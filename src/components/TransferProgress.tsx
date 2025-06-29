import React from 'react';
import { FileTransfer } from '../types';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';

interface TransferProgressProps {
  transfers: FileTransfer[];
}

export const TransferProgress: React.FC<TransferProgressProps> = ({ transfers }) => {
  const formatSpeed = (bytesPerSecond: number) => {
    if (bytesPerSecond === 0) return '0 B/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
    return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: FileTransfer['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'transferring':
        return <Loader className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <div className="w-5 h-5 rounded-full bg-gray-300" />;
    }
  };

  if (transfers.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <h2 className="text-xl font-bold text-gray-900">File Transfers</h2>
      
      {transfers.map((transfer) => (
        <div
          key={transfer.id}
          className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              {getStatusIcon(transfer.status)}
              <div>
                <p className="font-medium text-gray-900">{transfer.name}</p>
                <p className="text-sm text-gray-500">{formatFileSize(transfer.size)}</p>
              </div>
            </div>
            
            {transfer.status === 'transferring' && (
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {Math.round(transfer.progress)}%
                </p>
                <p className="text-xs text-gray-500">
                  {formatSpeed(transfer.speed)}
                </p>
              </div>
            )}
          </div>
          
          {transfer.status === 'transferring' && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${transfer.progress}%` }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};