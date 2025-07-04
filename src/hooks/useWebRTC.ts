import { useState, useEffect, useCallback, useRef } from 'react';
import { Peer, FileTransfer, FileChunk } from '../types';

const CHUNK_SIZE = 16384; // 16KB chunks
const SIGNALING_SERVER = import.meta.env.DEV ? 'ws://localhost:8080' : 'wss://beam-03dc.onrender.com:10000';

export const useWebRTC = () => {
  const [peers, setPeers] = useState<Map<string, Peer>>(new Map());
  const [transfers, setTransfers] = useState<FileTransfer[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [roomId, setRoomId] = useState<string>('');
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [clientId, setClientId] = useState<string>('');
  const peersRef = useRef<Map<string, Peer>>(new Map());

  // Keep refs in sync
  useEffect(() => {
    peersRef.current = peers;
  }, [peers]);

  const generateRoomId = useCallback(() => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }, []);

  const connectToRoom = useCallback(async (targetRoomId?: string) => {
    const id = targetRoomId || generateRoomId();
    setRoomId(id);

    try {
      const websocket = new WebSocket(SIGNALING_SERVER);
      
      websocket.onopen = () => {
        console.log('Connected to signaling server');
        setIsConnected(true);
        websocket.send(JSON.stringify({ type: 'join', roomId: id }));
      };

      websocket.onmessage = async (event) => {
        const message = JSON.parse(event.data);
        console.log('Received message:', message);
        
        switch (message.type) {
          case 'joined':
            setClientId(message.clientId);
            break;
          case 'existing-peers':
            // Create offers for existing peers
            for (const peerId of message.peers) {
              await createOffer(peerId);
            }
            break;
          case 'peer-joined':
            // New peer joined, they will send us an offer
            console.log('Peer joined:', message.peerId);
            break;
          case 'offer':
            await handleOffer(message.offer, message.from);
            break;
          case 'answer':
            await handleAnswer(message.answer, message.from);
            break;
          case 'ice-candidate':
            await handleIceCandidate(message.candidate, message.from);
            break;
          case 'peer-left':
            handlePeerLeft(message.peerId);
            break;
        }
      };

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };
      
      websocket.onclose = () => {
        console.log('WebSocket closed');
        setIsConnected(false);
      };

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

    // Create data channel for file transfer
    const dataChannel = pc.createDataChannel('fileTransfer', {
      ordered: true
    });

    dataChannel.onopen = () => {
      console.log('Data channel opened with', peerId);
      updatePeerConnection(peerId, { dataChannel, connected: true });
    };

    dataChannel.onmessage = (event) => {
      handleDataChannelMessage(event.data, peerId);
    };

    pc.ondatachannel = (event) => {
      const channel = event.channel;
      channel.onopen = () => {
        console.log('Incoming data channel opened with', peerId);
        updatePeerConnection(peerId, { dataChannel: channel, connected: true });
      };
      channel.onmessage = (event) => {
        handleDataChannelMessage(event.data, peerId);
      };
    };

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

    pc.onconnectionstatechange = () => {
      console.log('Connection state with', peerId, ':', pc.connectionState);
      if (pc.connectionState === 'connected') {
        console.log('WebRTC peer connected:', peerId);
        updatePeerConnection(peerId, { connected: true });
      } else if (pc.connectionState === 'connecting') {
        console.log('WebRTC peer connecting:', peerId);
        updatePeerConnection(peerId, { connected: false });
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        handlePeerLeft(peerId);
      }
    };

    const peer: Peer = { id: peerId, connection: pc, dataChannel };
    setPeers(prev => new Map(prev).set(peerId, peer));
    
    return peer;
  }, [ws, roomId, updatePeerConnection]);

  const createOffer = useCallback(async (peerId: string) => {
    const peer = createPeerConnection(peerId);
    
    try {
      const offer = await peer.connection.createOffer();
      await peer.connection.setLocalDescription(offer);

      if (ws) {
        ws.send(JSON.stringify({
          type: 'offer',
          offer,
          to: peerId,
          roomId
        }));
      }
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  }, [createPeerConnection, ws, roomId]);

  const handleOffer = useCallback(async (offer: RTCSessionDescriptionInit, from: string) => {
    const peer = createPeerConnection(from);
    
    try {
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
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  }, [createPeerConnection, ws, roomId]);

  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit, from: string) => {
    const peer = peersRef.current.get(from);
    if (peer) {
      try {
        await peer.connection.setRemoteDescription(answer);
      } catch (error) {
        console.error('Error handling answer:', error);
      }
    }
  }, []);

  const handleIceCandidate = useCallback(async (candidate: RTCIceCandidate, from: string) => {
    const peer = peersRef.current.get(from);
    if (peer) {
      try {
        await peer.connection.addIceCandidate(candidate);
      } catch (error) {
        console.error('Error handling ICE candidate:', error);
      }
    }
  }, []);

  const handlePeerLeft = useCallback((peerId: string) => {
    setPeers(prev => {
      const newPeers = new Map(prev);
      const peer = newPeers.get(peerId);
      if (peer) {
        peer.connection.close();
        newPeers.delete(peerId);
      }
      return newPeers;
    });
  }, []);

  const handleDataChannelMessage = useCallback((data: string, from: string) => {
    try {
      const message = JSON.parse(data);
      if (message.type === 'file-chunk') {
        // Handle incoming file chunk
        console.log('Received file chunk from', from);
        // TODO: Implement file reception logic
      }
    } catch (error) {
      console.error('Error parsing data channel message:', error);
    }
  }, []);

  const updatePeerConnection = useCallback((peerId: string, updates: Partial<Peer>) => {
    setPeers(prev => {
      const newPeers = new Map(prev);
      const peer = newPeers.get(peerId);
      if (peer) {
        newPeers.set(peerId, { ...peer, ...updates });
      }
      return newPeers;
    });
  }, []);

  const sendFile = useCallback(async (file: File, peerId: string) => {
    const peer = peersRef.current.get(peerId);
    if (!peer || !peer.dataChannel || peer.dataChannel.readyState !== 'open') {
      console.error('Data channel not ready for peer:', peerId);
      return;
    }

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

    try {
      const chunks = Math.ceil(file.size / CHUNK_SIZE);
      let sentChunks = 0;
      const startTime = Date.now();

      // Update status to transferring
      setTransfers(prev => prev.map(t => 
        t.id === transfer.id ? { ...t, status: 'transferring' } : t
      ));

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

        const message = {
          type: 'file-chunk',
          chunk: fileChunk,
          metadata: i === 0 ? { name: file.name, size: file.size, type: file.type } : undefined
        };

        peer.dataChannel.send(JSON.stringify(message));

        sentChunks++;
        const progress = (sentChunks / chunks) * 100;
        const elapsed = Date.now() - startTime;
        const speed = elapsed > 0 ? (sentChunks * CHUNK_SIZE) / (elapsed / 1000) : 0;

        setTransfers(prev => prev.map(t => 
          t.id === transfer.id ? { ...t, progress, speed } : t
        ));

        // Small delay to prevent overwhelming the data channel
        await new Promise(resolve => setTimeout(resolve, 1));
      }

      setTransfers(prev => prev.map(t => 
        t.id === transfer.id ? { ...t, status: 'completed', progress: 100 } : t
      ));
    } catch (error) {
      console.error('Error sending file:', error);
      setTransfers(prev => prev.map(t => 
        t.id === transfer.id ? { ...t, status: 'error' } : t
      ));
    }
  }, []);

  return {
    peers: Array.from(peers.values()),
    transfers,
    isConnected,
    roomId,
    connectToRoom,
    sendFile
  };
};