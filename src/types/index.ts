export interface FileTransfer {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  speed: number;
  status: 'pending' | 'transferring' | 'completed' | 'error';
}

export interface Peer {
  id: string;
  connection: RTCPeerConnection;
  dataChannel?: RTCDataChannel;
  connected?: boolean;
}

export interface FileChunk {
  id: string;
  index: number;
  data: ArrayBuffer;
  isLast: boolean;
}