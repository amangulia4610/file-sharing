# 📤 The File Share - P2P File Sharing App

A modern, secure peer-to-peer file sharing application built with React and Socket.IO that allows you to share files directly between devices on your local WiFi network. This project features comprehensive code documentation, glassmorphism design, and enterprise-ready architecture.

## ✨ Features

- 🔐 **Secure P2P Transfer**: Direct device-to-device file transfer using WebRTC
- 📱 **Cross-Platform**: Works seamlessly on desktop and mobile devices
- 🎯 **QR Code Sharing**: Easy connection via QR code scanning
- 📊 **Real-time Progress**: Live transfer progress tracking with speed calculations
- 🌐 **Local Network**: No internet required, works entirely on local WiFi networks
- 🎨 **Modern UI**: Beautiful, responsive glassmorphism interface
- 📚 **Comprehensive Documentation**: Extensively commented codebase for easy maintenance
- 🔄 **Session Management**: Robust session creation and device connection handling
- 📱 **Mobile Optimized**: Touch-friendly interface with responsive design

## 🏗️ Architecture Overview

### Frontend (React + Vite)
- **Modern React**: Uses React 19 with hooks for state management
- **Component Architecture**: Modular components (Sender, Receiver, App)
- **Real-time Communication**: Socket.IO client for signaling
- **WebRTC Integration**: Peer-to-peer data channels for file transfer
- **Responsive Design**: Mobile-first approach with glassmorphism UI

### Backend (Node.js + Express)
- **Signaling Server**: Coordinates WebRTC connections between devices
- **Session Management**: In-memory session storage with device tracking
- **Socket.IO Integration**: Real-time bidirectional communication
- **CORS Configuration**: Secure cross-origin request handling
- **Environment Support**: Development and production configurations

### P2P File Transfer
- **WebRTC Data Channels**: Direct browser-to-browser file transfer
- **Chunked Transfer**: Reliable large file handling with 16KB chunks
- **Progress Tracking**: Real-time progress updates and speed calculations
- **Error Handling**: Robust connection state management and error recovery

## 📚 Code Documentation

This project features **comprehensive code documentation** throughout all files:

### 📋 Documentation Standards
- **File Headers**: Each file includes detailed purpose and architecture explanations
- **Function Documentation**: JSDoc-style comments for all major functions
- **Section Comments**: Clear separation of code sections with descriptive headers
- **Inline Comments**: Detailed explanations of complex logic and important steps
- **State Management**: Documented state variables and their purposes
- **Event Handlers**: Explanation of all Socket.IO and WebRTC event handling

### 🗂️ Documented Files
- **`client/src/App.jsx`**: Main application component with routing
- **`client/src/config.js`**: Environment configuration with setup instructions
- **`client/src/components/Sender.jsx`**: Complete sender workflow with detailed comments
- **`client/src/components/Receiver.jsx`**: File receiving logic with progress tracking
- **`client/src/components/style.css`**: CSS with glassmorphism design documentation
- **`server/index.js`**: Socket.IO server with comprehensive event handling docs

### 💡 Key Documentation Features
- **Architecture Explanations**: High-level system design and component interactions
- **Workflow Documentation**: Step-by-step process flows for file sharing
- **Error Handling**: Documented error scenarios and recovery mechanisms
- **Performance Optimizations**: Explained memoization and state management strategies
- **Security Considerations**: CORS, session management, and WebRTC security notes

## 🚀 Live Demo

- **Client**: [Coming Soon - Deploy to GitHub Pages]
- **Server**: [Coming Soon - Deploy to Render.com]

## 🛠️ Tech Stack

### Frontend Technologies
- **React 19**: Latest React with hooks and modern patterns
- **Vite**: Fast build tool and development server
- **Socket.IO Client**: Real-time communication with the server
- **QRCode.react**: QR code generation for mobile device connections
- **React Router**: Client-side routing for sender/receiver modes

### Backend Technologies
- **Node.js**: JavaScript runtime for server-side logic
- **Express.js**: Minimal web framework for HTTP endpoints
- **Socket.IO**: Real-time bidirectional event-based communication
- **CORS**: Cross-Origin Resource Sharing middleware
- **dotenv**: Environment variable management

### Core Technologies
- **WebRTC**: Browser-to-browser real-time communication
- **Data Channels**: Direct peer-to-peer file transfer
- **ICE/STUN**: NAT traversal for connection establishment

## 💻 Development Approach & Code Quality

### 📝 Extensive Code Documentation
This project follows enterprise-level documentation standards:

- **Header Comments**: Every file starts with comprehensive documentation explaining purpose, features, and architecture
- **Function Documentation**: JSDoc-style comments for all major functions with parameters and return values
- **Section Organization**: Code is organized into logical sections with clear separators
- **Inline Explanations**: Complex logic is explained step-by-step with detailed comments
- **State Documentation**: All React state variables are documented with their purposes
- **Event Handler Docs**: Socket.IO and WebRTC events are thoroughly documented

### 🏗️ Code Organization Principles
- **Modular Architecture**: Separation of concerns between components
- **Single Responsibility**: Each component has a clear, focused purpose
- **State Management**: Organized state with clear data flow
- **Error Handling**: Comprehensive error scenarios and recovery
- **Performance**: Memoized values and optimized re-renders

### 🎨 UI/UX Design
- **Glassmorphism**: Modern glass-like visual effects
- **Responsive Design**: Mobile-first approach with desktop optimization
- **Consistent Theming**: Unified color scheme across desktop and mobile
- **Accessibility**: Proper contrast ratios and readable typography
- **Visual Feedback**: Real-time progress indicators and status updates

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
│   └── README.md            # Render deployment guide
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
