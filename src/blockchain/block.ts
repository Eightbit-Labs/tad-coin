export type Block = {
  index: number;
  timestamp: number;
  data: string;
  previousHash: string;
  hash: string;
  nonce: number;
}

export function createBlock(index: number, data: string, previousHash: string): Block {
  return {
    index,
    data,
    previousHash,
    timestamp: Date.now(),
    nonce: 0,
    hash: "",
  }
}