import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import connectDB from './utils/db';

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());

// Routes
import authRoutes         from './routes/auth';
import videoRoutes        from './routes/videos';
import commentRoutes      from './routes/comments';
import uploadRoutes       from './routes/upload';
import userRoutes         from './routes/users';
import subscriptionRoutes from './routes/subscriptions';
import historyRoutes      from './routes/history';
import searchRoutes       from './routes/search';
import playlistRoutes     from './routes/playlists';
import downloadRoutes     from './routes/downloads';
import planRoutes         from './routes/plans';          
import { paymentsRouter } from './routes/payments';
import watchTimeRoutes    from './routes/watchTime';
import otpRoutes          from './routes/otp';

app.use('/api/auth',          authRoutes);
app.use('/api/videos',        videoRoutes);
app.use('/api/comments',      commentRoutes);
app.use('/api/upload',        uploadRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/history',       historyRoutes);
app.use('/api/search',        searchRoutes);
app.use('/api/playlists',     playlistRoutes);
app.use('/api/downloads',     downloadRoutes);
app.use('/api/plans',         planRoutes);                
app.use('/api/payments',      paymentsRouter);
app.use('/api/watch-time',    watchTimeRoutes);
app.use('/api/otp',           otpRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.get('/', (req, res) => {
  res.send('YouTube Clone API is running');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

export default app;