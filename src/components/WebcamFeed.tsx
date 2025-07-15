import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, CameraOff, AlertCircle } from 'lucide-react';
import { useSignLanguage } from '../context/SignLanguageContext';

const WebcamFeed: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>();
  
  const { 
    isDetecting, 
    startDetection, 
    stopDetection, 
    processFrame,
    currentPrediction,
    confidence
  } = useSignLanguage();
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setCameraReady(false);
  }, []);

  // Initialize camera
  const initializeCamera = useCallback(async () => {
    if (!isDetecting || isLoading || cameraReady) {
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

      streamRef.current = mediaStream;

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        const handleLoadedMetadata = () => {
          setIsLoading(false);
          setCameraReady(true);
          startDetectionLoop();
        };

        videoRef.current.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Camera access denied. Please enable camera permissions and refresh the page.');
      setIsLoading(false);
      stopDetection();
    }
  }, [isDetecting, isLoading, cameraReady, stopDetection]);

  // Detection loop
  const startDetectionLoop = useCallback(() => {
    const detectFrame = () => {
      if (!isDetecting || !videoRef.current || !canvasRef.current || !cameraReady) {
        return;
      }

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

      if (isDetecting && cameraReady) {
        animationFrameRef.current = requestAnimationFrame(detectFrame);
      }
    };

    detectFrame();
  }, [isDetecting, cameraReady, processFrame]);

  // Handle detection state changes
  useEffect(() => {
    if (isDetecting && !cameraReady && !isLoading) {
      initializeCamera();
    } else if (!isDetecting) {
      cleanup();
    }
  }, [isDetecting, cameraReady, isLoading, initializeCamera, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

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
          <span className={`status-indicator ${cameraReady && isDetecting ? 'status-active' : 'status-inactive'}`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${cameraReady && isDetecting ? 'bg-accent-500 animate-pulse' : 'bg-gray-400'}`}></div>
            {cameraReady && isDetecting ? 'Active' : 'Inactive'}
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
        {/* Prediction Overlay - Top Left Corner */}
        {isDetecting && cameraReady && (
          <div className="absolute top-4 left-4 z-20">
            <div className="bg-black/80 backdrop-blur-md rounded-xl px-4 py-3 text-white border border-white/20">
              {currentPrediction ? (
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg"></div>
                  <div>
                    <div className="font-bold text-xl capitalize text-green-400">{currentPrediction}</div>
                    <div className="text-sm text-gray-300">
                      {(confidence * 100).toFixed(1)}% confidence
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
                  <div className="text-lg text-yellow-400 font-medium">Detecting...</div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="text-center text-white">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
              <p className="text-lg font-medium mb-2">Camera Error</p>
              <p className="text-sm text-gray-300">{error}</p>
              <button 
                onClick={() => {
                  setError('');
                  if (isDetecting) {
                    cleanup();
                    setTimeout(() => initializeCamera(), 100);
                  }
                }} 
                className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Retry
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
          style={{ transform: 'scaleX(-1)' }}
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