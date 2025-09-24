import React, { useState } from 'react';
import { Camera, Play, Square, Crown, Settings, Trash2, Timer } from 'lucide-react';
import { Camera as CameraType } from '../types/camera';

interface CameraControlProps {
  cameras: CameraType[];
  onSingleShot: (cameraId: number) => Promise<void>;
  onStartContinuous: (cameraId: number, intervalSeconds: number) => Promise<void>;
  onStopContinuous: (cameraId: number) => Promise<void>;
  onDisconnect: (cameraId: number) => Promise<void>;
}

export const CameraControl: React.FC<CameraControlProps> = ({
  cameras,
  onSingleShot,
  onStartContinuous,
  onStopContinuous,
  onDisconnect
}) => {
  const [loadingStates, setLoadingStates] = useState<Record<number, string>>({});
  const [intervalSettings, setIntervalSettings] = useState<Record<number, number>>({});

  const setLoading = (cameraId: number, action: string) => {
    setLoadingStates(prev => ({ ...prev, [cameraId]: action }));
  };

  const clearLoading = (cameraId: number) => {
    setLoadingStates(prev => {
      const next = { ...prev };
      delete next[cameraId];
      return next;
    });
  };

  const handleSingleShot = async (cameraId: number) => {
    setLoading(cameraId, 'single_shot');
    try {
      await onSingleShot(cameraId);
    } finally {
      clearLoading(cameraId);
    }
  };

  const handleStartContinuous = async (cameraId: number) => {
    const interval = intervalSettings[cameraId] || 5;
    setLoading(cameraId, 'start_continuous');
    try {
      await onStartContinuous(cameraId, interval);
    } finally {
      clearLoading(cameraId);
    }
  };

  const handleStopContinuous = async (cameraId: number) => {
    setLoading(cameraId, 'stop_continuous');
    try {
      await onStopContinuous(cameraId);
    } finally {
      clearLoading(cameraId);
    }
  };

  const handleDisconnect = async (cameraId: number) => {
    setLoading(cameraId, 'disconnect');
    try {
      await onDisconnect(cameraId);
    } finally {
      clearLoading(cameraId);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-500';
      case 'connecting': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getPositionIcon = (position: string) => {
    const baseClass = "w-3 h-3 rounded-full";
    switch (position) {
      case 'left': return <div className={`${baseClass} bg-blue-500`} title="Left" />;
      case 'center': return <div className={`${baseClass} bg-green-500`} title="Center" />;
      case 'right': return <div className={`${baseClass} bg-purple-500`} title="Right" />;
      default: return <div className={`${baseClass} bg-gray-500`} title="Unknown" />;
    }
  };

  if (cameras.length === 0) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <h3 className="text-white font-semibold text-lg mb-4">Camera Control</h3>
        <div className="text-center py-8 text-slate-400">
          <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No cameras connected</p>
          <p className="text-sm mt-2">Discover and connect cameras to begin</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-white font-semibold text-lg">Camera Control</h3>
        <div className="text-sm text-slate-400">
          {cameras.filter(c => c.status === 'connected').length} of {cameras.length} connected
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {cameras.map((camera) => {
          const isLoading = loadingStates[camera.id];
          const interval = intervalSettings[camera.id] || 5;

          return (
            <div key={camera.id} className="bg-slate-700 rounded-lg p-5 border border-slate-600">
              {/* Camera Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <Camera className="w-5 h-5 text-slate-300" />
                    {camera.is_master && <Crown className="w-4 h-4 text-yellow-500" title="Master Camera" />}
                    {getPositionIcon(camera.position)}
                  </div>
                  <div>
                    <h4 className="text-white font-medium">{camera.alias}</h4>
                    <p className="text-slate-400 text-sm">{camera.model}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className={`text-sm font-medium ${getStatusColor(camera.status)} capitalize`}>
                    {camera.status}
                  </div>
                  <div className="text-xs text-slate-400">ID: {camera.device_id}</div>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="space-y-3">
                {/* Single Shot */}
                <button
                  onClick={() => handleSingleShot(camera.id)}
                  disabled={camera.status !== 'connected' || isLoading === 'single_shot'}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:text-slate-400 text-white rounded-lg transition-colors duration-200 font-medium"
                >
                  {isLoading === 'single_shot' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Taking Photo...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4" />
                      <span>Take Single Shot</span>
                    </>
                  )}
                </button>

                {/* Continuous Mode Controls */}
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-2 flex-1">
                    <Timer className="w-4 h-4 text-slate-400" />
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={interval}
                      onChange={(e) => setIntervalSettings(prev => ({
                        ...prev,
                        [camera.id]: parseInt(e.target.value) || 1
                      }))}
                      disabled={camera.continuous_mode}
                      className="w-16 px-2 py-1 bg-slate-800 border border-slate-600 text-white text-sm rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-700 disabled:text-slate-400"
                    />
                    <span className="text-xs text-slate-400">sec</span>
                  </div>
                  
                  {!camera.continuous_mode ? (
                    <button
                      onClick={() => handleStartContinuous(camera.id)}
                      disabled={camera.status !== 'connected' || isLoading === 'start_continuous'}
                      className="flex items-center space-x-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:text-slate-400 text-white rounded-lg transition-colors duration-200 text-sm font-medium"
                    >
                      {isLoading === 'start_continuous' ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      <span>Start</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStopContinuous(camera.id)}
                      disabled={isLoading === 'stop_continuous'}
                      className="flex items-center space-x-2 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-600 disabled:text-slate-400 text-white rounded-lg transition-colors duration-200 text-sm font-medium"
                    >
                      {isLoading === 'stop_continuous' ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                      <span>Stop</span>
                    </button>
                  )}
                </div>

                {/* Disconnect Button */}
                <button
                  onClick={() => handleDisconnect(camera.id)}
                  disabled={isLoading === 'disconnect'}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 disabled:text-slate-400 text-white rounded-lg transition-colors duration-200 font-medium text-sm"
                >
                  {isLoading === 'disconnect' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Disconnecting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Disconnect</span>
                    </>
                  )}
                </button>
              </div>

              {/* Status Information */}
              {camera.continuous_mode && (
                <div className="mt-4 p-3 bg-slate-800 rounded-lg">
                  <div className="flex items-center space-x-2 text-sm text-green-400">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span>Continuous mode active (every {camera.interval_seconds}s)</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};