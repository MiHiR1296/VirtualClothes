import React from 'react';
import { Layers, X } from 'lucide-react';

/**
 * Component to display when multiple parts are selected
 * Shows selection count and provides a way to clear the selection
 */
const MultiSelectionIndicator = ({ count, onClear }) => {
  if (!count || count <= 1) return null;
  
  return (
    <div className="professional-card p-3 mb-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium text-primary">{count} parts selected</span>
        </div>
        <button 
          onClick={onClear}
          className="professional-button p-1"
          title="Clear selection"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-xs text-muted">
        Hold Ctrl/Cmd to select more parts or deselect
      </p>
    </div>
  );
};

export default MultiSelectionIndicator;