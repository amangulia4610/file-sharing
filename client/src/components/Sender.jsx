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

  const getDeviceInfo = () => ({
    type: 'sender',
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
  });

  const createSession = () => {
    const session = Math.random().toString(36).substring(2, 8);
    setSessionId(session);
    // Include the base path for GitHub Pages deployment
    const baseUrl = import.meta.env.PROD 
      ? `${window.location.origin}/file-sharing`
      : window.location.origin;
    setQrCode(`${baseUrl}/receive/${session}`);
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
    const file = fileInputRef.current.files[0];
    if (!file || connectedDevices.length === 0) return;

    const currentSession = sessionId;
    setIsTransferring(true);
    setCurrentFile(file);
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
    if (peerConnection) peerConnection.close();
    setPeerConnection(null);
    socket.off('device-joined');
    socket.off('device-left');
    socket.off('session-info');
  };

  return (
    <div className="sender-container">
      <div className="sender-box">
        <h1 className="sender-title">📤 Send a File</h1>
        {!sessionId ? (
          <>
            <p className="sender-subtext">Start a new session to share files securely over your local network.</p>
            <button onClick={createSession} className="btn btn-primary">🔐 Create Secure Session</button>
          </>
        ) : (
          <>
            <input type="file" ref={fileInputRef} className="file-input" />
            <div className="btn-group">
              <button onClick={startSending} disabled={isTransferring} className={`btn ${isTransferring ? 'btn-disabled' : 'btn-success'}`}>{isTransferring ? 'Sending...' : '🚀 Send File'}</button>
              <button onClick={resetSession} className="btn btn-danger">🔁 Reset</button>
            </div>
          </>
        )}

        {sessionId && (
          <div className="info-box">
            <div className="info-title">Connected Devices ({connectedDevices.length})</div>
            {connectedDevices.length === 0 ? (
              <p className="info-text">Waiting for devices to connect...</p>
            ) : (
              <ul className="info-list">
                {connectedDevices.map((device, i) => (<li key={device.id}>📱 {device.deviceType} #{i + 1}</li>))}
              </ul>
            )}
          </div>
        )}

        {isTransferring && currentFile && (
          <div className="progress-box">
            <div className="progress-title">📁 Sending: {currentFile.name}</div>
            <div className="progress-sub">Size: {(currentFile.size / 1024 / 1024).toFixed(2)} MB</div>
            <div className="progress-bar">
              <div className="progress-inner" style={{ width: `${transferProgress}%` }}></div>
            </div>
            <div className="progress-text">{transferProgress}%</div>
          </div>
        )}

        {qrCode && (
          <div className="qr-box">
            <p className="qr-text">Scan QR or open this link on the receiving device:</p>
            <div className="qr-image"><QRCodeSVG value={qrCode} size={180} /></div>
            <p className="qr-code">{qrCode}</p>
            <p className="qr-session">Session ID: <span>{sessionId}</span></p>
          </div>
        )}
      </div>
    </div>
  );
}
