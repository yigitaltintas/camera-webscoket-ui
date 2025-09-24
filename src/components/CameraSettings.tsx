import React, { useState, useEffect } from 'react';
import { Settings, FolderSync as Sync, RefreshCw, Eye, EyeOff, Sliders, Zap } from 'lucide-react';
import { Camera, CameraSettings as CameraSettingsType, AvailableSettings, AutoSyncSettings } from '../types/camera';

interface CameraSettingsProps {
  cameras: Camera[];
  autoSyncSettings?: AutoSyncSettings;
  onGetCameraSettings: (cameraId: number) => Promise<any>;
  onSetCameraSetting: (
    settingType: string,
    settingValue: string,
    options: {
      cameraId?: number;
      applyToAll?: boolean;
      syncToMaster?: boolean;
    }
  ) => Promise<any>;
  onSyncMasterSettings: (settingsToSync?: string) => Promise<any>;
  onEnableAutoSync: (enabled: boolean, intervalMs?: number, settingsToSync?: string) => Promise<any>;
  onGetAvailableSettings: (cameraId: number, settingType: string) => Promise<any>;
}

const SETTING_TYPES = [
  { key: 'aperture', label: 'Aperture', icon: '⚪' },
  { key: 'iso', label: 'ISO', icon: '📷' },
  { key: 'shutter_speed', label: 'Shutter Speed', icon: '⏱️' },
  { key: 'white_balance', label: 'White Balance', icon: '🌡️' },
  { key: 'focus_mode', label: 'Focus Mode', icon: '🎯' },
  { key: 'exposure_mode', label: 'Exposure Mode', icon: '☀️' }
];

export const CameraSettings: React.FC<CameraSettingsProps> = ({
  cameras,
  autoSyncSettings,
  onGetCameraSettings,
  onSetCameraSetting,
  onSyncMasterSettings,
  onEnableAutoSync,
  onGetAvailableSettings
}) => {
  const [selectedCamera, setSelectedCamera] = useState<number | null>(null);
  const [cameraSettings, setCameraSettings] = useState<Record<number, CameraSettingsType>>({});
  const [availableSettings, setAvailableSettings] = useState<Record<number, Partial<AvailableSettings>>>({});
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [syncSettings, setSyncSettings] = useState<string[]>(['aperture', 'iso', 'shutter_speed']);
  const [autoSyncInterval, setAutoSyncInterval] = useState(2000);

  const connectedCameras = cameras.filter(c => c.status === 'connected');
  const masterCamera = cameras.find(c => c.is_master);

  useEffect(() => {
    if (connectedCameras.length > 0 && !selectedCamera) {
      setSelectedCamera(masterCamera?.id || connectedCameras[0].id);
    }
  }, [connectedCameras, masterCamera, selectedCamera]);

  const setLoading = (key: string, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: loading }));
  };

  const handleGetSettings = async (cameraId: number) => {
    setLoading(`get_settings_${cameraId}`, true);
    try {
      const response = await onGetCameraSettings(cameraId);
      if (response.success) {
        setCameraSettings(prev => ({
          ...prev,
          [cameraId]: response.settings
        }));
      }
    } catch (error) {
      console.error('Failed to get camera settings:', error);
    } finally {
      setLoading(`get_settings_${cameraId}`, false);
    }
  };

  const handleGetAvailableSettings = async (cameraId: number, settingType: string) => {
    const key = `${cameraId}_${settingType}`;
    if (availableSettings[cameraId]?.[settingType as keyof AvailableSettings]) return;

    setLoading(`available_${key}`, true);
    try {
      const response = await onGetAvailableSettings(cameraId, settingType);
      if (response.success) {
        setAvailableSettings(prev => ({
          ...prev,
          [cameraId]: {
            ...prev[cameraId],
            [settingType]: response.available_values
          }
        }));
      }
    } catch (error) {
      console.error('Failed to get available settings:', error);
    } finally {
      setLoading(`available_${key}`, false);
    }
  };

  const handleSetSetting = async (
    settingType: string,
    settingValue: string,
    options: { cameraId?: number; applyToAll?: boolean; syncToMaster?: boolean } = {}
  ) => {
    const key = `set_${settingType}_${options.cameraId || 'all'}`;
    setLoading(key, true);
    try {
      await onSetCameraSetting(settingType, settingValue, options);
      // Refresh settings for affected cameras
      if (options.applyToAll) {
        connectedCameras.forEach(camera => handleGetSettings(camera.id));
      } else if (options.cameraId) {
        handleGetSettings(options.cameraId);
      }
    } catch (error) {
      console.error('Failed to set camera setting:', error);
    } finally {
      setLoading(key, false);
    }
  };

  const handleSyncMaster = async () => {
    setLoading('sync_master', true);
    try {
      const settingsStr = syncSettings.length === SETTING_TYPES.length ? 'all' : syncSettings.join(',');
      await onSyncMasterSettings(settingsStr);
      // Refresh all camera settings
      connectedCameras.forEach(camera => handleGetSettings(camera.id));
    } catch (error) {
      console.error('Failed to sync master settings:', error);
    } finally {
      setLoading('sync_master', false);
    }
  };

  const handleToggleAutoSync = async () => {
    setLoading('auto_sync', true);
    try {
      const newEnabled = !autoSyncSettings?.enabled;
      const settingsStr = syncSettings.join(',');
      await onEnableAutoSync(newEnabled, autoSyncInterval, settingsStr);
    } catch (error) {
      console.error('Failed to toggle auto sync:', error);
    } finally {
      setLoading('auto_sync', false);
    }
  };

  const renderSettingControl = (camera: Camera, settingType: string, settingLabel: string) => {
    const currentValue = cameraSettings[camera.id]?.[settingType as keyof CameraSettingsType];
    const availableValues = availableSettings[camera.id]?.[settingType as keyof AvailableSettings];
    const isLoading = loadingStates[`set_${settingType}_${camera.id}`];

    return (
      <div key={`${camera.id}_${settingType}`} className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-300">{settingLabel}</label>
          <button
            onClick={() => handleGetAvailableSettings(camera.id, settingType)}
            disabled={loadingStates[`available_${camera.id}_${settingType}`]}
            className="text-xs text-blue-400 hover:text-blue-300 disabled:text-slate-500"
          >
            {loadingStates[`available_${camera.id}_${settingType}`] ? 'Loading...' : 'Refresh'}
          </button>
        </div>
        
        <div className="flex space-x-2">
          <select
            value={currentValue || ''}
            onChange={(e) => handleSetSetting(settingType, e.target.value, { cameraId: camera.id })}
            disabled={isLoading || !availableValues}
            className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 text-white text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-800 disabled:text-slate-400"
          >
            <option value="">Select {settingLabel}</option>
            {availableValues?.map(value => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
          
          <button
            onClick={() => currentValue && handleSetSetting(settingType, currentValue, { applyToAll: true })}
            disabled={!currentValue || loadingStates[`set_${settingType}_all`]}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white text-sm rounded-lg transition-colors duration-200"
            title="Apply to all cameras"
          >
            {loadingStates[`set_${settingType}_all`] ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Sync className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    );
  };

  if (connectedCameras.length === 0) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <h3 className="text-white font-semibold text-lg mb-4">Camera Settings</h3>
        <div className="text-center py-8 text-slate-400">
          <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No cameras connected</p>
          <p className="text-sm mt-2">Connect cameras to manage settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-white font-semibold text-lg flex items-center space-x-2">
          <Settings className="w-5 h-5" />
          <span>Camera Settings</span>
        </h3>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center space-x-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors duration-200"
          >
            {showAdvanced ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>{showAdvanced ? 'Simple' : 'Advanced'}</span>
          </button>
        </div>
      </div>

      {/* Auto Sync Controls */}
      {showAdvanced && (
        <div className="mb-6 p-4 bg-slate-700 rounded-lg border border-slate-600">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-white font-medium flex items-center space-x-2">
              <Zap className="w-4 h-4" />
              <span>Auto Synchronization</span>
            </h4>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-slate-400">
                {autoSyncSettings?.enabled ? 'Enabled' : 'Disabled'}
              </span>
              <button
                onClick={handleToggleAutoSync}
                disabled={loadingStates.auto_sync}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors duration-200 ${
                  autoSyncSettings?.enabled
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-slate-600 hover:bg-slate-500 text-slate-300'
                }`}
              >
                {loadingStates.auto_sync ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  autoSyncSettings?.enabled ? 'Disable' : 'Enable'
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Sync Interval (ms)
              </label>
              <input
                type="number"
                min="1000"
                max="10000"
                step="500"
                value={autoSyncInterval}
                onChange={(e) => setAutoSyncInterval(parseInt(e.target.value) || 2000)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Settings to Sync
              </label>
              <div className="flex flex-wrap gap-2">
                {SETTING_TYPES.map(setting => (
                  <label key={setting.key} className="flex items-center space-x-1">
                    <input
                      type="checkbox"
                      checked={syncSettings.includes(setting.key)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSyncSettings(prev => [...prev, setting.key]);
                        } else {
                          setSyncSettings(prev => prev.filter(s => s !== setting.key));
                        }
                      }}
                      className="w-3 h-3 text-blue-600 bg-slate-800 border-slate-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-xs text-slate-300">{setting.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Master Sync Controls */}
      {masterCamera && (
        <div className="mb-6 p-4 bg-slate-700 rounded-lg border border-slate-600">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-medium">Master Camera Sync</h4>
              <p className="text-sm text-slate-400">
                Sync settings from {masterCamera.alias} to all other cameras
              </p>
            </div>
            <button
              onClick={handleSyncMaster}
              disabled={loadingStates.sync_master}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-lg transition-colors duration-200 font-medium"
            >
              {loadingStates.sync_master ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span>Sync Now</span>
            </button>
          </div>
        </div>
      )}

      {/* Camera Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Select Camera
        </label>
        <div className="flex space-x-2">
          <select
            value={selectedCamera || ''}
            onChange={(e) => setSelectedCamera(parseInt(e.target.value))}
            className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {connectedCameras.map(camera => (
              <option key={camera.id} value={camera.id}>
                {camera.alias} {camera.is_master ? '(Master)' : ''}
              </option>
            ))}
          </select>
          
          {selectedCamera && (
            <button
              onClick={() => handleGetSettings(selectedCamera)}
              disabled={loadingStates[`get_settings_${selectedCamera}`]}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white rounded-lg transition-colors duration-200 font-medium"
            >
              {loadingStates[`get_settings_${selectedCamera}`] ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Load Settings'
              )}
            </button>
          )}
        </div>
      </div>

      {/* Settings Controls */}
      {selectedCamera && (
        <div className="space-y-6">
          {connectedCameras
            .filter(camera => camera.id === selectedCamera)
            .map(camera => (
              <div key={camera.id} className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <Sliders className="w-5 h-5 text-blue-400" />
                  <h4 className="text-white font-medium">{camera.alias}</h4>
                  {camera.is_master && (
                    <span className="px-2 py-1 bg-yellow-600 text-yellow-100 text-xs rounded-full">
                      Master
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {SETTING_TYPES.map(setting => 
                    renderSettingControl(camera, setting.key, setting.label)
                  )}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};