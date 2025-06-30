/**
 * ============================================================================
 * The File Share - Receiver Component
 * ============================================================================
 * 
 * This component handles the file receiving functionality of the application.
 * It provides a dedicated interface for users who join a session to receive
 * files via WebRTC over WiFi networks.
 * 
 * KEY FEATURES:
 * - Automatic session joining via URL parameters
 * - Real-time connection status monitoring
 * - Progress tracking with speed and ETA calculations
 * - Automatic file download upon completion
 * - Responsive design optimized for mobile and desktop
 * - Error handling with retry mechanisms
 * 
 * TECHNICAL IMPLEMENTATION:
 * - Uses React Router params to extract session ID from URL
 * - WebRTC for direct peer-to-peer file reception
 * - Socket.IO for signaling and session management
 * - Chunked file assembly for reliable large file handling
 * - Real-time progress tracking with speed calculations
 * - Device fingerprinting for connection identification
 * 
 * WORKFLOW:
 * 1. Extract session ID from URL parameters
 * 2. Verify session exists on server
 * 3. Join session and establish WebRTC connection
 * 4. Receive file chunks and assemble complete file
 * 5. Automatically download file when transfer completes
 * 
 * Author: File Share Team
 * Last Updated: 2024
 * ============================================================================
 */

// React hooks for state management, lifecycle, and optimization
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';  // Extract URL parameters for session ID

// Third-party libraries
import io from 'socket.io-client';            // Socket.IO client for real-time communication

// Application configuration and styles
import config from '../config.js';            // Environment-specific server configuration
import './style.css';                        // Component styles with glassmorphism design

// Initialize Socket.IO connection to signaling server
const socket = io(config.SOCKET_URL);

/**
 * Main Receiver Component
 * 
 * Manages the complete file receiving workflow from session joining to file download.
 * Automatically extracts session ID from URL and handles the entire receiving process.
 */
export default function Receiver() {
  // ============================================================================
  // URL PARAMETERS & SESSION SETUP
  // ============================================================================
  
  // Extract session ID from URL parameters and normalize to lowercase
  const { session: rawSession } = useParams();
  const session = rawSession?.toLowerCase(); // Normalize session ID for consistency
  
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  // Connection and status tracking
  const [status, setStatus] = useState('Connecting to WiFi session...');     // Current status message
  const [connectionState, setConnectionState] = useState('connecting');      // Connection state machine
  const [hasStartedTransfer, setHasStartedTransfer] = useState(false);      // Flag to track if transfer began
  
  // Transfer progress and metrics
  const [downloadProgress, setDownloadProgress] = useState(0);               // Download progress percentage
  const [transferInfo, setTransferInfo] = useState(null);                   // File information (name, size)
  const [downloadSpeed, setDownloadSpeed] = useState(0);                    // Current download speed (bytes/sec)
  const [timeRemaining, setTimeRemaining] = useState(0);                    // Estimated time remaining
  const [lastKnownETA, setLastKnownETA] = useState('');                     // Last valid ETA calculation
  
  /**
   * Speed calculation configuration
   * Uses useRef to avoid triggering re-renders while maintaining state
   */
  const speedCalculationRef = useRef({
    lastUpdateTime: 0,        // Timestamp of last speed calculation
    lastReceivedSize: 0,      // Bytes received at last calculation
    updateInterval: 1000,     // Update interval in milliseconds (1 second)
  });

  // ============================================================================
  // UTILITY FUNCTIONS (OPTIMIZED WITH MEMOIZATION)
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
   * Format transfer speed in human-readable format
   * Converts bytes per second to appropriate units
   * 
   * @param {number} bytesPerSecond - Transfer speed in bytes per second
   * @returns {string} Formatted speed string
   */
  const formatSpeed = (bytesPerSecond) => {
    if (bytesPerSecond === 0) return '0 KB/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
    return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  /**
   * Format time duration in human-readable format
   * Converts seconds to minutes and seconds for ETA display
   * 
   * @param {number} seconds - Time duration in seconds
   * @returns {string} Formatted time string
   */
  const formatTime = (seconds) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  // ============================================================================
  // MEMOIZED VALUES FOR PERFORMANCE OPTIMIZATION
  // ============================================================================
  
  // These values are memoized to prevent unnecessary recalculations and re-renders
  
  const formattedProgress = useMemo(() => Math.round(downloadProgress), [downloadProgress]);
  
  const formattedSpeed = useMemo(() => formatSpeed(downloadSpeed), [downloadSpeed]);
  
  const formattedTimeRemaining = useMemo(() => {
    if (timeRemaining > 0) {
      const newETA = formatTime(timeRemaining);
      setLastKnownETA(newETA); // Update last known ETA when we have a valid value
      return newETA;
    }
    return lastKnownETA || ''; // Return last known ETA or empty string if none
  }, [timeRemaining, lastKnownETA]);
  
  const formattedFileSize = useMemo(() => 
    transferInfo ? formatFileSize(transferInfo.fileSize) : '', [transferInfo]
  );
  
  const formattedReceivedSize = useMemo(() => 
    transferInfo && downloadProgress > 0 ? formatFileSize((downloadProgress / 100) * transferInfo.fileSize) : '', 
    [transferInfo, downloadProgress]
  );

  // ============================================================================
  // DEVICE INFORMATION & FINGERPRINTING
  // ============================================================================

  /**
   * Generate comprehensive device information for connection identification
   * 
   * Creates a device fingerprint similar to the sender component, allowing
   * the sender to identify and display information about connected receivers.
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
      type: 'receiver',                                                  // Device role in the transfer
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
  // SESSION VERIFICATION & CONNECTION MANAGEMENT
  // ============================================================================

  /**
   * Verify that a session exists on the server before attempting to connect
   * 
   * This prevents users from trying to join non-existent sessions and provides
   * appropriate feedback. Includes timeout handling and proper cleanup.
   * 
   * @param {string} sessionId - The session ID to verify
   * @param {Function} callback - Callback function that receives the verification result
   */
  const verifySession = (sessionId, callback) => {
    console.log('Verifying session:', sessionId);
    socket.emit('verify-session', { sessionId });
    
    let timeoutId;
    let callbackCalled = false;
    
    /**
     * Handle session verification response from server
     * Ensures callback is only called once and cleans up listeners
     */
    const onSessionVerified = ({ exists, sessionId: verifiedSessionId }) => {
      console.log('Session verification result:', { exists, sessionId: verifiedSessionId });
      if (verifiedSessionId === sessionId && !callbackCalled) {
        callbackCalled = true;
        clearTimeout(timeoutId);
        socket.off('session-verified', onSessionVerified);
        callback(exists);
      }
    };
    
    socket.on('session-verified', onSessionVerified);
    
    // Timeout after 10 seconds
    timeoutId = setTimeout(() => {
      if (!callbackCalled) {
        console.log('Session verification timeout for:', sessionId);
        callbackCalled = true;
        socket.off('session-verified', onSessionVerified);
        callback(false);
      }
    }, 10000);
  };

  // ============================================================================
  // MAIN CONNECTION EFFECT & WORKFLOW MANAGEMENT
  // ============================================================================

  /**
   * Main useEffect hook that manages the entire receiver workflow
   * 
   * This effect handles:
   * - Session verification with retry logic
   * - WebRTC connection establishment
   * - File transfer event handling
   * - Progress tracking and speed calculations
   * - Cleanup on component unmount
   */
  useEffect(() => {
    console.log('Receiver useEffect triggered for session:', session);
    
    let isConnecting = false;      // Flag to prevent duplicate connection attempts
    let cleanupFunctions = [];     // Array to store cleanup functions
    
    /**
     * Attempt to connect to session with retry mechanism
     * 
     * Tries multiple times to find and connect to the session before giving up.
     * This handles cases where the receiver loads before the sender creates the session.
     * 
     * @param {number} retryCount - Current retry attempt number
     */
    const attemptConnection = (retryCount = 0) => {
      const maxRetries = 3;
      
      // Prevent multiple simultaneous connection attempts
      if (isConnecting) {
        console.log('Connection already in progress, skipping attempt');
        return;
      }
      
      console.log(`Attempting connection, retry ${retryCount}/${maxRetries}`);
      
      // Verify session exists before proceeding
      verifySession(session, (exists) => {
        if (!exists) {
          // Session not found - retry or show error
          if (retryCount < maxRetries) {
            setStatus(`Looking for session... (attempt ${retryCount + 1}/${maxRetries + 1})`);
            console.log(`Session not found, retrying in 3 seconds... (${retryCount + 1}/${maxRetries + 1})`);
            setTimeout(() => attemptConnection(retryCount + 1), 3000);
            return;
          } else {
            // Max retries reached - show error
            setStatus('Session not found. Please make sure the sender has started the session first.');
            setConnectionState('error');
            return;
          }
        }

        // Prevent duplicate connection setup
        if (isConnecting) {
          console.log('Connection setup already in progress, skipping');
          return;
        }

        console.log('Session found, proceeding with connection setup');
        isConnecting = true;
        setupConnection();
      });
    };

    /**
     * Set up WebRTC connection and file transfer handling
     * 
     * This function creates the WebRTC peer connection, sets up event handlers
     * for file transfer, and manages the complete receiving workflow.
     */
    const setupConnection = () => {
      // Create WebRTC peer connection with multiple STUN servers for better mobile compatibility
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },      // Google STUN server 1
          { urls: 'stun:stun1.l.google.com:19302' },     // Google STUN server 2
          { urls: 'stun:stun2.l.google.com:19302' },     // Google STUN server 3
          { urls: 'stun:stun3.l.google.com:19302' },     // Google STUN server 4
          { urls: 'stun:stun4.l.google.com:19302' }      // Google STUN server 5
        ],
        iceCandidatePoolSize: 10  // Increase ICE candidate pool for better connectivity
      });

      // Add cleanup function for peer connection
      cleanupFunctions.push(() => pc.close());

      // File transfer state variables
      let chunks = [];              // Array to store received file chunks
      let totalSize = 0;           // Expected total file size
      let receivedSize = 0;        // Current received bytes
      let originalFileName = 'received_file'; // Default filename
      let startTime = null;        // Transfer start timestamp
      let lastProgressTime = null; // Last progress update time
      let lastReceivedSize = 0;    // Bytes received at last update

      // Join the session and provide device information
      socket.emit('join', { session, deviceInfo: getDeviceInfo() });
      setStatus('Joined WiFi session, waiting for sender...');
      setConnectionState('waiting');

      /**
       * Handle transfer start event from sender
       * Initializes file transfer state and UI
       */
      const handleTransferStart = ({ fileName, fileSize }) => {
        setTransferInfo({ fileName, fileSize });
        setStatus(`Receiving via WiFi: ${fileName}...`);
        setConnectionState('receiving');
        setHasStartedTransfer(true); // Mark that transfer has started
        totalSize = fileSize;
        startTime = Date.now();
        lastProgressTime = startTime;
      };

      /**
       * Handle transfer progress updates from sender
       * Updates progress bar and calculates transfer speed with throttling
       */
      const handleTransferProgress = ({ progress }) => {
        // Throttle progress updates to reduce flickering
        const now = Date.now();
        const { lastUpdateTime, lastReceivedSize, updateInterval } = speedCalculationRef.current;
        
        // Update progress immediately but throttle other calculations
        setDownloadProgress(progress);
        
        // Only update speed and time remaining every second
        if (now - lastUpdateTime >= updateInterval && totalSize > 0) {
          const currentReceivedSize = (progress / 100) * totalSize;
          
          if (lastUpdateTime > 0) {
            const timeDiff = (now - lastUpdateTime) / 1000;
            const sizeDiff = currentReceivedSize - lastReceivedSize;
            const speed = sizeDiff / timeDiff;
            
            setDownloadSpeed(speed);
            
            // Calculate time remaining based on current speed
            const remainingBytes = totalSize - currentReceivedSize;
            if (speed > 0) {
              const timeRem = remainingBytes / speed;
              setTimeRemaining(timeRem);
            } else if (downloadSpeed > 0) {
              // Use previous speed if current speed is 0
              const timeRem = remainingBytes / downloadSpeed;
              setTimeRemaining(timeRem);
            }
          }
          
          // Update speed calculation reference
          speedCalculationRef.current = {
            ...speedCalculationRef.current,
            lastUpdateTime: now,
            lastReceivedSize: currentReceivedSize,
          };
        }
        
        // Update status less frequently to reduce flickering
        if (now - lastUpdateTime >= updateInterval || progress === 100) {
          setStatus(`Receiving via WiFi... ${Math.round(progress)}%`);
        }
      };

      /**
       * Handle transfer completion event from sender
       * Updates UI to show completion status
       */
      const handleTransferComplete = () => {
        setStatus('WiFi transfer completed!');
        setConnectionState('completed');
        setDownloadProgress(100);
      };

      // Register Socket.IO event handlers
      socket.on('transfer-start', handleTransferStart);
      socket.on('transfer-progress', handleTransferProgress);
      socket.on('transfer-complete', handleTransferComplete);

      // Add cleanup functions for Socket.IO event handlers
      cleanupFunctions.push(() => {
        socket.off('transfer-start', handleTransferStart);
        socket.off('transfer-progress', handleTransferProgress);
        socket.off('transfer-complete', handleTransferComplete);
      });

      /**
       * Handle incoming WebRTC data channel from sender
       * This is where the actual file data is received
       */
      pc.ondatachannel = (event) => {
        const dc = event.channel;
        setStatus('Connected! Receiving file...');

        /**
         * Data channel open event
         * Confirms that the data channel is ready for file transfer
         */
        dc.onopen = () => {
          console.log('Receiver: Data channel opened successfully');
          setStatus('Data channel open, ready to receive...');
        };

        /**
         * Data channel error event
         * Handles any errors with the data channel
         */
        dc.onerror = (error) => {
          console.error('Receiver: Data channel error:', error);
          setStatus('Data channel error - please try again');
          setConnectionState('error');
        };

        /**
         * Data channel close event
         * Handles data channel closure
         */
        dc.onclose = () => {
          console.log('Receiver: Data channel closed');
          if (connectionState === 'receiving') {
            setStatus('Connection lost during transfer');
            setConnectionState('error');
          }
        };

        /**
         * Handle incoming file data from sender
         * Processes both metadata (filename) and binary file chunks
         */
        dc.onmessage = (e) => {
          if (typeof e.data === 'string') {
            if (e.data === 'EOF') {
              // Create and download file with enhanced mobile compatibility
              console.log('Receiver: Creating file blob from', chunks.length, 'chunks');
              const blob = new Blob(chunks);
              const url = URL.createObjectURL(blob);
              
              // Enhanced download method that works better on mobile
              const a = document.createElement('a');
              a.href = url;
              a.download = originalFileName;
              a.style.display = 'none';
              
              // For mobile browsers, we need to ensure the download triggers properly
              document.body.appendChild(a);
              
              // Try multiple methods to trigger download for better mobile compatibility
              try {
                a.click();
              } catch (err) {
                console.log('First download method failed, trying alternative...');
                // Alternative method for some mobile browsers
                if (navigator.userAgent.match(/iPhone|iPad|iPod|Android/i)) {
                  // For mobile, open in new window if direct download fails
                  window.open(url, '_blank');
                }
              }
              
              // Cleanup
              setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }, 100);
              
              console.log('Receiver: File download triggered successfully');
              setStatus('Download complete!');
              setDownloadProgress(100);
              setConnectionState('completed');
            } else {
              try {
                const message = JSON.parse(e.data);
                if (message.type === 'filename') {
                  originalFileName = message.name;
                  setStatus(`Receiving ${originalFileName}...`);
                  setConnectionState('receiving');
                }
              } catch {
                // ignore non-JSON strings
              }
            }
          } else {
            // Handle binary data chunks
            chunks.push(e.data);
            receivedSize += e.data.byteLength || e.data.size || 0;
            
            // Update progress and speed with throttling
            const currentTime = Date.now();
            if (startTime === null) {
              startTime = currentTime;
              speedCalculationRef.current.lastUpdateTime = currentTime;
            }
            
            // Calculate download speed less frequently
            const { lastUpdateTime, lastReceivedSize, updateInterval } = speedCalculationRef.current;
            if (currentTime - lastUpdateTime >= updateInterval) {
              const timeDiff = (currentTime - lastUpdateTime) / 1000;
              const sizeDiff = receivedSize - lastReceivedSize;
              const speed = sizeDiff / timeDiff;
              
              setDownloadSpeed(speed);
              
              // Calculate time remaining
              if (totalSize > 0 && speed > 0) {
                const remainingBytes = totalSize - receivedSize;
                const timeRemaining = remainingBytes / speed;
                setTimeRemaining(timeRemaining);
              }
              
              speedCalculationRef.current = {
                ...speedCalculationRef.current,
                lastUpdateTime: currentTime,
                lastReceivedSize: receivedSize,
              };
            }
            
            // Update progress
            const progress = totalSize > 0 ? (receivedSize / totalSize) * 100 : 0;
            setDownloadProgress(Math.round(progress));
            
            // Update status less frequently to reduce flickering
            if (currentTime - lastUpdateTime >= updateInterval || progress >= 100) {
              if (totalSize > 0) {
                const received = formatFileSize(receivedSize);
                const total = formatFileSize(totalSize);
                const speedText = downloadSpeed > 0 ? ` • ${formatSpeed(downloadSpeed)}` : '';
                setStatus(`Receiving ${originalFileName}... ${received}/${total} (${Math.round(progress)}%)${speedText}`);
              } else {
                setStatus(`Receiving ${originalFileName}... ${formatFileSize(receivedSize)} received`);
              }
            }
          }
        };

        /**
         * Handle data channel errors
         * Updates UI to show error state
         */
        dc.onerror = (error) => {
          console.error('Receiver: Data channel error:', error);
          setStatus('Error receiving file');
          setConnectionState('error');
        };

        /**
         * Handle data channel close
         * Cleanup when data channel is closed
         */
        dc.onclose = () => {
          console.log('Receiver: Data channel closed');
        };
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('Receiver: Sending ICE candidate', event.candidate.type);
          socket.emit('candidate', { session, candidate: event.candidate });
        } else {
          console.log('Receiver: ICE candidate gathering complete');
        }
      };

      // Add connection state monitoring for debugging
      pc.onconnectionstatechange = () => {
        console.log('Receiver: Connection state changed to', pc.connectionState);
        if (pc.connectionState === 'connected') {
          setStatus('WebRTC connection established!');
        } else if (pc.connectionState === 'failed') {
          console.error('Receiver: WebRTC connection failed');
          setStatus('Connection failed - please try again');
          setConnectionState('error');
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('Receiver: ICE connection state changed to', pc.iceConnectionState);
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          setStatus('Connected! Ready to receive files...');
        }
      };

      const handleOffer = async ({ offer }) => {
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
      };

      const handleCandidate = async ({ candidate }) => {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch {}
      };

      socket.on('offer', handleOffer);
      socket.on('candidate', handleCandidate);

      cleanupFunctions.push(() => {
        socket.off('offer', handleOffer);
        socket.off('candidate', handleCandidate);
      });
    };

    attemptConnection();

    return () => {
      isConnecting = false;
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [session]);

  // ============================================================================
  // COMPONENT RENDER
  // ============================================================================


  return (
    <div className="receiver-container">
      <div className="receiver-box">
        <h1 className="receiver-title">
          <a href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            📥 The File Share - Receiver
          </a>
        </h1>
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

      

        {/* File Info Card */}
        {transferInfo && (
          <div className="file-info-card">
            <div className="file-details">
              <h3 className="file-name">{transferInfo.fileName}</h3>
              <div className="file-meta">
                <span className="file-size">{formattedFileSize}</span>
                {downloadSpeed > 0 && (
                  <>
                    <span className="file-speed">• {formattedSpeed}</span>
                    {hasStartedTransfer && downloadProgress < 100 && formattedTimeRemaining && (
                      <span className="file-eta">• {formattedTimeRemaining} remaining</span>
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
              <span className="progress-percentage">{formattedProgress}%</span>
            </div>
            <div className="progress-bar-container">
              <div className="progress-bar">
                <div 
                  className="progress-inner" 
                  style={{ width: `${formattedProgress}%` }}
                ></div>
              </div>
            </div>
            {transferInfo && (
              <div className="progress-stats">
                <span className="received-size">
                  {formattedReceivedSize} of {formattedFileSize}
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
