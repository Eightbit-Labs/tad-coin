import CryptoJS from "crypto-js";
import type { Block } from "./block";

export function calculateHash(block: Block): string {
  return CryptoJS.SHA256(
    block.index + block.timestamp + block.data + block.previousHash + block.nonce
    ).toString();
} 