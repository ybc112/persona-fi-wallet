"use client";

import { useState, useEffect } from 'react';
import { createRobustConnection } from '../utils/rpcConfig';

interface RpcStatusProps {
  className?: string;
}

export default function RpcStatus({ className = '' }: RpcStatusProps) {
  const [status, setStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [lastError, setLastError] = useState<string>('');
  const [requestCount, setRequestCount] = useState(0);

  useEffect(() => {
    const checkRpcStatus = async () => {
      try {
        const connection = createRobustConnection();
        const slot = await connection.getSlot();
        setStatus('connected');
        setLastError('');
        setRequestCount(prev => prev + 1);
      } catch (error: any) {
        setStatus('error');
        setLastError(error.message || 'Unknown error');
        console.error('RPC Status Check Error:', error);
      }
    };

    // 初始检查
    checkRpcStatus();

    // 每30秒检查一次
    const interval = setInterval(checkRpcStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'text-green-500';
      case 'error': return 'text-red-500';
      default: return 'text-yellow-500';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected': return '🟢 RPC Connected';
      case 'error': return '🔴 RPC Error';
      default: return '🟡 Checking...';
    }
  };

  return (
    <div className={`text-sm ${className}`}>
      <div className={`font-medium ${getStatusColor()}`}>
        {getStatusText()}
      </div>
      {status === 'connected' && (
        <div className="text-gray-500 text-xs">
          Requests: {requestCount}
        </div>
      )}
      {status === 'error' && lastError && (
        <div className="text-red-400 text-xs mt-1 max-w-xs truncate" title={lastError}>
          {lastError}
        </div>
      )}
    </div>
  );
}
