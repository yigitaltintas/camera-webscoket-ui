import React from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';

interface ConnectionStatusProps {
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  isConnecting,
  connectionError,
  onConnect,
  onDisconnect
}) => {
  const getStatusColor = () => {
    if (connectionError) return 'text-red-500';
    if (isConnected) return 'text-green-500';
    if (isConnecting) return 'text-yellow-500';
    return 'text-gray-500';
  };

  const getStatusText = () => {
    if (connectionError) return `Error: ${connectionError}`;
    if (isConnected) return 'Connected to Camera Server';
    if (isConnecting) return 'Connecting...';
    return 'Disconnected';
  };

  const getIcon = () => {
    if (isConnecting) return <Loader2 className="w-5 h-5 animate-spin" />;
    if (isConnected) return <Wifi className="w-5 h-5" />;
    return <WifiOff className="w-5 h-5" />;
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`${getStatusColor()} transition-colors duration-200`}>
            {getIcon()}
          </div>
          <div>
            <h3 className="text-white font-semibold">Server Connection</h3>
            <p className={`text-sm ${getStatusColor()} transition-colors duration-200`}>
              {getStatusText()}
            </p>
          </div>
        </div>
        
        <div className="space-x-2">
          {!isConnected && !isConnecting && (
            <button
              onClick={onConnect}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 font-medium"
            >
              Connect
            </button>
          )}
          
          {isConnected && (
            <button
              onClick={onDisconnect}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 font-medium"
            >
              Disconnect
            </button>
          )}
        </div>
      </div>
      
      <div className="mt-4 text-xs text-slate-400">
        WebSocket URL: ws://localhost:8080
      </div>
    </div>
  );
};