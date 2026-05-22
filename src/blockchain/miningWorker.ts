import { calculateHash } from './hash';
import type { Block } from './block';

self.onmessage = (e: MessageEvent<{ block: Block; difficulty: number }>) => {
  const { block, difficulty } = e.data;
  const channel = new BroadcastChannel('mining-logs');
  channel.postMessage({ type: 'start' });

  let minedBlock = { ...block };
  const target = '0'.repeat(difficulty);
  const batch: { nonce: number; hash: string }[] = [];

  while (!minedBlock.hash.startsWith(target)) {
    minedBlock.nonce++;
    minedBlock.hash = calculateHash(minedBlock);
    batch.push({ nonce: minedBlock.nonce, hash: minedBlock.hash });
    if (batch.length >= 500) {
      channel.postMessage({ type: 'progress', entries: [...batch] });
      batch.length = 0;
    }
  }

  if (batch.length > 0) {
    channel.postMessage({ type: 'progress', entries: batch });
  }
  channel.postMessage({ type: 'result' });
  channel.close();
  self.postMessage(minedBlock);
};
