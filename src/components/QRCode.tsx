import React, { useEffect, useRef } from 'react';
import QRCodeStyling from 'qr-code-styling';

interface QRCodeProps {
  value: string;
  size?: number;
}

export const QRCode: React.FC<QRCodeProps> = ({ value, size = 200 }) => {
  const ref = useRef<HTMLDivElement>(null);
  const qrCode = useRef<QRCodeStyling>();

  useEffect(() => {
    qrCode.current = new QRCodeStyling({
      width: size,
      height: size,
      type: "svg",
      data: value,
      dotsOptions: {
        color: "#000000",
        type: "rounded"
      },
      backgroundOptions: {
        color: "#ffffff",
      },
      cornersSquareOptions: {
        color: "#000000",
        type: "extra-rounded"
      },
      cornersDotOptions: {
        color: "#000000",
        type: "dot"
      }
    });
  }, [size]);

  useEffect(() => {
    if (qrCode.current && ref.current) {
      qrCode.current.update({ data: value });
      qrCode.current.append(ref.current);
    }
  }, [value]);

  return (
    <div className="flex flex-col items-center space-y-4">
      <div ref={ref} className="border-2 border-gray-200 rounded-lg p-2" />
      <p className="text-sm text-gray-600 font-mono text-center break-all max-w-xs">
        {value}
      </p>
    </div>
  );
};