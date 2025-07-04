import React, { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';
import { FileUpload } from './components/FileUpload';
import { RoomConnection } from './components/RoomConnection';
import { TransferProgress } from './components/TransferProgress';
import { useWebRTC } from './hooks/useWebRTC';

function App() {
  const { peers, transfers, isConnected, roomId, connectToRoom, sendFile } = useWebRTC();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  useEffect(() => {
    // Check if room ID is in URL
    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get('room');
    if (roomFromUrl) {
      connectToRoom(roomFromUrl);
    }
  }, [connectToRoom]);

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(files);
  };

  const handleSendFiles = async () => {
    if (selectedFiles.length === 0 || peers.length === 0) return;

    for (const file of selectedFiles) {
      for (const peer of peers) {
        await sendFile(file, peer.id);
      }
    }

    setSelectedFiles([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Beam
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Share files directly between devices with no limits. 
            Secure, fast, and completely peer-to-peer.
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 items-start">
            {/* Connection Panel */}
            <div className="space-y-8">
              <RoomConnection
                roomId={roomId}
                isConnected={isConnected}
                peerCount={peers.filter(p => p.connected).length}
                onConnect={connectToRoom}
              />

              {isConnected && (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Share Files</h3>
                  <FileUpload
                    onFilesSelected={handleFilesSelected}
                    disabled={!isConnected || peers.filter(p => p.connected).length === 0}
                  />
                  
                  {selectedFiles.length > 0 && peers.filter(p => p.connected).length > 0 && (
                    <button
                      onClick={handleSendFiles}
                      className="w-full mt-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg transition-all duration-300"
                    >
                      Send {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} to {peers.filter(p => p.connected).length} device{peers.filter(p => p.connected).length !== 1 ? 's' : ''}
                    </button>
                  )}

                  {peers.filter(p => p.connected).length === 0 && (
                    <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-amber-800 text-sm">
                        💡 Share your room ID or QR code with others to start transferring files
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Transfer Progress */}
            <div className="space-y-8">
              <TransferProgress transfers={transfers} />
              
              {!isConnected && (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                      <Zap className="w-8 h-8 text-gray-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Get Started
                      </h3>
                      <p className="text-gray-600">
                        Create a new room or join an existing one to start sharing files instantly.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-16 grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">No Size Limits</h3>
            <p className="text-gray-600 text-sm">
              Transfer files of any size directly between devices
            </p>
          </div>
          
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Secure & Private</h3>
            <p className="text-gray-600 text-sm">
              Direct peer-to-peer connections with no cloud storage
            </p>
          </div>
          
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Cross-Platform</h3>
            <p className="text-gray-600 text-sm">
              Works on any device with a modern web browser
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;