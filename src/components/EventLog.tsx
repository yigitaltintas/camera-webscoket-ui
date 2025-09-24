import React from 'react';
import { MessageCircle, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';
import { EventLog as EventLogType } from '../types/camera';

interface EventLogProps {
  events: EventLogType[];
  onClear: () => void;
}

export const EventLog: React.FC<EventLogProps> = ({ events, onClear }) => {
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getEventBgColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-900/20 border-green-700/50';
      case 'warning': return 'bg-yellow-900/20 border-yellow-700/50';
      case 'error': return 'bg-red-900/20 border-red-700/50';
      default: return 'bg-blue-900/20 border-blue-700/50';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-white font-semibold text-lg flex items-center space-x-2">
          <MessageCircle className="w-5 h-5" />
          <span>Event Log</span>
          {events.length > 0 && (
            <span className="text-slate-400 text-sm font-normal">({events.length})</span>
          )}
        </h3>
        
        {events.length > 0 && (
          <button
            onClick={onClear}
            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors duration-200"
          >
            Clear Log
          </button>
        )}
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {events.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No events yet</p>
          </div>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className={`p-3 rounded-lg border transition-colors duration-200 ${getEventBgColor(event.type)}`}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getEventIcon(event.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-white text-sm font-medium break-words">
                      {event.message}
                    </p>
                    <span className="text-slate-400 text-xs font-mono ml-2 flex-shrink-0">
                      {formatTime(event.timestamp)}
                    </span>
                  </div>
                  {event.camera_id && (
                    <p className="text-slate-400 text-xs mt-1">
                      Camera ID: {event.camera_id}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};