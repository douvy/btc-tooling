import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseLatencyMonitorResult {
  latency: number;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
}

/**
 * Ensures the WebSocket server is initialized before connecting
 */
const initializeWebSocketServer = async (): Promise<void> => {
  // Send a GET request to the socket endpoint to initialize the server
  await fetch('/api/socket');
};

/**
 * Hook to monitor WebSocket latency without using it for data
 * This allows us to show connection performance while using the REST API
 */
export function useLatencyMonitor(): UseLatencyMonitorResult {
  const [latency, setLatency] = useState<number>(0);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  
  const socketRef = useRef<Socket | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pingTimeRef = useRef<number>(0);
  const socketInitializedRef = useRef<boolean>(false);
  
  // Initialize and manage WebSocket connection
  useEffect(() => {
    let mounted = true;
    
    const setupSocket = async () => {
      try {
        // Initialize the WebSocket server if not already done
        if (!socketInitializedRef.current) {
          await initializeWebSocketServer();
          socketInitializedRef.current = true;
        }
        
        // Create socket connection if it doesn't exist
        if (!socketRef.current) {
          // Use absolute URL for WebSocket to ensure it works in production
          const socketUrl = typeof window !== 'undefined' ? `${window.location.origin}` : '';
          
          console.log('[Latency Monitor] Connecting to WebSocket server...');
          setConnectionStatus('connecting');
          
          // Connect to the WebSocket server
          socketRef.current = io(socketUrl, {
            path: '/api/socket',
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            timeout: 10000
          });
        }

        const socket = socketRef.current;
        
        // Handle WebSocket events
        socket.on('connect', () => {
          if (!mounted) return;
          
          console.log('[Latency Monitor] Connected successfully');
          setConnectionStatus('connected');
          
          // Set up latency monitoring (ping every 5 seconds)
          if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
          }
          
          pingIntervalRef.current = setInterval(() => {
            pingTimeRef.current = Date.now();
            socket.emit('ping');
          }, 5000);
          
          // Initial ping
          pingTimeRef.current = Date.now();
          socket.emit('ping');
        });
        
        socket.on('disconnect', () => {
          if (!mounted) return;
          
          console.log('[Latency Monitor] Disconnected');
          setConnectionStatus('disconnected');
          
          if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
            pingIntervalRef.current = null;
          }
        });
        
        socket.on('connect_error', (err: Error) => {
          if (!mounted) return;
          
          console.error('[Latency Monitor] Connection error:', err);
          setConnectionStatus('disconnected');
          
          if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
            pingIntervalRef.current = null;
          }
        });
        
        // Handle pong response to measure latency
        socket.on('pong', () => {
          if (!mounted) return;
          
          const receiveTime = Date.now();
          const latencyValue = receiveTime - pingTimeRef.current;
          setLatency(latencyValue);
        });
        
        // Also monitor crypto updates for latency
        socket.on('crypto_update', () => {
          if (!mounted || pingTimeRef.current === 0) return;
          
          const receiveTime = Date.now();
          const latencyValue = receiveTime - pingTimeRef.current;
          setLatency(latencyValue);
        });
        
      } catch (err) {
        console.error('[Latency Monitor] Setup error:', err);
        setConnectionStatus('disconnected');
      }
    };
    
    setupSocket();
    
    // Cleanup on unmount
    return () => {
      mounted = false;
      
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      
      if (socketRef.current) {
        console.log('[Latency Monitor] Disconnecting on unmount');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);
  
  return {
    latency,
    connectionStatus
  };
}