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
  const [currentFile, setCurrentFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  
  // Tab system states
  const [activeTab, setActiveTab] = useState('send'); // 'send' or 'receive'
  
  // Receiver mode states
  const [receiverSessionId, setReceiverSessionId] = useState('');
  const [receiverStatus, setReceiverStatus] = useState('');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [receivedFile, setReceivedFile] = useState(null);
  const [isReceiving, setIsReceiving] = useState(false);

  const getDeviceInfo = () => ({
    type: 'sender',
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
  });

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
      setConnectedDevices(prev => [...prev, device]);
    });
    socket.on('device-left', ({ socketId }) => {
      setConnectedDevices(prev => prev.filter(device => device.id !== socketId));
    });
    socket.on('session-info', ({ devices }) => {
      setConnectedDevices(devices.filter(device => device.type !== 'sender'));
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

    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    setPeerConnection(pc);
    const dc = pc.createDataChannel('file');

    socket.emit('join', { session: currentSession });

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
      const chunkSize = 16384;
      let offset = 0;
      const reader = new FileReader();

      reader.onload = (e) => {
        const arrayBuffer = e.target.result;
        const totalSize = arrayBuffer.byteLength;

        dc.send(JSON.stringify({ type: 'filename', name: file.name }));

        const sendChunk = () => {
          if (offset < totalSize) {
            const chunk = arrayBuffer.slice(offset, offset + chunkSize);
            dc.send(chunk);
            offset += chunkSize;
            const progress = Math.round((offset / totalSize) * 100);
            setTransferProgress(progress);
            socket.emit('transfer-progress', { session: currentSession, progress });
            setTimeout(sendChunk, 10);
          } else {
            dc.send('EOF');
            setTransferProgress(100);
            socket.emit('transfer-complete', { session: currentSession });
            setIsTransferring(false);
          }
        };
        sendChunk();
      };

      reader.readAsArrayBuffer(file);
    };

    dc.onerror = () => setIsTransferring(false);
  };

  const resetSession = () => {
    setSessionId('');
    setQrCode('');
    setIsTransferring(false);
    setConnectedDevices([]);
    setTransferProgress(0);
    setCurrentFile(null);
    setLinkCopied(false);
    if (peerConnection) peerConnection.close();
    setPeerConnection(null);
    socket.off('device-joined');
    socket.off('device-left');
    socket.off('session-info');
  };

  // Tab switching
  const switchTab = (tab) => {
    setActiveTab(tab);
    if (tab === 'send') {
      // Reset receiver states when switching to send
      setReceiverSessionId('');
      setReceiverStatus('');
      setDownloadProgress(0);
      setReceivedFile(null);
      setIsReceiving(false);
    } else {
      // Reset sender states when switching to receive
      resetSession();
    }
  };

  // Receiver functionality
  const joinReceiveSession = () => {
    if (!receiverSessionId.trim()) {
      alert('Please enter a session ID');
      return;
    }

    setIsReceiving(true);
    setReceiverStatus('Connecting to session...');
    
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    let chunks = [];
    let totalSize = 0;
    let receivedSize = 0;
    let originalFileName = 'received_file';

    socket.emit('join', { session: receiverSessionId, deviceInfo: getDeviceInfo() });
    setReceiverStatus('Joined session, waiting for sender...');

    socket.on('transfer-start', ({ fileName, fileSize }) => {
      setReceivedFile({ fileName, fileSize });
      setReceiverStatus(`Receiving ${fileName}...`);
      totalSize = fileSize;
    });

    socket.on('transfer-progress', ({ progress }) => {
      setDownloadProgress(progress);
      setReceiverStatus(`Receiving... ${progress}%`);
    });

    socket.on('transfer-complete', () => {
      setReceiverStatus('Transfer complete! Processing file...');
      setTimeout(() => {
        const blob = new Blob(chunks);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = originalFileName;
        a.click();
        URL.revokeObjectURL(url);
        setReceiverStatus('File downloaded successfully!');
        setIsReceiving(false);
      }, 1000);
    });

    socket.on('offer', async ({ offer }) => {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('answer', { session: receiverSessionId, answer });
    });

    socket.on('candidate', async ({ candidate }) => {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('candidate', { session: receiverSessionId, candidate: event.candidate });
      }
    };

    pc.ondatachannel = (event) => {
      const dc = event.channel;
      dc.onmessage = (event) => {
        if (typeof event.data === 'string') {
          if (event.data === 'EOF') {
            setReceiverStatus('Transfer complete!');
            return;
          }
          try {
            const metadata = JSON.parse(event.data);
            if (metadata.type === 'filename') {
              originalFileName = metadata.name;
            }
          } catch (e) {
            // Not JSON, ignore
          }
        } else {
          chunks.push(event.data);
          receivedSize += event.data.byteLength;
          const progress = Math.round((receivedSize / totalSize) * 100);
          setDownloadProgress(progress);
        }
      };
    };
  };

  const resetReceiveMode = () => {
    setReceiverSessionId('');
    setReceiverStatus('');
    setDownloadProgress(0);
    setReceivedFile(null);
    setIsReceiving(false);
    if (peerConnection) peerConnection.close();
    setPeerConnection(null);
    socket.off('transfer-start');
    socket.off('transfer-progress');
    socket.off('transfer-complete');
    socket.off('offer');
    socket.off('candidate');
  };

  return (
    <div className="sender-container">
      <div className="sender-box">
        <h1 className="sender-title">� File Share Hub</h1>
        
        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button 
            className={`tab-btn ${activeTab === 'send' ? 'active' : ''}`}
            onClick={() => switchTab('send')}
          >
            �📤 Send File
          </button>
          <button 
            className={`tab-btn ${activeTab === 'receive' ? 'active' : ''}`}
            onClick={() => switchTab('receive')}
          >
            📥 Receive File
          </button>
        </div>

        {/* Send File Tab */}
        {activeTab === 'send' && (
          <>
            {!sessionId ? (
          <>
            <p className="sender-subtext">
              Share files instantly and securely across devices using peer-to-peer technology.
            </p>
            
            <div className="instructions">
              <div className="instructions-title">
                🎯 How to Use
              </div>
              <ul className="instructions-list">
                <li>
                  <span className="step-number">1</span>
                  Click "Create Session" to start a secure connection
                </li>
                <li>
                  <span className="step-number">2</span>
                  Select or drag & drop your file into the upload area
                </li>
                <li>
                  <span className="step-number">3</span>
                  Share the QR code or link with the receiving device
                </li>
                <li>
                  <span className="step-number">4</span>
                  Wait for the receiver to connect, then hit "Send File"
                </li>
                <li>
                  <span className="step-number">5</span>
                  Files transfer directly between devices - no cloud storage!
                </li>
              </ul>
            </div>
            
            <button onClick={createSession} className="btn btn-primary">
              🔐 Create Secure Session
            </button>
          </>
        ) : (
          <>
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
                    Sending...
                  </>
                ) : (
                  '🚀 Send File'
                )}
              </button>
              <button onClick={resetSession} className="btn btn-danger">
                🔁 Reset Session
              </button>
            </div>
          </>
        )}

        {/* Connected Devices */}
        {sessionId && (
          <div className="info-box">
            <div className="info-title">
              🌐 Connected Devices ({connectedDevices.length})
            </div>
            {connectedDevices.length === 0 ? (
              <p className="info-text">
                Waiting for devices to connect... Share the QR code below!
              </p>
            ) : (
              <ul className="info-list">
                {connectedDevices.map((device, i) => (
                  <li key={device.id}>
                    📱 {device.deviceType === 'mobile' ? 'Mobile' : 'Desktop'} Device #{i + 1}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Transfer Progress */}
        {isTransferring && currentFile && (
          <div className="progress-box">
            <div className="progress-title">
              📁 Sending: {currentFile.name}
            </div>
            <div className="progress-sub">
              Size: {formatFileSize(currentFile.size)} • {transferProgress}% complete
            </div>
            <div className="progress-bar">
              <div className="progress-inner" style={{ width: `${transferProgress}%` }}></div>
            </div>
            <div className="progress-text">{transferProgress}%</div>
          </div>
        )}

        {/* QR Code and Connection Info */}
        {qrCode && (
          <div className="qr-box">
            <p className="qr-text">
              📱 Scan this QR code on the receiving device:
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
              Session ID: <span>{sessionId}</span>
            </p>
          </div>
        )}
          </>
        )}

        {/* Receive File Tab */}
        {activeTab === 'receive' && (
          <>
            <p className="sender-subtext">
              Enter a session ID to connect and receive files from another device.
            </p>
            
            <div className="instructions">
              <div className="instructions-title">
                🎯 How to Receive Files
              </div>
              <ul className="instructions-list">
                <li>
                  <span className="step-number">1</span>
                  Get the session ID from the sender (QR code or shared link)
                </li>
                <li>
                  <span className="step-number">2</span>
                  Enter the 6-character session ID below
                </li>
                <li>
                  <span className="step-number">3</span>
                  Click "Join Session" to connect to the sender
                </li>
                <li>
                  <span className="step-number">4</span>
                  Wait for the sender to start the file transfer
                </li>
                <li>
                  <span className="step-number">5</span>
                  Your file will download automatically when complete
                </li>
              </ul>
            </div>

            {!isReceiving ? (
              <div className="receiver-input-section">
                <div className="input-group">
                  <label htmlFor="sessionInput" className="input-label">
                    📋 Session ID
                  </label>
                  <input
                    id="sessionInput"
                    type="text"
                    value={receiverSessionId}
                    onChange={(e) => setReceiverSessionId(e.target.value.toUpperCase())}
                    placeholder="Enter 6-character session ID"
                    className="session-input"
                    maxLength={6}
                  />
                </div>
                
                <div className="btn-group">
                  <button 
                    onClick={joinReceiveSession}
                    disabled={!receiverSessionId.trim()}
                    className={`btn ${!receiverSessionId.trim() ? 'btn-disabled' : 'btn-primary'}`}
                  >
                    🔗 Join Session
                  </button>
                  <button onClick={resetReceiveMode} className="btn btn-danger">
                    🔁 Clear
                  </button>
                </div>
              </div>
            ) : (
              <div className="receiver-status-section">
                <div className="receiver-info">
                  <div className="info-title">
                    📡 Connection Status
                  </div>
                  <p className="info-text">{receiverStatus}</p>
                  {receivedFile && (
                    <div className="file-info">
                      <div className="file-icon">📄</div>
                      <div className="file-details">
                        <h4>{receivedFile.fileName}</h4>
                        <p>Size: {formatFileSize(receivedFile.fileSize)}</p>
                      </div>
                    </div>
                  )}
                </div>

                {downloadProgress > 0 && (
                  <div className="progress-box">
                    <div className="progress-title">
                      📥 Receiving: {receivedFile?.fileName || 'File'}
                    </div>
                    <div className="progress-bar">
                      <div className="progress-inner" style={{ width: `${downloadProgress}%` }}></div>
                    </div>
                    <div className="progress-text">{downloadProgress}%</div>
                  </div>
                )}

                <button onClick={resetReceiveMode} className="btn btn-danger">
                  ❌ Cancel Reception
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
