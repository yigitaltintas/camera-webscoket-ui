import React, { useState, useCallback, useEffect } from 'react';
import { Camera, Zap } from 'lucide-react';
import { useWebSocket } from './hooks/useWebSocket';
import { ConnectionStatus } from './components/ConnectionStatus';
import { CameraDiscovery } from './components/CameraDiscovery';
import { CameraControl } from './components/CameraControl';
import { EventLog } from './components/EventLog';
import { TransferSettings } from './components/TransferSettings';
import { CameraSettings } from './components/CameraSettings';
import { DiscoveredCamera, Camera as CameraType, SystemStatus, EventLog as EventLogType, AutoSyncSettings } from './types/camera';

const WEBSOCKET_URL = 'ws://localhost:8080';

function App() {
  const {
    isConnected,
    isConnecting,
    connectionError,
    eventLogs,
    connect,
    disconnect,
    sendMessage,
    subscribe,
    addLog
  } = useWebSocket(WEBSOCKET_URL);

  const [discoveredCameras, setDiscoveredCameras] = useState<DiscoveredCamera[]>([]);
  const [connectedCameras, setConnectedCameras] = useState<CameraType[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [autoSyncSettings, setAutoSyncSettings] = useState<AutoSyncSettings | undefined>();

  // Subscribe to WebSocket events
  useEffect(() => {
    const unsubscribeStatus = subscribe('status', (data: SystemStatus) => {
      setConnectedCameras(data.cameras);
      if (data.auto_sync) {
        setAutoSyncSettings(data.auto_sync);
      }
    });

    const unsubscribeConnected = subscribe('camera_connected', () => {
      // Refresh camera status when a camera connects
      if (isConnected) {
        sendMessage({ command: 'status' }).catch(console.error);
      }
    });

    const unsubscribeDisconnected = subscribe('camera_disconnected', () => {
      // Refresh camera status when a camera disconnects
      if (isConnected) {
        sendMessage({ command: 'status' }).catch(console.error);
      }
    });

    return () => {
      unsubscribeStatus();
      unsubscribeConnected();
      unsubscribeDisconnected();
    };
  }, [subscribe, isConnected, sendMessage]);

  // Initial status fetch when connected
  useEffect(() => {
    if (isConnected) {
      sendMessage({ command: 'status' }).catch(console.error);
    }
  }, [isConnected, sendMessage]);

  const handleDiscoverCameras = useCallback(async () => {
    if (!isConnected) {
      addLog('error', 'Please connect to the server first');
      return;
    }

    setIsDiscovering(true);
    try {
      const response = await sendMessage({ command: 'discover' });
      if (response.success) {
        setDiscoveredCameras(response.cameras || []);
        addLog('info', `Found ${response.count} camera(s)`);
      } else {
        addLog('error', response.error || 'Failed to discover cameras');
      }
    } catch (error) {
      addLog('error', 'Failed to discover cameras');
      console.error('Discovery error:', error);
    } finally {
      setIsDiscovering(false);
    }
  }, [isConnected, sendMessage, addLog]);

  const handleConnectCamera = useCallback(async (
    camera: DiscoveredCamera,
    options: { position?: string; alias?: string; setMaster?: boolean }
  ) => {
    try {
      const connectOptions: any = {
        command: 'connect',
        camera_index: camera.index.toString()
      };

      if (options.position && options.position !== 'unknown') {
        connectOptions.position = options.position;
      }
      if (options.alias) {
        connectOptions.alias = options.alias;
      }
      if (options.setMaster !== undefined) {
        connectOptions.set_master = options.setMaster.toString();
      }

      const response = await sendMessage(connectOptions);
      if (response.success) {
        addLog('success', `Connecting to ${options.alias || camera.model}...`);
      } else {
        addLog('error', response.error || 'Failed to connect camera');
      }
    } catch (error) {
      addLog('error', 'Failed to connect camera');
      console.error('Connection error:', error);
    }
  }, [sendMessage, addLog]);

  const handleSingleShot = useCallback(async (cameraId: number) => {
    try {
      const response = await sendMessage({
        command: 'single_shot',
        camera_id: cameraId.toString()
      });
      if (response.success) {
        addLog('success', `Photo taken by ${response.alias}`, cameraId);
      } else {
        addLog('error', response.error || 'Failed to take photo', cameraId);
      }
    } catch (error) {
      addLog('error', 'Failed to take photo', cameraId);
      console.error('Single shot error:', error);
    }
  }, [sendMessage, addLog]);

  const handleStartContinuous = useCallback(async (cameraId: number, intervalSeconds: number) => {
    try {
      const response = await sendMessage({
        command: 'start_continuous',
        camera_id: cameraId.toString(),
        interval_seconds: intervalSeconds.toString()
      });
      if (response.success) {
        addLog('success', `Continuous mode started (every ${intervalSeconds}s)`, cameraId);
        // Refresh status to get updated continuous mode state
        sendMessage({ command: 'status' }).catch(console.error);
      } else {
        addLog('error', response.error || 'Failed to start continuous mode', cameraId);
      }
    } catch (error) {
      addLog('error', 'Failed to start continuous mode', cameraId);
      console.error('Start continuous error:', error);
    }
  }, [sendMessage, addLog]);

  const handleStopContinuous = useCallback(async (cameraId: number) => {
    try {
      const response = await sendMessage({
        command: 'stop_continuous',
        camera_id: cameraId.toString()
      });
      if (response.success) {
        addLog('success', 'Continuous mode stopped', cameraId);
        // Refresh status to get updated continuous mode state
        sendMessage({ command: 'status' }).catch(console.error);
      } else {
        addLog('error', response.error || 'Failed to stop continuous mode', cameraId);
      }
    } catch (error) {
      addLog('error', 'Failed to stop continuous mode', cameraId);
      console.error('Stop continuous error:', error);
    }
  }, [sendMessage, addLog]);

  const handleDisconnectCamera = useCallback(async (cameraId: number) => {
    try {
      const response = await sendMessage({
        command: 'disconnect',
        camera_id: cameraId.toString()
      });
      if (response.success) {
        addLog('info', 'Camera disconnected', cameraId);
      } else {
        addLog('error', response.error || 'Failed to disconnect camera', cameraId);
      }
    } catch (error) {
      addLog('error', 'Failed to disconnect camera', cameraId);
      console.error('Disconnect error:', error);
    }
  }, [sendMessage, addLog]);

  const handleSetTransferPath = useCallback(async (path: string) => {
    try {
      const response = await sendMessage({
        command: 'set_transfer_path',
        path
      });
      if (response.success) {
        addLog('success', `Transfer path set to: ${response.path}`);
      } else {
        addLog('error', response.error || 'Failed to set transfer path');
      }
    } catch (error) {
      addLog('error', 'Failed to set transfer path');
      console.error('Set transfer path error:', error);
    }
  }, [sendMessage, addLog]);

  const handleGetCameraSettings = useCallback(async (cameraId: number) => {
    try {
      const response = await sendMessage({
        command: 'get_camera_settings',
        camera_id: cameraId.toString()
      });
      return response;
    } catch (error) {
      addLog('error', 'Failed to get camera settings', cameraId);
      throw error;
    }
  }, [sendMessage, addLog]);

  const handleSetCameraSetting = useCallback(async (
    settingType: string,
    settingValue: string,
    options: { cameraId?: number; applyToAll?: boolean; syncToMaster?: boolean } = {}
  ) => {
    try {
      const command: any = {
        command: 'set_camera_setting',
        setting_type: settingType,
        setting_value: settingValue
      };

      if (options.cameraId) {
        command.camera_id = options.cameraId.toString();
      }
      if (options.applyToAll !== undefined) {
        command.apply_to_all = options.applyToAll.toString();
      }
      if (options.syncToMaster !== undefined) {
        command.sync_to_master = options.syncToMaster.toString();
      }

      const response = await sendMessage(command);
      if (response.success) {
        const target = options.applyToAll ? 'all cameras' : 
                      options.cameraId ? `camera ${options.cameraId}` : 'master camera';
        addLog('success', `${settingType} set to ${settingValue} on ${target}`);
      } else {
        addLog('error', response.error || 'Failed to set camera setting');
      }
      return response;
    } catch (error) {
      addLog('error', 'Failed to set camera setting');
      throw error;
    }
  }, [sendMessage, addLog]);

  const handleSyncMasterSettings = useCallback(async (settingsToSync?: string) => {
    try {
      const command: any = {
        command: 'sync_master_settings'
      };
      
      if (settingsToSync) {
        command.settings_to_sync = settingsToSync;
      }

      const response = await sendMessage(command);
      if (response.success) {
        addLog('success', `Synchronized ${response.synced_settings.join(', ')} to ${response.total_synced} cameras`);
      } else {
        addLog('error', response.error || 'Failed to sync master settings');
      }
      return response;
    } catch (error) {
      addLog('error', 'Failed to sync master settings');
      throw error;
    }
  }, [sendMessage, addLog]);

  const handleEnableAutoSync = useCallback(async (
    enabled: boolean,
    intervalMs?: number,
    settingsToSync?: string
  ) => {
    try {
      const command: any = {
        command: 'enable_auto_sync',
        enabled: enabled.toString()
      };
      
      if (intervalMs) {
        command.sync_interval_ms = intervalMs.toString();
      }
      if (settingsToSync) {
        command.settings_to_auto_sync = settingsToSync;
      }

      const response = await sendMessage(command);
      if (response.success) {
        setAutoSyncSettings({
          enabled: response.auto_sync_enabled,
          interval_ms: response.sync_interval_ms,
          settings_to_sync: response.settings_to_sync
        });
        addLog('success', `Auto sync ${enabled ? 'enabled' : 'disabled'}`);
      } else {
        addLog('error', response.error || 'Failed to toggle auto sync');
      }
      return response;
    } catch (error) {
      addLog('error', 'Failed to toggle auto sync');
      throw error;
    }
  }, [sendMessage, addLog]);

  const handleGetAvailableSettings = useCallback(async (cameraId: number, settingType: string) => {
    try {
      const response = await sendMessage({
        command: 'get_available_settings',
        camera_id: cameraId.toString(),
        setting_type: settingType
      });
      return response;
    } catch (error) {
      addLog('error', 'Failed to get available settings', cameraId);
      throw error;
    }
  }, [sendMessage, addLog]);

  const handleClearLog = useCallback(() => {
    // This would clear the eventLogs state if we had a clearLogs function from the hook
    window.location.reload(); // Simple approach for now
  }, []);

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Sony Camera Control</h1>
                <p className="text-sm text-slate-400">Multi-Camera Server Interface</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Zap className={`w-5 h-5 ${isConnected ? 'text-green-500' : 'text-slate-500'}`} />
              <span className="text-sm text-slate-300">
                {connectedCameras.filter(c => c.status === 'connected').length} Active
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 2xl:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="2xl:col-span-2 space-y-8">
            {/* Connection Status */}
            <ConnectionStatus
              isConnected={isConnected}
              isConnecting={isConnecting}
              connectionError={connectionError}
              onConnect={connect}
              onDisconnect={disconnect}
            />

            {/* Camera Discovery */}
            <CameraDiscovery
              discoveredCameras={discoveredCameras}
              onDiscover={handleDiscoverCameras}
              onConnect={handleConnectCamera}
              isDiscovering={isDiscovering}
            />

            {/* Camera Control */}
            <CameraControl
              cameras={connectedCameras}
              onSingleShot={handleSingleShot}
              onStartContinuous={handleStartContinuous}
              onStopContinuous={handleStopContinuous}
              onDisconnect={handleDisconnectCamera}
            />

            {/* Camera Settings */}
            <CameraSettings
              cameras={connectedCameras}
              autoSyncSettings={autoSyncSettings}
              onGetCameraSettings={handleGetCameraSettings}
              onSetCameraSetting={handleSetCameraSetting}
              onSyncMasterSettings={handleSyncMasterSettings}
              onEnableAutoSync={handleEnableAutoSync}
              onGetAvailableSettings={handleGetAvailableSettings}
            />
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Transfer Settings */}
            <TransferSettings onSetTransferPath={handleSetTransferPath} />

            {/* Event Log */}
            <EventLog events={eventLogs} onClear={handleClearLog} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;