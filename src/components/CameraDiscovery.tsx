import React, { useState } from 'react';
import { Search, Camera, Usb, Wifi, MapPin } from 'lucide-react';
import { DiscoveredCamera } from '../types/camera';

interface CameraDiscoveryProps {
  discoveredCameras: DiscoveredCamera[];
  onDiscover: () => Promise<void>;
  onConnect: (camera: DiscoveredCamera, options: {
    position?: string;
    alias?: string;
    setMaster?: boolean;
  }) => Promise<void>;
  isDiscovering: boolean;
}

export const CameraDiscovery: React.FC<CameraDiscoveryProps> = ({
  discoveredCameras,
  onDiscover,
  onConnect,
  isDiscovering
}) => {
  const [connectingCameras, setConnectingCameras] = useState<Set<number>>(new Set());
  const [connectionOptions, setConnectionOptions] = useState<Record<number, {
    position: string;
    alias: string;
    setMaster: boolean;
  }>>({});

  const handleConnect = async (camera: DiscoveredCamera) => {
    setConnectingCameras(prev => new Set(prev).add(camera.index));
    
    try {
      const options = connectionOptions[camera.index] || {
        position: 'unknown',
        alias: camera.model,
        setMaster: discoveredCameras.length === 1
      };
      
      await onConnect(camera, options);
    } catch (error) {
      console.error('Failed to connect camera:', error);
    } finally {
      setConnectingCameras(prev => {
        const next = new Set(prev);
        next.delete(camera.index);
        return next;
      });
    }
  };

  const updateConnectionOption = (cameraIndex: number, key: string, value: any) => {
    setConnectionOptions(prev => ({
      ...prev,
      [cameraIndex]: {
        ...prev[cameraIndex] || { position: 'unknown', alias: '', setMaster: false },
        [key]: value
      }
    }));
  };

  const getConnectionTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'usb': return <Usb className="w-4 h-4" />;
      case 'wifi': return <Wifi className="w-4 h-4" />;
      default: return <Camera className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-white font-semibold text-lg">Camera Discovery</h3>
        <button
          onClick={onDiscover}
          disabled={isDiscovering}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors duration-200 font-medium"
        >
          <Search className={`w-4 h-4 ${isDiscovering ? 'animate-spin' : ''}`} />
          <span>{isDiscovering ? 'Discovering...' : 'Discover Cameras'}</span>
        </button>
      </div>

      {discoveredCameras.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <Camera className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No cameras discovered yet</p>
          <p className="text-sm mt-2">Click "Discover Cameras" to search for Sony cameras</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {discoveredCameras.map((camera) => {
            const isConnecting = connectingCameras.has(camera.index);
            const options = connectionOptions[camera.index] || {
              position: 'unknown',
              alias: camera.model,
              setMaster: discoveredCameras.length === 1
            };

            return (
              <div key={camera.index} className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-white font-medium">{camera.model}</h4>
                    <p className="text-slate-400 text-sm">ID: {camera.id}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      {getConnectionTypeIcon(camera.connection_type)}
                      <span className="text-slate-400 text-sm">{camera.connection_type}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Alias
                    </label>
                    <input
                      type="text"
                      value={options.alias}
                      onChange={(e) => updateConnectionOption(camera.index, 'alias', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Camera name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Position
                    </label>
                    <select
                      value={options.position}
                      onChange={(e) => updateConnectionOption(camera.index, 'position', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                      <option value="unknown">Unknown</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`master-${camera.index}`}
                      checked={options.setMaster}
                      onChange={(e) => updateConnectionOption(camera.index, 'setMaster', e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor={`master-${camera.index}`} className="text-sm text-slate-300">
                      Set as master camera
                    </label>
                  </div>
                </div>

                <button
                  onClick={() => handleConnect(camera)}
                  disabled={isConnecting}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg transition-colors duration-200 font-medium"
                >
                  {isConnecting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <MapPin className="w-4 h-4" />
                      <span>Connect Camera</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};