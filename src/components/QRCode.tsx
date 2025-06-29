import React, { useEffect, useRef } from 'react';

interface QRCodeProps {
  value: string;
  size?: number;
}

export const QRCode: React.FC<QRCodeProps> = ({ value, size = 200 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Simple QR code implementation using canvas
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = size;
    canvas.height = size;

    // Create a simple pattern for demo
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, size, size);
    
    ctx.fillStyle = '#FFFFFF';
    const cellSize = size / 20;
    
    // Create a simple pattern
    for (let i = 0; i < 20; i++) {
      for (let j = 0; j < 20; j++) {
        if ((i + j) % 2 === 0) {
          ctx.fillRect(i * cellSize, j * cellSize, cellSize, cellSize);
        }
      }
    }

    // Add text
    ctx.fillStyle = '#000000';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(value, size / 2, size - 10);
  }, [value, size]);

  return (
    <div className="flex flex-col items-center space-y-4">
      <canvas
        ref={canvasRef}
        className="border-2 border-gray-200 rounded-lg"
      />
      <p className="text-sm text-gray-600 font-mono">{value}</p>
    </div>
  );
};