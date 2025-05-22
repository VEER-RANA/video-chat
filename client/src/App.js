import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import './App.css'; // Optional external CSS



function App() {
  const socket = io('http://localhost:5000');
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  // const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  // const localStream = useRef(null);
  const [showChat, setShowChat] = useState(false);

  const [roomId, setRoomId] = useState('');
  const [joined, setJoined] = useState(false);

  const config = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' }
    ]
  };

  const localVideoRef = useRef(null);
const localStream = useRef(null);

useEffect(() => {
  const getMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStream.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Media error:", err);
      alert("Please allow camera/mic to use the app.");
    }
  };

  getMedia();
}, []);


  // useEffect(() => {
  //   socket.on('user-joined', async () => {
  //     await createPeerConnection(true);
  //   });

  //   socket.on('offer', async ({ offer }) => {
  //     await createPeerConnection(false, offer);
  //   });

  //   socket.on('answer', async ({ answer }) => {
  //     await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
  //   });

  //   socket.on('ice-candidate', async ({ candidate }) => {
  //     try {
  //       await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
  //     } catch (e) {
  //       console.error('Error adding ICE candidate', e);
  //     }
  //   });

  //   return () => {
  //     socket.disconnect();
  //   };
  // }, [roomId]);

  const createPeerConnection = async (isCaller, offer = null) => {
    peerConnection.current = new RTCPeerConnection(config);

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', { candidate: event.candidate, roomId });
      }
    };

    peerConnection.current.ontrack = (event) => {
      remoteVideoRef.current.srcObject = event.streams[0];
    };

    localStream.current.getTracks().forEach(track => {
      peerConnection.current.addTrack(track, localStream.current);
    });

    if (isCaller) {
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      socket.emit('offer', { offer, roomId });
    } else {
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      socket.emit('answer', { answer, roomId });
    }
  };

  const startLocalVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localVideoRef.current.srcObject = stream;
      localStream.current = stream;
    } catch (error) {
      console.error('Error starting video:', error);
    }
  };

  const handleJoinRoom = async () => {
    if (!roomId.trim()) return;
    await startLocalVideo();
    socket.emit('join-room', roomId);
    setJoined(true);
  };

  const handleLeaveRoom = () => {
    if (peerConnection.current) peerConnection.current.close();
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setRoomId('');
    setJoined(false);
  };

  const toggleMic = () => {
    if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setMicOn(audioTrack.enabled);
    }
  };

  const toggleVideo = () => {
    if (localStream.current) {
      const videoTrack = localStream.current.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setVideoOn(videoTrack.enabled);
    }
  };

  const sendMessage = () => {
    if (newMessage.trim()) {
      socket.emit('chat-message', { message: newMessage, roomId });
      setMessages(prev => [...prev, { type: 'local', text: newMessage }]);
      setNewMessage('');
    }
  };

  const deleteMessage = (indexToDelete) => {
    setMessages(prev => prev.filter((_, i) => i !== indexToDelete));
  };


  return (
    <div className="app-container">
      <h1 className="title">🔥 Video Chat</h1>
      {!joined && (
        <div className="join-box">
          <input
            className="input"
            placeholder="Enter Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
          <button className="btn join" onClick={handleJoinRoom}>Join Room</button>
        </div>
      )}
      {joined && (
        <>
          <div className="join-box">
            <p>✅ In Room: <b>{roomId}</b></p>
            <button className="btn leave" onClick={handleLeaveRoom}>Leave</button>
          </div>

          <div className="controls">
            <button className="btn mic" onClick={toggleMic}>
              {micOn ? 'Mute 🎤' : 'Unmute 🔇'}
            </button>
            <button className="btn video" onClick={toggleVideo}>
              {videoOn ? 'Turn Video Off 📵' : 'Turn Video On 🎥'}
            </button>
          </div>
        </>
      )}

      <div className="video-section">
        <div className="video-box">
          <p>🧍 You</p>
          <video ref={localVideoRef} autoPlay muted playsInline />
        </div>
        <div className="video-box">
          <p>👤 Friend</p>
          <video ref={remoteVideoRef} autoPlay playsInline />
        </div>
      </div>

      {joined && (
        <button className="btn chat-toggle" onClick={() => setShowChat(!showChat)}>
          {showChat ? '❌ Close Chat' : '💬 Open Chat'}
        </button>
      )}

      {joined && showChat && (
        <div className="chat-section">
          <div className="chat-box">
            <h3>💬 Chat</h3>
            <div className="messages">
              {messages.map((msg, index) => (
                <div key={index} className={`message ${msg.type}`} style={{ position: 'relative', paddingRight: '24px' }}>
                  {msg.text}
                  <button
                    onClick={() => deleteMessage(index)}
                    style={{
                      position: 'absolute',
                      right: '4px',
                      top: '2px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      color: '#888',
                    }}
                    title="Delete message"
                  >
                    🗑️
                  </button>
                </div>
              ))}

            </div>
            <div className="chat-input">
              <input
                type="text"
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              />
              <button className="btn send" onClick={sendMessage}>Send</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );

}

export default App;
