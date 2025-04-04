import React from 'react';
import { Layers, X } from 'lucide-react';

/**
 * Component to display when multiple parts are selected
 * Shows selection count and provides a way to clear the selection
 */
const MultiSelectionIndicator = ({ count, onClear }) => {
  if (!count || count <= 1) return null;
  
  return (
    <div className="mt-2 p-2 bg-blue-600/20 border border-blue-500/30 rounded-lg text-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-400" />
          <span>{count} parts selected</span>
        </div>
        <button 
          onClick={onClear}
          className="p-1 hover:bg-blue-700/30 rounded-full"
          title="Clear selection"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-1">
        Hold Ctrl/Cmd to select more parts or deselect
      </p>
    </div>
  );
};

export default MultiSelectionIndicator;