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

// Add custom WebSocket interface at the top of the file
interface ExtendedWebSocket extends WebSocket {
  pingIntervalId?: NodeJS.Timeout;
}

function TradingChart({ data, currentPrice, activeTrades = [] }: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<any | null>(null);
  const priceLineRef = useRef<any>(null);
  const tradeLineRefs = useRef<Map<string, any>>(new Map());
  const [isChartReady, setIsChartReady] = useState(false);
  const [chartData, setChartData] = useState(data);
  const [livePrice, setLivePrice] = useState(currentPrice);
  const socketRef = useRef<ExtendedWebSocket | null>(null);
  const isConnectedRef = useRef(false);

  // Connect to WebSocket for live data updates
  const connectWebSocket = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] Already connected');
      return;
    }

    // Close existing connection if any
    if (socketRef.current) {
      try {
        if (socketRef.current.pingIntervalId) {
          clearInterval(socketRef.current.pingIntervalId);
        }
        socketRef.current.close();
      } catch (e) {
        console.log('Error closing existing WebSocket:', e);
      }
      socketRef.current = null;
    }

    try {
      console.log('[WebSocket] Attempting to connect...');
      const socket = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@kline_1m') as ExtendedWebSocket;
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('[WebSocket] Connected successfully');
        isConnectedRef.current = true;
        setIsChartReady(true);
      };

      socket.onclose = (event) => {
        isConnectedRef.current = false;
        setIsChartReady(false);

        if (event.wasClean) {
          console.log(`[WebSocket] Connection closed cleanly, code=${event.code} reason=${event.reason}`);
        } else {
          console.log('[WebSocket] Connection died');
        }

        // Only attempt reconnect if this is still the current socket
        if (socketRef.current === socket) {
          const retryDelay = 5000;
          console.log(`[WebSocket] Will attempt reconnect in ${retryDelay}ms`);
          setTimeout(() => {
            if (!isConnectedRef.current) {
              connectWebSocket();
            }
          }, retryDelay);
        }
      };

      socket.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        // Don't call connectWebSocket here - let onclose handle reconnection
      };

      socket.onmessage = (event) => {
        if (event.data === 'pong') {
          console.log('[WebSocket] Received pong');
          return;
        }

        try {
          const message = JSON.parse(event.data);
          if (message.k) {
            const candle = {
              time: message.k.t / 1000 as UTCTimestamp,
              open: parseFloat(message.k.o),
              high: parseFloat(message.k.h),
              low: parseFloat(message.k.l),
              close: parseFloat(message.k.c)
            };

            setLivePrice(candle.close);

            if (candleSeriesRef.current && isChartReady) {
              candleSeriesRef.current.update(candle);
              if (priceLineRef.current) {
                priceLineRef.current.applyOptions({ price: candle.close });
              }
            }
          }
        } catch (error) {
          console.error('[WebSocket] Error processing message:', error);
        }
      };
    } catch (error) {
      console.error('[WebSocket] Error connecting:', error);
      isConnectedRef.current = false;
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
            style: 1,
            visible: true,
            labelVisible: true,
          },
        },
        handleScroll: true,
        handleScale: true,
      });

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

      if (chartData && chartData.length > 0) {
        const formattedData = chartData.map((candle) => ({
          time: candle.time as UTCTimestamp,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
        }));

        candlestickSeries.setData(formattedData);
      }

      chartRef.current = chart;
      candleSeriesRef.current = candlestickSeries;

      chart.timeScale().fitContent();

      setIsChartReady(true);

      const handleResize = () => {
        if (chartRef.current && chartContainerRef.current) {
          chartRef.current.applyOptions({
            width: chartContainerRef.current.clientWidth,
          });
        }
      };

      window.addEventListener('resize', handleResize);

      connectWebSocket();

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

  useEffect(() => {
    if (!priceLineRef.current || !isChartReady) return;
    priceLineRef.current.applyOptions({ price: livePrice });
  }, [livePrice, isChartReady]);

  useEffect(() => {
    if (!chartRef.current || !isChartReady) return;

    const currentTradeIds = new Set(activeTrades.map((trade) => trade.id));

    tradeLineRefs.current.forEach((line, tradeId) => {
      if (!currentTradeIds.has(tradeId)) {
        line.remove();
        tradeLineRefs.current.delete(tradeId);
      }
    });

    activeTrades.forEach((trade) => {
      if (!tradeLineRefs.current.has(trade.id)) {
        const line = chartRef.current!.addLineSeries({
          color: trade.direction === 'higher' ? '#26a69a' : '#ef5350',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          priceScaleId: 'right'
        });
        
        // Format the date as yyyy-mm-dd for lightweight-charts
        const date = new Date();
        const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        
        line.setData([{ 
          time: formattedDate, 
          value: trade.entryPrice 
        }]);
        tradeLineRefs.current.set(trade.id, line);
      }
    });
  }, [activeTrades, isChartReady]);

  return (
    <div className="relative">
      <div ref={chartContainerRef} className="h-[400px] w-full" />
      
      {/* Connection Status Indicator */}
      <div className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-medium">
        <span className={isChartReady ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}>
          {isChartReady ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      {livePrice > 0 && (
        <div className="absolute bottom-4 right-4 bg-[#131722]/80 backdrop-blur-sm p-2 rounded-md border border-gray-700">
          <div className="flex items-center">
            <span className="text-sm font-medium">Current Price:</span>
            <span className="ml-2 text-lg font-bold text-white">
              {livePrice.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      <div className="absolute bottom-4 left-4 flex space-x-2">
        <button
          className="bg-gray-700 text-white p-1 rounded-md"
          onClick={() => chartRef.current?.timeScale().scrollToRealTime()}
          title="Scroll to latest data"
          disabled={!isChartReady}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="7 13 12 18 17 13"></polyline>
            <polyline points="7 6 12 11 17 6"></polyline>
          </svg>
        </button>
        <button 
          className="bg-gray-700 text-white p-1 rounded-md" 
          onClick={() => chartRef.current?.timeScale().fitContent()}
          title="Fit all data"
          disabled={!isChartReady}
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
          disabled={!isChartReady}
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
          disabled={!isChartReady}
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

export default TradingChart;
