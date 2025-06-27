# 📤 P2P File Sharing App

A modern, secure peer-to-peer file sharing application built with React and Socket.IO that allows you to share files directly between devices on your local network.

## ✨ Features

- 🔐 **Secure P2P Transfer**: Direct device-to-device file transfer using WebRTC
- 📱 **Cross-Platform**: Works on desktop and mobile devices
- 🎯 **QR Code Sharing**: Easy connection via QR code scanning
- 📊 **Real-time Progress**: Live transfer progress tracking
- 🌐 **Local Network**: No internet required, works on local networks
- 🎨 **Modern UI**: Beautiful, responsive interface with Tailwind CSS

## 🚀 Live Demo

- **Client**: [Coming Soon - Deploy to GitHub Pages]
- **Server**: [Coming Soon - Deploy to Render.com]

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS
- **Backend**: Node.js, Express, Socket.IO
- **P2P**: WebRTC for direct file transfer
- **Deployment**: GitHub Pages (client) + Render.com (server)

## 📁 Project Structure

```
file-sharing/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sender.jsx     # File sending component
│   │   │   └── Receiver.jsx   # File receiving component
│   │   ├── App.jsx
│   │   ├── config.js          # Server configuration
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── server/                 # Node.js backend
│   ├── index.js              # Socket.IO server
│   ├── package.json
│   └── Procfile             # Heroku deployment
├── .github/workflows/       # GitHub Actions
└── DEPLOYMENT_GUIDE.md     # Deployment instructions
```

## 🏃‍♂️ Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/file-sharing.git
   cd file-sharing
   ```

2. **Install dependencies**:
   ```bash
   # Install root dependencies
   npm run install:all
   
   # Or install manually
   npm install
   cd client && npm install
   cd ../server && npm install
   ```

3. **Start development servers**:
   ```bash
   # Start both client and server
   npm run dev
   
   # Or start individually
   npm run server:dev  # Server on http://localhost:4000
   npm run client:dev  # Client on http://localhost:5173
   ```

4. **Open your browser**:
   - Sender: `http://localhost:5173`
   - Receiver: `http://localhost:5173/receive/SESSION_ID`

## 🌐 Deployment

Follow the comprehensive [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for step-by-step deployment instructions.

### Quick Deployment Summary:

1. **Deploy Server** (Free on Render.com):
   - Connect GitHub repo to Render
   - Set root directory to `server`
   - Deploy with `npm start`

2. **Update Client Config**:
   - Add your server URL to `client/src/config.js`
   - Update repository name in `client/vite.config.js`

3. **Deploy Client** (Free on GitHub Pages):
   ```bash
   cd client
   npm run deploy
   ```

## 🎯 How It Works

1. **Create Session**: Sender creates a unique session ID
2. **Share QR Code**: QR code contains receiver URL with session ID
3. **Connect Devices**: Receiver scans QR code or enters session ID
4. **WebRTC Setup**: Direct P2P connection established via signaling server
5. **File Transfer**: Files transferred directly between devices

## 🔧 Configuration

### Client Configuration (`client/src/config.js`)

```javascript
const config = {
  SOCKET_URL: import.meta.env.PROD 
    ? 'https://your-server-url.onrender.com' // Your deployed server
    : 'http://localhost:4000'                // Local development
};
```

### Server Configuration (`server/index.js`)

- **Port**: Uses `process.env.PORT` or defaults to 4000
- **CORS**: Configured for GitHub Pages and localhost
- **WebRTC**: STUN servers for NAT traversal

## 📱 Usage

### Sending Files

1. Open the app and click "Create Secure Session"
2. Select a file to send
3. Share the QR code with the receiving device
4. Click "Send File" once receiver connects
5. Monitor transfer progress

### Receiving Files

1. Scan QR code or visit the receiver URL
2. Wait for sender to initiate transfer
3. File will download automatically
4. Check download folder for received file

## 🔒 Security Features

- **Session-based**: Unique session IDs for each transfer
- **Local Network**: Transfers don't leave your network
- **No File Storage**: Files are transferred directly, not stored on server
- **Temporary Sessions**: Sessions expire after use

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -m 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Troubleshooting

### Common Issues

- **Connection fails**: Check if both devices are on the same network
- **CORS errors**: Verify server URL in client config
- **Transfer stalls**: Try refreshing and creating a new session
- **QR code not working**: Ensure receiver device can access the URL

### Getting Help

- Check the [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for deployment issues
- Open an issue for bugs or feature requests
- Make sure your server is running and accessible

## 🎉 Acknowledgments

- Built with ❤️ using React and Socket.IO
- Icons and design inspiration from modern file sharing apps
- WebRTC implementation based on MDN documentation

---

**Happy file sharing! 📤**
