import { useState } from "react";
import { Popup } from "./AccountPopup";
import { ShowAlert as Alertbox} from "./Alert";
import { SignIn as SignInPopup } from "./SignIn";
import { useNavigate } from "react-router-dom";
import tadcoinLogo from '../tadcoin.png';
import { API_URL } from './api';

export default function App() {
  const navigate = useNavigate();
  const [isPopupOpen, setPopupOpen] = useState(false);
  const [isAlertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [isSignInOpen, setSignInOpen] = useState(false);

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
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('username', username);
    navigate('/dashboard', { state: { username } });
  }

  return (
    <main>
      <a href="/"><img src={tadcoinLogo} alt="TAD Coin Logo" style={{ position: 'fixed', top: '16px', right: '16px', height: '48px' }} /></a>
      <h1>
        TAD Coin
      </h1>
      <p>Welcome to the multiverse! This site is dedicated to Terry A. Davis.</p>
      <p>Made and maintained by Lawrence Tong and WerterTheBug</p>
      <button onClick={() => setPopupOpen(true)}>Make Account</button><br />
      <button onClick={() => setSignInOpen(true)}>Sign In</button>
      <Popup isOpen={isPopupOpen} onClose={() => setPopupOpen(false)} createAccount={createAccount}/>
      <Alertbox alertText={alertMessage} isOpen={isAlertOpen} onClose={() => setAlertOpen(false)}/>
      <SignInPopup isOpen={isSignInOpen} onClose={() => setSignInOpen(false)} UserSignIn={signIn}/>
    </main>
    
  );
}
