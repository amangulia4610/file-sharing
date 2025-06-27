// File: server/index.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Environment configuration
const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// CORS configuration
const corsOptions = {
  origin: NODE_ENV === 'production' 
    ? [
        'https://thefileshare.com',  // Custom domain HTTPS
        'https://www.thefileshare.com',  // WWW version HTTPS
        'http://thefileshare.com',   // Custom domain HTTP
        'http://www.thefileshare.com',   // WWW version HTTP
        /\.github\.io$/,  // Allow any GitHub Pages domain
        /localhost/,      // Allow localhost for testing
        /127\.0\.0\.1/    // Allow local IP testing
      ]
    : '*',
  credentials: true,
  methods: ['GET', 'POST']
};

app.use(cors(corsOptions));

// Health check route
app.get('/', (req, res) => {
  res.json({ 
    status: 'Server is running', 
    message: 'File sharing server is active',
    env: NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', uptime: process.uptime() });
});

const io = socketIo(server, {
  cors: corsOptions,
});

// Serve static files from the React app build in production
if (NODE_ENV === 'production') {
  // Note: Client is served from GitHub Pages, not from this server
  console.log('Production mode: Client served from GitHub Pages');
}

const sessions = {};

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join', ({ session, deviceInfo }) => {
    socket.join(session);
    if (!sessions[session]) {
      sessions[session] = { devices: [] };
    }
    
    const device = {
      id: socket.id,
      type: deviceInfo?.type || 'unknown',
      userAgent: deviceInfo?.userAgent || 'unknown',
      timestamp: new Date()
    };
    
    sessions[session].devices.push(device);
    console.log(`Client ${socket.id} (${device.type}) joined session ${session}`);
    
    // Notify all devices in session about new device
    socket.to(session).emit('device-joined', { device, totalDevices: sessions[session].devices.length });
    
    // Send current devices list to the new device
    socket.emit('session-info', { 
      devices: sessions[session].devices,
      totalDevices: sessions[session].devices.length 
    });
  });

  socket.on('offer', ({ session, offer }) => {
    console.log(`Offer from ${socket.id} for session ${session}`);
    socket.to(session).emit('offer', { offer });
  });

  socket.on('answer', ({ session, answer }) => {
    console.log(`Answer from ${socket.id} for session ${session}`);
    socket.to(session).emit('answer', { answer });
  });

  socket.on('candidate', ({ session, candidate }) => {
    console.log(`ICE candidate from ${socket.id} for session ${session}`);
    socket.to(session).emit('candidate', { candidate });
  });

  socket.on('transfer-start', ({ session, fileName, fileSize }) => {
    console.log(`Transfer starting in session ${session}: ${fileName} (${fileSize} bytes)`);
    socket.to(session).emit('transfer-start', { fileName, fileSize });
  });

  socket.on('transfer-progress', ({ session, progress }) => {
    socket.to(session).emit('transfer-progress', { progress });
  });

  socket.on('transfer-complete', ({ session }) => {
    console.log(`Transfer completed in session ${session}`);
    socket.to(session).emit('transfer-complete');
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    // Clean up sessions
    for (const session in sessions) {
      if (sessions[session].devices) {
        sessions[session].devices = sessions[session].devices.filter(device => device.id !== socket.id);
        if (sessions[session].devices.length === 0) {
          delete sessions[session];
        } else {
          // Notify remaining devices about disconnection
          io.to(session).emit('device-left', { 
            socketId: socket.id,
            totalDevices: sessions[session].devices.length 
          });
        }
      }
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const host = NODE_ENV === 'production' ? '0.0.0.0' : '10.0.0.15';
  console.log(`🚀 Server running in ${NODE_ENV} mode`);
  console.log(`📡 Signaling server: http://${host}:${PORT}`);
  if (NODE_ENV === 'production') {
    console.log(`🌐 Web app available at: http://${host}:${PORT}`);
  }
});