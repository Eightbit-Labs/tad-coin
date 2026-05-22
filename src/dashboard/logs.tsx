import '../index.css';
import { useEffect, useRef, useState } from 'react';

export default function Logs() {
  const [status, setStatus] = useState('Waiting for mining...');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const channel = new BroadcastChannel('mining-logs');
    channel.onmessage = (e) => {
      if (e.data.type === 'start') {
        if (listRef.current) listRef.current.innerHTML = '';
        setStatus(' Running...');
      } else if (e.data.type === 'progress') {
        if (!listRef.current) return;
        const frag = document.createDocumentFragment();
        for (const entry of e.data.entries) {
          const div = document.createElement('div');
          div.textContent = `Nonce: ${entry.nonce} | ${entry.hash}`;
          frag.appendChild(div);
        }
        listRef.current.appendChild(frag);
        listRef.current.lastElementChild?.scrollIntoView();
      } else if (e.data.type === 'result') {
        setStatus('✓ Done');
      }
    };
    return () => channel.close();
  }, []);

  return (
    <main style={{ fontFamily: 'monospace', padding: '16px' }}>
      <h2>TAD Coin Mining Logs</h2>
      <h2>{status}</h2>
      <div ref={listRef} style={{ height: '80vh', overflowY: 'auto', fontSize: '12px' }} />
    </main>
  );
}
