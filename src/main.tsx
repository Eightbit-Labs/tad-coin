import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.tsx';
import Dashboard from './dashboard/dashboard.tsx';
import Logs from './dashboard/logs.tsx';
import TransferWindow from './dashboard/transfer.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/logs" element={<Logs />} />
        <Route path="/transfer" element={<TransferWindow />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)