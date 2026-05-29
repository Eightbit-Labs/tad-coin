import '../index.css';
import { useLocation } from 'react-router-dom';
import tadcoinLogo from '../../tadcoin.png';
import { useState, useRef, useEffect } from 'react';
import { createBlock } from '../blockchain/block';
import type { Block } from '../blockchain/block';
import { API_URL, authHeaders } from '../api';

const DIFFICULTY = 8;
const NOTIFICATION_REFRESH_MS = 5000;
const NOTIFICATION_STORAGE_PREFIX = 'tadcoin_seen_transfer_notifications';

type IncomingTransfer = {
  id: string;
  blockIndex: number;
  timestamp: number;
  fromUsername: string;
  amount: number;
};

type IncomingTransferResponse = {
  transfers: IncomingTransfer[];
};

function spawnWorker(block: Block, difficulty: number, onDone: (b: Block) => void) {
  const worker = new Worker(new URL('../blockchain/miningWorker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (e: MessageEvent<Block>) => { onDone(e.data); worker.terminate(); };
  worker.postMessage({ block, difficulty });
  return worker;
}

function getSeenTransferIds(storageKey: string): Set<string> {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return new Set();

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === 'string'));
  } catch {
    return new Set();
  }
}

function saveSeenTransferIds(storageKey: string, ids: Set<string>): void {
  localStorage.setItem(storageKey, JSON.stringify(Array.from(ids)));
}

export default function Dashboard() {
  const location = useLocation();
  const [chain, setChain] = useState<Block[]>([]);
  const [mining, setMining] = useState(true);
  const [status, setStatus] = useState('Loading chain...');
  const [balance, setBalance] = useState(0);
  const [notifications, setNotifications] = useState<IncomingTransfer[]>([]);
  const [notificationStatus, setNotificationStatus] = useState('');
  const username = location.state?.username ?? localStorage.getItem('username') ?? 'Unknown';
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

  useEffect(() => {
    const storageKey = `${NOTIFICATION_STORAGE_PREFIX}:${username}`;

    async function loadNotifications() {
      try {
        const res = await fetch(`${API_URL}/api/transfer/incoming`, { headers: authHeaders() });
        if (!res.ok) {
          setNotificationStatus(res.status === 401 ? 'Sign in to receive transfer notifications.' : 'Could not load transfer notifications.');
          return;
        }

        const data = await res.json() as IncomingTransferResponse;
        const seenIds = getSeenTransferIds(storageKey);
        const unseen = data.transfers.filter(transfer => !seenIds.has(transfer.id));

        if (seenIds.size === 0) {
          saveSeenTransferIds(storageKey, new Set(data.transfers.map(transfer => transfer.id)));
          setNotificationStatus('');
          return;
        }

        if (unseen.length > 0) {
          setNotifications(prev => [...unseen, ...prev].slice(0, 5));
          unseen.forEach(transfer => seenIds.add(transfer.id));
          saveSeenTransferIds(storageKey, seenIds);
        }

        setNotificationStatus('');
      } catch {
        setNotificationStatus('Could not reach server.');
      }
    }

    const initialLoad = window.setTimeout(() => {
      void loadNotifications();
    }, 0);
    const pollTimer = window.setInterval(() => {
      void loadNotifications();
    }, NOTIFICATION_REFRESH_MS);

    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(pollTimer);
    };
  }, [username]);

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
      <h2>Balance: {balance} TAD</h2>
      <section className="content-box">
        <h2 className="section-title">Notifications</h2>
        <div className="section-content">
          {notificationStatus && <p>{notificationStatus}</p>}
          {!notificationStatus && notifications.length === 0 && <p>No new transfer notifications.</p>}
          {notifications.map(notification => (
            <p key={notification.id}>
              Received <strong className="stat">{notification.amount} TAD</strong> from <strong className="stat">{notification.fromUsername}</strong> in block #{notification.blockIndex}
            </p>
          ))}
        </div>
      </section>
      <button onClick={mine} disabled={mining}>{mining ? 'Mining...' : 'Mine'}</button><br />
      <button onClick={() => window.open('/logs', 'mining-logs', 'width=600,height=500')}>Open logs</button><br />
      <button onClick={() => window.open('/transfer', 'transfer-window', 'width=700,height=600')}>Transfer</button>
      {status && <p>{status}</p>}
      <h2>Blockchain history:</h2>
      <p id='top'><a href="#bottom">Jump to most recent</a></p>
      {chain.map(block => (
        <div key={block.index}>
          <p>Block #{block.index} | Nonce: {block.nonce} | Hash: {block.hash.slice(0, 40)}... {block.hash.startsWith("0".repeat(DIFFICULTY)) ? "[Mined]" : "[Invalid]"}</p>
        </div>
      ))}
      <div id="bottom"></div>
      <p><a href="#top">Back to top</a></p>
    </main>
  );
}