import React, { useEffect, useRef, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Phone, Monitor, MessageSquare } from 'lucide-react';
import './index.css';

const SIGNALING_SERVER_URL = 'http://localhost:5000';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export const App: React.FC = () => {
  const [userId, setUserId] = useState<string>(() => 'user_' + Math.floor(Math.random() * 1000));
  const [targetId, setTargetId] = useState<string>('');
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [callState, setCallState] = useState<'IDLE' | 'CALLING' | 'INCOMING' | 'CONNECTED'>('IDLE');
  const [callerId, setCallerId] = useState<string>('');

  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [videoEnabled, setVideoEnabled] = useState<boolean>(true);
  const [screenSharing, setScreenSharing] = useState<boolean>(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    socketRef.current = io(SIGNALING_SERVER_URL);

    socketRef.current.on('user:online_list', (users: string[]) => {
      setOnlineUsers(users.filter(u => u !== userId));
    });

    socketRef.current.on('call:incoming', (data: { fromUserId: string }) => {
      setCallerId(data.fromUserId);
      setCallState('INCOMING');
    });

    socketRef.current.on('call:answered', async (data: { accepted: boolean; fromUserId: string }) => {
      if (data.accepted) {
        setCallState('CONNECTED');
        await createOffer(data.fromUserId);
      } else {
        alert('Call was rejected.');
        resetCall();
      }
    });

    socketRef.current.on('webrtc:offer', async (data: { fromUserId: string; sdp: RTCSessionDescriptionInit }) => {
      await handleOffer(data.fromUserId, data.sdp);
    });

    socketRef.current.on('webrtc:answer', async (data: { sdp: RTCSessionDescriptionInit }) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
      }
    });

    socketRef.current.on('webrtc:ice-candidate', async (data: { candidate: RTCIceCandidateInit }) => {
      if (peerConnectionRef.current && data.candidate) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.error('Error adding ICE candidate', e);
        }
      }
    });

    socketRef.current.on('call:ended', () => {
      resetCall();
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [userId]);

  const registerUser = () => {
    if (userId.trim()) {
      socketRef.current?.emit('user:register', userId);
      setIsRegistered(true);
      startLocalStream();
    }
  };

  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Failed to get local stream', err);
    }
  };

  const initPeerConnection = (targetUser: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit('webrtc:ice-candidate', {
          toUserId: targetUser,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    peerConnectionRef.current = pc;
    return pc;
  };

  const startCall = (target: string) => {
    setTargetId(target);
    setCallState('CALLING');
    socketRef.current?.emit('call:request', {
      toUserId: target,
      callerInfo: { id: userId, username: userId }
    });
  };

  const acceptCall = async () => {
    setCallState('CONNECTED');
    socketRef.current?.emit('call:response', {
      toUserId: callerId,
      accepted: true
    });
  };

  const rejectCall = () => {
    socketRef.current?.emit('call:response', {
      toUserId: callerId,
      accepted: false
    });
    resetCall();
  };

  const createOffer = async (targetUser: string) => {
    const pc = initPeerConnection(targetUser);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socketRef.current?.emit('webrtc:offer', {
      toUserId: targetUser,
      sdp: offer
    });
  };

  const handleOffer = async (targetUser: string, offerSdp: RTCSessionDescriptionInit) => {
    setTargetId(targetUser);
    const pc = initPeerConnection(targetUser);
    await pc.setRemoteDescription(new RTCSessionDescription(offerSdp));

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socketRef.current?.emit('webrtc:answer', {
      toUserId: targetUser,
      sdp: answer
    });
  };

  const endCall = () => {
    socketRef.current?.emit('call:end', { toUserId: targetId || callerId });
    resetCall();
  };

  const resetCall = () => {
    setCallState('IDLE');
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    setCallerId('');
    setTargetId('');
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (!screenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];

        if (peerConnectionRef.current) {
          const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        }

        screenTrack.onended = () => {
          revertToCameraTrack();
        };

        setScreenSharing(true);
      } catch (err) {
        console.error('Error starting screen share', err);
      }
    } else {
      revertToCameraTrack();
    }
  };

  const revertToCameraTrack = () => {
    if (localStreamRef.current && peerConnectionRef.current) {
      const cameraTrack = localStreamRef.current.getVideoTracks()[0];
      const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
      if (sender && cameraTrack) {
        sender.replaceTrack(cameraTrack);
      }
    }
    setScreenSharing(false);
  };

  if (!isRegistered) {
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center' }}>
        <div className="glass-panel" style={{ padding: '32px', width: '360px', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '16px' }}>Join P2P Video Call</h2>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Enter your Username/ID"
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #334155',
              background: '#0f172a',
              color: '#fff',
              marginBottom: '16px'
            }}
          />
          <button className="btn-primary" style={{ width: '100%' }} onClick={registerUser}>
            Connect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', padding: '16px', gap: '16px' }}>
      {/* Sidebar for Online Users */}
      <div className="glass-panel" style={{ width: '280px', padding: '16px', display: 'flex', flexDirection: 'column' }}>
        <h3>Logged as: {userId}</h3>
        <hr style={{ borderColor: '#334155', margin: '12px 0' }} />
        <h4>Online Users ({onlineUsers.length})</h4>
        <div style={{ flex: 1, overflowY: 'auto', marginTop: '12px' }}>
          {onlineUsers.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No other users online. Open another window to test!</p>
          ) : (
            onlineUsers.map(u => (
              <div
                key={u}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  background: 'var(--bg-card)',
                  borderRadius: '8px',
                  marginBottom: '8px'
                }}
              >
                <span>{u}</span>
                <button
                  className="btn-primary"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                  onClick={() => startCall(u)}
                  disabled={callState !== 'IDLE'}
                >
                  <Phone size={14} /> Call
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Video View Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {callState === 'INCOMING' && (
          <div
            className="glass-panel"
            style={{
              position: 'absolute',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 100,
              padding: '16px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}
          >
            <span>Incoming Call from <strong>{callerId}</strong></span>
            <button className="btn-primary" style={{ background: 'var(--success)' }} onClick={acceptCall}>Accept</button>
            <button className="btn-primary" style={{ background: 'var(--danger)' }} onClick={rejectCall}>Reject</button>
          </div>
        )}

        <div className={`video-grid ${callState === 'CONNECTED' ? 'connected' : ''}`}>
          <div className="video-container">
            <video ref={localVideoRef} autoPlay playsInline muted />
            <div className="video-overlay-info">You ({userId})</div>
          </div>

          {callState === 'CONNECTED' && (
            <div className="video-container">
              <video ref={remoteVideoRef} autoPlay playsInline />
              <div className="video-overlay-info">Remote User</div>
            </div>
          )}
        </div>

        {/* Controls Toolbar */}
        <div className="control-bar glass-panel">
          <button className={`btn-circle ${!audioEnabled ? 'active-off' : ''}`} onClick={toggleAudio}>
            {audioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
          </button>

          <button className={`btn-circle ${!videoEnabled ? 'active-off' : ''}`} onClick={toggleVideo}>
            {videoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
          </button>

          <button className={`btn-circle ${screenSharing ? 'active-off' : ''}`} onClick={toggleScreenShare}>
            <Monitor size={20} />
          </button>

          {callState !== 'IDLE' && (
            <button className="btn-circle end-call" onClick={endCall}>
              <PhoneOff size={24} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
