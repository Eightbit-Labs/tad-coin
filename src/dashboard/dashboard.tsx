import '../index.css';
import { useLocation } from 'react-router-dom';
import tadcoinLogo from '../../tadcoin.png';
import { useState, useRef, useEffect } from 'react';
import { createBlock } from '../blockchain/block';
import type { Block } from '../blockchain/block';
import { API_URL, authHeaders } from '../api';
import TransferWindow from '../dashboard/transfer'

const DIFFICULTY = 8;

function spawnWorker(block: Block, difficulty: number, onDone: (b: Block) => void) {
  const worker = new Worker(new URL('../blockchain/miningWorker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (e: MessageEvent<Block>) => { onDone(e.data); worker.terminate(); };
  worker.postMessage({ block, difficulty });
  return worker;
}

export default function Dashboard() {
  const location = useLocation();
  const [chain, setChain] = useState<Block[]>([]);
  const [mining, setMining] = useState(true);
  const [status, setStatus] = useState('Loading chain...');
  const [balance, setBalance] = useState(0);
  const username = location.state?.username ?? sessionStorage.getItem('username') ?? 'Unknown';
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/chain`)
      .then(r => r.json())
      .then((fetched: Block[]) => {
        setChain(fetched);
        setMining(false);
        setStatus('');
      })
      .catch(() => {
        setMining(false);
        setStatus('Could not reach server.');
      });

    fetch(`${API_URL}/api/chain/balance`, { headers: authHeaders() })
      .then(r => r.json())
      .then(({ balance }: { balance: number }) => setBalance(balance))
      .catch(() => {});
  }, []);

  function mine() {
    if (chain.length === 0 || mining) return;
    const previousBlock = chain[chain.length - 1];
    const newBlock = createBlock(chain.length, `Block mined by ${username} at ${Date.now()}`, previousBlock.hash);
    setMining(true);
    setStatus('Mining...');
    workerRef.current = spawnWorker(newBlock, DIFFICULTY, (mined) => {
      async function submit() {
        const res = await fetch(`${API_URL}/api/chain/submit`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(mined),
        });
        if (res.ok) {
          const { chain: updated, balance: newBalance } = await res.json();
          setChain(updated);
          setBalance(newBalance);
          setStatus('');
        } else {
          const updated: Block[] = await fetch(`${API_URL}/api/chain`).then(r => r.json());
          setChain(updated);
          setStatus('Block rejected — chain updated. Try again.');
        }
        setMining(false);
      }
      submit();
    });
  }

  return(
    <main>
      <h1>Welcome, {username}</h1>
      <a href="/"><img src={tadcoinLogo} alt="TAD Coin Logo" style={{ position: 'fixed', top: '16px', right: '16px', height: '48px' }} /></a>
      <p><strong>Notice:</strong> Render, has scheduled maintenance for May 27th, 1:00 am UTC, meaning the blockchain will be down for a couple hours.</p>
      <h2>Balance: {balance} TAD</h2>
      <button onClick={mine} disabled={mining}>{mining ? 'Mining...' : 'Mine'}</button><br />
      <button onClick={() => window.open('/logs', 'mining-logs', 'width=600,height=500')}>Open logs</button><br />
      <button onClick={() => TransferWindow}>Transfer [Not funcitonal yet]</button>
      {status && <p>{status}</p>}
      <h2>Blockchain history:</h2>
      <p><a href="#bottom">Jump to most recent</a></p>
      {chain.map(block => (
        <div key={block.index}>
          <p>Block #{block.index} | Nonce: {block.nonce} | Hash: {block.hash.slice(0, 40)}... {block.hash.startsWith("0".repeat(DIFFICULTY)) ? "[Mined]" : "[Invalid]"}</p>
        </div>
      ))}
    </main>
  );
}