'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';

// Define an interface for the auth object
interface SocketAuth {
  token?: string;
  [key: string]: any;
}

export default function useSocket(namespace: string = '') {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const { isAuthenticated, getTokens } = useAuth();
  const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  
  const connect = useCallback(() => {
    try {
      if (socketRef.current?.connected) {
        console.log(`Socket already connected to ${namespace}`);
        return;
      }
      
      const { token } = getTokens();
      
      if (!token && namespace !== '/health') {
        console.warn('Socket connection attempted without authentication token');
        setError('Authentication required');
        return;
      }
      
      // Disconnect any existing connection first
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      
      console.log(`Connecting to socket namespace: ${namespace} at ${socketUrl}`);

      const socket = io(`${socketUrl}${namespace}`, {
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        auth: token ? { token } : undefined,
        withCredentials: true,
        transports: ['websocket', 'polling'],
      });

      socket.on('connect', () => {
        console.log(`Socket connected to ${namespace}`, socket.id);
        setIsConnected(true);
        setError(null);
      });

      socket.on('connect_error', (err) => {
        console.error(`Socket connection error for ${namespace}:`, err.message);
        setIsConnected(false);
        setError(`Connection error: ${err.message}`);
        setReconnectAttempt(prev => prev + 1);
      });

      socket.on('disconnect', (reason) => {
        console.log(`Socket disconnected from ${namespace}: ${reason}`);
        setIsConnected(false);
      });

      socket.on('error', (err) => {
        console.error(`Socket error for ${namespace}:`, err);
        setError(`Socket error: ${typeof err === 'string' ? err : err.message || 'Unknown error'}`);
      });

      socketRef.current = socket;
      return () => {
        socket.disconnect();
      };
    } catch (err: any) {
      console.error('Failed to create socket connection:', err);
      setError(`Socket initialization error: ${err.message}`);
      setIsConnected(false);
    }
  }, [namespace, socketUrl, getTokens]);

  // Connect when the component mounts and token is available
  useEffect(() => {
    if ((isAuthenticated || namespace === '/health') && !socketRef.current) {
      connect();
    }
    
    return () => {
      if (socketRef.current) {
        console.log(`Disconnecting socket from ${namespace}`);
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isAuthenticated, namespace, connect]);

  // Handle reconnection when token changes
  useEffect(() => {
    if (isAuthenticated && socketRef.current) {
      const { token } = getTokens();
      // Use type assertion to properly type the auth object
      const auth = socketRef.current.auth as SocketAuth | undefined;
      if (auth?.token !== token) {
        console.log('Token changed, reconnecting socket');
        connect();
      }
    }
  }, [isAuthenticated, getTokens, connect]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const emit = useCallback((event: string, ...args: any[]) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(event, ...args);
    } else {
      console.warn(`Cannot emit ${event}: socket is not connected`);
      if (!isAuthenticated && namespace !== '/health') {
        setError('Authentication required');
      } else if (!socketRef.current) {
        connect();
        // Queue the emit for after connection if needed
      }
    }
  }, [isConnected, isAuthenticated, namespace, connect]);

  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.off(event, callback);
      }
    };
  }, []);

  const off = useCallback((event: string, callback?: (...args: any[]) => void) => {
    if (socketRef.current) {
      if (callback) {
        socketRef.current.off(event, callback);
      } else {
        socketRef.current.off(event);
      }
    }
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    error,
    reconnectAttempt,
    connect,
    disconnect,
    emit,
    on,
    off
  };
}
