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
  processFrame: (imageData: ImageData) => void;
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
        // Simulate gradual loading
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
  }, []);

  const startDetection = useCallback(() => {
    if (modelLoaded && detector) {
      setIsDetecting(true);
      console.log('Detection started');
    }
  }, [modelLoaded, detector]);

  const stopDetection = useCallback(() => {
    setIsDetecting(false);
    setCurrentPrediction(null);
    setConfidence(0);
    console.log('Detection stopped');
  }, []);

  const processFrame = useCallback(async (imageData: ImageData) => {
    if (!detector || !isDetecting) return;

    try {
      const result = await detector.detectGesture(imageData);
      
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
            // Avoid duplicate consecutive predictions within 3 seconds
            const lastPrediction = prev[prev.length - 1];
            if (lastPrediction && 
                lastPrediction.gesture === newPrediction.gesture && 
                newPrediction.timestamp - lastPrediction.timestamp < 3000) {
              return prev;
            }
            
            // Keep only last 20 predictions to avoid memory issues
            const updated = [...prev, newPrediction];
            return updated.slice(-20);
          });
        }
      } else {
        // Gradually reduce confidence when no gesture is detected
        setConfidence(prev => Math.max(0, prev - 0.1));
        if (confidence < 0.3) {
          setCurrentPrediction(null);
        }
      }
    } catch (error) {
      console.error('Error processing frame:', error);
    }
  }, [detector, isDetecting, confidence]);

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