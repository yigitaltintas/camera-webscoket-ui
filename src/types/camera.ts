export interface Camera {
  id: number;
  model: string;
  device_id: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  position: 'left' | 'center' | 'right' | 'unknown';
  alias: string;
  is_master: boolean;
  continuous_mode: boolean;
  interval_seconds: number;
  settings?: CameraSettings;
}

export interface CameraSettings {
  aperture: string;
  iso: string;
  shutter_speed: string;
  white_balance: string;
  focus_mode: string;
  exposure_mode: string;
}

export interface AvailableSettings {
  aperture: string[];
  iso: string[];
  shutter_speed: string[];
  white_balance: string[];
  focus_mode: string[];
  exposure_mode: string[];
}

export interface AutoSyncSettings {
  enabled: boolean;
  interval_ms: number;
  settings_to_sync: string[];
}

export interface DiscoveredCamera {
  index: number;
  model: string;
  id: string;
  connection_type: string;
}

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export interface SystemStatus {
  cameras: Camera[];
  master_camera_id: number;
  total_cameras: number;
  connected_cameras: number;
  auto_sync?: AutoSyncSettings;
}

export interface EventLog {
  id: string;
  timestamp: Date;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  camera_id?: number;
}