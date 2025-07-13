import React, { useRef, useEffect, useState } from 'react';
import { Camera, CameraOff, AlertCircle } from 'lucide-react';
import { useSignLanguage } from '../context/SignLanguageContext';

const WebcamFeed: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isDetecting, startDetection, stopDetection, processFrame } = useSignLanguage();
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let animationFrame: number;

    const setupCamera = async () => {
      if (!isDetecting) return;
      
      setIsLoading(true);
      setError('');
      
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            setIsLoading(false);
            detectFrame();
          };
        }
      } catch (err) {
        setError('Camera access denied. Please enable camera permissions.');
        setIsLoading(false);
        stopDetection();
      }
    };

    const detectFrame = () => {
      if (!isDetecting || !videoRef.current || !canvasRef.current) return;
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (ctx && video.readyState === 4) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        
        // Process frame for hand detection
        processFrame(canvas);
      }
      
      animationFrame = requestAnimationFrame(detectFrame);
    };

    if (isDetecting) {
      setupCamera();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isDetecting, processFrame, stopDetection]);

  const handleToggleDetection = () => {
    if (isDetecting) {
      stopDetection();
    } else {
      startDetection();
    }
  };

  return (
    <div className="glass-effect rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-900">Camera Feed</h3>
        <div className="flex items-center space-x-3">
          <span className={`status-indicator ${isDetecting ? 'status-active' : 'status-inactive'}`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${isDetecting ? 'bg-accent-500 animate-pulse' : 'bg-gray-400'}`}></div>
            {isDetecting ? 'Active' : 'Inactive'}
          </span>
          <button
            onClick={handleToggleDetection}
            className={`p-3 rounded-xl transition-all duration-200 ${
              isDetecting 
                ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                : 'bg-primary-100 text-primary-600 hover:bg-primary-200'
            }`}
            disabled={isLoading}
          >
            {isDetecting ? <CameraOff className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
          </button>
        </div>
      </div>
      
      <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-video">
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
              <p className="text-lg font-medium mb-2">Camera Error</p>
              <p className="text-sm text-gray-300">{error}</p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-lg font-medium">Initializing Camera...</p>
            </div>
          </div>
        ) : !isDetecting ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white">
              <Camera className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium mb-2">Camera Ready</p>
              <p className="text-sm text-gray-300">Click the camera button to start detection</p>
            </div>
          </div>
        ) : null}
        
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }} // Mirror effect
        />
        
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ display: 'none' }}
        />
        
        {/* Overlay for hand landmarks */}
        <div className="absolute inset-0 pointer-events-none">
          <svg className="w-full h-full">
            {/* Hand landmarks will be drawn here */}
          </svg>
        </div>
      </div>
      
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">
          Supported gestures: <span className="font-medium text-primary-600">Hello</span>, <span className="font-medium text-accent-600">Thank You</span>
        </p>
      </div>
    </div>
  );
};

export default WebcamFeed;