import { useState, useEffect, useCallback } from "react";
import { Popup } from "./AccountPopup";
import { ShowAlert as Alertbox} from "./Alert";
import { SignIn as SignInPopup } from "./SignIn";
import { useNavigate } from "react-router-dom";
import tadcoinLogo from '../tadcoin.png';
import { API_URL } from './api';

type LeaderboardEntry = {
  username: string;
  balance: number;
};

type LeaderboardResponse = {
  leaderboard: LeaderboardEntry[];
};

const LEADERBOARD_REFRESH_SECONDS = 30;

export default function App() {
  const navigate = useNavigate();
  const [isPopupOpen, setPopupOpen] = useState(false);
  const [isAlertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [isSignInOpen, setSignInOpen] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [leaderboardError, setLeaderboardError] = useState('');
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(LEADERBOARD_REFRESH_SECONDS);

  useEffect(() => {
    async function fetchUserCount() {
      try {
        const res = await fetch(`${API_URL}/api/users/count`);
        if (res.ok) {
          const data = await res.json();
          setUserCount(data.count || 0);
        } else {
          console.error('Failed to fetch user count. Status:', res.status);
        }
      } catch (error) {
        console.error('Failed to fetch user count:', error);
      }
    }
    fetchUserCount();
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/users/leaderboard`);
      if (!res.ok) {
        throw new Error(`Leaderboard request failed with status ${res.status}`);
      }

      const data = await res.json() as LeaderboardResponse;
      setLeaderboard(Array.isArray(data.leaderboard) ? data.leaderboard : []);
      setLeaderboardError('');
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      setLeaderboardError('Failed to load leaderboard.');
    } finally {
      setLeaderboardLoading(false);
      setSecondsUntilRefresh(LEADERBOARD_REFRESH_SECONDS);
    }
  }, []);

  useEffect(() => {
    const initialLoadTimer = window.setTimeout(() => {
      void fetchLeaderboard();
    }, 0);

    const refreshTimer = window.setInterval(fetchLeaderboard, LEADERBOARD_REFRESH_SECONDS * 1000);
    return () => {
      window.clearTimeout(initialLoadTimer);
      window.clearInterval(refreshTimer);
    };
  }, [fetchLeaderboard]);

  useEffect(() => {
    const countdownTimer = window.setInterval(() => {
      setSecondsUntilRefresh(current => (current <= 1 ? LEADERBOARD_REFRESH_SECONDS : current - 1));
    }, 1000);

    return () => window.clearInterval(countdownTimer);
  }, []);

  async function createAccount(username: string, password: string) {
    setPopupOpen(false);
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (res.ok) {
      setAlertMessage('Account creation success');
    } else {
      const err = await res.json();
      setAlertMessage(err.error ?? 'Account creation failed');
    }
    setAlertOpen(true);
  }

  async function signIn(username: string, password: string) {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    setSignInOpen(false);
    if (!res.ok) {
      const err = await res.json();
      setAlertMessage(err.error ?? 'Sign in failed');
      setAlertOpen(true);
      return;
    }
    const { token } = await res.json();
    localStorage.setItem('token', token);
    localStorage.setItem('username', username);
    navigate('/dashboard', { state: { username } });
  }

  return (
    <main className="retro-main">
      <header className="header">
        <div className="header-content">
          <h1 className="title">TAD Coin</h1>
          <a href="/" className="logo-link"><img src={tadcoinLogo} alt="TAD Coin Logo" className="logo" /></a>
        </div>
      </header>

      <div className="container">
        <section className="content-box">
          <h2 className="section-title">About</h2>
          <div className="section-content">
            <p>Welcome to the multiverse! This site is dedicated to Terry A. Davis. King Terry the Terrible will prevail. Rest in peace.</p>
            <p>Learn more about <a href="https://en.wikipedia.org/wiki/Terry_A._Davis" className="link">Terry A. Davis</a></p>
          </div>
        </section>

        <section className="content-box">
          <h2 className="section-title">Community</h2>
          <div className="section-content">
            <p><strong className="stat">{userCount}</strong> active traders</p>
            <p>Made and maintained by Lawrence Tong and WerterTheBug</p>
          </div>
        </section>

        <section className="content-box">
          <h2 className="section-title">Leaderboard</h2>
          <div className="section-content">
            <p>Updates globally every 30 seconds. Refreshes in <strong className="stat">{secondsUntilRefresh}s</strong>.</p>
            {leaderboardLoading && leaderboard.length === 0 ? (
              <p>Loading leaderboard...</p>
            ) : leaderboardError ? (
              <p>{leaderboardError}</p>
            ) : leaderboard.length === 0 ? (
              <p>No balances available yet.</p>
            ) : (
              leaderboard.map((entry, index) => (
                <p key={entry.username}>
                  <strong className="stat">#{index + 1}</strong> {entry.username} — <strong className="stat">{entry.balance} TAD</strong>
                </p>
              ))
            )}
          </div>
        </section>

        <section className="content-box">
          <h2 className="section-title">Access</h2>
          <div className="button-group">
            <button onClick={() => setPopupOpen(true)} className="retro-button">Make Account</button>
            <button onClick={() => setSignInOpen(true)} className="retro-button">Sign In</button>
          </div>
        </section>
      </div>

      <Popup isOpen={isPopupOpen} onClose={() => setPopupOpen(false)} createAccount={createAccount}/>
      <Alertbox alertText={alertMessage} isOpen={isAlertOpen} onClose={() => setAlertOpen(false)}/>
      <SignInPopup isOpen={isSignInOpen} onClose={() => setSignInOpen(false)} UserSignIn={signIn}/>
    </main>
  );
}
