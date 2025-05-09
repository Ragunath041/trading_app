'use client';

import { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreditCard, Wallet } from "lucide-react";

export default function DepositPage() {
  const [amount, setAmount] = useState('100');

  const handleDeposit = async () => {
    try {
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: parseFloat(amount) }),
      });

      const data = await response.json();
      // Handle the payment with Stripe.js
      // You'll need to implement the client-side Stripe integration here
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Wallet className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Deposit Funds</h1>
          </div>

          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium block mb-2">
                Deposit Amount (USD)
              </label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="10"
                step="10"
                className="text-lg"
              />
            </div>

            <div className="grid gap-4">
              <Button 
                onClick={handleDeposit}
                className="w-full py-6 text-lg gap-2"
              >
                <CreditCard className="h-5 w-5" />
                Deposit ${amount}
              </Button>
            </div>

            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h3 className="font-medium">Payment Methods</h3>
              <ul className="text-sm text-muted-foreground">
                <li>• Credit/Debit Card</li>
                <li>• Bank Transfer</li>
                <li>• Cryptocurrency</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}