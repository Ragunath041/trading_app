'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import TradeTimer from './TradeTimer';
import { ArrowUp, ArrowDown, Clock } from 'lucide-react';
import { format } from 'date-fns';

export interface Trade {
  id: string;
  amount: number;
  direction: 'higher' | 'lower';
  status: 'active' | 'won' | 'lost';
  duration: number;
  startTime: number;
  endTime: number;
  result?: number;
  entryPrice?: number;
  finalPrice?: number;
}

interface RecentTradesProps {
  trades: Trade[];
  onTradeComplete?: (tradeId: string) => void;
}

export default function RecentTrades({ trades, onTradeComplete }: RecentTradesProps) {
  const [activeTrades, setActiveTrades] = useState<Trade[]>([]);

  useEffect(() => {
    setActiveTrades(trades);
    
    // Check for any active trades that should be completed
    const now = Date.now();
    const expiredTrades = trades.filter(trade => 
      trade.status === 'active' && trade.endTime <= now
    );
    
    if (expiredTrades.length > 0) {
      expiredTrades.forEach(trade => {
        onTradeComplete && onTradeComplete(trade.id);
      });
    }
  }, [trades, onTradeComplete]);

  const handleTradeComplete = (tradeId: string) => {
    onTradeComplete && onTradeComplete(tradeId);
  };

  if (trades.length === 0) {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Trades</h2>
        <p className="text-muted-foreground text-center py-4">No recent trades</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Recent Trades</h2>
      {activeTrades.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No recent trades. Place a trade to get started!</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left pb-2">Trade Amount</th>
                <th className="text-left pb-2">Direction</th>
                <th className="text-left pb-2">Result</th>
                <th className="text-left pb-2">Time Remaining</th>
                <th className="text-left pb-2">End Time</th>
              </tr>
            </thead>
            <tbody>
              {activeTrades.map((trade) => (
                <tr key={trade.id} className="border-b">
                  <td className="py-3">
                    <p className="font-medium">${trade.amount.toFixed(2)}</p>
                  </td>
                  <td className="py-3">
                    <p className={`font-medium flex items-center ${trade.direction === 'higher' ? 'text-green-500' : 'text-red-500'}`}>
                      {trade.direction === 'higher' ? (
                        <>
                          <ArrowUp className="h-4 w-4 mr-1" />
                          Higher
                        </>
                      ) : (
                        <>
                          <ArrowDown className="h-4 w-4 mr-1" />
                          Lower
                        </>
                      )}
                    </p>
                  </td>
                  <td className="py-3">
                    {trade.status === 'active' ? (
                      <p className="font-medium text-yellow-500">Pending</p>
                    ) : trade.status === 'won' ? (
                      <p className="font-medium text-green-500">Won (+${trade.result?.toFixed(2)})</p>
                    ) : (
                      <p className="font-medium text-red-500">Lost (-${trade.amount.toFixed(2)})</p>
                    )}
                  </td>
                  <td className="py-3">
                    {trade.status === 'active' ? (
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1 text-yellow-500" />
                        <TradeTimer 
                          duration={trade.duration} 
                          onComplete={() => handleTradeComplete(trade.id)} 
                        />
                      </div>
                    ) : (
                      <p className="font-medium">Completed</p>
                    )}
                  </td>
                  <td className="py-3">
                    <p className="font-medium">
                      {format(new Date(trade.endTime), 'HH:mm:ss')}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
