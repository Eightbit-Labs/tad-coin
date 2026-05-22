import { createBlock, type Block } from './block';
import { calculateHash } from './hash';

export const DIFFICULTY = 3;

export function mineBlock(block: Block): Block {
  const b = { ...block };
  const target = '0'.repeat(DIFFICULTY);
  while (!b.hash.startsWith(target)) {
    b.nonce++;
    b.hash = calculateHash(b);
  }
  return b;
}

export function createGenesis(): Block {
  return mineBlock(createBlock(0, 'Genesis Block', '0'));
}

export function isBlockValid(block: Block, previous: Block): boolean {
  if (block.index !== previous.index + 1) return false;
  if (block.previousHash !== previous.hash) return false;
  if (calculateHash(block) !== block.hash) return false;
  if (!block.hash.startsWith('0'.repeat(DIFFICULTY))) return false;
  return true;
}
