'use client';

import { useState, useEffect, useRef } from 'react';

export interface CandleData {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
}

interface UseChartDataProps {
  cryptoId: string;
  timeframe: string;
  updateInterval?: number;
}

export default function useChartData({ cryptoId, timeframe, updateInterval = 500 }: UseChartDataProps) {
  const [candleData, setCandleData] = useState<CandleData[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Use refs to store mutable data that doesn't need to trigger re-renders
  const dataRef = useRef<{
    initialDataGenerated: boolean;
    lastUpdateTime: number;
    lastPrice: number;
    updateCount: number;
    trendDirection: number;
    trendStrength: number;
    trendDuration: number;
    volatility: number;
  }>({
    initialDataGenerated: false,
    lastUpdateTime: 0,
    lastPrice: 0,
    updateCount: 0,
    trendDirection: 0,
    trendStrength: 0,
    trendDuration: 0,
    volatility: 0.005
  });

  // Generate initial data when component mounts or crypto/timeframe changes
  useEffect(() => {
    setIsLoading(true);
    generateInitialData();
    setIsLoading(false);
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cryptoId, timeframe]);
  
  // Set up interval for real-time updates
  useEffect(() => {
    const intervalId = setInterval(() => {
      updatePriceAndCandle();
    }, updateInterval);
    
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateInterval]);

  // Helper function to get interval in seconds based on timeframe
  const getIntervalInSeconds = (): number => {
    return timeframe === '30s' ? 30 :
           timeframe === '1m' ? 60 :
           timeframe === '5m' ? 300 :
           timeframe === '10m' ? 600 :
           timeframe === '15m' ? 900 :
           timeframe === '30m' ? 1800 : 3600;
  };

  // Generate initial historical data
  const generateInitialData = () => {
    if (dataRef.current.initialDataGenerated) return;
    
    const now = Math.floor(Date.now() / 1000);
    const interval = getIntervalInSeconds();
    const mockCandles: CandleData[] = [];
    
    // Get base price for the selected crypto
    let basePrice = getBasePriceForCrypto(cryptoId);
    let price = basePrice;
    
    // Initialize trend variables
    let trend = Math.random() > 0.5 ? 1 : -1;
    let trendDuration = 5 + Math.floor(Math.random() * 10);
    let trendStrength = 0.3 + Math.random() * 0.7;
    
    // Store trend data for future updates
    dataRef.current.trendDirection = trend;
    dataRef.current.trendStrength = trendStrength;
    dataRef.current.trendDuration = trendDuration;
    
    // Generate 100 candles of historical data
    for (let i = 0; i < 100; i++) {
      // Align candle times to proper interval boundaries
      const time = Math.floor((now - (99 - i) * interval) / interval) * interval;
      
      // Periodically change the trend to create realistic patterns
      if (trendDuration <= 0) {
        // Change trend direction
        trend = Math.random() > 0.5 ? 1 : -1;
        // Trend lasts for 5-15 candles
        trendDuration = 5 + Math.floor(Math.random() * 10);
        // Trend strength varies
        trendStrength = 0.3 + Math.random() * 0.7;
      }
      trendDuration--;
      
      // Generate realistic price movements combining trend and randomness
      const trendFactor = trend * trendStrength * 0.005;
      const randomFactor = (Math.random() - 0.5) * 0.015;
      const changePercent = trendFactor + randomFactor;
      
      const open = price;
      price = Math.max(price * (1 + changePercent), 0.01);
      
      // Create realistic high/low values
      const volatilityFactor = 0.005 + Math.random() * 0.01;
      const high = Math.max(open, price) * (1 + volatilityFactor);
      const low = Math.min(open, price) * (1 - volatilityFactor);
      const close = price;
      
      mockCandles.push({
        time,
        open,
        high,
        low,
        close
      });
    }
    
    setCandleData(mockCandles);
    setCurrentPrice(price);
    dataRef.current.lastPrice = price;
    dataRef.current.lastUpdateTime = now;
    dataRef.current.initialDataGenerated = true;
    dataRef.current.trendDirection = trend;
    dataRef.current.trendStrength = trendStrength;
    dataRef.current.trendDuration = trendDuration;
  };

  // Get a realistic base price for the selected cryptocurrency
  const getBasePriceForCrypto = (id: string): number => {
    switch (id) {
      case 'bitcoin':
        return 30000 + Math.random() * 10000; // Around $30-40k
      case 'ethereum':
        return 2000 + Math.random() * 1000; // Around $2-3k
      case 'binancecoin':
        return 300 + Math.random() * 100; // Around $300-400
      case 'ripple':
        return 0.5 + Math.random() * 0.2; // Around $0.5-0.7
      case 'cardano':
        return 0.3 + Math.random() * 0.2; // Around $0.3-0.5
      default:
        return 100 + Math.random() * 900; // Random starting price
    }
  };

  // Update price and add/update candle
  const updatePriceAndCandle = () => {
    if (!dataRef.current.initialDataGenerated || candleData.length === 0) {
      generateInitialData();
      return;
    }
    
    const now = Math.floor(Date.now() / 1000);
    const lastCandle = candleData[candleData.length - 1];
    const interval = getIntervalInSeconds();
    
    // Update trend if needed
    if (dataRef.current.trendDuration <= 0) {
      dataRef.current.trendDirection = Math.random() > 0.5 ? 1 : -1;
      dataRef.current.trendDuration = 5 + Math.floor(Math.random() * 10);
      dataRef.current.trendStrength = 0.3 + Math.random() * 0.7;
    }
    dataRef.current.trendDuration--;
    
    // Generate a realistic price movement
    const trendFactor = dataRef.current.trendDirection * dataRef.current.trendStrength * 0.005;
    const randomFactor = (Math.random() - 0.5) * 0.015;
    const changePercent = trendFactor + randomFactor;
    
    const lastPrice = dataRef.current.lastPrice > 0 ? dataRef.current.lastPrice : lastCandle.close;
    const newPrice = Math.max(lastPrice * (1 + changePercent), 0.01);
    
    // Update the current price state
    setCurrentPrice(newPrice);
    dataRef.current.lastPrice = newPrice;
    
    // Check if we need to create a new candle
    if (now - lastCandle.time >= interval) {
      // Create a new candle aligned to interval boundaries
      const newCandle: CandleData = {
        time: Math.floor(now / interval) * interval,
        open: lastCandle.close,
        high: Math.max(lastCandle.close, newPrice),
        low: Math.min(lastCandle.close, newPrice),
        close: newPrice
      };
      
      // Add the new candle and remove the oldest one if we have too many
      setCandleData(prev => {
        const updated = [...prev, newCandle];
        if (updated.length > 100) {
          return updated.slice(-100); // Keep most recent 100 candles
        }
        return updated;
      });
    } else {
      // Just update the last candle
      setCandleData(prev => {
        if (prev.length === 0) return prev;
        
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        
        updated[lastIndex] = {
          ...updated[lastIndex],
          high: Math.max(updated[lastIndex].high, newPrice),
          low: Math.min(updated[lastIndex].low, newPrice),
          close: newPrice
        };
        
        return updated;
      });
    }
    
    dataRef.current.lastUpdateTime = now;
  };

  return {
    candleData,
    currentPrice,
    isLoading,
    error
  };
}
