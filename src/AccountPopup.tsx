import './App.css';
import { useState } from 'react';
interface PopupProps {
  isOpen: boolean;
  onClose: () => void;
  createAccount: (username: string, password: string) => void;
    
  }


export function Popup({ isOpen, onClose, createAccount }: PopupProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  if (!isOpen) return null;
  return (
    <div className="overlay">
      <div className="popup">
        <h2>Create an Account</h2>

        <label htmlFor="username">Username:</label>
        <input type="text" id='username' name='username' value={username} onChange={e => setUsername(e.target.value)}/><br />

        <label htmlFor="password">Password:</label>
        <input type="password" id='password' name='password' value={password} onChange={e => setPassword(e.target.value)}/><br />
        <button onClick={() => createAccount(username, password)}>Create Account</button><br />

        <button onClick={onClose}>Close</button>
        {/* content */}
      </div>
    </div>
  );
}