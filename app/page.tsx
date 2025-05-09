'use client';

import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDown, ArrowUp, Timer, TrendingUp, Wallet } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import TradingChart from '@/components/TradingChart';
import { toast } from 'sonner';
import ProtectedRoute from '@/components/ProtectedRoute';
import UserProfile from '@/components/UserProfile';
import RecentTrades from '@/components/RecentTrades';
import { Trade } from '@/components/RecentTrades';
import useChartData from '@/hooks/useChartData';
import { useAuth } from '@/contexts/AuthContext';

// Cryptocurrency options
const CRYPTO_OPTIONS = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
  { id: 'binancecoin', symbol: 'BNB', name: 'BNB' },
  { id: 'ripple', symbol: 'XRP', name: 'XRP' },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano' },
];

const TIMEFRAMES = [
  { value: '30s', label: '30 Seconds' },
  { value: '1m', label: '1 Minute' },
  { value: '5m', label: '5 Minutes' },
  { value: '10m', label: '10 Minutes' },
  { value: '15m', label: '15 Minutes' },
  { value: '30m', label: '30 Minutes' },
  { value: '1h', label: '1 Hour' },
];

export default function Home() {
  const router = useRouter();
  const { user, updateUserBalance } = useAuth();
  const [amount, setAmount] = useState('100');
  const [tradeAmount, setTradeAmount] = useState(100);
  const [selectedTimeframe, setSelectedTimeframe] = useState(TIMEFRAMES[0]); // Track the full timeframe object

  const [selectedCrypto, setSelectedCrypto] = useState(CRYPTO_OPTIONS[0]);
  const [timeframe, setTimeframe] = useState('1m');
  const [trades, setTrades] = useState<Trade[]>([]);
  // Store trades in local storage to persist between refreshes
  useEffect(() => {
    // Load trades from localStorage on initial render
    const savedTrades = localStorage.getItem('trades');
    if (savedTrades) {
      try {
        setTrades(JSON.parse(savedTrades));
      } catch (e) {
        console.error('Error parsing saved trades:', e);
      }
    }
  }, []);
  
  // Save trades to localStorage whenever they change
  useEffect(() => {
    if (trades.length > 0) {
      localStorage.setItem('trades', JSON.stringify(trades));
    }
  }, [trades]);

  // Use our custom hook for chart data with frequent updates for live feel
  const { candleData, currentPrice, isLoading, error } = useChartData({
    cryptoId: selectedCrypto.id,
    timeframe,
    updateInterval: 500, // Use very frequent updates for a live feel
  });

  // Handle placing a trade
  const placeTrade = async (direction: 'higher' | 'lower') => {
    if (!user) {
      toast.error('Please login to place trades');
      router.push('/auth/login');
      return;
    }

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      return;
    }

    if (amountValue > user.balance) {
      toast.error('Insufficient balance');
      return;
    }

    try {
      // Create a new trade
      const tradeId = Date.now().toString();
      // Use the value from selectedTimeframe for correct duration
      const durationMs = parseInt(selectedTimeframe.value.replace(/[^0-9]/g, '')) * (selectedTimeframe.value.includes('s') ? 1000 : 60000);
      const newTrade: Trade = {
        id: tradeId,
        amount: amountValue,
        direction,
        startTime: Date.now(),
        endTime: Date.now() + durationMs,
        duration: durationMs,
        status: 'active' as const,
        entryPrice: currentPrice,
      };

      // Update user balance (deduct trade amount)
      await updateUserBalance(user.balance - amountValue);

      // Add the trade to the list
      setTrades(prevTrades => [newTrade, ...prevTrades]);
      toast.success(`${direction === 'higher' ? 'Up' : 'Down'} trade placed for $${amountValue}`);
    } catch (error) {
      toast.error('Failed to place trade. Please try again.');
    }
  };

  // Handle trade completion
  const handleTradeComplete = async (tradeId: string) => {
    // Find the trade
    const trade = trades.find(t => t.id === tradeId);
    if (!trade || trade.status !== 'active' || !user) return;

    try {
      // Determine if the trade won or lost
      const entryPrice = trade.entryPrice || 0;
      const isWin = trade.direction === 'higher' ? 
        currentPrice > entryPrice : 
        currentPrice < entryPrice;

      // Calculate the result
      const result = isWin ? trade.amount * 1.9 : 0; // 90% profit on win, 100% loss on lose

      // Update the trade status
      const updatedTrade = {
        ...trade,
        status: isWin ? 'won' as const : 'lost' as const,
        result: isWin ? result : 0,
        finalPrice: currentPrice,
      };

      // Update the trades list first
      setTrades(prevTrades => 
        prevTrades.map(t => t.id === tradeId ? updatedTrade : t)
      );

      // Update user balance if won
      if (isWin) {
        await updateUserBalance(user.balance + result);
        toast.success(`Trade won! +$${result.toFixed(2)}`);
      } else {
        toast.error(`Trade lost! -$${trade.amount.toFixed(2)}`);
      }
    } catch (error) {
      toast.error('Failed to complete trade. Please refresh the page.');
    }
  };

  return (
    <ProtectedRoute>
      <main className="flex min-h-screen flex-col p-4 md:p-6 lg:p-8 bg-[#131722]">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <TrendingUp className="h-6 w-6 mr-2 text-white" />
            <h1 className="text-2xl font-bold text-white">BinaryTrade</h1>
          </div>
          <div className="flex items-center">
            <div className="mr-4">
              <p className="text-sm text-muted-foreground">Balance</p>
              <p className="font-bold text-white">${user?.balance?.toFixed(2) || '0.00'}</p>
            </div>
            <Button variant="outline" onClick={() => router.push('/deposit')} className="mr-4">
              <Wallet className="h-4 w-4 mr-2" />
              Deposit
            </Button>
            <UserProfile />
          </div>
        </div>

        {/* Main Trading Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chart */}
          <Card className="col-span-2 p-6 bg-[#131722] border-gray-800">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-semibold text-white">{selectedCrypto.name}</h2>
                <Select
                  value={timeframe}
                  onValueChange={setTimeframe}
                >
                  <SelectTrigger className="w-[100px] bg-[#2A2E39] border-gray-700 text-white">
                    <SelectValue placeholder="Timeframe" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2A2E39] border-gray-700 text-white">
                    {TIMEFRAMES.map((tf) => (
                      <SelectItem key={tf.value} value={tf.value}>
                        {tf.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-4">
                <Select
                  value={selectedCrypto.id}
                  onValueChange={(value) => setSelectedCrypto(CRYPTO_OPTIONS.find(opt => opt.id === value) || CRYPTO_OPTIONS[0])}
                >
                  <SelectTrigger className="w-[180px] bg-[#2A2E39] border-gray-700 text-white">
                    <SelectValue placeholder="Select Crypto" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2A2E39] border-gray-700 text-white">
                    {CRYPTO_OPTIONS.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name} ({option.symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <TradingChart 
              data={candleData} 
              currentPrice={currentPrice} 
              activeTrades={trades.filter(trade => trade.status === 'active').map(trade => ({
                ...trade,
                entryPrice: trade.entryPrice || currentPrice,
              }))} 
            />
          </Card>

          {/* Trading Panel */}
          <Card className="p-6 bg-[#131722] border-gray-800">
            <h2 className="text-xl font-semibold mb-4 text-white">Place Trade</h2>
            <div className="space-y-4">
              <div>
                <label className="text-gray-300">Investment Amount</label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setTradeAmount(parseFloat(e.target.value));
                  }}
                  className="mt-1 bg-[#2A2E39] border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="text-gray-300">Duration</label>
                <Select
                  value={selectedTimeframe.value}
                  onValueChange={(value) => {
                    const timeframe = TIMEFRAMES.find(tf => tf.value === value) || TIMEFRAMES[0];
                    setSelectedTimeframe(timeframe);
                  }}
                >
                  <SelectTrigger className="mt-1 bg-[#2A2E39] border-gray-700 text-white">
                    <SelectValue placeholder="Select Duration" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2A2E39] border-gray-700 text-white">
                    {TIMEFRAMES.map((tf) => (
                      <SelectItem key={tf.value} value={tf.value}>
                        {tf.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-6">
                <Button
                  className="bg-green-500 hover:bg-green-600 text-white"
                  onClick={() => placeTrade('higher')}
                >
                  <ArrowUp className="h-4 w-4 mr-2" />
                  Up
                </Button>
                <Button
                  className="bg-red-500 hover:bg-red-600 text-white"
                  onClick={() => placeTrade('lower')}
                >
                  <ArrowDown className="h-4 w-4 mr-2" />
                  Down
                </Button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-gray-400">Profit:</span>
                <span className="font-medium text-white">+90.1%</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Trading History */}
        <RecentTrades trades={trades} onTradeComplete={handleTradeComplete} />
      </main>
    </ProtectedRoute>
  );
}