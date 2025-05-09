'use client';

import { useState, useEffect } from 'react';

interface TradeTimerProps {
  duration: number; // in milliseconds
  onComplete: () => void;
}

export default function TradeTimer({ duration, onComplete }: TradeTimerProps) {
  const [seconds, setSeconds] = useState(() => Math.floor(duration / 1000));
  
  useEffect(() => {
    // Set up the countdown timer
    const timer = setInterval(() => {
      setSeconds(prevSeconds => {
        if (prevSeconds <= 1) {
          clearInterval(timer);
          onComplete();
          return 0;
        }
        return prevSeconds - 1;
      });
    }, 1000);
    
    // Clean up the timer on unmount
    return () => clearInterval(timer);
  }, [duration, onComplete]);
  
  // Format seconds to mm:ss
  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="font-mono text-sm">
      {formatTime(seconds)}
    </div>
  );
}
