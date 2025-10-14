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
      ? "professional-input border-error bg-error/10"
      : "professional-input";

  return (
    <div className="professional-card overflow-hidden">
      {/* Layer Header */}
      <div className="panel-header">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            onClick={() => onToggleVisibility(layer.id)}
            className={`professional-button p-1 ${
              layer.visible ? 'opacity-100' : 'opacity-60'
            }`}
            title={layer.visible ? 'Hide Layer' : 'Show Layer'}
          >
            {layer.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          <span className="text-sm font-medium text-primary truncate">
            {layer.name || 'Unnamed Layer'}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={() => onMoveLayer(layer.id, 'up')}
            disabled={index === 0}
            className="professional-button p-1 disabled:opacity-50"
            title="Move Up"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => onMoveLayer(layer.id, 'down')}
            disabled={index === totalLayers - 1}
            className="professional-button p-1 disabled:opacity-50"
            title="Move Down"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(layer.id)}
            className="professional-button danger p-1"
            title="Delete Layer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Layer Content */}
      <div className="panel-content">
        <div className="space-y-4">
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
              className="flex-1 professional-button flex items-center gap-2 px-3 py-2 cursor-pointer text-sm"
            >
              <Upload className="w-4 h-4" />
              <span className="truncate">
                {layer.texture ? 'Change Logo' : 'Upload Logo'}
              </span>
            </label>
            
            <button
              onClick={handleOpenUVEditor}
              className="professional-button px-3 py-2 flex items-center gap-2 text-sm"
            >
              <Edit className="w-4 h-4" />
              UV Edit
            </button>
          </div>

          {/* Material Type Selection */}
          <div className="form-group">
            <label className="form-label">Material Type</label>
            <select
              value={layer.materialType || 'base'}
              onChange={(e) => onMaterialTypeChange(layer.id, e.target.value)}
              className="professional-input w-full focus-ring"
            >
              <option value="base">Base</option>
              <option value="print">Print</option>
              <option value="embroidery">Embroidery</option>
              <option value="generic">Generic</option>
            </select>
          </div>

          {/* Part Selection Dropdown */}
          <div className="form-group">
            <label className="form-label">Select Parts</label>
            <select
              multiple
              value={selectedParts}
              onChange={handlePartSelectionChange}
              className={`${partsSelectionClass} w-full focus-ring`}
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
                  <option key={part} value={part} className="text-error">
                    {part} (assigned elsewhere)
                  </option>
                ))
              }
            </select>
            
            {partsWarning && (
              <div className="mt-2 p-2 professional-card bg-warning/10 border-warning/30">
                <p className="text-xs text-warning">
                  {partsWarning}
                </p>
              </div>
            )}
            
            <p className="text-xs text-muted mt-1">
              Hold Ctrl/Cmd to select multiple parts
            </p>
          </div>

          {/* Detail Scale Slider */}
          {layer.materialType !== 'base' && (
            <div className="form-group">
              <div className="flex justify-between text-sm text-secondary mb-2">
                <span>Detail Scale</span>
                <span className="font-mono text-primary">{localDetailScale.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={2.0}
                step={0.1}
                value={localDetailScale}
                onChange={handleDetailScaleChange}
                className="w-full"
              />
            </div>
          )}

          {/* Layer Opacity Slider */}
          <div className="form-group">
            <div className="flex justify-between text-sm text-secondary mb-2">
              <span>Layer Opacity</span>
              <span className="font-mono text-primary">{(localOpacity * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={localOpacity}
              onChange={handleOpacityChange}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}