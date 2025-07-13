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
      const newDetector = new SignLanguageDetector();
      
      // Simulate model loading progress
      const progressInterval = setInterval(() => {
        setModelLoadingProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + Math.random() * 15;
        });
      }, 200);

      try {
        await newDetector.initialize();
        setDetector(newDetector);
        setModelLoaded(true);
        setModelLoadingProgress(100);
        clearInterval(progressInterval);
      } catch (error) {
        console.error('Failed to initialize detector:', error);
        clearInterval(progressInterval);
      }
    };

    initializeDetector();
  }, []);

  const startDetection = useCallback(() => {
    if (modelLoaded) {
      setIsDetecting(true);
    }
  }, [modelLoaded]);

  const stopDetection = useCallback(() => {
    setIsDetecting(false);
    setCurrentPrediction(null);
    setConfidence(0);
  }, []);

  const processFrame = useCallback(async (canvas: HTMLCanvasElement) => {
    if (!detector || !isDetecting) return;

    try {
      const result = await detector.detectGesture(canvas);
      
      if (result) {
        setCurrentPrediction(result.gesture);
        setConfidence(result.confidence);
        
        // Add to history if confidence is high enough
        if (result.confidence > 0.7) {
          const newPrediction: Prediction = {
            gesture: result.gesture,
            confidence: result.confidence,
            timestamp: Date.now()
          };
          
          setPredictionHistory(prev => {
            // Avoid duplicate consecutive predictions
            const lastPrediction = prev[prev.length - 1];
            if (lastPrediction && 
                lastPrediction.gesture === newPrediction.gesture && 
                newPrediction.timestamp - lastPrediction.timestamp < 2000) {
              return prev;
            }
            return [...prev, newPrediction];
          });
        }
      } else {
        setCurrentPrediction(null);
        setConfidence(0);
      }
    } catch (error) {
      console.error('Error processing frame:', error);
    }
  }, [detector, isDetecting]);

  const clearHistory = useCallback(() => {
    setPredictionHistory([]);
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