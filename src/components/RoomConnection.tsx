import React, { useState } from 'react';
import { Wifi, Users, Copy, Check } from 'lucide-react';
import { QRCode } from './QRCode';

interface RoomConnectionProps {
  roomId: string;
  isConnected: boolean;
  peerCount: number;
  onConnect: (roomId?: string) => void;
}

export const RoomConnection: React.FC<RoomConnectionProps> = ({
  roomId,
  isConnected,
  peerCount,
  onConnect
}) => {
  const [joinRoomId, setJoinRoomId] = useState('');
  const [copied, setCopied] = useState(false);

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareUrl = `${window.location.origin}?room=${roomId}`;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <div className="flex items-center space-x-3">
            <Wifi className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">Connection Status</h2>
              <p className="text-blue-100">
                {isConnected ? 'Connected' : 'Disconnected'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {!isConnected ? (
            <div className="space-y-4">
              <div>
                <button
                  onClick={() => onConnect()}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Create New Room
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-2 text-gray-500">or</span>
                </div>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Enter Room ID"
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={() => onConnect(joinRoomId)}
                  disabled={!joinRoomId}
                  className="w-full bg-gray-800 text-white py-3 px-4 rounded-lg font-semibold hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Join Room
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <QRCode value={shareUrl} size={160} />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Room ID</p>
                    <p className="text-lg font-mono font-bold text-gray-900">{roomId}</p>
                  </div>
                  <button
                    onClick={copyRoomId}
                    className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>

                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                  <Users className="w-4 h-4" />
                  <span>{peerCount} device{peerCount !== 1 ? 's' : ''} connected</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};