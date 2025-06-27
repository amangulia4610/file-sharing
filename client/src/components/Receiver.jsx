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

  const getDeviceInfo = () => ({
    type: 'receiver',
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
  });

  useEffect(() => {
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

    socket.emit('join', { session, deviceInfo: getDeviceInfo() });
    setStatus('Joined WiFi session, waiting for sender...');

    socket.on('transfer-start', ({ fileName, fileSize }) => {
      setTransferInfo({ fileName, fileSize });
      setStatus(`Receiving via WiFi: ${fileName}...`);
      totalSize = fileSize;
    });

    socket.on('transfer-progress', ({ progress }) => {
      setDownloadProgress(progress);
      setStatus(`Receiving via WiFi... ${progress}%`);
    });

    socket.on('transfer-complete', () => {
      setStatus('WiFi transfer completed!');
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
  }, [session]);

  return (
    <div className="receiver-container">
      <div className="receiver-box">
        <h1 className="receiver-title">📥 The File Share - Receiver</h1>
        <p className="receiver-subtitle">📶 Receiving files via WiFi connection</p>
        <p className="receiver-session">Session: <span>{session}</span></p>
        <p className="receiver-status">{status}</p>

        {transferInfo && (
          <div className="info-box">
            <div className="info-title">📡 Incoming File via WiFi</div>
            <p className="info-text">📄 {transferInfo.fileName}</p>
            <p className="info-subtext">Size: {(transferInfo.fileSize / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        )}

        {downloadProgress > 0 && downloadProgress < 100 && (
          <div className="progress-box">
            <div className="progress-bar">
              <div className="progress-inner" style={{ width: `${downloadProgress}%` }}></div>
            </div>
            <div className="progress-text">{downloadProgress}%</div>
          </div>
        )}

        {downloadProgress === 100 && (
          <div className="success-box">
            ✅ File downloaded successfully!
          </div>
        )}
      </div>
    </div>
  );
}
