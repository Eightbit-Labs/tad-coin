import '../index.css';
import { useEffect, useState } from 'react';
import { API_URL, authHeaders, getToken, getUsername } from '../api';

type RecipientsResponse = {
  users: string[];
};

type BalanceResponse = {
  balance: number;
};

type TransferResponse = {
  ok: boolean;
  balance: number;
  blockHash: string;
  blockIndex: number;
};

export default function TransferWindow() {
  const [recipients, setRecipients] = useState<string[]>([]);
  const [toUsername, setToUsername] = useState('');
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState('');
  const username = getUsername() ?? 'Unknown';

  useEffect(() => {
    async function loadTransferData() {
      if (!getToken()) {
        setStatus('You must sign in to transfer coins.');
        setLoading(false);
        return;
      }
      try {
        const [usersRes, balanceRes] = await Promise.all([
          fetch(`${API_URL}/api/users/recipients`, { headers: authHeaders() }),
          fetch(`${API_URL}/api/chain/balance`, { headers: authHeaders() }),
        ]);

        if (!usersRes.ok) {
          const err = await usersRes.json();
          setStatus(err.error ?? 'Failed to load recipients.');
          setLoading(false);
          return;
        }

        if (!balanceRes.ok) {
          const err = await balanceRes.json();
          setStatus(err.error ?? 'Failed to load balance.');
          setLoading(false);
          return;
        }

        const usersData = await usersRes.json() as RecipientsResponse;
        const balanceData = await balanceRes.json() as BalanceResponse;
        setRecipients(usersData.users);
        setToUsername(usersData.users[0] ?? '');
        setBalance(balanceData.balance);
      } catch {
        setStatus('Could not reach server.');
      } finally {
        setLoading(false);
      }
    }

    loadTransferData();
  }, []);

  async function transfer() {
    const parsedAmount = Number(amount);
    if (!toUsername) {
      setStatus('Please select a recipient.');
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setStatus('Amount must be a positive number.');
      return;
    }

    setSubmitting(true);
    setStatus('Submitting transfer...');
    try {
      const res = await fetch(`${API_URL}/api/transfer`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ toUsername, amount: parsedAmount }),
      });
      const data = await res.json() as TransferResponse | { error?: string };
      if (!res.ok) {
        const errorData = data as { error?: string };
        setStatus(errorData.error ?? 'Transfer failed.');
        setSubmitting(false);
        return;
      }
      const successData = data as TransferResponse;
      setBalance(successData.balance);
      setAmount('');
      setStatus(`Transfer complete. Block #${successData.blockIndex} ${successData.blockHash.slice(0, 16)}...`);
    } catch {
      setStatus('Could not reach server.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main>
        <h2>Transfer TAD Coin</h2>
        <p>Loading transfer window...</p>
      </main>
    );
  }

  return (
    <main>
      <h2>Transfer TAD Coin</h2>
      <p>Signed in as: <strong>{username}</strong></p>
      <p>Balance: <strong>{balance} TAD</strong></p>
      <label htmlFor="recipient">Recipient:</label>{' '}
      <select id="recipient" value={toUsername} onChange={e => setToUsername(e.target.value)} disabled={recipients.length === 0 || submitting}>
        {recipients.length === 0 ? <option value="">No eligible users found</option> : recipients.map(user => <option key={user} value={user}>{user}</option>)}
      </select>
      <br />
      <label htmlFor="amount">Amount:</label>{' '}
      <input
        id="amount"
        type="number"
        min="0.00000001"
        step="0.00000001"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        disabled={submitting}
      />
      <br />
      <button onClick={transfer} disabled={submitting || recipients.length === 0}>
        {submitting ? 'Transferring...' : 'Send Transfer'}
      </button>{' '}
      <button onClick={() => window.close()}>Close</button>
      {status && <p>{status}</p>}
      <p><a href="https://decenter.princeton.edu/news/how-secure-is-crypto-as-secure-as-the-internet/">Learn how your transfers are secured</a></p>
    </main>
  );
}
