import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
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
  const [detector, setDetector] = useState<SignLanguageDetector | null>(null);

  useEffect(() => {
    const initializeDetector = async () => {
      try {
        console.log('Starting detector initialization...');
        
        // Simulate loading progress
        const progressInterval = setInterval(() => {
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
        
        setDetector(newDetector);
        setModelLoaded(true);
        setModelLoadingProgress(100);
        clearInterval(progressInterval);
        
        console.log('Detector initialized successfully');
      } catch (error) {
        console.error('Failed to initialize detector:', error);
        setModelLoadingProgress(0);
      }
    };

    initializeDetector();

    // Cleanup on unmount
    return () => {
      if (detector) {
        detector.dispose();
      }
    };
  }, []);

  const startDetection = useCallback(() => {
    if (modelLoaded && detector) {
      console.log('Starting detection...');
      setIsDetecting(true);
    } else {
      console.warn('Cannot start detection: model not loaded or detector not initialized');
    }
  }, [modelLoaded, detector]);

  const stopDetection = useCallback(() => {
    console.log('Stopping detection...');
    setIsDetecting(false);
    setCurrentPrediction(null);
    setConfidence(0);
  }, []);

  const processFrame = useCallback(async (canvas: HTMLCanvasElement) => {
    if (!detector || !isDetecting || !modelLoaded) return;

    try {
      const result = await detector.detectGesture(canvas);
      
      if (result && result.confidence > 0.5) {
        setCurrentPrediction(result.gesture);
        setConfidence(result.confidence);
        
        // Add to history if confidence is high enough and not a duplicate
        if (result.confidence > 0.7) {
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
        // Gradually reduce confidence when no gesture is detected
        setConfidence(prev => Math.max(0, prev * 0.9));
        if (confidence < 0.3) {
          setCurrentPrediction(null);
        }
      }
    } catch (error) {
      console.error('Error processing frame:', error);
    }
  }, [detector, isDetecting, modelLoaded, confidence]);

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