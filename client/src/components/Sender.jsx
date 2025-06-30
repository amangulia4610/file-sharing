/**
 * ============================================================================
 * The File Share - Sender Component
 * ============================================================================
 * 
 * This component handles the file sending functionality of the application.
 * It provides a comprehensive interface for creating sessions, managing
 * connections, and transferring files via WebRTC over WiFi networks.
 * 
 * KEY FEATURES:
 * - Session creation with QR code generation
 * - Real-time device connection monitoring
 * - Drag & drop file upload interface
 * - WebRTC peer-to-peer file transfer
 * - Progress tracking with speed calculations
 * - Responsive design for desktop and mobile
 * - Tab-based navigation (Send/Receive modes)
 * 
 * TECHNICAL IMPLEMENTATION:
 * - Uses Socket.IO for signaling and session management
 * - WebRTC for direct peer-to-peer file transfer
 * - QR code generation for easy mobile device connection
 * - Chunked file transfer for reliable large file handling
 * - Device fingerprinting for connection identification
 * 
 * Author: File Share Team
 * Last Updated: 2024
 * ============================================================================
 */

// React hooks for state management and lifecycle
import { useRef, useState } from 'react';

// Third-party libraries
import { QRCodeSVG } from 'qrcode.react';  // QR code generation for mobile scanning
import io from 'socket.io-client';         // Socket.IO client for real-time communication

// Application configuration and styles
import config from '../config.js';          // Environment-specific server configuration
import './style.css';                       // Component styles with glassmorphism design

// Initialize Socket.IO connection to signaling server
const socket = io(config.SOCKET_URL);

/**
 * Main Sender Component
 * 
 * Manages the entire file sending workflow from session creation to file transfer.
 * Includes both sender and receiver input modes via tab navigation.
 */
export default function Sender() {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  // File handling refs and state
  const fileInputRef = useRef();                    // Reference to hidden file input element
  const [currentFile, setCurrentFile] = useState(null);     // Currently selected file object
  const [isDragOver, setIsDragOver] = useState(false);      // Drag & drop visual feedback
  
  // Session and connection state
  const [sessionId, setSessionId] = useState('');           // Generated session identifier
  const [qrCode, setQrCode] = useState('');                 // QR code URL for mobile scanning
  const [connectedDevices, setConnectedDevices] = useState([]); // List of connected receiver devices
  
  // WebRTC and transfer state
  const [peerConnection, setPeerConnection] = useState(null); // WebRTC peer connection object
  const [isTransferring, setIsTransferring] = useState(false); // Transfer in progress flag
  const [transferProgress, setTransferProgress] = useState(0); // Transfer progress percentage
  const [transferSpeed, setTransferSpeed] = useState(0);      // Current transfer speed (bytes/sec)
  
  // UI interaction state
  const [linkCopied, setLinkCopied] = useState(false);       // QR code link copy feedback
  const [sessionIdCopied, setSessionIdCopied] = useState(false); // Session ID copy feedback
  
  // Tab navigation state
  const [activeTab, setActiveTab] = useState('send');        // Current active tab ('send' or 'receive')
  
  // Receiver mode state (simplified input mode for redirecting to proper receiver)
  const [receiverSessionId, setReceiverSessionId] = useState(''); // Session ID input for joining sessions

  // ============================================================================
  // DEVICE INFORMATION & FINGERPRINTING
  // ============================================================================
  
  /**
   * Generate comprehensive device information for connection identification
   * 
   * This function creates a device fingerprint that helps identify and display
   * connected devices in a user-friendly way. It detects device type, OS,
   * browser, and other relevant information.
   * 
   * @returns {Object} Device information object with identification details
   */

  const getDeviceInfo = () => {
    // Extract browser and system information from user agent
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    
    // Default device classification
    let deviceType = 'desktop';
    let deviceIcon = '💻';
    let osName = 'Unknown OS';
    let deviceName = 'Unknown Device';
    
    // Device type and OS detection based on user agent patterns
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
    
    // Return comprehensive device information object
    return {
      type: 'sender',                                                    // Device role in the transfer
      userAgent,                                                         // Full user agent string
      platform,                                                          // Browser platform information
      deviceType,                                                        // Device category (mobile/tablet/desktop)
      deviceIcon,                                                        // Emoji icon for UI display
      deviceName,                                                        // Human-readable device name
      osName,                                                           // Operating system name
      screenResolution: `${screen.width}x${screen.height}`,            // Display resolution
      language: navigator.language,                                      // Browser language setting
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,      // User's timezone
      timestamp: new Date().toISOString()                              // Connection timestamp
    };
  };

  // ============================================================================
  // FILE HANDLING & DRAG-AND-DROP
  // ============================================================================

  /**
   * Handle drag over events for file drop zone
   * Prevents default browser behavior and provides visual feedback
   */
  const handleDragOver = (e) => {
    e.preventDefault();          // Prevent default browser file handling
    setIsDragOver(true);        // Show drag-over visual state
  };

  /**
   * Handle drag leave events for file drop zone
   * Removes visual feedback when drag leaves the zone
   */
  const handleDragLeave = (e) => {
    e.preventDefault();         // Prevent default browser behavior
    setIsDragOver(false);      // Remove drag-over visual state
  };

  /**
   * Handle file drop events
   * Processes dropped files and updates the current file state
   */
  const handleDrop = (e) => {
    e.preventDefault();                    // Prevent default browser file handling
    setIsDragOver(false);                 // Remove drag-over visual state
    const files = e.dataTransfer.files;   // Extract dropped files
    if (files.length > 0) {
      setCurrentFile(files[0]);           // Use the first dropped file
    }
  };

  /**
   * Handle file selection from file input dialog
   * Updates current file state when user selects files via dialog
   */
  const handleFileSelect = (e) => {
    const files = e.target.files;  // Extract selected files
    if (files.length > 0) {
      setCurrentFile(files[0]);    // Use the first selected file
    }
  };

  /**
   * Programmatically open the file selection dialog
   * Triggered when user clicks on the file drop zone
   */
  const openFileDialog = () => {
    fileInputRef.current?.click();  // Trigger click on hidden file input
  };

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Format file size in human-readable format
   * Converts bytes to appropriate units (Bytes, KB, MB, GB)
   * 
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted file size string
   */
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  /**
   * Copy QR code link to clipboard with user feedback
   * Uses modern clipboard API with fallback for older browsers
   */
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

  /**
   * Copy session ID to clipboard with user feedback
   * Provides fallback method for browsers without clipboard API support
   */
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

  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================

  /**
   * Create a new file sharing session
   * 
   * Generates a unique session ID, creates QR code URL, and sets up
   * Socket.IO event handlers for device connection management.
   * The session serves as a meeting point for sender and receiver devices.
   */
  const createSession = () => {
    // Generate random 6-character session ID
    const session = Math.random().toString(36).substring(2, 8);
    setSessionId(session);
    
    // Build the QR URL using current location - ensure proper format for custom domain
    const currentUrl = new URL(window.location.href);
    const qrUrl = `${currentUrl.origin}/receive/${session}`;
    
    // Debug logging for QR code generation
    console.log('Debug QR Code generation:', {
      currentHref: window.location.href,
      origin: currentUrl.origin,
      pathname: currentUrl.pathname,
      qrUrl,
      session
    });
    
    setQrCode(qrUrl);
    
    // Join the session and provide device information
    socket.emit('join', { session, deviceInfo: getDeviceInfo() });

    /**
     * Handle new device joining the session
     * Updates the connected devices list while preventing duplicates
     */
    socket.on('device-joined', ({ device }) => {
      console.log('Device joined:', device);
      setConnectedDevices(prev => {
        // Prevent duplicate devices
        const exists = prev.some(d => d.id === device.id);
        if (exists) return prev;
        return [...prev, device];
      });
    });
    
    /**
     * Handle device leaving the session
     * Removes disconnected devices from the list
     */
    socket.on('device-left', ({ socketId }) => {
      console.log('Device left:', socketId);
      setConnectedDevices(prev => prev.filter(device => device.id !== socketId));
    });
    
    /**
     * Handle session information updates
     * Receives the current list of devices in the session
     */
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

  // ============================================================================
  // FILE TRANSFER IMPLEMENTATION
  // ============================================================================

  /**
   * Initiate file transfer to connected devices
   * 
   * This function implements the core file transfer logic using WebRTC
   * data channels for peer-to-peer communication. It handles:
   * - Connection validation
   * - WebRTC peer connection setup
   * - Chunked file transfer for reliability
   * - Progress tracking and speed calculation
   */
  const startSending = async () => {
    // Validate transfer prerequisites
    if (!currentFile) {
      alert('Please select a file first');
      return;
    }

    if (connectedDevices.length === 0) {
      alert('No devices connected. Please wait for a device to join your session.');
      return;
    }

    // Initialize transfer state
    const file = currentFile;
    const currentSession = sessionId;
    setIsTransferring(true);
    setTransferProgress(0);

    // Notify all devices in session that transfer is starting
    socket.emit('transfer-start', { session: currentSession, fileName: file.name, fileSize: file.size });

    // Create WebRTC peer connection with multiple STUN/TURN servers for better mobile compatibility
    const pc = new RTCPeerConnection({ 
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },      // Google STUN server 1
        { urls: 'stun:stun1.l.google.com:19302' },     // Google STUN server 2
        { urls: 'stun:stun2.l.google.com:19302' },     // Google STUN server 3
        { urls: 'stun:stun3.l.google.com:19302' },     // Google STUN server 4
        { urls: 'stun:stun4.l.google.com:19302' },     // Google STUN server 5
        // Add more STUN servers for better connectivity
        { urls: 'stun:stun.stunprotocol.org:3478' },
        { urls: 'stun:stun.voiparound.com:3478' },
        { urls: 'stun:stun.voipbuster.com:3478' },
        // Free TURN servers for better NAT traversal
        { 
          urls: 'turn:openrelay.metered.ca:80',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        { 
          urls: 'turn:openrelay.metered.ca:443',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        }
      ],
      iceCandidatePoolSize: 10,  // Increase ICE candidate pool for better connectivity
      iceTransportPolicy: 'all'  // Use all available transport methods
    });
    setPeerConnection(pc);
    
    // Create data channel for file transfer with enhanced configuration for mobile compatibility
    const dc = pc.createDataChannel('file', {
      ordered: true,        // Ensure chunks arrive in order
      maxRetransmits: 3,    // Retry failed packets up to 3 times
      protocol: 'file-transfer'  // Custom protocol identifier
    });

    /**
     * Handle ICE candidate events for WebRTC connection establishment
     * ICE candidates are used to establish the optimal connection path
     */
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Sender: Sending ICE candidate', event.candidate.type);
        socket.emit('candidate', { session: currentSession, candidate: event.candidate });
      } else {
        console.log('Sender: ICE candidate gathering complete');
      }
    };

    // Add mobile transfer debugging
    pc.ondatachannelopen = () => {
      console.log('Sender: Data channel opened successfully');
    };

    pc.ondatachannelerror = (error) => {
      console.error('Sender: Data channel error:', error);
    };

    // Add connection state monitoring for debugging
    pc.onconnectionstatechange = () => {
      console.log('Sender: Connection state changed to', pc.connectionState);
      if (pc.connectionState === 'failed') {
        console.error('Sender: WebRTC connection failed');
        setStatus('Connection failed - please try again');
      } else if (pc.connectionState === 'connected') {
        console.log('Sender: WebRTC connection established successfully');
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('Sender: ICE connection state changed to', pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        console.error('Sender: ICE connection failed or disconnected, attempting restart...');
        // Attempt ICE restart
        pc.restartIce();
      }
    };

    // Create and send WebRTC offer to establish connection
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('offer', { session: currentSession, offer });

    /**
     * Handle WebRTC answer from receiver
     * Completes the connection negotiation process
     */
    socket.on('answer', async ({ answer }) => {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    /**
     * Handle incoming ICE candidates from receiver
     * Adds candidates to complete the connection establishment
     */
    socket.on('candidate', async ({ candidate }) => {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    });

    /**
     * Data channel open event - start file transfer
     * This is where the actual file transfer logic begins
     */
    dc.onopen = () => {
      console.log('Sender: Data channel opened successfully');
      // Configuration for chunked file transfer with mobile device optimization
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const chunkSize = isMobile ? 8192 : 16384; // Smaller chunks for mobile (8KB vs 16KB)
      console.log('Sender: Using chunk size', chunkSize, 'bytes for', isMobile ? 'mobile' : 'desktop');
      let offset = 0;          // Current position in file
      const reader = new FileReader();
      let startTime = null;
      let lastProgressTime = null;
      let lastOffset = 0;

      /**
       * File reader load event - handles the actual file transfer
       * Reads the file into memory and initiates chunked sending
       */
      reader.onload = (e) => {
        const arrayBuffer = e.target.result;
        const totalSize = arrayBuffer.byteLength;
        startTime = Date.now();
        lastProgressTime = startTime;

        // Send filename first so receiver knows what file it's getting
        dc.send(JSON.stringify({ type: 'filename', name: file.name }));

        /**
         * Recursive function to send file chunks
         * Sends file in small chunks to ensure reliability and enable progress tracking
         */
        const sendChunk = () => {
          // Check if transfer is complete
          if (offset >= totalSize) {
            // Transfer complete - send end-of-file marker
            dc.send('EOF');
            setTransferProgress(100);
            setTransferSpeed(0);
            socket.emit('transfer-complete', { session: currentSession });
            setIsTransferring(false);
            return;
          }

          // Send one chunk at a time with buffer monitoring for mobile compatibility
          const chunk = arrayBuffer.slice(offset, offset + chunkSize);
          
          // Check data channel buffer before sending (important for mobile devices)
          if (dc.bufferedAmount > 1024 * 1024) { // 1MB buffer limit
            console.log('Sender: Buffer full, waiting...', dc.bufferedAmount);
            // Wait for buffer to drain before sending more data
            setTimeout(sendChunk, 100);
            return;
          }
          
          try {
            dc.send(chunk);
            console.log('Sender: Sent chunk', offset, 'of', totalSize, 'bytes');
          } catch (error) {
            console.error('Sender: Error sending chunk:', error);
            setStatus('Transfer error - please try again');
            setIsTransferring(false);
            return;
          }
          
          offset += chunkSize;
          
          // Update progress percentage
          const progress = Math.round((offset / totalSize) * 100);
          setTransferProgress(progress);
          socket.emit('transfer-progress', { session: currentSession, progress });
          
          // Calculate transfer speed every 500ms
          const currentTime = Date.now();
          if (currentTime - lastProgressTime >= 500) {
            // Calculate transfer speed in bytes per second
            const timeDiff = (currentTime - lastProgressTime) / 1000;
            const dataDiff = offset - lastOffset;
            const speed = dataDiff / timeDiff;
            setTransferSpeed(speed);
            lastProgressTime = currentTime;
            lastOffset = offset;
          }

          // Continue with next chunk after delay (longer delay for mobile for stability)
          const delay = isMobile ? 25 : 10; // Slower sending rate for mobile devices
          setTimeout(sendChunk, delay);
        };
        
        // Start the chunked transfer process
        sendChunk();
      };

      // Read the entire file into memory as ArrayBuffer
      reader.readAsArrayBuffer(file);
    };

    // Add error handling for data channel
    dc.onerror = (error) => {
      console.error('Sender: Data channel error:', error);
      setStatus('Data channel error - please try again');
      setIsTransferring(false);
    };

    dc.onclose = () => {
      console.log('Sender: Data channel closed');
      if (isTransferring) {
        setStatus('Connection closed - transfer interrupted');
        setIsTransferring(false);
      }
    };

    /**
     * Monitor WebRTC connection state changes
     * Handles connection failures and disconnections
     */
    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        setIsTransferring(false);
        setTransferSpeed(0);
      }
    };
  };

  // ============================================================================
  // SESSION CLEANUP & RESET
  // ============================================================================

  /**
   * Reset the entire session state
   * 
   * Cleans up all session-related state, closes connections,
   * and removes event listeners to prepare for a new session.
   */
  const resetSession = () => {
    // Reset all session state
    setSessionId('');
    setQrCode('');
    setIsTransferring(false);
    setConnectedDevices([]);
    setTransferProgress(0);
    setTransferSpeed(0);
    setCurrentFile(null);
    setLinkCopied(false);
    setSessionIdCopied(false);
    
    // Close WebRTC connection if it exists
    if (peerConnection) peerConnection.close();
    setPeerConnection(null);
    
    // Remove Socket.IO event listeners to prevent memory leaks
    socket.off('device-joined');
    socket.off('device-left');
    socket.off('session-info');
  };

  // ============================================================================
  // DEVICE CUSTOMIZATION
  // ============================================================================

  // ============================================================================
  // TAB NAVIGATION SYSTEM
  // ============================================================================

  /**
   * Switch between Send and Receive tabs
   * 
   * Handles tab navigation and resets appropriate state when switching modes.
   * This allows the same component to handle both sending and receiving workflows.
   * 
   * @param {string} tab - The tab to switch to ('send' or 'receive')
   */
  const switchTab = (tab) => {
    setActiveTab(tab);
    if (tab === 'send') {
      // Reset receiver states when switching to send mode
      setReceiverSessionId('');
    } else {
      // Reset sender states when switching to receive mode
      resetSession();
    }
  };

  // ============================================================================
  // RECEIVER MODE FUNCTIONALITY
  // ============================================================================

  /**
   * Join a receiver session by redirecting to the proper receiver page
   * 
   * This function handles the session joining workflow from the send page.
   * It validates the session exists before redirecting to prevent errors.
   */
  const joinReceiveSession = () => {
    if (!receiverSessionId.trim()) {
      alert('Please enter a session ID');
      return;
    }

    // Convert session ID to lowercase for consistency
    const normalizedSessionId = receiverSessionId.trim().toLowerCase();

    // Verify session exists before redirecting to prevent broken links
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

  /**
   * Reset receiver mode input
   * Clears the session ID input field
   */
  const resetReceiveMode = () => {
    setReceiverSessionId('');
  };

  /**
   * Verify that a session exists on the server
   * 
   * This function checks with the server to ensure a session is active
   * before attempting to connect, preventing users from joining non-existent sessions.
   * 
   * @param {string} sessionId - The session ID to verify
   * @param {Function} callback - Callback function that receives the verification result
   */
  const verifySession = (sessionId, callback) => {
    socket.emit('verify-session', { sessionId });
    
    /**
     * Handle session verification response
     * Ensures the callback is only called once and cleans up listeners
     */
    const onSessionVerified = ({ exists, sessionId: verifiedSessionId }) => {
      if (verifiedSessionId === sessionId) {
        socket.off('session-verified', onSessionVerified);
        callback(exists);
      }
    };
    
    socket.on('session-verified', onSessionVerified);
    
    // Timeout after 5 seconds if no response received
    setTimeout(() => {
      socket.off('session-verified', onSessionVerified);
      callback(false);
    }, 5000);
  };

  // ============================================================================
  // COMPONENT RENDER
  // ============================================================================

  /**
   * Main component render function
   * 
   * Renders the complete sender interface with:
   * - Tab navigation (Send/Receive)
   * - Session creation and management
   * - File upload and drag & drop
   * - Connection monitoring
   * - Transfer progress tracking
   * - QR code generation for mobile devices
   */
  return (
    <div className={`sender-container ${sessionId ? 'session-active' : ''}`}>
      <div className={`sender-box ${sessionId ? 'session-active' : ''}`}>
        <h1 className="sender-title">
          <a href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            📁 The File Share
          </a>
        </h1>
        
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
