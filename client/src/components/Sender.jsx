// File: client/src/components/Sender.jsx
import { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import io from 'socket.io-client';
import config from '../config.js';
import './style.css';

const socket = io(config.SOCKET_URL);

export default function Sender() {
  const fileInputRef = useRef();
  const [sessionId, setSessionId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [peerConnection, setPeerConnection] = useState(null);
  const [connectedDevices, setConnectedDevices] = useState([]);
  const [transferProgress, setTransferProgress] = useState(0);
  const [transferSpeed, setTransferSpeed] = useState(0);
  const [currentFile, setCurrentFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [sessionIdCopied, setSessionIdCopied] = useState(false);
  
  // Tab system states
  const [activeTab, setActiveTab] = useState('send'); // 'send' or 'receive'
  
  // Receiver mode states (simplified for input only)
  const [receiverSessionId, setReceiverSessionId] = useState('');

  const getDeviceInfo = () => {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    
    let deviceType = 'desktop';
    let deviceIcon = '💻';
    let osName = 'Unknown OS';
    let deviceName = 'Unknown Device';
    
    if (/iPhone/i.test(userAgent)) {
      deviceType = 'mobile';
      deviceIcon = '📱';
      osName = 'iOS';
      deviceName = 'iPhone';
    } else if (/iPad/i.test(userAgent)) {
      deviceType = 'tablet';
      deviceIcon = '📱';
      osName = 'iPadOS';
      deviceName = 'iPad';
    } else if (/Android/i.test(userAgent) && /Mobile/i.test(userAgent)) {
      deviceType = 'mobile';
      deviceIcon = '📱';
      osName = 'Android';
      deviceName = 'Android Phone';
    } else if (/Android/i.test(userAgent)) {
      deviceType = 'tablet';
      deviceIcon = '📱';
      osName = 'Android';
      deviceName = 'Android Tablet';
    } else if (/Mac/i.test(userAgent)) {
      osName = 'macOS';
      deviceName = 'Mac';
    } else if (/Windows/i.test(userAgent)) {
      osName = 'Windows';
      deviceName = 'Windows PC';
    } else if (/Linux/i.test(userAgent)) {
      osName = 'Linux';
      deviceName = 'Linux PC';
    }
    
    return {
      type: 'sender',
      userAgent,
      platform,
      deviceType,
      deviceIcon,
      deviceName,
      osName,
      screenResolution: `${screen.width}x${screen.height}`,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timestamp: new Date().toISOString()
    };
  };

  // Drag and Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setCurrentFile(files[0]);
    }
  };

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      setCurrentFile(files[0]);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const copyLinkToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(qrCode);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000); // Reset after 2 seconds
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = qrCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const copySessionIdToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(sessionId);
      setSessionIdCopied(true);
      setTimeout(() => setSessionIdCopied(false), 2000); // Reset after 2 seconds
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = sessionId;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setSessionIdCopied(true);
      setTimeout(() => setSessionIdCopied(false), 2000);
    }
  };

  const createSession = () => {
    const session = Math.random().toString(36).substring(2, 8);
    setSessionId(session);
    // Build the QR URL using current location - ensure proper format for custom domain
    const currentUrl = new URL(window.location.href);
    const qrUrl = `${currentUrl.origin}/receive/${session}`;
    console.log('Debug QR Code generation:', {
      currentHref: window.location.href,
      origin: currentUrl.origin,
      pathname: currentUrl.pathname,
      qrUrl,
      session
    });
    setQrCode(qrUrl);
    socket.emit('join', { session, deviceInfo: getDeviceInfo() });

    socket.on('device-joined', ({ device }) => {
      console.log('Device joined:', device);
      setConnectedDevices(prev => {
        // Prevent duplicate devices
        const exists = prev.some(d => d.id === device.id);
        if (exists) return prev;
        return [...prev, device];
      });
    });
    socket.on('device-left', ({ socketId }) => {
      console.log('Device left:', socketId);
      setConnectedDevices(prev => prev.filter(device => device.id !== socketId));
    });
    socket.on('session-info', ({ devices }) => {
      console.log('Session info received:', devices);
      // Filter out sender devices and duplicates
      const uniqueDevices = devices.filter((device, index, self) => 
        device.type !== 'sender' && 
        self.findIndex(d => d.id === device.id) === index
      );
      setConnectedDevices(uniqueDevices);
    });
  };

  const startSending = async () => {
    if (!currentFile) {
      alert('Please select a file first');
      return;
    }

    if (connectedDevices.length === 0) {
      alert('No devices connected. Please wait for a device to join your session.');
      return;
    }

    const file = currentFile;
    const currentSession = sessionId;
    setIsTransferring(true);
    setTransferProgress(0);

    socket.emit('transfer-start', { session: currentSession, fileName: file.name, fileSize: file.size });

    const pc = new RTCPeerConnection({ 
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });
    setPeerConnection(pc);
    const dc = pc.createDataChannel('file', {
      ordered: true
    });

    // Only join once - remove the duplicate join call

    pc.onicecandidate = (event) => {
      if (event.candidate) socket.emit('candidate', { session: currentSession, candidate: event.candidate });
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('offer', { session: currentSession, offer });

    socket.on('answer', async ({ answer }) => {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on('candidate', async ({ candidate }) => {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    });

    dc.onopen = () => {
      // Simple and reliable chunk size
      const chunkSize = 16384; // 16KB chunks - reliable and tested
      let offset = 0;
      const reader = new FileReader();
      let startTime = null;
      let lastProgressTime = null;
      let lastOffset = 0;

      reader.onload = (e) => {
        const arrayBuffer = e.target.result;
        const totalSize = arrayBuffer.byteLength;
        startTime = Date.now();
        lastProgressTime = startTime;

        // Send filename first
        dc.send(JSON.stringify({ type: 'filename', name: file.name }));

        const sendChunk = () => {
          if (offset >= totalSize) {
            // Transfer complete
            dc.send('EOF');
            setTransferProgress(100);
            setTransferSpeed(0);
            socket.emit('transfer-complete', { session: currentSession });
            setIsTransferring(false);
            return;
          }

          // Send one chunk at a time
          const chunk = arrayBuffer.slice(offset, offset + chunkSize);
          dc.send(chunk);
          offset += chunkSize;
          
          // Update progress
          const progress = Math.round((offset / totalSize) * 100);
          setTransferProgress(progress);
          socket.emit('transfer-progress', { session: currentSession, progress });
          
          // Calculate speed every 500ms
          const currentTime = Date.now();
          if (currentTime - lastProgressTime >= 500) {
            const timeDiff = (currentTime - lastProgressTime) / 1000;
            const dataDiff = offset - lastOffset;
            const speed = dataDiff / timeDiff;
            setTransferSpeed(speed);
            lastProgressTime = currentTime;
            lastOffset = offset;
          }

          // Continue with next chunk after small delay
          setTimeout(sendChunk, 10);
        };
        
        sendChunk();
      };

      reader.readAsArrayBuffer(file);
    };

    dc.onerror = (error) => {
      console.error('Data channel error:', error);
      setIsTransferring(false);
      setTransferSpeed(0);
    };

    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        setIsTransferring(false);
        setTransferSpeed(0);
      }
    };
  };

  const resetSession = () => {
    setSessionId('');
    setQrCode('');
    setIsTransferring(false);
    setConnectedDevices([]);
    setTransferProgress(0);
    setTransferSpeed(0);
    setCurrentFile(null);
    setLinkCopied(false);
    setSessionIdCopied(false);
    if (peerConnection) peerConnection.close();
    setPeerConnection(null);
    socket.off('device-joined');
    socket.off('device-left');
    socket.off('session-info');
  };

  // Function to set custom device name
  const setCustomDeviceName = () => {
    const currentName = localStorage.getItem('deviceCustomName') || '';
    const newName = prompt('Enter your name to personalize your device (e.g., "Aman" will show as "Aman\'s iPhone"):', currentName);
    
    if (newName !== null) { // User didn't cancel
      if (newName.trim()) {
        localStorage.setItem('deviceCustomName', newName.trim());
      } else {
        localStorage.removeItem('deviceCustomName');
      }
      
      // Refresh the session if one exists to update device info
      if (sessionId) {
        createSession();
      }
    }
  };

  // Tab switching
  const switchTab = (tab) => {
    setActiveTab(tab);
    if (tab === 'send') {
      // Reset receiver states when switching to send
      setReceiverSessionId('');
    } else {
      // Reset sender states when switching to receive
      resetSession();
    }
  };

  // Receiver functionality - redirect to proper receiver page
  const joinReceiveSession = () => {
    if (!receiverSessionId.trim()) {
      alert('Please enter a session ID');
      return;
    }

    // Convert session ID to lowercase before verification and joining
    const normalizedSessionId = receiverSessionId.trim().toLowerCase();

    // Verify session exists before redirecting
    verifySession(normalizedSessionId, (exists) => {
      if (exists) {
        // Redirect to the proper receiver URL
        const currentUrl = new URL(window.location.href);
        const receiverUrl = `${currentUrl.origin}/receive/${normalizedSessionId}`;
        window.location.href = receiverUrl;
      } else {
        alert('Session not found. Please check the session ID and make sure the sender has created the session.');
      }
    });
  };

  const resetReceiveMode = () => {
    setReceiverSessionId('');
  };

  // Function to verify session exists
  const verifySession = (sessionId, callback) => {
    socket.emit('verify-session', { sessionId });
    
    const onSessionVerified = ({ exists, sessionId: verifiedSessionId }) => {
      if (verifiedSessionId === sessionId) {
        socket.off('session-verified', onSessionVerified);
        callback(exists);
      }
    };
    
    socket.on('session-verified', onSessionVerified);
    
    // Timeout after 5 seconds
    setTimeout(() => {
      socket.off('session-verified', onSessionVerified);
      callback(false);
    }, 5000);
  };

  return (
    <div className={`sender-container ${sessionId ? 'session-active' : ''}`}>
      <div className={`sender-box ${sessionId ? 'session-active' : ''}`}>
        <h1 className="sender-title">📁 The File Share</h1>
        
        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button 
            className={`tab-btn ${activeTab === 'send' ? 'active' : ''}`}
            onClick={() => switchTab('send')}
          >
            📤 Send File via WiFi
          </button>
          <button 
            className={`tab-btn ${activeTab === 'receive' ? 'active' : ''}`}
            onClick={() => switchTab('receive')}
          >
            📥 Receive File via WiFi
          </button>
        </div>

        {/* Send File Tab */}
        {activeTab === 'send' && (
          <>
            {!sessionId ? (
          <>
            <p className="sender-subtext">
              Share files instantly via WiFi using The File Share. Connect all devices to the same WiFi network for seamless file sharing.
            </p>
            
            <div className="instructions">
              <div className="instructions-title">
                🎯 How to Send Files via WiFi
              </div>
              <ul className="instructions-list">
                <li>
                  <span className="step-number">1</span>
                  Ensure both devices are connected to the same WiFi network
                </li>
                <li>
                  <span className="step-number">2</span>
                  Click "Create Session" to start a secure connection
                </li>
                <li>
                  <span className="step-number">3</span>
                  Select or drag & drop your file into the upload area
                </li>
                <li>
                  <span className="step-number">4</span>
                  Share the QR code or link with the receiving device
                </li>
                <li>
                  <span className="step-number">5</span>
                  Wait for the receiver to connect, then hit "Send File"
                </li>
                <li>
                  <span className="step-number">6</span>
                  Files transfer directly via WiFi - no cloud storage needed!
                </li>
              </ul>
            </div>
            
            <button onClick={createSession} className="btn btn-primary">
              🔐 Create Secure Session
            </button>
          </>
        ) : (
          <>
            {/* Two-column responsive layout */}
            <div className="sender-content-layout">
              
              {/* Left Section - File Upload */}
              <div className="sender-left-section">
                {/* File Selection Area */}
                <div 
                  className={`file-drop-zone ${isDragOver ? 'drag-over' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={openFileDialog}
                >
                  <div className="file-drop-icon">
                    {currentFile ? '📄' : '📁'}
                  </div>
                  <div className="file-drop-text">
                    {currentFile ? 'File Selected!' : 'Drop your file here'}
                  </div>
                  <div className="file-drop-subtext">
                    {currentFile ? 'Click to change file' : 'or click to browse files'}
                  </div>
                </div>

                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="file-input"
                  onChange={handleFileSelect}
                />

                {/* Selected File Info */}
                {currentFile && (
                  <div className="selected-file">
                    <div className="file-info">
                      <div className="file-icon">📄</div>
                      <div className="file-details">
                        <h4>{currentFile.name}</h4>
                        <p>Size: {formatFileSize(currentFile.size)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="btn-group">
                  <button 
                    onClick={startSending} 
                    disabled={isTransferring || !currentFile} 
                    className={`btn ${isTransferring || !currentFile ? 'btn-disabled' : 'btn-success'}`}
                  >
                    {isTransferring ? (
                      <>
                        <span className="loading"></span>
                        Sending via WiFi...
                      </>
                    ) : (
                      '🚀 Send File via WiFi'
                    )}
                  </button>
                  <button onClick={resetSession} className="btn btn-danger">
                    🔁 Reset Session
                  </button>
                </div>

                {/* Transfer Progress */}
                {isTransferring && currentFile && (
                  <div className="progress-box">
                    <div className="progress-title">
                      📁 Sending via WiFi: {currentFile.name}
                    </div>
                    <div className="progress-sub">
                      Size: {formatFileSize(currentFile.size)} • {transferProgress}% complete
                      {transferSpeed > 0 && ` • ${formatFileSize(transferSpeed)}/s`}
                    </div>
                    <div className="progress-bar">
                      <div className="progress-inner" style={{ width: `${transferProgress}%` }}></div>
                    </div>
                    <div className="progress-text">{transferProgress}%</div>
                  </div>
                )}
              </div>

              {/* Right Section - Connection Info */}
              <div className="sender-right-section">
                {/* Connected Devices */}
                <div className="info-box">
                  <div className="info-title">
                    🌐 WiFi Connected Devices ({connectedDevices.length})
                  </div>
                  {connectedDevices.length === 0 ? (
                    <p className="info-text">
                      Waiting for devices to connect via WiFi... Share the QR code below!
                    </p>
                  ) : (
                    <div className="connected-devices-list">
                      {connectedDevices.map((device, i) => (
                        <div key={device.id} className="device-card">
                          <div className="device-header">
                            <span className="device-icon">
                              {device.deviceIcon || (device.deviceType === 'mobile' ? '📱' : '💻')}
                            </span>
                            <div className="device-basic-info">
                              <h4 className="device-title">
                                {device.displayName || device.deviceName || 
                                 `${device.deviceType === 'mobile' ? 'Mobile' : 
                                   device.deviceType === 'tablet' ? 'Tablet' : 'Desktop'} Device #${i + 1}`}
                              </h4>
                              <span className="device-status">🟢 Connected via WiFi</span>
                            </div>
                          </div>
                          
                          <div className="device-details">
                            {device.osName && (
                              <div className="device-detail-item">
                                <span className="detail-label">Operating System:</span>
                                <span className="detail-value">{device.osName}</span>
                              </div>
                            )}
                            
                            {device.browserName && (
                              <div className="device-detail-item">
                                <span className="detail-label">Browser:</span>
                                <span className="detail-value">
                                  {device.browserName} {device.browserVersion && `v${device.browserVersion}`}
                                </span>
                              </div>
                            )}
                            
                            {device.screenResolution && (
                              <div className="device-detail-item">
                                <span className="detail-label">Screen:</span>
                                <span className="detail-value">{device.screenResolution}</span>
                              </div>
                            )}
                            
                            {device.language && (
                              <div className="device-detail-item">
                                <span className="detail-label">Language:</span>
                                <span className="detail-value">{device.language}</span>
                              </div>
                            )}
                            
                            {device.timezone && (
                              <div className="device-detail-item">
                                <span className="detail-label">Timezone:</span>
                                <span className="detail-value">{device.timezone}</span>
                              </div>
                            )}
                            
                            {device.timestamp && (
                              <div className="device-detail-item">
                                <span className="detail-label">Connected:</span>
                                <span className="detail-value">
                                  {new Date(device.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* QR Code and Connection Info */}
                {qrCode && (
                  <div className="qr-box">
                    <p className="qr-text">
                      📱 Scan this QR code on the receiving device (same WiFi network):
                    </p>
                    <div className="qr-image">
                      <QRCodeSVG value={qrCode} size={180} />
                    </div>
                    <div 
                      className={`qr-code ${linkCopied ? 'copied' : ''}`}
                      onClick={copyLinkToClipboard}
                      title="Click to copy link"
                    >
                      {qrCode}
                      {linkCopied && (
                        <span className="copy-feedback">
                          ✓ Copied!
                        </span>
                      )}
                    </div>
                    <p className="qr-session">
                      Session ID: <span 
                        className={`session-id-clickable ${sessionIdCopied ? 'copied' : ''}`}
                        onClick={copySessionIdToClipboard}
                        title="Click to copy session ID"
                      >
                        {sessionId}
                      </span>
                      {sessionIdCopied && (
                        <span className="copy-feedback session-copy-feedback">
                          ✓ Copied!
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>
              
            </div>
          </>
        )}
          </>
        )}

        {/* Receive File Tab */}
        {activeTab === 'receive' && (
          <>
            <p className="sender-subtext">
              Enter a session ID to connect and receive files from another device on the same WiFi network.
            </p>
            
            <div className="instructions">
              <div className="instructions-title">
                🎯 How to Receive Files via WiFi
              </div>
              <ul className="instructions-list">
                <li>
                  <span className="step-number">1</span>
                  Make sure you're connected to the same WiFi as the sender
                </li>
                <li>
                  <span className="step-number">2</span>
                  Get the session ID from the sender (QR code or shared link)
                </li>
                <li>
                  <span className="step-number">3</span>
                  Enter the 6-character session ID below
                </li>
                <li>
                  <span className="step-number">4</span>
                  Click "Join Session" to be redirected to the receiver page
                </li>
                <li>
                  <span className="step-number">5</span>
                  Wait for the sender to start the WiFi file transfer
                </li>
                <li>
                  <span className="step-number">6</span>
                  Your file will download automatically when complete
                </li>
              </ul>
            </div>

            <div className="receiver-input-section">
              <div className="input-group">
                <label htmlFor="sessionInput" className="input-label">
                  📋 Session ID
                </label>
                <input
                  id="sessionInput"
                  type="text"
                  value={receiverSessionId}
                  onChange={(e) => setReceiverSessionId(e.target.value)}
                  placeholder="Enter 6-character session ID"
                  className="session-input"
                  maxLength={6}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && receiverSessionId.trim().toLowerCase()) {
                      joinReceiveSession();
                    }
                  }}
                />
              </div>
              
              <div className="btn-group">
                <button 
                  onClick={joinReceiveSession}
                  disabled={!receiverSessionId.trim()}
                  className={`btn ${!receiverSessionId.trim() ? 'btn-disabled' : 'btn-primary'}`}
                >
                  🔗 Join WiFi Session
                </button>
                <button onClick={resetReceiveMode} className="btn btn-danger">
                  🔁 Clear
                </button>
              </div>
              
              <div className="receiver-hint">
                <p className="hint-text">
                  💡 <strong>WiFi Required:</strong> Both devices must be on the same WiFi network. You'll be redirected to a dedicated receiver page to track transfer progress.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
