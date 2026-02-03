import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { bountyRouter } from './routes/bounties';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'agentgrind-api' });
});

// Routes
app.use('/api/bounties', bountyRouter);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

app.listen(PORT, () => {
  console.log(`AgentGrind API running on port ${PORT}`);
});
