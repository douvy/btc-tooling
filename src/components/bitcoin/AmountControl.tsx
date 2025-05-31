import { ChangeEvent, useState } from 'react';

// Amount increment steps for BTC
const AMOUNT_STEPS = [0.01, 0.05, 0.1, 0.5, 1, 2.5, 5, 10];
const MIN_AMOUNT = 0.01;
const MAX_AMOUNT = 10;

interface AmountControlProps {
  amount: string;
  onAmountChange: (amount: string) => void;
  isMobile: boolean;
}

/**
 * Component for controlling BTC amount with increment/decrement buttons
 */
export function AmountControl({ amount, onAmountChange, isMobile }: AmountControlProps) {
  // Check if at min or max amount
  const isAtMinAmount = parseFloat(amount) <= MIN_AMOUNT;
  const isAtMaxAmount = parseFloat(amount) >= MAX_AMOUNT;
  
  // Handle amount decrement
  const decrementAmount = () => {
    const currentAmount = parseFloat(amount);
    
    // Find the previous step in the array
    const currentIndex = AMOUNT_STEPS.findIndex(step => step >= currentAmount);
    const prevIndex = Math.max(0, currentIndex - 1);
    
    const newAmount = AMOUNT_STEPS[prevIndex];
    onAmountChange(newAmount.toString());
  };
  
  // Handle amount increment
  const incrementAmount = () => {
    const currentAmount = parseFloat(amount);
    
    // Find the next step in the array
    const currentIndex = AMOUNT_STEPS.findIndex(step => step > currentAmount);
    const nextIndex = currentIndex === -1 ? AMOUNT_STEPS.length - 1 : currentIndex;
    
    const newAmount = AMOUNT_STEPS[nextIndex];
    onAmountChange(newAmount.toString());
  };
  
  // Handle amount input change
  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    // Only allow valid numbers with up to 2 decimal places
    const value = e.target.value;
    if (/^\d*\.?\d{0,2}$/.test(value) || value === '') {
      onAmountChange(value);
    }
  };
  
  // Handle entering a custom amount
  const handleBlur = () => {
    // Validate and format amount on blur
    if (amount === '' || isNaN(parseFloat(amount))) {
      onAmountChange(MIN_AMOUNT.toString());
    } else {
      // Ensure amount is within min/max range
      let numAmount = parseFloat(amount);
      if (numAmount < MIN_AMOUNT) {
        numAmount = MIN_AMOUNT;
      } else if (numAmount > MAX_AMOUNT) {
        numAmount = MAX_AMOUNT;
      }
      
      // Find the closest preset step
      const closestStep = AMOUNT_STEPS.reduce((prev, curr) => {
        return (Math.abs(curr - numAmount) < Math.abs(prev - numAmount) ? curr : prev);
      });
      
      onAmountChange(closestStep.toString());
    }
  };

  return (
    <div className={`flex items-center my-3 ${isMobile ? '' : 'gap-1'}`}>
      {/* Minus button */}
      <div className={`${isMobile ? 'w-12' : 'w-8'} h-10 
        border ${isAtMinAmount ? 'border-gray-800' : 'border-divider'} 
        rounded-sm ${!isAtMinAmount ? 'hover:bg-gray-700' : ''} 
        transition-colors flex-shrink-0`}>
        <button 
          className={`w-full h-full flex items-center justify-center text-lg ${isAtMinAmount ? 'text-gray-700 cursor-default' : 'text-white'}`}
          onClick={decrementAmount}
          aria-label="Decrease amount"
          disabled={isAtMinAmount}
        >−</button>
      </div>
      
      {/* Amount input - Fixed width to ensure proper sizing */}
      <div className="flex-grow mx-3">
        <div className="w-full h-10 border border-divider flex items-center rounded-sm relative">
          <input
            type="text"
            value={amount}
            onChange={handleAmountChange}
            onBlur={handleBlur}
            className="w-full h-full bg-transparent text-sm text-white text-center outline-none px-8"
            aria-label="Amount in BTC"
          />
          <span className="absolute right-2 text-sm text-white">BTC</span>
        </div>
      </div>
      
      {/* Plus button */}
      <div className={`${isMobile ? 'w-12' : 'w-8'} h-10 
        border ${isAtMaxAmount ? 'border-gray-800' : 'border-divider'} 
        rounded-sm ${!isAtMaxAmount ? 'hover:bg-gray-700' : ''} 
        transition-colors flex-shrink-0`}>
        <button 
          className={`w-full h-full flex items-center justify-center text-lg ${isAtMaxAmount ? 'text-gray-700 cursor-default' : 'text-white'}`}
          onClick={incrementAmount}
          aria-label="Increase amount"
          disabled={isAtMaxAmount}
        >+</button>
      </div>
    </div>
  );
}