import crypto from 'crypto';
import type { Block } from './block';

// Must produce identical output to the client's crypto-js SHA256 for the same input string.
export function calculateHash(block: Block): string {
  const input = String(block.index + block.timestamp) + block.data + block.previousHash + block.nonce;
  return crypto.createHash('sha256').update(input).digest('hex');
}
