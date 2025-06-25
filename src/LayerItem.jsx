import { logDebug, logInfo, logWarn, logError } from "./logger.js";
import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, ChevronUp, ChevronDown, Trash2, Upload, Edit } from 'lucide-react';
import { useTextureContext } from './TextureContext';

export default function LayerItem({
  layer,
  index,
  totalLayers,
  onToggleVisibility,
  onFileChange,
  onMoveLayer,
  onDelete,
  onOpacityChange,
  onDetailScaleChange,
  onMaterialTypeChange,
  availableParts = [] // Available parts dynamically calculated by parent
}) {
  const { updateTransformation } = useTextureContext();
  
  // Local state for slider values
  const [localOpacity, setLocalOpacity] = useState(layer.opacity || 1);
  const [localDetailScale, setLocalDetailScale] = useState(layer.transformations?.detailScale || 1);
  const [selectedParts, setSelectedParts] = useState(layer.selectedParts || []); 

  // Update local state when layer props change
  useEffect(() => {
    setLocalOpacity(layer.opacity || 1);
    setLocalDetailScale(layer.transformations?.detailScale || 1);
    setSelectedParts(layer.selectedParts || []);
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

  // Handler to open UV Editor for this specific layer
  const handleOpenUVEditor = () => {
    // Use global window event to open UV Editor for this specific layer
    window.dispatchEvent(new CustomEvent('open-uv-editor', { 
      detail: { layerId: layer.id, layerData: layer } 
    }));
  };

  // Part selection handler with error checking
  
  // Direct part selection handler for LayerItem.jsx
  const handlePartSelectionChange = (e) => {
    try {
      const options = e.target.options;
      const newSelectedParts = [];
      
      if (options) {
        for (let i = 0; i < options.length; i++) {
          if (options[i].selected) {
            newSelectedParts.push(options[i].value);
          }
        }
      }
      
      // Set local state first for immediate UI feedback
      setSelectedParts(newSelectedParts);
      
      // Log the new selection for debugging
      logDebug(`Layer ${layer.id} (${layer.name}): Selected parts changed to:`, newSelectedParts);
      
      // First step: Update the layer data in context
      updateTransformation(layer.id, {
        selectedParts: newSelectedParts
      });
      
      // Second step: Force immediate update of all texture meshes
      const updateTextureMeshes = () => {
        // Get all texture objects from the scene
        const textureObjects = window.findTextureObjects?.() || [];
        if (textureObjects.length === 0) {
          logWarn("No texture objects found to update");
          return;
        }
        
        logDebug(`Updating ${textureObjects.length} texture objects with new part selection`);
        
        // Get the compositor
        const compositor = window._textureCompositor;
        if (!compositor) {
          logWarn('TextureCompositor not available');
          return;
        }
        
        // Reset compositor to clear any cached state
        compositor.reset();
        
        // Get all layers, ensuring we have the latest data
        const allLayers = window.getAllTextureLayersForUpdate?.() || [];
        
        // Explicitly reset materials first
        textureObjects.forEach(obj => {
          if (obj.material) {
            // Ensure we have proper material properties
            obj.material.transparent = true;
            obj.material.opacity = 1.0;
            obj.material.alphaTest = 0.01;
            obj.material.needsUpdate = true;
          }
        });
        
        // Now update all texture objects with fresh data
        textureObjects.forEach(object => {
          try {
            // Always use the latest context data
            const latestLayers = window.getAllTextureLayersForUpdate?.() || allLayers;
            
            // Completely fresh update
            compositor.updateMaterial(object, latestLayers);
          } catch (error) {
            logError(`Error updating material for ${object.name}:`, error);
          }
        });
      };
      
      // Execute the update with a very slight delay to ensure context is updated
      setTimeout(updateTextureMeshes, 10);
      
    } catch (error) {
      logError('Error updating part selection:', error);
    }
  };

  // Calculate if parts selection should show a warning about limited parts
  const calculatePartsWarning = () => {
    // Show warning only if there are available parts but they're less than all model parts
    if (availableParts.length === 0) {
      return "No parts available - all parts are assigned to other layers";
    }
    
    return null; // No warning needed
  };
  
  const partsWarning = calculatePartsWarning();
  
  // Calculate CSS class for part selection based on available parts
  const partsSelectionClass = 
    availableParts.length === 0
      ? "bg-red-900/30 border-red-700"
      : "bg-gray-700 border-gray-600";

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
        {/* Upload and UV Edit Controls */}
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
            onClick={handleOpenUVEditor}
            className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                     transition-colors flex items-center gap-2 text-sm"
          >
            <Edit className="w-4 h-4" />
            UV Edit
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

        {/* Part Selection Dropdown */}
        <div className="space-y-1">
          <label className="text-xs text-gray-400">Select Parts</label>
          <select
            multiple
            value={selectedParts}
            onChange={handlePartSelectionChange}
            className={`w-full px-2 py-1 text-gray-200 rounded-lg 
                     border text-sm focus:outline-none 
                     focus:ring-2 focus:ring-blue-500 ${partsSelectionClass}`}
            style={{ minHeight: '100px' }}
            disabled={availableParts.length === 0}
          >
            {availableParts.map(part => (
              <option key={part} value={part}>
                {part}
              </option>
            ))}
            
            {/* If there are already selected parts that are no longer available, still show them */}
            {selectedParts
              .filter(part => !availableParts.includes(part))
              .map(part => (
                <option key={part} value={part} style={{color: '#ff9999'}}>
                  {part} (assigned elsewhere)
                </option>
              ))
            }
          </select>
          
          {partsWarning && (
            <p className="text-xs text-yellow-500 mt-1">
              {partsWarning}
            </p>
          )}
          
          <p className="text-xs text-gray-500">
            Hold Ctrl/Cmd to select multiple parts
          </p>
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