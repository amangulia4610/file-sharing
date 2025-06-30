/**
 * ============================================================================
 * The File Share - Express.js Server with Socket.IO Signaling
 * ============================================================================
 * 
 * This server provides the signaling infrastructure for WebRTC peer-to-peer
 * file sharing. It does NOT handle the actual file transfers (which happen
 * directly between devices via WebRTC), but rather coordinates the connection
 * establishment between sender and receiver devices.
 * 
 * KEY RESPONSIBILITIES:
 * - Session management (create, join, verify sessions)
 * - WebRTC signaling (offers, answers, ICE candidates)
 * - Device connection tracking and status updates
 * - Real-time progress updates via Socket.IO
 * - CORS configuration for cross-origin requests
 * 
 * ARCHITECTURE:
 * - Express.js HTTP server for health checks and API endpoints
 * - Socket.IO for real-time bidirectional communication
 * - In-memory session storage (resets on server restart)
 * - Support for both development and production environments
 * 
 * DEPLOYMENT:
 * - Production: Designed for platforms like Render.com, Heroku, etc.
 * - Development: Local server on specified IP for same-network testing
 * - Environment variables for configuration
 * 
 * Author: File Share Team
 * Last Updated: 2024
 * ============================================================================
 */

// Load environment variables from .env file
require('dotenv').config();

// Core Node.js and Express dependencies
const express = require('express');      // Web framework for Node.js
const http = require('http');           // HTTP server module
const socketIo = require('socket.io');  // Real-time communication library
const cors = require('cors');           // Cross-Origin Resource Sharing middleware
const path = require('path');           // File path utilities

// Initialize Express application and HTTP server
const app = express();
const server = http.createServer(app);

// ============================================================================
// ENVIRONMENT CONFIGURATION
// ============================================================================

// Server configuration from environment variables with sensible defaults
const PORT = process.env.PORT || 4000;                    // Server port
const NODE_ENV = process.env.NODE_ENV || 'development';   // Environment mode

/**
 * CORS (Cross-Origin Resource Sharing) Configuration
 * 
 * Defines which origins are allowed to connect to this server.
 * Critical for security and proper functioning across different domains.
 */
const corsOptions = {
  origin: NODE_ENV === 'production' 
    ? [
        // Production origins - replace with your actual domains
        'https://thefileshare.com',      // Custom domain HTTPS
        'https://www.thefileshare.com',  // WWW version HTTPS
        'http://thefileshare.com',       // Custom domain HTTP
        'http://www.thefileshare.com',   // WWW version HTTP
        /\.github\.io$/,                 // Allow any GitHub Pages domain
        /localhost/,                     // Allow localhost for testing
        /127\.0\.0\.1/                   // Allow local IP testing
      ]
    : '*',  // Development: Allow all origins for local testing
  credentials: true,    // Allow credentials (cookies, authorization headers)
  methods: ['GET', 'POST']  // Allowed HTTP methods
};

// Apply CORS middleware to all routes
app.use(cors(corsOptions));

// ============================================================================
// HTTP ROUTES & HEALTH CHECKS
// ============================================================================

/**
 * Root endpoint - Server status and information
 * Provides basic server information and confirms the server is running
 */
app.get('/', (req, res) => {
  res.json({ 
    status: 'Server is running', 
    message: 'File sharing server is active',
    env: NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

/**
 * Health check endpoint
 * Used by hosting platforms and monitoring services to check server health
 */
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    uptime: process.uptime()  // Server uptime in seconds
  });
});

// ============================================================================
// SOCKET.IO CONFIGURATION
// ============================================================================

/**
 * Initialize Socket.IO server with CORS configuration
 * This enables real-time bidirectional communication between server and clients
 */
const io = socketIo(server, {
  cors: corsOptions,  // Apply same CORS rules to WebSocket connections
});

// ============================================================================
// STATIC FILE SERVING (PRODUCTION ONLY)
// ============================================================================

/**
 * Production static file serving configuration
 * 
 * Note: In the current setup, the client is served from GitHub Pages,
 * so this server only handles the signaling functionality.
 */
if (NODE_ENV === 'production') {
  console.log('Production mode: Client served from GitHub Pages');
  // Add static file serving here if needed in the future
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * In-memory session storage
 * 
 * Structure: { 
 *   [sessionId]: { 
 *     devices: [{ id, type, deviceInfo, ... }] 
 *   } 
 * }
 * 
 * Note: This resets when the server restarts. For production use,
 * consider using Redis or another persistent storage solution.
 */
const sessions = {};

// ============================================================================
// SOCKET.IO CONNECTION HANDLING
// ============================================================================

/**
 * Main Socket.IO connection handler
 * 
 * Manages all real-time communication between sender and receiver devices.
 * Each connection represents a device (sender or receiver) in the file sharing network.
 */
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // ==========================================================================
  // SESSION JOINING & DEVICE MANAGEMENT
  // ==========================================================================

  /**
   * Handle device joining a session
   * 
   * When a device (sender or receiver) wants to join a session, this handler:
   * 1. Adds the device to the session's device list
   * 2. Prevents duplicate entries for the same socket ID
   * 3. Notifies other devices about the new connection
   * 4. Sends the current device list to the joining device
   * 
   * @param {string} session - The session ID to join
   * @param {Object} deviceInfo - Device information and capabilities
   */
  socket.on('join', ({ session, deviceInfo }) => {
    socket.join(session);  // Join the Socket.IO room for this session
    
    // Initialize session if it doesn't exist
    if (!sessions[session]) {
      sessions[session] = { devices: [] };
    }
    
    // Check if device already exists in session to prevent duplicates
    const existingDeviceIndex = sessions[session].devices.findIndex(device => device.id === socket.id);
    
    // Create comprehensive device object with all relevant information
    const device = {
      id: socket.id,                                          // Unique socket identifier
      type: deviceInfo?.type || 'unknown',                   // Device role (sender/receiver)
      deviceType: deviceInfo?.deviceType || 'unknown',       // Device category (mobile/desktop/tablet)
      deviceName: deviceInfo?.deviceName || 'Unknown Device', // Human-readable device name
      deviceIcon: deviceInfo?.deviceIcon || '💻',            // Icon for UI display
      osName: deviceInfo?.osName || 'Unknown OS',            // Operating system
      userAgent: deviceInfo?.userAgent || 'unknown',         // Browser user agent
      screenResolution: deviceInfo?.screenResolution || 'unknown', // Display resolution
      language: deviceInfo?.language || 'unknown',           // Browser language
      timezone: deviceInfo?.timezone || 'unknown',           // User timezone
      timestamp: deviceInfo?.timestamp || new Date().toISOString() // Connection time
    };
    
    if (existingDeviceIndex >= 0) {
      // Update existing device info (in case of reconnection)
      sessions[session].devices[existingDeviceIndex] = device;
      console.log(`Client ${socket.id} (${device.type}) updated in session ${session}`);
    } else {
      // Add new device to session
      sessions[session].devices.push(device);
      console.log(`Client ${socket.id} (${device.type}) joined session ${session}`);
      
      // Notify all OTHER devices in session about new device (don't send to self)
      socket.to(session).emit('device-joined', { 
        device, 
        totalDevices: sessions[session].devices.length 
      });
    }
    
    // Send current devices list to the connecting device
    socket.emit('session-info', { 
      devices: sessions[session].devices,
      totalDevices: sessions[session].devices.length 
    });
  });

  // ==========================================================================
  // WEBRTC SIGNALING EVENTS
  // ==========================================================================

  /**
   * Handle WebRTC offer from sender to receiver
   * 
   * The offer contains the sender's session description (SDP) which includes
   * information about media capabilities, codecs, and connection details.
   * This is the first step in WebRTC connection establishment.
   */
  socket.on('offer', ({ session, offer }) => {
    console.log(`Offer from ${socket.id} for session ${session}`);
    socket.to(session).emit('offer', { offer });
  });

  /**
   * Handle WebRTC answer from receiver to sender
   * 
   * The answer is the receiver's response to the offer, completing the
   * initial handshake for WebRTC connection establishment.
   */
  socket.on('answer', ({ session, answer }) => {
    console.log(`Answer from ${socket.id} for session ${session}`);
    socket.to(session).emit('answer', { answer });
  });

  /**
   * Handle ICE (Interactive Connectivity Establishment) candidates
   * 
   * ICE candidates are network endpoints that devices can use to connect.
   * Multiple candidates may be exchanged to find the best connection path
   * through NATs and firewalls.
   */
  socket.on('candidate', ({ session, candidate }) => {
    console.log(`ICE candidate from ${socket.id} for session ${session}`);
    socket.to(session).emit('candidate', { candidate });
  });

  // ==========================================================================
  // FILE TRANSFER COORDINATION EVENTS
  // ==========================================================================

  /**
   * Handle transfer start notification
   * 
   * When the sender begins a file transfer, this event notifies all receivers
   * in the session about the incoming file and its details.
   */
  socket.on('transfer-start', ({ session, fileName, fileSize }) => {
    console.log(`Transfer starting in session ${session}: ${fileName} (${fileSize} bytes)`);
    socket.to(session).emit('transfer-start', { fileName, fileSize });
  });

  /**
   * Handle transfer progress updates
   * 
   * Relays progress updates from sender to all receivers in the session.
   * This enables real-time progress bars and status updates.
   */
  socket.on('transfer-progress', ({ session, progress }) => {
    socket.to(session).emit('transfer-progress', { progress });
  });

  /**
   * Handle transfer completion notification
   * 
   * Notifies all devices in the session that the file transfer has completed.
   */
  socket.on('transfer-complete', ({ session }) => {
    console.log(`Transfer completed in session ${session}`);
    socket.to(session).emit('transfer-complete');
  });

  // ==========================================================================
  // SESSION VERIFICATION
  // ==========================================================================

  /**
   * Handle session verification requests
   * 
   * Allows devices to check if a session exists before attempting to join.
   * This prevents users from trying to join non-existent sessions.
   */
  socket.on('verify-session', ({ sessionId }) => {
    const exists = sessions[sessionId] && sessions[sessionId].devices.length > 0;
    socket.emit('session-verified', { exists, sessionId });
  });

  // ==========================================================================
  // CONNECTION CLEANUP
  // ==========================================================================

  /**
   * Handle client disconnection
   * 
   * When a device disconnects, this handler:
   * 1. Removes the device from all sessions
   * 2. Cleans up empty sessions
   * 3. Notifies remaining devices about the disconnection
   */
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Clean up sessions - remove this device from all sessions
    for (const session in sessions) {
      if (sessions[session].devices) {
        // Remove the disconnected device
        sessions[session].devices = sessions[session].devices.filter(device => device.id !== socket.id);
        
        if (sessions[session].devices.length === 0) {
          // Delete empty sessions to prevent memory leaks
          delete sessions[session];
          console.log(`Empty session ${session} deleted`);
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

// ============================================================================
// SERVER STARTUP & CONFIGURATION
// ============================================================================

/**
 * Start the HTTP server and begin listening for connections
 * 
 * The server binds to all network interfaces (0.0.0.0) to accept connections
 * from any device on the network, which is essential for the WiFi file sharing
 * functionality where devices need to connect across the local network.
 */
server.listen(PORT, '0.0.0.0', () => {
  // Determine the host address for logging
  const host = NODE_ENV === 'production' ? '0.0.0.0' : '10.0.0.15';
  
  // Log server startup information
  console.log(`🚀 Server running in ${NODE_ENV} mode`);
  console.log(`📡 Signaling server: http://${host}:${PORT}`);
  
  if (NODE_ENV === 'production') {
    console.log(`🌐 Web app available at: http://${host}:${PORT}`);
    console.log(`💡 Note: Client is served from GitHub Pages in production`);
  } else {
    console.log(`💻 Development mode: Use local IP address for cross-device testing`);
    console.log(`🔗 Update client config.js with this server URL if needed`);
  }
  
  console.log(`📊 Session storage: In-memory (resets on server restart)`);
  console.log(`🔒 CORS enabled for configured origins`);
});