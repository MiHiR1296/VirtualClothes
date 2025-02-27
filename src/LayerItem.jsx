import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, ChevronUp, ChevronDown, Trash2, Upload } from 'lucide-react';

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
  onDetailScaleChange,
  onMaterialTypeChange
}) {
  // Local state for slider values
  const [localOpacity, setLocalOpacity] = useState(layer.opacity || 1);
  const [localDetailScale, setLocalDetailScale] = useState(layer.transformations?.detailScale || 1);

  // Update local state when layer props change
  useEffect(() => {
    setLocalOpacity(layer.opacity || 1);
    setLocalDetailScale(layer.transformations?.detailScale || 1);
  }, [layer]);

  // Handlers for slider changes
  const handleOpacityChange = (e) => {
    const newValue = Number(e.target.value);
    setLocalOpacity(newValue);
    onOpacityChange(layer.id, newValue);
  };

  const handleDetailScaleChange = (e) => {
    const newValue = Number(e.target.value);
    setLocalDetailScale(newValue);
    onDetailScaleChange(layer.id, newValue);
  };

  return (
    <div className="mb-2 bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
      {/* Layer Header */}
      <div className="p-2 bg-gray-800/50 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={() => onToggleVisibility(layer.id)}
            className={`flex-shrink-0 p-1 rounded hover:bg-gray-700 transition-colors ${
              layer.visible ? 'text-blue-400' : 'text-gray-500'
            }`}
            title={layer.visible ? 'Hide Layer' : 'Show Layer'}
          >
            {layer.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          <span className="text-sm font-medium text-gray-200 truncate">
            {layer.name || 'Unnamed Layer'}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={() => onMoveLayer(layer.id, 'up')}
            disabled={index === 0}
            className="p-1 text-gray-400 hover:bg-gray-700 rounded disabled:opacity-50"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => onMoveLayer(layer.id, 'down')}
            disabled={index === totalLayers - 1}
            className="p-1 text-gray-400 hover:bg-gray-700 rounded disabled:opacity-50"
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
        {/* Upload and Active Controls */}
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
                     rounded-lg cursor-pointer transition-colors text-sm text-gray-300"
          >
            <Upload className="w-4 h-4" />
            <span className="truncate">
              {layer.texture ? 'Change Logo' : 'Upload Logo'}
            </span>
          </label>
          
          <button
            onClick={() => onSetActive(layer.id)}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              layer.isActive 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {layer.isActive ? 'Active' : 'Select'}
          </button>
        </div>

        {/* Material Type Selection */}
        <div className="space-y-1">
          <label className="text-xs text-gray-400">Material Type</label>
          <select
            value={layer.materialType || 'base'}
            onChange={(e) => onMaterialTypeChange(layer.id, e.target.value)}
            className="w-full px-2 py-1 bg-gray-700 text-gray-200 rounded-lg 
                     border border-gray-600 text-sm focus:outline-none 
                     focus:ring-2 focus:ring-blue-500"
          >
            <option value="base">Base</option>
            <option value="print">Print</option>
            <option value="embroidery">Embroidery</option>
            <option value="generic">Generic</option>
          </select>
        </div>

        {/* Detail Scale Slider */}
        {layer.materialType !== 'base' && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-400">
              <span>Detail Scale</span>
              <span>{localDetailScale.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0.1}
              max={2.0}
              step={0.1}
              value={localDetailScale}
              onChange={handleDetailScaleChange}
              className="w-full accent-blue-500"
            />
          </div>
        )}

        {/* Layer Opacity Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Layer Opacity</span>
            <span>{(localOpacity * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={localOpacity}
            onChange={handleOpacityChange}
            className="w-full accent-blue-500"
          />
        </div>
      </div>
    </div>
  );
}