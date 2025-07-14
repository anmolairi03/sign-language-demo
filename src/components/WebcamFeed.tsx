import React, { useRef, useEffect, useState } from 'react';
import { Camera, CameraOff, AlertCircle } from 'lucide-react';
import { useSignLanguage } from '../context/SignLanguageContext';

const WebcamFeed: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isDetecting, startDetection, stopDetection, processFrame } = useSignLanguage();
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    let animationFrame: number;

    const setupCamera = async () => {
      if (!isDetecting) {
        // Clean up existing stream
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
          setStream(null);
        }
        return;
      }
      
      setIsLoading(true);
      setError('');
      
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          }
        });
        
        setStream(mediaStream);
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.onloadedmetadata = () => {
            setIsLoading(false);
            detectFrame();
          };
        }
      } catch (err) {
        console.error('Camera error:', err);
        setError('Camera access denied. Please enable camera permissions and refresh the page.');
        setIsLoading(false);
        stopDetection();
      }
    };

    const detectFrame = () => {
      if (!isDetecting || !videoRef.current || !canvasRef.current) return;
      
      try {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        if (ctx && video.readyState === 4) {
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
          
          // Draw video frame to canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Process frame for hand detection
          processFrame(canvas);
        }
      } catch (error) {
        console.error('Error in detectFrame:', error);
      }
      
      if (isDetecting) {
        animationFrame = requestAnimationFrame(detectFrame);
      }
    };

    setupCamera();

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isDetecting, processFrame, stopDetection, stream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

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
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
            ) : isDetecting ? (
              <CameraOff className="w-5 h-5" />
            ) : (
              <Camera className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
      
      <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-video">
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="text-center text-white">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
              <p className="text-lg font-medium mb-2">Camera Error</p>
              <p className="text-sm text-gray-300">{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Refresh Page
              </button>
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
          className="absolute inset-0 w-full h-full opacity-0"
        />
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