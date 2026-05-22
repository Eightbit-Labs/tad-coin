import './App.css'
import { useState } from 'react';
interface SignInProps {
  isOpen: boolean;
  onClose: () => void;
  UserSignIn: (username: string, password: string) => void;
}

export function SignIn({isOpen, onClose, UserSignIn}: SignInProps) {
  const [username, setUsername] = useState({ username: ""})
  const [password, setPassword] = useState({ password: ""})
  if (!isOpen) return null;

  return(
    <div className="overlay">
      <div className="popup">
        <h2>Sign In</h2>
        <label htmlFor="username">Username:</label>
        <input type="text" id='username' name='username' value={username.username} onChange={e => setUsername(prev => ({ ...prev, username: e.target.value }))}/><br />
        <label htmlFor="password">Password:</label>
        <input type="password" id='password' name='password' value={password.password} onChange={e => setPassword(prev => ({...prev, password: e.target.value}))}/><br />
        <button onClick={() => UserSignIn(username.username, password.password)}>Sign In</button>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  )
}