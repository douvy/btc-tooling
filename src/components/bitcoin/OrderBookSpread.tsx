interface OrderBookSpreadProps {
  spread: number;
  currentPrice: number;
  amount: string;
  viewMode: 'sum' | 'total';
}

/**
 * Component for displaying the spread between asks and bids
 * and the current value of the selected amount
 */
export function OrderBookSpread({ spread, currentPrice, amount, viewMode }: OrderBookSpreadProps) {
  // Calculate the current value of the amount in USD
  const amountValue = parseFloat(amount) * currentPrice;

  return (
    <div className="grid grid-cols-18 text-xs py-2 border-t border-b border-divider">
      <div className="col-span-1"></div>
      <div className="col-span-5 text-center text-dark-grayish-blue">USD Spread</div>
      <div className="col-span-6 text-center text-dark-grayish-blue">{spread.toFixed(2)}</div>
      <div className="col-span-6 text-center text-white">
        <span className="text-dark-grayish-blue mr-1">≈</span>
        ${amountValue.toFixed(2)}
      </div>
    </div>
  );
}