import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import Peer from 'simple-peer';
import {
  FiMic, FiMicOff, FiVideo, FiVideoOff, FiMonitor,
  FiPhoneMissed
} from 'react-icons/fi';
import { BsRecordCircle } from 'react-icons/bs';
import { useAuth } from '../../contexts/AuthContext';

// Extract base URL for socket.io (remove '/api' if present)
const getSocketUrl = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  return apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : apiUrl;
};

interface PeerRef {
  peerID: string;
  peer: Peer.Instance;
}

const CallRoom = () => {
  const router = useRouter();
  const { id: roomId } = router.query;
  const { user } = useAuth();

  const [peers, setPeers] = useState<PeerRef[]>([]);
  const socketRef = useRef<Socket | undefined>(undefined);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const peersRef = useRef<PeerRef[]>([]);
  const localStreamRef = useRef<MediaStream | undefined>(undefined);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!roomId) return;
    
    // Initialize Socket
    socketRef.current = io(getSocketUrl());

    // Get Local Stream
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        socketRef.current?.emit('join-room', roomId);

        socketRef.current?.on('all-users', (usersInRoom: string[]) => {
          const peersList: PeerRef[] = [];
          usersInRoom.forEach((userId) => {
            const peer = createPeer(userId, socketRef.current!.id, stream);
            peersRef.current.push({
              peerID: userId,
              peer,
            });
            peersList.push({
              peerID: userId,
              peer,
            });
          });
          setPeers(peersList);
        });

        socketRef.current?.on('user-joined', (payload: any) => {
          const peer = addPeer(payload.signal, payload.callerID, stream);
          const peerObj = {
            peerID: payload.callerID,
            peer,
          };
          peersRef.current.push(peerObj);
          setPeers((users) => [...users, peerObj]);
        });

        socketRef.current?.on('receiving-returned-signal', (payload: any) => {
          const item = peersRef.current.find((p) => p.peerID === payload.id);
          if (item) {
            item.peer.signal(payload.signal);
          }
        });

        socketRef.current?.on('user-disconnected', (userId: string) => {
          const peerObj = peersRef.current.find((p) => p.peerID === userId);
          if (peerObj) peerObj.peer.destroy();
          const pRef = peersRef.current.filter((p) => p.peerID !== userId);
          peersRef.current = pRef;
          setPeers(pRef);
        });
      })
      .catch((err) => {
        console.error("Failed to get local stream", err);
        setErrorMsg('Camera and Microphone permission denied or unavailable.');
      });

    return () => {
      socketRef.current?.disconnect();
      peersRef.current.forEach((p) => p.peer.destroy());
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [roomId]);

  function createPeer(userToSignal: string, callerID: string | undefined, stream: MediaStream) {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
    });

    peer.on('signal', (signal) => {
      socketRef.current?.emit('sending-signal', {
        userToSignal,
        callerID,
        signal,
      });
    });

    return peer;
  }

  function addPeer(incomingSignal: any, callerID: string, stream: MediaStream) {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
    });

    peer.on('signal', (signal) => {
      socketRef.current?.emit('returning-signal', { signal, callerID });
    });

    peer.signal(incomingSignal);

    return peer;
  }

  // --- Controls ---
  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks().find(t => !t.label.includes('screen'));
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoDisabled(!videoTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ 
          video: true,
          audio: true // allows system audio for youtube viewing
        });
        
        const screenTrack = displayStream.getVideoTracks()[0];
        
        // Replace video track for all peers
        peersRef.current.forEach(({ peer }) => {
          const oldVideoTrack = localStreamRef.current?.getVideoTracks()[0];
          if (oldVideoTrack) {
            peer.replaceTrack(oldVideoTrack, screenTrack, localStreamRef.current!);
          }
        });
        
        // Show local screen stream
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = displayStream;
        }

        screenTrack.onended = () => {
          stopScreenShare();
        };

        setIsScreenSharing(true);
      } catch (err) {
        console.error("Failed to share screen", err);
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = () => {
    if (localStreamRef.current && localVideoRef.current) {
      const originalVideoTrack = localStreamRef.current.getVideoTracks().find(t => t.readyState === 'live' || !t.label.includes('screen'));
      
      // Stop display tracks
      const currentStream = localVideoRef.current.srcObject as MediaStream;
      currentStream?.getTracks().forEach(track => {
        if (track.label.includes('screen')) track.stop();
      });

      if (originalVideoTrack) {
        peersRef.current.forEach(({ peer }) => {
          const currentTrack = currentStream.getVideoTracks()[0];
          peer.replaceTrack(currentTrack, originalVideoTrack, localStreamRef.current!);
        });
        localVideoRef.current.srcObject = localStreamRef.current;
        setIsScreenSharing(false);
      }
    }
  };

  const toggleRecording = () => {
    if (!isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
  };

  const startRecording = () => {
    if (!localStreamRef.current) return;
    recordedChunksRef.current = [];
    
    // Attempt to record all peers by merging streams... for simplicity, record local stream (could be screen share with sys audio)
    // For a real meeting recorder, you'd need a canvas or complex WebAudio mix. We will just record the local stream.
    const stream = localVideoRef.current?.srcObject as MediaStream || localStreamRef.current;
    
    const options = { mimeType: 'video/webm; codecs=vp9' };
    mediaRecorderRef.current = new MediaRecorder(stream, options);

    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      document.body.appendChild(a);
      a.style.display = 'none';
      a.href = url;
      a.download = `meeting-record-${new Date().getTime()}.webm`;
      a.click();
      window.URL.revokeObjectURL(url);
    };

    mediaRecorderRef.current.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const leaveCall = () => {
    router.push('/calls');
  };

   return (
    <>
      <div className="flex flex-col h-[85vh] bg-[#121212] p-4 text-white rounded-lg gap-4">
        {/* Header */}
        <div className="bg-[#1f1f1f] p-4 rounded-xl flex items-center justify-between shadow-md">
          <h2 className="text-xl font-bold flex flex-col">
            Call Room
            <span className="text-sm font-normal text-gray-400">ID: {roomId}</span>
          </h2>
          {isRecording && (
            <div className="flex items-center gap-2 text-red-500 font-semibold animate-pulse">
              <span className="w-3 h-3 bg-red-600 rounded-full inline-block"></span>
              Recording
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="bg-red-500/20 text-red-500 p-4 rounded-lg border border-red-500 text-center">
            {errorMsg}
          </div>
        )}

        {/* Video Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="relative bg-black rounded-xl overflow-hidden aspect-video shadow-lg border-2 border-[#2a2a2a]">
            <video
              className="w-full h-full object-cover transform scale-x-[-1]"
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
            />
            <div className="absolute bottom-2 left-2 bg-black/60 px-3 py-1 rounded text-sm backdrop-blur-sm">
              You {user?.displayName ? `(${user.displayName})` : ''}
            </div>
            {isScreenSharing && (
              <div className="absolute top-2 left-2 bg-blue-600 px-3 py-1 rounded text-xs font-bold uppercase tracking-wide">
                Screen Shared
              </div>
            )}
            {isAudioMuted && (
              <div className="absolute top-2 right-2 bg-red-600 p-1.5 rounded-full text-white">
                <FiMicOff className="w-4 h-4" />
              </div>
            )}
          </div>
          
          {peers.map((peer, index) => (
            <Video key={peer.peerID} peer={peer.peer} index={index + 1} />
          ))}
        </div>

        {/* Controls */}
        <div className="bg-[#1f1f1f] p-4 rounded-xl flex items-center justify-center gap-4 shadow-md mt-auto">
          <button
            onClick={toggleAudio}
            className={`p-4 rounded-full transition-all ${
              isAudioMuted ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-[#333] hover:bg-[#444] text-white'
            }`}
            title="Toggle Microphone"
          >
            {isAudioMuted ? <FiMicOff size={24} /> : <FiMic size={24} />}
          </button>
          
          <button
            onClick={toggleVideo}
            className={`p-4 rounded-full transition-all ${
              isVideoDisabled ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-[#333] hover:bg-[#444] text-white'
            }`}
            title="Toggle Camera"
          >
            {isVideoDisabled ? <FiVideoOff size={24} /> : <FiVideo size={24} />}
          </button>

          <button
            onClick={toggleScreenShare}
            className={`p-4 rounded-full transition-all ${
              isScreenSharing ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]' : 'bg-[#333] hover:bg-[#444] text-white'
            }`}
            title="Share Screen"
          >
            <FiMonitor size={24} />
          </button>

          <button
            onClick={toggleRecording}
            className={`p-4 rounded-full transition-all flex items-center gap-2 px-6 ${
              isRecording 
                ? 'bg-transparent border-2 border-red-600 text-red-500 hover:bg-red-600 hover:text-white' 
                : 'bg-red-600/20 text-red-500 hover:bg-red-600 hover:text-white'
            }`}
          >
            <BsRecordCircle size={20} className={isRecording ? 'animate-pulse' : ''} />
            {isRecording ? 'Stop Rec' : 'Record'}
          </button>

          <button
            onClick={leaveCall}
            className="p-4 rounded-full bg-red-600 hover:bg-red-700 text-white ml-8 shadow-lg transition-transform hover:scale-105"
            title="Leave Call"
          >
            <FiPhoneMissed size={24} />
          </button>
        </div>
      </div>
    </>
  );
};

interface VideoProps {
  peer: Peer.Instance;
  index: number;
}

const Video = ({ peer, index }: VideoProps) => {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    peer.on('stream', (stream) => {
      if (ref.current) {
        ref.current.srcObject = stream;
      }
    });
  }, [peer]);

  return (
    <div className="relative bg-[#111] rounded-xl overflow-hidden aspect-video shadow-lg border-2 border-[#2a2a2a]">
      <video
        className="w-full h-full object-cover"
        playsInline
        autoPlay
        ref={ref}
      />
      <div className="absolute bottom-2 left-2 bg-black/60 px-3 py-1 rounded text-sm backdrop-blur-sm shadow-md">
        Participant {index}
      </div>
    </div>
  );
};

export default CallRoom;
