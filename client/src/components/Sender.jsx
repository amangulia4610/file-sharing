
// File: client/src/components/Sender.jsx
import { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import io from 'socket.io-client';

const socket = io('http://10.0.0.15:4000');

export default function Sender() {
  const fileInputRef = useRef();
  const [sessionId, setSessionId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [peerConnection, setPeerConnection] = useState(null);
  const [connectedDevices, setConnectedDevices] = useState([]);
  const [transferProgress, setTransferProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState(null);

  const getDeviceInfo = () => {
    return {
      type: 'sender',
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
    };
  };

  const createSession = () => {
    const session = Math.random().toString(36).substring(2, 8);
    setSessionId(session);
    setQrCode(`${window.location.origin}/receive/${session}`);
    
    // Join session as sender
    socket.emit('join', { session, deviceInfo: getDeviceInfo() });
    
    // Listen for device events
    socket.on('device-joined', ({ device, totalDevices }) => {
      console.log('Device joined:', device);
      setConnectedDevices(prev => [...prev, device]);
    });
    
    socket.on('device-left', ({ socketId, totalDevices }) => {
      console.log('Device left:', socketId);
      setConnectedDevices(prev => prev.filter(device => device.id !== socketId));
    });
    
    socket.on('session-info', ({ devices }) => {
      console.log('Session info:', devices);
      setConnectedDevices(devices.filter(device => device.type !== 'sender'));
    });
    
    return session;
  };

  const startSending = async () => {
    const file = fileInputRef.current.files[0];
    if (!file) {
      alert('Please select a file to send.');
      return;
    }

    if (connectedDevices.length === 0) {
      alert('No receiver devices connected. Please make sure a device has scanned the QR code.');
      return;
    }

    // Use existing session
    const currentSession = sessionId;

    setIsTransferring(true);
    setCurrentFile(file);
    setTransferProgress(0);

    // Notify about transfer start
    socket.emit('transfer-start', { 
      session: currentSession, 
      fileName: file.name, 
      fileSize: file.size 
    });

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });
    
    setPeerConnection(pc);
    const dc = pc.createDataChannel('file');

    console.log('Starting file transfer for session:', currentSession);

    // Join session first
    socket.emit('join', { session: currentSession });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Sending ICE candidate');
        socket.emit('candidate', { session: currentSession, candidate: event.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        console.log('WebRTC connection established');
      }
    };

    // Create and send offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    console.log('Sending offer');
    socket.emit('offer', { session: currentSession, offer });

    socket.on('answer', async ({ answer }) => {
      try {
        console.log('Received answer');
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (error) {
        console.error('Error setting remote description:', error);
      }
    });

    socket.on('candidate', async ({ candidate }) => {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    });

    dc.onopen = () => {
      console.log('Data channel opened, starting file transfer');
      const chunkSize = 16384;
      let offset = 0;

      const reader = new FileReader();
      reader.onload = (e) => {
        const arrayBuffer = e.target.result;
        const totalSize = arrayBuffer.byteLength;
        console.log('Sending file in chunks, total size:', totalSize);
        
        // First, send the filename
        dc.send(JSON.stringify({ type: 'filename', name: file.name }));
        
        const sendChunk = () => {
          if (offset < totalSize) {
            const chunk = arrayBuffer.slice(offset, offset + chunkSize);
            dc.send(chunk);
            offset += chunkSize;
            
            // Update progress
            const progress = Math.round((offset / totalSize) * 100);
            setTransferProgress(progress);
            socket.emit('transfer-progress', { session: currentSession, progress });
            
            // Continue sending chunks
            setTimeout(sendChunk, 10); // Small delay to prevent overwhelming
          } else {
            // Send end marker
            dc.send('EOF');
            console.log('File transfer complete');
            setTransferProgress(100);
            socket.emit('transfer-complete', { session: currentSession });
            setIsTransferring(false);
          }
        };
        
        sendChunk();
      };
      reader.readAsArrayBuffer(file);
    };

    dc.onerror = (error) => {
      console.error('Data channel error:', error);
      setIsTransferring(false);
    };
  };

  const resetSession = () => {
    setSessionId('');
    setQrCode('');
    setIsTransferring(false);
    setConnectedDevices([]);
    setTransferProgress(0);
    setCurrentFile(null);
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }
    // Remove socket listeners
    socket.off('device-joined');
    socket.off('device-left');
    socket.off('session-info');
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">P2P File Sender</h1>
      
      <div className="mb-4">
        {!sessionId ? (
          // No session created yet
          <div>
            <p className="text-gray-600 mb-4">Create a session to get started</p>
            <button 
              onClick={createSession}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 w-full"
            >
              Create New Session
            </button>
          </div>
        ) : (
          // Session exists
          <div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="mb-4 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
            />
            
            <div className="flex gap-2">
              <button 
                onClick={startSending} 
                disabled={isTransferring}
                className={`flex-1 px-4 py-2 rounded text-white ${
                  isTransferring 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                {isTransferring ? 'Sending...' : 'Send File'}
              </button>
              
              <button 
                onClick={resetSession}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                New Session
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Connected Devices */}
      {sessionId && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-semibold text-green-800 mb-2">Connected Devices ({connectedDevices.length})</h3>
          {connectedDevices.length === 0 ? (
            <p className="text-green-600 text-sm">Waiting for devices to scan QR code...</p>
          ) : (
            <div className="space-y-2">
              {connectedDevices.map((device, index) => (
                <div key={device.id} className="bg-white p-2 rounded border text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      📱 {device.deviceType === 'mobile' ? 'Mobile' : 'Desktop'} Device #{index + 1}
                    </span>
                    <span className="text-green-600 text-xs">Connected</span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {new Date(device.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Transfer Progress */}
      {isTransferring && currentFile && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">Sending File</h3>
          <p className="text-sm text-blue-600 mb-2">📄 {currentFile.name}</p>
          <p className="text-xs text-blue-500 mb-2">Size: {(currentFile.size / 1024 / 1024).toFixed(2)} MB</p>
          <div className="w-full bg-blue-200 rounded-full h-3">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all duration-300" 
              style={{ width: `${transferProgress}%` }}
            ></div>
          </div>
          <p className="text-center text-sm text-blue-700 mt-1">{transferProgress}%</p>
        </div>
      )}
      
      {qrCode && (
        <div className="mt-4 p-4 bg-gray-100 rounded-lg">
          <p className="mb-2 text-sm">Scan this QR or open link on receiver device:</p>
          <div className="flex justify-center mb-2">
            <QRCodeSVG value={qrCode} size={200} />
          </div>
          <p className="text-xs break-all bg-white p-2 rounded border">
            <span className="font-mono">{qrCode}</span>
          </p>
          <p className="text-xs text-gray-600 mt-2">
            Session ID: <span className="font-mono">{sessionId}</span>
          </p>
        </div>
      )}
    </div>
  );
}