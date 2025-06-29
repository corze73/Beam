# Beam Signaling Server

WebRTC signaling server for the Beam P2P file sharing application.

## Features

- Room-based peer connections
- WebRTC signaling message relay (offers, answers, ICE candidates)
- Automatic room cleanup
- Health monitoring
- Graceful shutdown

## Local Development

```bash
cd server
npm install
npm run dev
```

The server will start on port 8080 by default.

## Deployment

### Render

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set the following:
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`
   - **Environment**: Node.js

### Environment Variables

- `PORT`: Server port (default: 8080)

## API

### WebSocket Messages

#### Join Room
```json
{
  "type": "join",
  "roomId": "ABC123"
}
```

#### WebRTC Signaling
```json
{
  "type": "offer|answer|ice-candidate",
  "to": "target-peer-id",
  "roomId": "ABC123",
  "offer|answer|candidate": "..."
}
```

## Room Management

- Rooms are created automatically when the first peer joins
- Rooms are deleted when the last peer leaves
- Each peer gets a unique ID within the room
- Peers are notified when others join or leave