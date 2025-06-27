
// File: client/src/components/Receiver.jsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import config from '../config.js';

const socket = io(config.SOCKET_URL);

export default function Receiver() {
  const { session } = useParams();
  const [status, setStatus] = useState('Connecting...');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [transferInfo, setTransferInfo] = useState(null);

  const getDeviceInfo = () => {
    return {
      type: 'receiver',
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
    };
  };

  useEffect(() => {
    console.log('Receiver starting for session:', session);
    
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

    // Join the session with device info
    socket.emit('join', { session, deviceInfo: getDeviceInfo() });
    setStatus('Joined session, waiting for sender...');

    // Listen for transfer events
    socket.on('transfer-start', ({ fileName, fileSize }) => {
      console.log('Transfer starting:', fileName, fileSize);
      setTransferInfo({ fileName, fileSize });
      setStatus(`Receiving ${fileName}...`);
      totalSize = fileSize;
    });

    socket.on('transfer-progress', ({ progress }) => {
      setDownloadProgress(progress);
      setStatus(`Receiving... ${progress}%`);
    });

    socket.on('transfer-complete', () => {
      console.log('Transfer completed');
      setStatus('Transfer completed!');
    });

    pc.ondatachannel = (event) => {
      console.log('Data channel received');
      const dc = event.channel;
      setStatus('Connected! Receiving file...');

      dc.onopen = () => {
        console.log('Data channel opened');
        setStatus('Data channel open, ready to receive...');
      };

      dc.onmessage = (e) => {
        console.log('Received data chunk');
        
        // Check if this is the filename message
        if (typeof e.data === 'string') {
          if (e.data === 'EOF') {
            console.log('File transfer complete');
            const blob = new Blob(chunks);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = originalFileName; // Use original filename
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
                console.log('Received filename:', originalFileName);
                setStatus(`Receiving ${originalFileName}...`);
              }
            } catch (err) {
              // Not a JSON message, might be some other string data
              console.log('Received non-JSON string data');
            }
          }
        } else {
          // This is file data
          chunks.push(e.data);
          receivedSize += e.data.byteLength || e.data.size || 0;
          const progress = totalSize > 0 ? (receivedSize / totalSize) * 100 : 0;
          setDownloadProgress(Math.round(progress));
          setStatus(`Receiving ${originalFileName}... ${Math.round(progress)}%`);
        }
      };

      dc.onerror = (error) => {
        console.error('Data channel error:', error);
        setStatus('Error receiving file');
      };
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Sending ICE candidate');
        socket.emit('candidate', { session, candidate: event.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setStatus('WebRTC connected, waiting for data...');
      } else if (pc.connectionState === 'failed') {
        setStatus('Connection failed');
      }
    };

    // Listen for offer from sender
    socket.on('offer', async ({ offer }) => {
      try {
        console.log('Received offer');
        setStatus('Received offer, creating answer...');
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', { session, answer });
        setStatus('Answer sent, establishing connection...');
      } catch (error) {
        console.error('Error handling offer:', error);
        setStatus('Error processing offer');
      }
    });

    socket.on('candidate', async ({ candidate }) => {
      try {
        console.log('Received ICE candidate');
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    });

    socket.on('connect', () => {
      console.log('Socket connected');
      setStatus('Connected to server, waiting for sender...');
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setStatus('Disconnected from server');
    });

    // Cleanup function
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
  }, [session]);

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">P2P File Receiver</h1>
      <div className="bg-gray-100 p-4 rounded-lg">
        <p className="mb-2">Session: <span className="font-mono text-sm">{session}</span></p>
        <p className="mb-4">{status}</p>
        
        {transferInfo && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">Incoming File</h3>
            <p className="text-sm text-blue-600 mb-1">📄 {transferInfo.fileName}</p>
            <p className="text-xs text-blue-500">Size: {(transferInfo.fileSize / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        )}
        
        {downloadProgress > 0 && downloadProgress < 100 && (
          <div className="mb-4">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${downloadProgress}%` }}
              ></div>
            </div>
            <p className="text-center text-sm text-gray-700 mt-1">{downloadProgress}%</p>
          </div>
        )}
        
        {downloadProgress === 100 && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 font-semibold">✅ File downloaded successfully!</p>
          </div>
        )}
      </div>
    </div>
  );
}