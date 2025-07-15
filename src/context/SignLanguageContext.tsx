import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { SignLanguageDetector } from '../utils/SignLanguageDetector';

interface Prediction {
  gesture: string;
  confidence: number;
  timestamp: number;
}

interface SignLanguageContextType {
  isDetecting: boolean;
  currentPrediction: string | null;
  confidence: number;
  predictionHistory: Prediction[];
  modelLoaded: boolean;
  modelLoadingProgress: number;
  startDetection: () => void;
  stopDetection: () => void;
  processFrame: (canvas: HTMLCanvasElement) => void;
  clearHistory: () => void;
}

const SignLanguageContext = createContext<SignLanguageContextType | undefined>(undefined);

export const useSignLanguage = () => {
  const context = useContext(SignLanguageContext);
  if (!context) {
    throw new Error('useSignLanguage must be used within a SignLanguageProvider');
  }
  return context;
};

export const SignLanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [currentPrediction, setCurrentPrediction] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [predictionHistory, setPredictionHistory] = useState<Prediction[]>([]);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelLoadingProgress, setModelLoadingProgress] = useState(0);
  
  const detectorRef = useRef<SignLanguageDetector | null>(null);
  const lastProcessTimeRef = useRef<number>(0);
  const processingRef = useRef<boolean>(false);

  // Initialize detector once
  useEffect(() => {
    let isMounted = true;
    
    const initializeDetector = async () => {
      try {
        console.log('Starting detector initialization...');
        
        // Simulate loading progress
        const progressInterval = setInterval(() => {
          if (!isMounted) {
            clearInterval(progressInterval);
            return;
          }
          
          setModelLoadingProgress(prev => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return 90;
            }
            return prev + Math.random() * 10;
          });
        }, 100);

        const newDetector = new SignLanguageDetector();
        await newDetector.initialize();
        
        if (isMounted) {
          detectorRef.current = newDetector;
          setModelLoaded(true);
          setModelLoadingProgress(100);
          console.log('Detector initialized successfully');
        } else {
          // Component unmounted, cleanup
          newDetector.dispose();
        }
        
        clearInterval(progressInterval);
      } catch (error) {
        console.error('Failed to initialize detector:', error);
        if (isMounted) {
          setModelLoadingProgress(0);
        }
      }
    };

    initializeDetector();

    return () => {
      isMounted = false;
      if (detectorRef.current) {
        detectorRef.current.dispose();
        detectorRef.current = null;
      }
    };
  }, []); // Empty dependency array - only run once

  const startDetection = useCallback(() => {
    if (modelLoaded && detectorRef.current) {
      console.log('Starting detection...');
      setIsDetecting(true);
    } else {
      console.warn('Cannot start detection: model not loaded or detector not initialized');
    }
  }, [modelLoaded]);

  const stopDetection = useCallback(() => {
    console.log('Stopping detection...');
    setIsDetecting(false);
    setCurrentPrediction(null);
    setConfidence(0);
    processingRef.current = false;
  }, []);

  const processFrame = useCallback(async (canvas: HTMLCanvasElement) => {
    if (!detectorRef.current || !isDetecting || !modelLoaded) {
      return;
    }

    // Prevent concurrent processing
    if (processingRef.current) {
      return;
    }
    
    // Throttle processing to 5 FPS for stability
    const now = Date.now();
    if (now - lastProcessTimeRef.current < 200) {
      return;
    }
    
    processingRef.current = true;
    lastProcessTimeRef.current = now;

    try {
      const result = await detectorRef.current.detectGesture(canvas);
      
      if (!isDetecting) {
        processingRef.current = false;
        return;
      }
      
      if (result && result.confidence > 0.5) {
        console.log(`🎯 DETECTED: ${result.gesture} (${(result.confidence * 100).toFixed(1)}%)`);
        
        setCurrentPrediction(result.gesture);
        setConfidence(result.confidence);
        
        // Add to history if confidence is reasonable
        if (result.confidence > 0.5) {
          const newPrediction: Prediction = {
            gesture: result.gesture,
            confidence: result.confidence,
            timestamp: Date.now()
          };
          
          setPredictionHistory(prev => {
            // Avoid duplicate consecutive predictions within 2 seconds
            const lastPrediction = prev[prev.length - 1];
            if (lastPrediction && 
                lastPrediction.gesture === newPrediction.gesture && 
                newPrediction.timestamp - lastPrediction.timestamp < 2000) {
              return prev;
            }
            
            // Keep only last 50 predictions
            const updated = [...prev, newPrediction];
            return updated.slice(-50);
          });
        }
      } else {
        // More gradual confidence reduction
        setConfidence(prev => Math.max(0, prev * 0.95));
        
        // Clear prediction if confidence drops below threshold
        if (confidence < 0.4) {
          setCurrentPrediction(null);
        }
      }
    } catch (error) {
      console.error('Error processing frame:', error);
    } finally {
      processingRef.current = false;
    }
  }, [isDetecting, modelLoaded, confidence]);

  const clearHistory = useCallback(() => {
    setPredictionHistory([]);
    console.log('Prediction history cleared');
  }, []);

  const value: SignLanguageContextType = {
    isDetecting,
    currentPrediction,
    confidence,
    predictionHistory,
    modelLoaded,
    modelLoadingProgress,
    startDetection,
    stopDetection,
    processFrame,
    clearHistory
  };

  return (
    <SignLanguageContext.Provider value={value}>
      {children}
    </SignLanguageContext.Provider>
  );
};