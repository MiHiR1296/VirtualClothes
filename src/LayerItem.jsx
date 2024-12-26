import React from 'react';
import { Eye, EyeOff, ChevronUp, ChevronDown, Trash2, Upload } from 'lucide-react';
import { MaterialTypeSelect } from './MaterialTypeSelect';


export default function LayerItem({
  layer,
  index,
  totalLayers,
  onToggleVisibility,
  onFileChange,
  onSetActive,
  onMoveLayer,
  onDelete,
  onOpacityChange,
  onMaterialTypeChange
}) {
  return (
    <div className="mb-2 bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
      {/* Layer Header - Added max width and flex properties */}
      <div className="p-2 bg-gray-800/50 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0 flex-1"> {/* Added min-w-0 and flex-1 */}
          <button
            onClick={() => onToggleVisibility(layer.id)}
            className={`flex-shrink-0 p-1 rounded hover:bg-gray-700 transition-colors ${
              layer.visible ? 'text-blue-400' : 'text-gray-500'
            }`}
            title={layer.visible ? 'Hide Layer' : 'Show Layer'}
          >
            {layer.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          <span className="text-sm font-medium text-gray-200 truncate" title={layer.name || 'Unnamed Layer'}>
            {layer.name || 'Unnamed Layer'}
          </span>
        </div>
        
        <div className="flex items-center gap-1 flex-shrink-0 ml-2"> {/* Added flex-shrink-0 and margin */}
          <button
            onClick={() => onMoveLayer(layer.id, 'up')}
            disabled={index === 0}
            className="p-1 text-gray-400 hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => onMoveLayer(layer.id, 'down')}
            disabled={index === totalLayers - 1}
            className="p-1 text-gray-400 hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(layer.id)}
            className="p-1 text-red-400 hover:bg-red-500/20 rounded"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Layer Content */}
      <div className="p-2 space-y-2">
        {/* File Upload - Improved layout for long filenames */}
        <div className="flex items-center gap-2">
          <input
            type="file"
            id={`layer-upload-${layer.id}`}
            onChange={(e) => onFileChange(layer.id, e)}
            accept="image/*"
            className="hidden"
          />
          <label
            htmlFor={`layer-upload-${layer.id}`}
            className="flex-1 flex items-center gap-2 px-2 py-1 bg-gray-700 hover:bg-gray-600 
                     rounded-lg cursor-pointer transition-colors text-sm text-gray-300 min-w-0"
          >
            <Upload className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">
              {layer.texture ? 'Change Logo' : 'Upload Logo'}
            </span>
          </label>
          
          <button
            onClick={() => onSetActive(layer.id)}
            className={`flex-shrink-0 px-3 py-1 text-sm rounded-lg transition-colors ${
              layer.isActive 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {layer.isActive ? 'Active' : 'Select'}
          </button>
        </div>

        {/* Opacity Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Opacity</span>
            <span>{Math.round(layer.opacity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={layer.opacity}
            onChange={(e) => onOpacityChange(layer.id, parseFloat(e.target.value))}
            className="w-full accent-blue-500"
          />
        </div>
      
        {/* Material Type Dropdown */}
        <MaterialTypeSelect
          value={layer.materialType}
          onChange={(value) => onMaterialTypeChange(layer.id, value)}
        />
      </div>
    </div>
  );
}