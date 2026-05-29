import { Router, Request, Response } from 'express';
import { MongoServerError } from 'mongodb';
import { createBlock, type Block } from '../blockchain/block';
import { isBlockValid, mineBlock } from '../blockchain/blockchain';
import { getClient, getDb } from '../db';
import { requireAuth, type AuthedRequest } from '../middleware/auth';

const router = Router();
const MAX_DECIMALS = 8;

class TransferError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
  }
}

function hasValidPrecision(amount: number): boolean {
  const scale = 10 ** MAX_DECIMALS;
  return Number.isInteger(amount * scale);
}

type IncomingTransfer = {
  id: string;
  blockIndex: number;
  timestamp: number;
  fromUsername: string;
  amount: number;
};

function parseIncomingTransfer(block: Pick<Block, 'hash' | 'index' | 'timestamp' | 'data'>, username: string): IncomingTransfer | null {
  try {
    const data = JSON.parse(block.data) as {
      type?: unknown;
      from?: unknown;
      to?: unknown;
      amount?: unknown;
    };

    if (data.type !== 'transfer' || data.to !== username) return null;
    if (typeof data.from !== 'string' || typeof data.amount !== 'number' || !Number.isFinite(data.amount)) return null;

    return {
      id: block.hash,
      blockIndex: block.index,
      timestamp: block.timestamp,
      fromUsername: data.from,
      amount: data.amount,
    };
  } catch {
    return null;
  }
}

router.get('/incoming', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { username } = (req as AuthedRequest).user;
    const blocks = await getDb()
      .collection<Pick<Block, 'hash' | 'index' | 'timestamp' | 'data'>>('blocks')
      .find({}, { projection: { _id: 0, index: 1, timestamp: 1, data: 1, hash: 1 } })
      .sort({ index: -1 })
      .toArray();

    const transfers = blocks
      .map(block => parseIncomingTransfer(block, username))
      .filter((transfer): transfer is IncomingTransfer => transfer !== null);

    res.json({ transfers });
  } catch (error) {
    console.error('Failed to load incoming transfers:', error);
    res.status(500).json({ error: 'Failed to load incoming transfers' });
  }
});

router.post('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { username: fromUsername } = (req as AuthedRequest).user;
  const { toUsername, amount } = req.body as { toUsername: unknown; amount: unknown };

  if (typeof toUsername !== 'string' || toUsername.trim() === '') {
    res.status(400).json({ error: 'Recipient username is required' });
    return;
  }
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    res.status(400).json({ error: 'Amount must be a positive number' });
    return;
  }
  if (!hasValidPrecision(amount)) {
    res.status(400).json({ error: `Amount cannot have more than ${MAX_DECIMALS} decimal places` });
    return;
  }

  const recipient = toUsername.trim();
  if (recipient === fromUsername) {
    res.status(400).json({ error: 'Cannot transfer to yourself' });
    return;
  }

  const db = getDb();
  const client = getClient();
  const users = db.collection('users');
  const balances = db.collection('balances');
  const blocks = db.collection('blocks');

  try {
    const responsePayload = await client.withSession(async (session) => {
      return session.withTransaction(async () => {
        const recipientUser = await users.findOne({ username: recipient }, { session, projection: { _id: 1 } });
        if (!recipientUser) {
          throw new TransferError(404, 'Recipient user not found');
        }

        const lastBlock = await blocks.find({}, { session }).sort({ index: -1 }).limit(1).next() as Block | null;
        if (!lastBlock) {
          throw new TransferError(500, 'Blockchain is not initialized');
        }

        const senderBalance = await balances.findOneAndUpdate(
          { username: fromUsername, balance: { $gte: amount } },
          { $inc: { balance: -amount } },
          { session, returnDocument: 'after' }
        );

        if (!senderBalance) {
          throw new TransferError(400, 'Insufficient balance');
        }

        await balances.findOneAndUpdate(
          { username: recipient },
          { $inc: { balance: amount } },
          { session, upsert: true, returnDocument: 'after' }
        );

        const transferData = JSON.stringify({
          type: 'transfer',
          from: fromUsername,
          to: recipient,
          amount,
          timestamp: Date.now(),
        });

        const transferBlock = mineBlock(createBlock(lastBlock.index + 1, transferData, lastBlock.hash));
        if (!isBlockValid(transferBlock, lastBlock)) {
          throw new TransferError(400, 'Generated transfer block is invalid');
        }

        await blocks.insertOne(transferBlock, { session });
        return {
          balance: Number(senderBalance.balance ?? 0),
          blockHash: transferBlock.hash,
          blockIndex: transferBlock.index,
        };
      });
    });

    if (!responsePayload) {
      res.status(500).json({ error: 'Transfer failed before commit' });
      return;
    }

    res.json({
      ok: true,
      balance: responsePayload.balance,
      blockHash: responsePayload.blockHash,
      blockIndex: responsePayload.blockIndex,
    });
  } catch (error) {
    if (error instanceof TransferError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    if (error instanceof MongoServerError && error.code === 11000) {
      res.status(409).json({ error: 'Transfer conflict detected. Please retry.' });
      return;
    }
    console.error('Transfer failed:', error);
    res.status(500).json({ error: 'Transfer failed' });
  }
});

export default router;