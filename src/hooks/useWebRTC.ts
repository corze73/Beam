import { useState, useEffect, useCallback } from 'react';
import { Peer, FileTransfer, FileChunk } from '../types';

const CHUNK_SIZE = 16384; // 16KB chunks
const SIGNALING_SERVER = 'wss://beam-03dc.onrender.com:10000';

export const useWebRTC = () => {
  const [peers, setPeers] = useState<Map<string, Peer>>(new Map());
  const [transfers, setTransfers] = useState<FileTransfer[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [roomId, setRoomId] = useState<string>('');
  const [ws, setWs] = useState<WebSocket | null>(null);

  const generateRoomId = useCallback(() => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }, []);

  const connectToRoom = useCallback(async (targetRoomId?: string) => {
    const id = targetRoomId || generateRoomId();
    setRoomId(id);

    try {
      const websocket = new WebSocket(SIGNALING_SERVER);
      
      websocket.onopen = () => {
        setIsConnected(true);
        websocket.send(JSON.stringify({ type: 'join', roomId: id }));
      };

      websocket.onmessage = async (event) => {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'offer':
            await handleOffer(message.offer, message.from);
            break;
          case 'answer':
            await handleAnswer(message.answer, message.from);
            break;
          case 'ice-candidate':
            await handleIceCandidate(message.candidate, message.from);
            break;
        }
      };

      websocket.onerror = () => setIsConnected(false);
      websocket.onclose = () => setIsConnected(false);

      setWs(websocket);
    } catch (error) {
      console.error('Failed to connect:', error);
      setIsConnected(false);
    }
  }, [generateRoomId]);

  const createPeerConnection = useCallback((peerId: string) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && ws) {
        ws.send(JSON.stringify({
          type: 'ice-candidate',
          candidate: event.candidate,
          to: peerId,
          roomId
        }));
      }
    };

    const peer: Peer = { id: peerId, connection: pc };
    setPeers(prev => new Map(prev).set(peerId, peer));
    
    return peer;
  }, [ws, roomId]);

  const handleOffer = useCallback(async (offer: RTCSessionDescriptionInit, from: string) => {
    const peer = createPeerConnection(from);
    
    await peer.connection.setRemoteDescription(offer);
    const answer = await peer.connection.createAnswer();
    await peer.connection.setLocalDescription(answer);

    if (ws) {
      ws.send(JSON.stringify({
        type: 'answer',
        answer,
        to: from,
        roomId
      }));
    }
  }, [createPeerConnection, ws, roomId]);

  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit, from: string) => {
    const peer = peers.get(from);
    if (peer) {
      await peer.connection.setRemoteDescription(answer);
    }
  }, [peers]);

  const handleIceCandidate = useCallback(async (candidate: RTCIceCandidate, from: string) => {
    const peer = peers.get(from);
    if (peer) {
      await peer.connection.addIceCandidate(candidate);
    }
  }, [peers]);

  const sendFile = useCallback(async (file: File, peerId: string) => {
    const peer = peers.get(peerId);
    if (!peer || !peer.dataChannel) return;

    const transfer: FileTransfer = {
      id: `${Date.now()}-${file.name}`,
      name: file.name,
      size: file.size,
      type: file.type,
      progress: 0,
      speed: 0,
      status: 'pending'
    };

    setTransfers(prev => [...prev, transfer]);

    const chunks = Math.ceil(file.size / CHUNK_SIZE);
    let sentChunks = 0;
    const startTime = Date.now();

    for (let i = 0; i < chunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);
      const arrayBuffer = await chunk.arrayBuffer();

      const fileChunk: FileChunk = {
        id: transfer.id,
        index: i,
        data: arrayBuffer,
        isLast: i === chunks - 1
      };

      peer.dataChannel.send(JSON.stringify({
        type: 'file-chunk',
        chunk: fileChunk,
        metadata: i === 0 ? { name: file.name, size: file.size, type: file.type } : undefined
      }));

      sentChunks++;
      const progress = (sentChunks / chunks) * 100;
      const elapsed = Date.now() - startTime;
      const speed = (sentChunks * CHUNK_SIZE) / (elapsed / 1000);

      setTransfers(prev => prev.map(t => 
        t.id === transfer.id ? { ...t, progress, speed, status: 'transferring' } : t
      ));
    }

    setTransfers(prev => prev.map(t => 
      t.id === transfer.id ? { ...t, status: 'completed' } : t
    ));
  }, [peers]);

  return {
    peers: Array.from(peers.values()),
    transfers,
    isConnected,
    roomId,
    connectToRoom,
    sendFile
  };
};