import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import githubRoutes from './routes/github.js';
import aiRoutes from './routes/ai.js';
import job from './utils/cron.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Corrected CORS options: withCredentials is not needed for token-based auth
app.use(cors({ 
  origin: process.env.FRONTEND_URL, 
  credentials: true
}));
app.use(express.json());
job.start();

app.use('/api/auth', authRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/ai', aiRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});