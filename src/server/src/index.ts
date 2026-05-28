import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDb } from './db';
import authRouter from './routes/auth';
import chainRouter from './routes/chain';
import usersRouter from './routes/users';
import transferRouter from './routes/transfer';

const app = express();
const PORT = process.env.PORT ?? 3001;
const CLIENT_URL = process.env.CLIENT_URL ?? 'http://localhost:5173';

app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRouter);
app.use('/api/chain', chainRouter);
app.use('/api/users', usersRouter);
app.use('/api/transfer', transferRouter);

connectDb().then(() => {
  app.listen(PORT, () => {
    console.log(`TAD Coin backend server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to connect to MongoDB:', err);
  process.exit(1);
});
