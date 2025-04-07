import React from 'react';
import classNames from 'classnames';

interface LatencyDisplayProps {
  latency: number;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
}

export const LatencyDisplay: React.FC<LatencyDisplayProps> = ({ latency, connectionStatus }) => {
  // Determine color based on latency
  const getColorClass = () => {
    if (connectionStatus === 'disconnected') return 'text-error';
    if (connectionStatus === 'connecting') return 'text-warning';
    
    if (latency < 100) return 'text-success';
    if (latency < 300) return 'text-success-dark';
    if (latency < 500) return 'text-warning';
    return 'text-error';
  };
  
  // Connection status indicator
  const getStatusIndicator = () => {
    const statusClasses = classNames(
      "inline-block w-2 h-2 rounded-full mr-2",
      {
        "bg-success animate-pulse": connectionStatus === 'connected',
        "bg-warning": connectionStatus === 'connecting',
        "bg-error": connectionStatus === 'disconnected'
      }
    );
    
    return <span className={statusClasses} aria-hidden="true"></span>;
  };
  
  // Format latency display
  const getLatencyText = () => {
    if (connectionStatus === 'disconnected') return 'Offline';
    if (connectionStatus === 'connecting') return 'Connecting...';
    
    return `${latency}ms`;
  };
  
  return (
    <div className="flex items-center mr-3 text-xs" title="Data latency">
      {getStatusIndicator()}
      <span className={classNames("font-mono", getColorClass())}>
        {getLatencyText()}
      </span>
    </div>
  );
};