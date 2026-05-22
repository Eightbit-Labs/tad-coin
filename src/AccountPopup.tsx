import './App.css';
import { useState } from 'react';
interface PopupProps {
  isOpen: boolean;
  onClose: () => void;
  createAccount: (username: string, password: string) => void;
    
  }


export function Popup({ isOpen, onClose, createAccount }: PopupProps) {
  if (!isOpen) return null;
  const [username, setUsername] = useState({ username: ""})
  const [password, setPassword] = useState({ password: ""})
  return (
    <div className="overlay">
      <div className="popup">
        <h2>Create an Account</h2>

        <label htmlFor="username">Username:</label>
        <input type="text" id='username' name='username' value={username.username} onChange={e => setUsername(prev => ({ ...prev, username: e.target.value }))}/><br />

        <label htmlFor="password">Password:</label>
        <input type="password" id='password' name='password' value={password.password} onChange={e => setPassword(prev => ({...prev, password: e.target.value}))}/><br />
        <button onClick={() => createAccount(username.username, password.password)}>Create Account</button><br />

        <button onClick={onClose}>Close</button>
        {/* content */}
      </div>
    </div>
  );
}