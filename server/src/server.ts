import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import connectDB from './utils/db';

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  }
});


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

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.get('/', (req, res) => {
  res.send('YouTube Clone API is running');
});

// --- Socket.IO WebRTC Signaling ---
io.on('connection', (socket) => {
  socket.on('join-room', (roomId: string) => {
    socket.join(roomId);

    // Get all clients in the room (excluding this new socket since we just joined, wait, actually we did join, so we filter it out)
    const clients = io.sockets.adapter.rooms.get(roomId);
    const usersInRoom = clients ? Array.from(clients).filter(id => id !== socket.id) : [];
    
    // Notify the joiner of all existing users in the room
    socket.emit('all-users', usersInRoom);
  });

  socket.on('sending-signal', (payload) => {
    io.to(payload.userToSignal).emit('user-joined', { 
      signal: payload.signal, 
      callerID: payload.callerID 
    });
  });

  socket.on('returning-signal', (payload) => {
    io.to(payload.callerID).emit('receiving-returned-signal', { 
      signal: payload.signal, 
      id: socket.id 
    });
  });

  socket.on('disconnecting', () => {
    socket.rooms.forEach((room) => {
      if (room !== socket.id) {
        socket.to(room).emit('user-disconnected', socket.id);
      }
    });
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

export default app;