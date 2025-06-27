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

  const getDeviceInfo = async () => {
    const userAgent = navigator.userAgent;
    let platform = navigator.platform;
    
    // Extract browser information
    let browserName = 'Unknown Browser';
    let browserVersion = '';
    
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      browserName = 'Chrome';
      browserVersion = userAgent.match(/Chrome\/(\d+\.\d+)/)?.[1] || '';
    } else if (userAgent.includes('Firefox')) {
      browserName = 'Firefox';
      browserVersion = userAgent.match(/Firefox\/(\d+\.\d+)/)?.[1] || '';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      browserName = 'Safari';
      browserVersion = userAgent.match(/Version\/(\d+\.\d+)/)?.[1] || '';
    } else if (userAgent.includes('Edg')) {
      browserName = 'Edge';
      browserVersion = userAgent.match(/Edg\/(\d+\.\d+)/)?.[1] || '';
    }
    
    // Extract specific device names and OS information
    let osName = 'Unknown OS';
    let deviceName = 'Unknown Device';
    let deviceModel = '';
    let customName = '';
    
    // Try to use Navigator User-Agent Client Hints API (Chrome 89+)
    try {
      if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
        const highEntropyValues = await navigator.userAgentData.getHighEntropyValues([
          'architecture',
          'model',
          'platform',
          'platformVersion',
          'uaFullVersion'
        ]);
        
        if (highEntropyValues.model) {
          deviceModel = highEntropyValues.model;
        }
        
        if (highEntropyValues.platform) {
          platform = highEntropyValues.platform;
        }
      }
    } catch (e) {
      // Fall back to traditional detection
    }
    
    if (userAgent.includes('Windows')) {
      osName = 'Windows';
      deviceName = 'Windows PC';
      
      // Better Windows version detection
      if (userAgent.includes('Windows NT 10.0')) {
        if (userAgent.includes('Windows NT 10.0; Win64; x64')) {
          osName = 'Windows 11/10';
          deviceName = 'Windows Desktop';
        }
      } else if (userAgent.includes('Windows NT 6.3')) {
        osName = 'Windows 8.1';
      } else if (userAgent.includes('Windows NT 6.1')) {
        osName = 'Windows 7';
      }
      
      // Try to detect Surface devices
      if (userAgent.includes('Surface') || userAgent.includes('tablet pc')) {
        deviceName = 'Microsoft Surface';
      }
      
    } else if (userAgent.includes('Mac OS X') || platform.includes('Mac')) {
      osName = 'macOS';
      
      // Enhanced Mac detection using screen resolution and CPU architecture
      const macVersion = userAgent.match(/Mac OS X (\d+_\d+)/);
      if (macVersion) {
        const version = macVersion[1].replace('_', '.');
        osName = `macOS ${version}`;
      }
      
      // Detect Apple Silicon vs Intel
      const isAppleSilicon = !userAgent.includes('Intel') && platform.includes('MacIntel');
      
      // More precise Mac model detection using screen dimensions and device pixel ratio
      const screenWidth = screen.width;
      const screenHeight = screen.height;
      const pixelRatio = window.devicePixelRatio || 1;
      const actualWidth = screenWidth * pixelRatio;
      const actualHeight = screenHeight * pixelRatio;
      
      // Try to get more specific Mac information
      let macModel = '';
      try {
        // Use memory as additional hint for Mac model
        const memory = navigator.deviceMemory;
        if (memory >= 32) {
          macModel = ' Pro/Max';
        } else if (memory >= 16) {
          macModel = ' Pro';
        }
      } catch (e) {
        // Memory API not available
      }
      
      if (isAppleSilicon) {
        // Apple Silicon Macs with enhanced detection
        if (actualWidth >= 7680 || actualHeight >= 4320) {
          deviceName = 'Mac Studio / Mac Pro (M1/M2)';
        } else if (actualWidth >= 5120 || actualHeight >= 2880) {
          deviceName = 'iMac 24" (M1/M2/M3)';
        } else if (actualWidth >= 3456 || actualHeight >= 2234) {
          deviceName = `MacBook Pro 16" (M1/M2/M3${macModel})`;
        } else if (actualWidth >= 3024 || actualHeight >= 1964) {
          deviceName = `MacBook Pro 14" (M1/M2/M3${macModel})`;
        } else if (actualWidth >= 2560 || actualHeight >= 1664) {
          deviceName = 'MacBook Air (M1/M2/M3)';
        } else if (actualWidth >= 2560 || actualHeight >= 1600) {
          deviceName = `MacBook Pro 13" (M1/M2${macModel})`;
        } else {
          deviceName = 'Mac (Apple Silicon)';
        }
      } else {
        // Intel Macs
        if (actualWidth >= 5120 || actualHeight >= 2880) {
          deviceName = 'iMac 27" (Intel)';
        } else if (actualWidth >= 4096 || actualHeight >= 2304) {
          deviceName = 'iMac 21.5" (Intel)';
        } else if (actualWidth >= 3072 || actualHeight >= 1920) {
          deviceName = 'MacBook Pro 16" (Intel)';
        } else if (actualWidth >= 2560 || actualHeight >= 1600) {
          deviceName = 'MacBook Pro 13/15" (Intel)';
        } else if (actualWidth >= 2304 || actualHeight >= 1440) {
          deviceName = 'MacBook Air (Intel)';
        } else {
          deviceName = 'Mac (Intel)';
        }
      }
      
    } else if (userAgent.includes('Linux')) {
      osName = 'Linux';
      deviceName = 'Linux PC';
      
      // Enhanced Linux distribution detection
      if (userAgent.includes('Ubuntu')) {
        osName = 'Ubuntu Linux';
        deviceName = 'Ubuntu Desktop';
      } else if (userAgent.includes('Debian')) {
        osName = 'Debian Linux';
        deviceName = 'Debian Desktop';
      } else if (userAgent.includes('Fedora')) {
        osName = 'Fedora Linux';
        deviceName = 'Fedora Desktop';
      } else if (userAgent.includes('CentOS')) {
        osName = 'CentOS Linux';
        deviceName = 'CentOS Desktop';
      } else if (userAgent.includes('Arch')) {
        osName = 'Arch Linux';
        deviceName = 'Arch Desktop';
      }
      
    } else if (userAgent.includes('iPhone')) {
      osName = 'iOS';
      
      // Enhanced iPhone model detection using screen dimensions
      const screenWidth = screen.width;
      const screenHeight = screen.height;
      const pixelRatio = window.devicePixelRatio || 1;
      
      // iPhone 15 series
      if (pixelRatio >= 3 && (screenWidth >= 430 || screenHeight >= 932)) {
        deviceName = 'iPhone 15 Pro Max';
      } else if (pixelRatio >= 3 && (screenWidth >= 393 || screenHeight >= 852)) {
        deviceName = 'iPhone 15 Pro';
      } else if (pixelRatio >= 2 && (screenWidth >= 430 || screenHeight >= 932)) {
        deviceName = 'iPhone 15 Plus';
      } else if (pixelRatio >= 2 && (screenWidth >= 393 || screenHeight >= 852)) {
        deviceName = 'iPhone 15';
      }
      // iPhone 14 series
      else if (pixelRatio >= 3 && (screenWidth >= 428 || screenHeight >= 926)) {
        deviceName = 'iPhone 14 Pro Max';
      } else if (pixelRatio >= 3 && (screenWidth >= 390 || screenHeight >= 844)) {
        deviceName = 'iPhone 14 Pro';
      } else if (pixelRatio >= 2 && (screenWidth >= 428 || screenHeight >= 926)) {
        deviceName = 'iPhone 14 Plus';
      } else if (pixelRatio >= 2 && (screenWidth >= 390 || screenHeight >= 844)) {
        deviceName = 'iPhone 14';
      }
      // iPhone 13 series
      else if (pixelRatio >= 3 && (screenWidth >= 428 || screenHeight >= 926)) {
        deviceName = 'iPhone 13 Pro Max';
      } else if (pixelRatio >= 3 && (screenWidth >= 390 || screenHeight >= 844)) {
        deviceName = 'iPhone 13 Pro';
      } else if (pixelRatio >= 2 && (screenWidth >= 428 || screenHeight >= 926)) {
        deviceName = 'iPhone 13 Pro Max';
      } else if (pixelRatio >= 2 && (screenWidth >= 390 || screenHeight >= 844)) {
        deviceName = 'iPhone 13';
      }
      // iPhone 12 series
      else if (pixelRatio >= 3 && (screenWidth >= 428 || screenHeight >= 926)) {
        deviceName = 'iPhone 12 Pro Max';
      } else if (pixelRatio >= 3 && (screenWidth >= 390 || screenHeight >= 844)) {
        deviceName = 'iPhone 12 Pro';
      } else if (pixelRatio >= 2 && (screenWidth >= 390 || screenHeight >= 844)) {
        deviceName = 'iPhone 12';
      }
      // Older models
      else if (pixelRatio >= 3 && (screenWidth >= 414 || screenHeight >= 896)) {
        deviceName = 'iPhone 11 Pro Max';
      } else if (pixelRatio >= 2 && (screenWidth >= 414 || screenHeight >= 896)) {
        deviceName = 'iPhone 11';
      } else if (pixelRatio >= 3 && (screenWidth >= 375 || screenHeight >= 812)) {
        deviceName = 'iPhone X/XS';
      } else if (pixelRatio >= 2 && (screenWidth >= 375 || screenHeight >= 667)) {
        deviceName = 'iPhone SE';
      } else {
        deviceName = 'iPhone';
      }
      
      // Try to extract iOS version
      const iosMatch = userAgent.match(/OS (\d+_\d+)/);
      if (iosMatch) {
        osName = `iOS ${iosMatch[1].replace('_', '.')}`;
      }
      
    } else if (userAgent.includes('iPad')) {
      osName = 'iPadOS';
      
      // Enhanced iPad model detection using screen dimensions
      const screenWidth = screen.width;
      const screenHeight = screen.height;
      const pixelRatio = window.devicePixelRatio || 1;
      
      if (pixelRatio >= 2 && (screenWidth >= 1366 || screenHeight >= 1024)) {
        deviceName = 'iPad Pro 12.9"';
      } else if (pixelRatio >= 2 && (screenWidth >= 1194 || screenHeight >= 834)) {
        deviceName = 'iPad Pro 11"';
      } else if (pixelRatio >= 2 && (screenWidth >= 1180 || screenHeight >= 820)) {
        deviceName = 'iPad Air';
      } else if (pixelRatio >= 2 && (screenWidth >= 1080 || screenHeight >= 810)) {
        deviceName = 'iPad (10th gen)';
      } else if (pixelRatio >= 2 && (screenWidth >= 1024 || screenHeight >= 768)) {
        deviceName = 'iPad mini';
      } else {
        deviceName = 'iPad';
      }
      
    } else if (userAgent.includes('Android')) {
      osName = 'Android';
      
      // Enhanced Android device model extraction
      const androidMatch = userAgent.match(/Android.*?;\s*(.+?)\s*Build/);
      if (androidMatch) {
        deviceModel = androidMatch[1].trim();
        
        // Better device name formatting
        if (deviceModel.includes('SM-G') && deviceModel.includes('998')) {
          deviceName = 'Samsung Galaxy S21 Ultra';
        } else if (deviceModel.includes('SM-G') && deviceModel.includes('996')) {
          deviceName = 'Samsung Galaxy S21+';
        } else if (deviceModel.includes('SM-G') && deviceModel.includes('991')) {
          deviceName = 'Samsung Galaxy S21';
        } else if (deviceModel.includes('SM-G') && deviceModel.includes('988')) {
          deviceName = 'Samsung Galaxy S20 Ultra';
        } else if (deviceModel.includes('SM-G') && deviceModel.includes('986')) {
          deviceName = 'Samsung Galaxy S20+';
        } else if (deviceModel.includes('SM-G') && deviceModel.includes('981')) {
          deviceName = 'Samsung Galaxy S20';
        } else if (deviceModel.includes('SM-N') && deviceModel.includes('986')) {
          deviceName = 'Samsung Galaxy Note 20 Ultra';
        } else if (deviceModel.includes('SM-N') && deviceModel.includes('981')) {
          deviceName = 'Samsung Galaxy Note 20';
        } else if (deviceModel.includes('SM-')) {
          const model = deviceModel.replace(/SM-/, '').replace(/[0-9]+/, '');
          deviceName = `Samsung Galaxy ${model}`;
        } else if (deviceModel.includes('Pixel 8 Pro')) {
          deviceName = 'Google Pixel 8 Pro';
        } else if (deviceModel.includes('Pixel 8')) {
          deviceName = 'Google Pixel 8';
        } else if (deviceModel.includes('Pixel 7 Pro')) {
          deviceName = 'Google Pixel 7 Pro';
        } else if (deviceModel.includes('Pixel 7')) {
          deviceName = 'Google Pixel 7';
        } else if (deviceModel.includes('Pixel')) {
          deviceName = `Google ${deviceModel}`;
        } else if (deviceModel.includes('OnePlus')) {
          deviceName = deviceModel;
        } else if (deviceModel.includes('Xiaomi') || deviceModel.includes('Mi ')) {
          deviceName = deviceModel.replace(/Xiaomi/, 'Xiaomi').replace(/Mi /, 'Xiaomi Mi ');
        } else if (deviceModel.includes('HUAWEI') || deviceModel.includes('HW-')) {
          deviceName = deviceModel.replace(/HUAWEI|HW-/, 'Huawei ');
        } else if (deviceModel.includes('LG-')) {
          deviceName = deviceModel.replace(/LG-/, 'LG ');
        } else {
          deviceName = deviceModel;
        }
      } else {
        deviceName = 'Android Device';
      }
      
      // Extract Android version
      const androidVersionMatch = userAgent.match(/Android (\d+\.?\d*)/);
      if (androidVersionMatch) {
        osName = `Android ${androidVersionMatch[1]}`;
      }
    }
    
    // Determine device type with more detail
    let deviceType = 'desktop';
    let deviceIcon = '💻';
    
    if (/iPhone/i.test(userAgent)) {
      deviceType = 'mobile';
      deviceIcon = '📱';
    } else if (/iPad/i.test(userAgent)) {
      deviceType = 'tablet';
      deviceIcon = '📱';
    } else if (/Android/i.test(userAgent) && /Mobile/i.test(userAgent)) {
      deviceType = 'mobile';
      deviceIcon = '📱';
    } else if (/Android/i.test(userAgent)) {
      deviceType = 'tablet';
      deviceIcon = '📱';
    }
    
    // Try advanced methods to get device custom name
    let displayName = deviceName;
    
    try {
      // Try to get device hostname through various methods
      if (location.hostname && location.hostname !== 'localhost' && !location.hostname.includes('github.io') && !location.hostname.includes('thefileshare.com')) {
        const hostname = location.hostname.split('.')[0];
        if (hostname && hostname !== 'thefileshare') {
          customName = hostname;
          displayName = `${deviceName} (${hostname})`;
        }
      }
      
      // Try WebRTC to get local IP and potentially device name
      if (!customName && window.RTCPeerConnection) {
        // This is a fallback that might provide additional device info
        // but won't work reliably across all browsers due to privacy restrictions
      }
      
      // Check for any stored device name in localStorage
      const storedName = localStorage.getItem('deviceCustomName');
      if (storedName) {
        customName = storedName;
        displayName = `${storedName}'s ${deviceName}`;
      }
      
    } catch (e) {
      // Ignore errors - fall back to detected device name
    }
    
    return {
      type: 'receiver',
      userAgent,
      platform,
      deviceType,
      deviceIcon,
      deviceName,
      deviceModel,
      displayName,
      customName,
      browserName,
      browserVersion,
      osName,
      screenResolution: `${screen.width}x${screen.height}`,
      pixelRatio: window.devicePixelRatio || 1,
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

  useEffect(() => {
    const initializeReceiver = async () => {
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

      const deviceInfo = await getDeviceInfo();
      socket.emit('join', { session, deviceInfo });
      setStatus('Joined WiFi session, waiting for sender...');
      setConnectionState('waiting');

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
    };

    initializeReceiver();
  }, [session]);

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
      
      // Trigger a re-initialization with new device info
      window.location.reload();
    }
  };

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
          <button onClick={setCustomDeviceName} className="btn btn-secondary btn-small" title="Personalize how your device appears to the sender">
            👤 Set Device Name
          </button>
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
