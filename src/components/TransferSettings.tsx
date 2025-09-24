import React, { useState } from 'react';
import { FolderOpen, Check, X } from 'lucide-react';

interface TransferSettingsProps {
  onSetTransferPath: (path: string) => Promise<void>;
}

export const TransferSettings: React.FC<TransferSettingsProps> = ({
  onSetTransferPath
}) => {
  const [transferPath, setTransferPath] = useState('');
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSetPath = async () => {
    if (!transferPath.trim()) return;

    setIsLoading(true);
    try {
      await onSetTransferPath(transferPath);
      setCurrentPath(transferPath);
      setTransferPath('');
    } catch (error) {
      console.error('Failed to set transfer path:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
      <h3 className="text-white font-semibold text-lg mb-4 flex items-center space-x-2">
        <FolderOpen className="w-5 h-5" />
        <span>Transfer Settings</span>
      </h3>

      {currentPath && (
        <div className="mb-4 p-3 bg-green-900/20 border border-green-700/50 rounded-lg">
          <div className="flex items-center space-x-2 text-green-400 text-sm">
            <Check className="w-4 h-4" />
            <span>Current path: {currentPath}</span>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Custom Transfer Path
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={transferPath}
              onChange={(e) => setTransferPath(e.target.value)}
              placeholder="/path/to/photos"
              className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={handleSetPath}
              disabled={!transferPath.trim() || isLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:text-slate-400 text-white rounded-lg transition-colors duration-200 font-medium"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Set Path'
              )}
            </button>
          </div>
        </div>

        <p className="text-slate-400 text-sm">
          Set a custom directory path where captured images will be saved. 
          Leave empty to use the default system path.
        </p>
      </div>
    </div>
  );
};