import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 8080;

// Store rooms and their connected clients
const rooms = new Map();

// Create WebSocket server
const wss = new WebSocketServer({ 
  port: PORT,
  perMessageDeflate: false
});

console.log(`🚀 Beam signaling server running on port ${PORT}`);

// Handle new WebSocket connections
wss.on('connection', (ws, request) => {
  console.log('📱 New client connected');
  
  let currentRoom = null;
  let clientId = null;

  // Handle incoming messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'join':
          handleJoinRoom(ws, message);
          break;
        case 'offer':
        case 'answer':
        case 'ice-candidate':
          relaySignalingMessage(message);
          break;
        default:
          console.log('❓ Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('❌ Error parsing message:', error);
    }
  });

  // Handle client disconnect
  ws.on('close', () => {
    console.log('📱 Client disconnected');
    if (currentRoom && clientId) {
      leaveRoom(currentRoom, clientId);
    }
  });

  // Handle WebSocket errors
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });

  function handleJoinRoom(ws, message) {
    const { roomId } = message;
    
    if (!roomId) {
      ws.send(JSON.stringify({ type: 'error', message: 'Room ID required' }));
      return;
    }

    // Generate unique client ID
    clientId = generateClientId();
    currentRoom = roomId;

    // Create room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Map());
      console.log(`🏠 Created new room: ${roomId}`);
    }

    const room = rooms.get(roomId);
    
    // Add client to room
    room.set(clientId, { ws, joinedAt: Date.now() });
    
    console.log(`👤 Client ${clientId} joined room ${roomId} (${room.size} total)`);

    // Notify client of successful join
    ws.send(JSON.stringify({
      type: 'joined',
      roomId,
      clientId,
      peerCount: room.size - 1 // Exclude self
    }));

    // Notify other clients in the room about new peer
    broadcastToRoom(roomId, {
      type: 'peer-joined',
      peerId: clientId
    }, clientId);

    // Send existing peers to new client
    const existingPeers = Array.from(room.keys()).filter(id => id !== clientId);
    if (existingPeers.length > 0) {
      ws.send(JSON.stringify({
        type: 'existing-peers',
        peers: existingPeers
      }));
    }
  }

  function relaySignalingMessage(message) {
    const { to, roomId } = message;
    
    if (!to || !roomId) {
      console.log('❌ Invalid signaling message: missing to or roomId');
      return;
    }

    const room = rooms.get(roomId);
    if (!room) {
      console.log(`❌ Room ${roomId} not found`);
      return;
    }

    const targetClient = room.get(to);
    if (!targetClient) {
      console.log(`❌ Target client ${to} not found in room ${roomId}`);
      return;
    }

    // Add sender information
    const relayMessage = {
      ...message,
      from: clientId
    };

    // Send message to target client
    targetClient.ws.send(JSON.stringify(relayMessage));
    
    console.log(`📤 Relayed ${message.type} from ${clientId} to ${to} in room ${roomId}`);
  }

  function leaveRoom(roomId, clientId) {
    const room = rooms.get(roomId);
    if (!room) return;

    room.delete(clientId);
    console.log(`👋 Client ${clientId} left room ${roomId} (${room.size} remaining)`);

    // Notify other clients about peer leaving
    broadcastToRoom(roomId, {
      type: 'peer-left',
      peerId: clientId
    });

    // Clean up empty rooms
    if (room.size === 0) {
      rooms.delete(roomId);
      console.log(`🗑️ Removed empty room: ${roomId}`);
    }
  }
});

// Utility functions
function generateClientId() {
  return Math.random().toString(36).substring(2, 15);
}

function broadcastToRoom(roomId, message, excludeClientId = null) {
  const room = rooms.get(roomId);
  if (!room) return;

  room.forEach((client, clientId) => {
    if (clientId !== excludeClientId && client.ws.readyState === 1) {
      client.ws.send(JSON.stringify(message));
    }
  });
}

// Health check endpoint for deployment platforms
wss.on('listening', () => {
  console.log(`✅ Server is listening on port ${PORT}`);
  console.log(`📊 Health check: ws://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully');
  wss.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully');
  wss.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});