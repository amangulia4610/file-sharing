// File: client/src/components/Receiver.jsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import config from '../config.js';
import './style.css';

const socket = io(config.SOCKET_URL);

export default function Receiver() {
  const { session } = useParams();
  const [status, setStatus] = useState('Connecting to WiFi session...');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [transferInfo, setTransferInfo] = useState(null);
  const [connectionState, setConnectionState] = useState('connecting'); // connecting, waiting, receiving, completed, error
  const [downloadSpeed, setDownloadSpeed] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [connectedDevices, setConnectedDevices] = useState(0);

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
      type: 'receiver',
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

  // Helper functions for better UX
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond) => {
    if (bytesPerSecond === 0) return '0 KB/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
    return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatTime = (seconds) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
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

  useEffect(() => {
    // First verify the session exists
    verifySession(session, (exists) => {
      if (!exists) {
        setStatus('Session not found. Please check the session ID.');
        setConnectionState('error');
        return;
      }

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
      let startTime = null;
      let lastProgressTime = null;
      let lastReceivedSize = 0;

      socket.emit('join', { session, deviceInfo: getDeviceInfo() });
      setStatus('Joined WiFi session, waiting for sender...');
      setConnectionState('waiting');

    // Verify session exists
    verifySession(session, (exists) => {
      if (!exists) {
        setStatus('Session not found. Please check the session ID and try again.');
        setConnectionState('error');
        return;
      }
    });

    socket.on('transfer-start', ({ fileName, fileSize }) => {
      setTransferInfo({ fileName, fileSize });
      setStatus(`Receiving via WiFi: ${fileName}...`);
      setConnectionState('receiving');
      totalSize = fileSize;
      startTime = Date.now();
      lastProgressTime = startTime;
    });

    socket.on('transfer-progress', ({ progress }) => {
      setDownloadProgress(progress);
      setStatus(`Receiving via WiFi... ${progress}%`);
      
      // Calculate speed and time remaining
      const now = Date.now();
      const currentReceivedSize = (progress / 100) * totalSize;
      
      if (lastProgressTime && now - lastProgressTime > 500) { // Update every 500ms
        const timeDiff = (now - lastProgressTime) / 1000;
        const sizeDiff = currentReceivedSize - lastReceivedSize;
        const speed = sizeDiff / timeDiff;
        
        setDownloadSpeed(speed);
        
        if (speed > 0) {
          const remainingBytes = totalSize - currentReceivedSize;
          const timeRem = remainingBytes / speed;
          setTimeRemaining(timeRem);
        }
        
        lastProgressTime = now;
        lastReceivedSize = currentReceivedSize;
      }
    });

    socket.on('transfer-complete', () => {
      setStatus('WiFi transfer completed!');
      setConnectionState('completed');
      setDownloadProgress(100);
    });

    pc.ondatachannel = (event) => {
      const dc = event.channel;
      setStatus('Connected! Receiving file...');

      dc.onopen = () => {
        setStatus('Data channel open, ready to receive...');
      };

      dc.onmessage = (e) => {
        if (typeof e.data === 'string') {
          if (e.data === 'EOF') {
            const blob = new Blob(chunks);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = originalFileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setStatus('Download complete!');
            setDownloadProgress(100);
          } else {
            try {
              const message = JSON.parse(e.data);
              if (message.type === 'filename') {
                originalFileName = message.name;
                setStatus(`Receiving ${originalFileName}...`);
              }
            } catch {
              // ignore non-JSON strings
            }
          }
        } else {
          chunks.push(e.data);
          receivedSize += e.data.byteLength || e.data.size || 0;
          const progress = totalSize > 0 ? (receivedSize / totalSize) * 100 : 0;
          setDownloadProgress(Math.round(progress));
          setStatus(`Receiving ${originalFileName}... ${Math.round(progress)}%`);
        }
      };

      dc.onerror = () => {
        setStatus('Error receiving file');
      };
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) socket.emit('candidate', { session, candidate: event.candidate });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setStatus('WebRTC connected, waiting for data...');
      } else if (pc.connectionState === 'failed') {
        setStatus('Connection failed');
      }
    };

    socket.on('offer', async ({ offer }) => {
      try {
        setStatus('Received offer, creating answer...');
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', { session, answer });
        setStatus('Answer sent, establishing connection...');
      } catch {
        setStatus('Error processing offer');
      }
    });

    socket.on('candidate', async ({ candidate }) => {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {}
    });

    socket.on('connect', () => {
      setStatus('Connected to server, waiting for sender...');
    });

    socket.on('disconnect', () => {
      setStatus('Disconnected from server');
    });

    return () => {
      pc.close();
      socket.off('offer');
      socket.off('candidate');
      socket.off('connect');
      socket.off('disconnect');
      socket.off('transfer-start');
      socket.off('transfer-progress');
      socket.off('transfer-complete');
    };
    }); // Close the verifySession callback
  }, [session]);


  return (
    <div className="receiver-container">
      <div className="receiver-box">
        <h1 className="receiver-title">📥 The File Share - Receiver</h1>
        <p className="receiver-subtitle">📶 Receiving files via WiFi connection</p>
        
        {/* Session Info Card */}
        <div className="receiver-session-card">
          <div className="session-info">
            <span className="session-label">Session ID:</span>
            <span className="session-id">{session}</span>
          </div>
          <div className={`connection-indicator ${connectionState}`}>
            <div className="indicator-dot"></div>
            <span className="indicator-text">
              {connectionState === 'connecting' && 'Connecting...'}
              {connectionState === 'waiting' && 'Waiting for sender'}
              {connectionState === 'receiving' && 'Receiving file'}
              {connectionState === 'completed' && 'Transfer complete'}
              {connectionState === 'error' && 'Connection error'}
            </span>
          </div>
        </div>

        {/* Status Message */}
        <div className="receiver-status-card">
          <div className="status-icon">
            {connectionState === 'connecting' && '⏳'}
            {connectionState === 'waiting' && '⏰'}
            {connectionState === 'receiving' && '📡'}
            {connectionState === 'completed' && '✅'}
            {connectionState === 'error' && '❌'}
          </div>
          <p className="receiver-status">{status}</p>
        </div>

        {/* File Info Card */}
        {transferInfo && (
          <div className="file-info-card">
            <div className="file-icon">�</div>
            <div className="file-details">
              <h3 className="file-name">{transferInfo.fileName}</h3>
              <div className="file-meta">
                <span className="file-size">{formatFileSize(transferInfo.fileSize)}</span>
                {downloadSpeed > 0 && (
                  <>
                    <span className="file-speed">• {formatSpeed(downloadSpeed)}</span>
                    {timeRemaining > 0 && downloadProgress < 100 && (
                      <span className="file-eta">• {formatTime(timeRemaining)} remaining</span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Progress Section */}
        {downloadProgress > 0 && downloadProgress < 100 && (
          <div className="progress-section">
            <div className="progress-header">
              <span className="progress-label">Transfer Progress</span>
              <span className="progress-percentage">{downloadProgress}%</span>
            </div>
            <div className="progress-bar-container">
              <div className="progress-bar">
                <div 
                  className="progress-inner" 
                  style={{ width: `${downloadProgress}%` }}
                ></div>
              </div>
            </div>
            {transferInfo && (
              <div className="progress-stats">
                <span className="received-size">
                  {formatFileSize((downloadProgress / 100) * transferInfo.fileSize)} of {formatFileSize(transferInfo.fileSize)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Success State */}
        {downloadProgress === 100 && connectionState === 'completed' && (
          <div className="success-card">
            <div className="success-icon">🎉</div>
            <h3 className="success-title">File Received Successfully!</h3>
            <p className="success-message">
              Your file has been downloaded via WiFi and saved to your device.
            </p>
            {transferInfo && (
              <div className="success-file-info">
                <span className="success-file-name">📄 {transferInfo.fileName}</span>
                <span className="success-file-size">({formatFileSize(transferInfo.fileSize)})</span>
              </div>
            )}
          </div>
        )}

        {/* Waiting State Animation */}
        {connectionState === 'waiting' && (
          <div className="waiting-animation">
            <div className="waiting-dots">
              <div className="dot"></div>
              <div className="dot"></div>
              <div className="dot"></div>
            </div>
            <p className="waiting-text">Waiting for sender to start transfer...</p>
          </div>
        )}

        {/* Error State */}
        {connectionState === 'error' && (
          <div className="error-card">
            <div className="error-icon">⚠️</div>
            <h3 className="error-title">Connection Error</h3>
            <p className="error-message">
              Unable to establish connection. Please check your WiFi connection and try again.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
