# P2P File Sharing App

A peer-to-peer file sharing application built with React, Node.js, Socket.IO, and WebRTC. Share files directly between devices on the same network without uploading to any server.

## Features

- 🔄 **Peer-to-Peer Transfer**: Direct file sharing using WebRTC
- 📱 **Cross-Platform**: Works on desktop and mobile devices
- 🔒 **Network Local**: Files stay within your local network
- 📊 **Real-time Progress**: Live transfer progress tracking
- 🔗 **QR Code Sharing**: Easy session sharing via QR codes
- 🌐 **Network Access**: Accessible across local network devices

## Quick Start

### Development Mode

1. **Install dependencies:**
   ```bash
   npm run install:all
   ```

2. **Start development servers:**
   ```bash
   npm run dev
   ```
   This starts both the client (React) and server (Node.js) concurrently.

3. **Access the application:**
   - Local: `http://localhost:5173`
   - Network: `http://[YOUR-IP]:5173`

### Production Mode

1. **Install dependencies:**
   ```bash
   npm run install:all
   ```

2. **Build and start production:**
   ```bash
   npm run production
   ```

3. **Access the application:**
   - `http://[YOUR-IP]:4000`

## Production Deployment

### Method 1: Direct Node.js

1. **Set environment variables:**
   ```bash
   export NODE_ENV=production
   export PORT=4000
   ```

2. **Build and start:**
   ```bash
   npm run build
   npm start
   ```

### Method 2: Using Docker

1. **Build Docker image:**
   ```bash
   docker build -t p2p-file-share .
   ```

2. **Run container:**
   ```bash
   docker run -p 4000:4000 -e NODE_ENV=production p2p-file-share
   ```

### Method 3: Using PM2 (Recommended for production)

1. **Install PM2:**
   ```bash
   npm install -g pm2
   ```

2. **Build the application:**
   ```bash
   npm run build
   ```

3. **Start with PM2:**
   ```bash
   pm2 start server/index.js --name "file-share-app" --env production
   ```

## Environment Configuration

Create a `.env` file in the root directory:

```env
NODE_ENV=production  # or development
PORT=4000           # Server port
```

## Architecture

- **Frontend**: React with Vite bundler
- **Backend**: Express.js with Socket.IO for signaling
- **File Transfer**: WebRTC DataChannel for peer-to-peer transfer
- **Session Management**: Socket.IO rooms for device coordination

## How It Works

1. **Sender** creates a session and gets a QR code
2. **Receiver** scans QR code or enters session URL
3. **Socket.IO** facilitates WebRTC connection setup
4. **Files transfer directly** between devices via WebRTC
5. **No files** are stored on the server

## Network Requirements

- Both devices must be on the same local network
- Firewall should allow connections on the configured port (default: 4000)
- For external access, configure router port forwarding

## Available Scripts

- `npm run dev` - Start development servers
- `npm run build` - Build React app for production
- `npm start` - Start production server
- `npm run production` - Build and start production
- `npm run install:all` - Install all dependencies
- `npm run server:dev` - Start server with nodemon
- `npm run client:dev` - Start client development server

## Browser Support

- Chrome/Chromium (recommended)
- Firefox
- Safari (iOS/macOS)
- Edge

Note: WebRTC support required for file transfer functionality.

## Troubleshooting

### Connection Issues
- Ensure devices are on the same network
- Check firewall settings
- Verify the correct IP address is being used

### File Transfer Issues
- Large files may take time to establish connection
- Check browser console for WebRTC errors
- Ensure stable network connection

### Mobile Access
- Use the network IP address (not localhost)
- Ensure mobile device is on the same WiFi network
- Some mobile browsers may have WebRTC limitations

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use and modify as needed.
