import { createBlock, type Block } from "./block";
import { calculateHash } from "./hash";

export function createGenesis(difficulty: number): Block {
  const genesis = createBlock(0, "Genisis Block", "0");
  return mineBlock(genesis, difficulty);
}

export function addBlock(chain: Block[], data: string, difficulty: number): Block[] {
  const previousBlock = chain[chain.length - 1];
  const newBlock = createBlock(chain.length, data, previousBlock.hash);
  const minedBlock = mineBlock(newBlock, difficulty);
  return [...chain, minedBlock];
}

export function isChainValid(chain: Block[], difficulty: number): boolean {
  for (let i = 1; i < chain.length; i++) {
    const current = chain[i];
    const previous = chain[i - 1];

    if (current.hash !== calculateHash(current)) return false;
    if (current.previousHash !== previous.hash) return false;
    if (!current.hash.startsWith("0".repeat(difficulty))) return false;
  }
  return true;
}

export function mineBlock(block: Block, difficulty: number): Block {
  let minedBlock = { ...block };
  while (!minedBlock.hash.startsWith("0".repeat(difficulty))) {
    minedBlock.nonce++;
    minedBlock.hash = calculateHash(minedBlock);
  }
  return minedBlock;
}