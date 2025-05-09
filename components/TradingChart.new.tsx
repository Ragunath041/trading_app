'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, IChartApi, LineStyle, PriceScaleMode, UTCTimestamp } from 'lightweight-charts';
import { toast } from 'sonner';

interface TradingChartProps {
  data: Array<{
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
  }>;
  currentPrice: number;
  activeTrades?: Array<{
    id: string;
    direction: 'higher' | 'lower';
    entryPrice: number;
    targetPrice?: number;
    startTime: number;
    endTime: number;
    status: 'active' | 'won' | 'lost';
  }>;
}

export default function TradingChart({ data, currentPrice, activeTrades = [] }: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<any | null>(null);
  const priceLineRef = useRef<any>(null);
  const tradeLineRefs = useRef<Map<string, any>>(new Map());
  const [isChartReady, setIsChartReady] = useState(false);
  const [chartData, setChartData] = useState(data);
  const [livePrice, setLivePrice] = useState(currentPrice);
  const socketRef = useRef<WebSocket | null>(null);
  const isConnectedRef = useRef(false);

  // Connect to WebSocket for live data updates
  const connectWebSocket = useCallback(() => {
    // Close existing connection if any
    if (socketRef.current) {
      socketRef.current.close();
    }

    try {
      // Connect to a WebSocket server - replace with your actual WebSocket endpoint
      // For demo purposes, we're using a sample crypto WebSocket
      const socket = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@kline_1m');
      
      socketRef.current = socket;
      
      socket.onopen = () => {
        isConnectedRef.current = true;
        toast.success('Live data connected');
      };
      
      socket.onclose = () => {
        isConnectedRef.current = false;
        toast.error('Live data disconnected');
        
        // Try to reconnect after 5 seconds
        setTimeout(() => {
          if (!isConnectedRef.current) {
            connectWebSocket();
          }
        }, 5000);
      };
      
      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast.error('Connection error');
      };
      
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Handle Binance kline data format
          if (message.k) {
            const candle = {
              time: message.k.t / 1000 as UTCTimestamp, // Convert to seconds for lightweight-charts
              open: parseFloat(message.k.o),
              high: parseFloat(message.k.h),
              low: parseFloat(message.k.l),
              close: parseFloat(message.k.c)
            };
            
            // Update the latest price
            setLivePrice(candle.close);
            
            // Update the chart data
            setChartData(prevData => {
              // If the candle for this timestamp already exists, update it
              const newData = [...prevData];
              const existingIndex = newData.findIndex(item => item.time === candle.time);
              
              if (existingIndex >= 0) {
                newData[existingIndex] = candle;
              } else {
                // Add new candle
                newData.push(candle);
              }
              
              // Keep only the last 100 candles to prevent memory issues
              if (newData.length > 100) {
                return newData.slice(newData.length - 100);
              }
              
              return newData;
            });
            
            // Update the chart if it's ready
            if (candleSeriesRef.current && isChartReady) {
              candleSeriesRef.current.update(candle);
              
              // Update the price line
              if (priceLineRef.current) {
                priceLineRef.current.applyOptions({ price: candle.close });
              }
            }
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      toast.error('Failed to connect to live data');
    }
  }, [isChartReady]);
  
  // Initialize chart once
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Clean up previous chart if it exists
    if (chartRef.current) {
      try {
        chartRef.current.remove();
      } catch (e) {
        console.log('Error removing chart:', e);
      }
      chartRef.current = null;
      candleSeriesRef.current = null;
      priceLineRef.current = null;
      tradeLineRefs.current.clear();
    }
    
    // Add a small delay before creating a new chart to ensure DOM is ready
    const initTimeout = setTimeout(() => {
      // Create new chart with dark theme
      const chart = createChart(chartContainerRef.current!, {
        layout: {
          background: { color: '#131722' },
          textColor: 'rgba(255, 255, 255, 0.7)',
          fontFamily: 'Roboto, Arial, sans-serif',
        },
        grid: {
          vertLines: { color: 'rgba(42, 46, 57, 0.6)' },
          horzLines: { color: 'rgba(42, 46, 57, 0.6)' },
        },
        width: chartContainerRef.current!.clientWidth,
        height: 400,
        timeScale: {
          timeVisible: true,
          secondsVisible: true,
          borderColor: 'rgba(42, 46, 57, 0.6)',
          barSpacing: 10, // Adjust spacing between bars
          rightOffset: 2, // Keep some space on the right for new candles
          fixLeftEdge: false, // Allow scrolling to the left
          fixRightEdge: false, // Allow scrolling to the right
          lockVisibleTimeRangeOnResize: true, // Keep the visible range on resize
        },
        rightPriceScale: {
          borderColor: 'rgba(42, 46, 57, 0.6)',
          mode: PriceScaleMode.Normal,
          autoScale: true,
          scaleMargins: {
            top: 0.1, 
            bottom: 0.1,
          },
          entireTextOnly: false, // Show partial price labels
        },
        crosshair: {
          mode: 1, // Magnet mode
          vertLine: {
            color: 'rgba(255, 255, 255, 0.4)',
            labelBackgroundColor: '#2962FF',
            width: 1,
            style: 1, // Solid line
            visible: true,
            labelVisible: true,
          },
          horzLine: {
            color: 'rgba(255, 255, 255, 0.4)',
            labelBackgroundColor: '#2962FF',
            width: 1,
            style: 1, // Solid line
            visible: true,
            labelVisible: true,
          },
        },
        handleScroll: true,
        handleScale: true,
      });

      // Add candlestick series with trading style
      const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
        priceFormat: {
          type: 'price',
          precision: 2,
          minMove: 0.01,
        },
        lastValueVisible: true,
        priceLineVisible: true,
        priceLineWidth: 1,
        priceLineColor: '#2962FF',
        priceLineStyle: LineStyle.Dashed,
      });
      
      // Store references
      chartRef.current = chart;
      candleSeriesRef.current = candlestickSeries;
      
      // Set the data
      if (chartData && chartData.length > 0) {
        // Format data for the chart if needed
        const formattedData = chartData.map(candle => ({
          time: candle.time as UTCTimestamp,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
        }));
        
        // Set the data to the series
        candlestickSeries.setData(formattedData);
      }
      
      // Add a price line for the current price
      if (livePrice > 0) {
        priceLineRef.current = candlestickSeries.createPriceLine({
          price: livePrice,
          color: '#2962FF',
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: 'Current Price',
        });
      }
      
      // Fit content to show all data
      chart.timeScale().fitContent();
      
      // Mark chart as ready
      setIsChartReady(true);
      
      // Handle window resize
      const handleResize = () => {
        if (chartRef.current && chartContainerRef.current) {
          chartRef.current.applyOptions({ 
            width: chartContainerRef.current.clientWidth 
          });
        }
      };
      
      window.addEventListener('resize', handleResize);
      
      // Connect to WebSocket for live data
      connectWebSocket();
      
      // Clean up
      return () => {
        window.removeEventListener('resize', handleResize);
        clearTimeout(initTimeout);
        
        if (chartRef.current) {
          chartRef.current.remove();
          chartRef.current = null;
        }
        
        candleSeriesRef.current = null;
        priceLineRef.current = null;
        tradeLineRefs.current.clear();
        
        // Clean up WebSocket connection
        if (socketRef.current) {
          socketRef.current.close();
          socketRef.current = null;
        }
        isConnectedRef.current = false;
      };
    }, 100);
    
    return () => {
      clearTimeout(initTimeout);
    };
  }, [chartData, connectWebSocket, livePrice]);

  // Update active trades when they change
  useEffect(() => {
    if (!isChartReady || !candleSeriesRef.current) return;
    
    // Get current trade IDs
    const currentTradeIds = new Set(activeTrades.map(trade => trade.id));
    
    // Remove lines for trades that are no longer active
    tradeLineRefs.current.forEach((line, id) => {
      if (!currentTradeIds.has(id)) {
        try {
          candleSeriesRef.current.removePriceLine(line);
          tradeLineRefs.current.delete(id);
        } catch (e) {
          // Line might not exist anymore
        }
      }
    });
    
    // Add or update lines for active trades
    activeTrades.forEach(trade => {
      // Skip if we already have a line for this trade
      if (tradeLineRefs.current.has(trade.id)) return;
      
      // Create entry price line
      const entryLine = candleSeriesRef.current.createPriceLine({
        price: trade.entryPrice,
        color: trade.direction === 'higher' ? '#26a69a' : '#ef5350',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'Entry',
      });
      
      // Store reference to the line
      tradeLineRefs.current.set(trade.id, entryLine);
      
      // Add target price line if available
      if (trade.targetPrice) {
        const targetLine = candleSeriesRef.current.createPriceLine({
          price: trade.targetPrice,
          color: '#FFD700',
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: 'Target',
        });
      }
    });
  }, [activeTrades, isChartReady]);

  return (
    <div className="relative">
      <div ref={chartContainerRef} className="h-[400px] w-full" />
      {livePrice > 0 && (
        <div className="absolute bottom-4 right-4 bg-[#131722]/80 backdrop-blur-sm p-2 rounded-md border border-gray-700">
          <p className="text-2xl font-bold text-white">${livePrice.toFixed(2)}</p>
          <div className="flex items-center gap-1 text-xs">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-green-500">Live</span>
          </div>
        </div>
      )}
      <div className="absolute bottom-4 left-4 flex space-x-2">
        <button 
          className="bg-gray-700 text-white p-1 rounded-md" 
          onClick={() => chartRef.current?.timeScale().scrollToRealTime()}
          title="Scroll to latest data"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="7 13 12 18 17 13"></polyline>
            <polyline points="7 6 12 11 17 6"></polyline>
          </svg>
        </button>
        <button 
          className="bg-gray-700 text-white p-1 rounded-md" 
          onClick={() => chartRef.current?.timeScale().fitContent()}
          title="Fit all data"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="8" y1="12" x2="16" y2="12"></line>
            <line x1="12" y1="16" x2="12" y2="8"></line>
          </svg>
        </button>
        <button 
          className="bg-gray-700 text-white p-1 rounded-md" 
          onClick={() => {
            if (chartRef.current) {
              // Zoom in by adjusting the visible range
              const visibleLogicalRange = chartRef.current.timeScale().getVisibleLogicalRange();
              if (visibleLogicalRange) {
                const newRange = {
                  from: visibleLogicalRange.from + (visibleLogicalRange.to - visibleLogicalRange.from) * 0.2,
                  to: visibleLogicalRange.to - (visibleLogicalRange.to - visibleLogicalRange.from) * 0.2
                };
                chartRef.current.timeScale().setVisibleLogicalRange(newRange);
              }
            }
          }}
          title="Zoom in"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <line x1="11" y1="8" x2="11" y2="14"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
        </button>
        <button 
          className="bg-gray-700 text-white p-1 rounded-md" 
          onClick={() => {
            if (chartRef.current) {
              // Zoom out by adjusting the visible range
              const visibleLogicalRange = chartRef.current.timeScale().getVisibleLogicalRange();
              if (visibleLogicalRange) {
                const rangeSize = visibleLogicalRange.to - visibleLogicalRange.from;
                const newRange = {
                  from: Math.max(0, visibleLogicalRange.from - rangeSize * 0.3),
                  to: visibleLogicalRange.to + rangeSize * 0.3
                };
                chartRef.current.timeScale().setVisibleLogicalRange(newRange);
              }
            }
          }}
          title="Zoom out"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
        </button>
      </div>
    </div>
  );
}
