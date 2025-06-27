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
  const [sessionIdCopied, setSessionIdCopied] = useState(false);
  
  // Tab system states
  const [activeTab, setActiveTab] = useState('send'); // 'send' or 'receive'
  
  // Receiver mode states (simplified for input only)
  const [receiverSessionId, setReceiverSessionId] = useState('');

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
      type: 'sender',
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

  const createSession = async () => {
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
    const deviceInfo = await getDeviceInfo();
    socket.emit('join', { session, deviceInfo });

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

    // Redirect to the proper receiver URL
    const currentUrl = new URL(window.location.href);
    const receiverUrl = `${currentUrl.origin}/receive/${receiverSessionId.trim()}`;
    window.location.href = receiverUrl;
  };

  const resetReceiveMode = () => {
    setReceiverSessionId('');
  };

  return (
    <div className="sender-container">
      <div className="sender-box">
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
            
            <div className="session-controls">
              <button onClick={createSession} className="btn btn-primary">
                🔐 Create Secure Session
              </button>
              <button onClick={setCustomDeviceName} className="btn btn-secondary" title="Personalize how your device appears to others">
                👤 Set Device Name
              </button>
            </div>
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
          </>
        )}

        {/* Connected Devices */}
        {sessionId && (
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
        )}

        {/* Transfer Progress */}
        {isTransferring && currentFile && (
          <div className="progress-box">
            <div className="progress-title">
              📁 Sending via WiFi: {currentFile.name}
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
                  onChange={(e) => setReceiverSessionId(e.target.value.toUpperCase())}
                  placeholder="Enter 6-character session ID"
                  className="session-input"
                  maxLength={6}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && receiverSessionId.trim()) {
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
