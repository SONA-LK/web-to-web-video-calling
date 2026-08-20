import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Map of userId -> socketId
const userSocketMap = new Map<string, string>();
const socketUserMap = new Map<string, string>();

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  socket.on('user:register', (userId: string) => {
    userSocketMap.set(userId, socket.id);
    socketUserMap.set(socket.id, userId);
    console.log(`[Socket] Registered user ${userId} with socket ${socket.id}`);
    io.emit('user:online_list', Array.from(userSocketMap.keys()));
  });

  socket.on('call:request', (data: { toUserId: string; callerInfo: any }) => {
    const targetSocketId = userSocketMap.get(data.toUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call:incoming', {
        fromUserId: data.callerInfo.id,
        callerInfo: data.callerInfo
      });
    } else {
      socket.emit('call:user_offline', { userId: data.toUserId });
    }
  });

  socket.on('call:response', (data: { toUserId: string; accepted: boolean }) => {
    const targetSocketId = userSocketMap.get(data.toUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call:answered', {
        accepted: data.accepted,
        fromUserId: socketUserMap.get(socket.id)
      });
    }
  });

  socket.on('webrtc:offer', (data: { toUserId: string; sdp: any }) => {
    const targetSocketId = userSocketMap.get(data.toUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('webrtc:offer', {
        fromUserId: socketUserMap.get(socket.id),
        sdp: data.sdp
      });
    }
  });

  socket.on('webrtc:answer', (data: { toUserId: string; sdp: any }) => {
    const targetSocketId = userSocketMap.get(data.toUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('webrtc:answer', {
        fromUserId: socketUserMap.get(socket.id),
        sdp: data.sdp
      });
    }
  });

  socket.on('webrtc:ice-candidate', (data: { toUserId: string; candidate: any }) => {
    const targetSocketId = userSocketMap.get(data.toUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('webrtc:ice-candidate', {
        fromUserId: socketUserMap.get(socket.id),
        candidate: data.candidate
      });
    }
  });

  socket.on('call:end', (data: { toUserId: string }) => {
    const targetSocketId = userSocketMap.get(data.toUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call:ended', {
        fromUserId: socketUserMap.get(socket.id)
      });
    }
  });

  socket.on('disconnect', () => {
    const userId = socketUserMap.get(socket.id);
    if (userId) {
      userSocketMap.delete(userId);
      socketUserMap.delete(socket.id);
      console.log(`[Socket] User ${userId} disconnected`);
      io.emit('user:online_list', Array.from(userSocketMap.keys()));
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
