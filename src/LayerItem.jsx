import { logDebug, logWarn, logError } from "./logger.js";
import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Edit,
  Eye,
  EyeOff,
  SlidersHorizontal,
  Trash2,
  Upload,
  X
} from 'lucide-react';
import { useTextureContext } from './TextureContext';

const formatPartLabel = (name = '') =>
  name
    .replace(/_/g, ' ')
    .replace(/\s*\.\d+$/i, '')
    .replace(/\s*[-_ ]?\d+$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const groupTextureParts = (parts = []) => {
  const groups = new Map();

  parts
    .filter((part) => part && !/^no texture/i.test(part))
    .forEach((part) => {
      const label = formatPartLabel(part);
      const key = label || part;

      if (!groups.has(key)) {
        groups.set(key, {
          id: key,
          label: key,
          parts: []
        });
      }

      groups.get(key).parts.push(part);
    });

  return Array.from(groups.values());
};

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
  availableParts = []
}) {
  const { updateTransformation } = useTextureContext();
  const [localOpacity, setLocalOpacity] = useState(layer.opacity || 1);
  const [localDetailScale, setLocalDetailScale] = useState(layer.transformations?.detailScale || 1);
  const [selectedParts, setSelectedParts] = useState(layer.selectedParts || []);
  const [isPartPickerOpen, setIsPartPickerOpen] = useState(false);

  const partGroups = useMemo(() => groupTextureParts(availableParts), [availableParts]);

  useEffect(() => {
    setLocalOpacity(layer.opacity || 1);
    setLocalDetailScale(layer.transformations?.detailScale || 1);
    setSelectedParts(layer.selectedParts || []);
  }, [layer]);

  const refreshTextureMeshes = () => {
    const textureObjects = window.findTextureObjects?.() || [];
    if (textureObjects.length === 0) {
      logWarn("No texture objects found to update");
      return;
    }

    const compositor = window._textureCompositor;
    if (!compositor) {
      logWarn('TextureCompositor not available');
      return;
    }

    compositor.reset();
    const allLayers = window.getAllTextureLayersForUpdate?.() || [];

    textureObjects.forEach((obj) => {
      if (obj.material) {
        obj.material.transparent = true;
        obj.material.opacity = 1.0;
        obj.material.alphaTest = 0.01;
        obj.material.needsUpdate = true;
      }
    });

    textureObjects.forEach((object) => {
      try {
        const latestLayers = window.getAllTextureLayersForUpdate?.() || allLayers;
        compositor.updateMaterial(object, latestLayers);
      } catch (error) {
        logError(`Error updating material for ${object.name}:`, error);
      }
    });
  };

  const updateSelectedParts = (newSelectedParts) => {
    setSelectedParts(newSelectedParts);
    logDebug(`Layer ${layer.id} (${layer.name}): Selected parts changed to:`, newSelectedParts);

    updateTransformation(layer.id, {
      selectedParts: newSelectedParts
    });

    setTimeout(refreshTextureMeshes, 10);
  };

  const handleOpacityChange = (event) => {
    const newValue = Number(event.target.value);
    setLocalOpacity(newValue);
    onOpacityChange(layer.id, newValue);
  };

  const handleDetailScaleChange = (event) => {
    const newValue = Number(event.target.value);
    setLocalDetailScale(newValue);
    onDetailScaleChange(layer.id, newValue);
  };

  const handleOpenUVEditor = () => {
    window.dispatchEvent(new CustomEvent('open-uv-editor', {
      detail: { layerId: layer.id, layerData: layer }
    }));
  };

  const togglePartGroup = (group) => {
    if (selectedParts.length === 0) {
      updateSelectedParts(group.parts);
      return;
    }

    const nextSelection = new Set(selectedParts);
    const isGroupSelected = group.parts.every((part) => nextSelection.has(part));

    if (isGroupSelected) {
      group.parts.forEach((part) => nextSelection.delete(part));
    } else {
      group.parts.forEach((part) => nextSelection.add(part));
    }

    updateSelectedParts(Array.from(nextSelection));
  };

  const targetSummary =
    partGroups.length === 0
      ? 'No texture targets'
      : selectedParts.length === 0
        ? 'All texture parts'
        : `${partGroups.filter((group) => group.parts.some((part) => selectedParts.includes(part))).length} selected`;

  return (
    <div className="layer-card">
      <div className="layer-card__top">
        <button
          type="button"
          onClick={() => onToggleVisibility(layer.id)}
          className={`layer-icon-button ${layer.visible ? '' : 'is-muted'}`}
          title={layer.visible ? 'Hide layer' : 'Show layer'}
        >
          {layer.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>

        <div className="layer-card__title">
          <span>{layer.name || 'Unnamed layer'}</span>
          <small>{layer.texture ? 'Texture loaded' : 'No texture yet'}</small>
        </div>

        <div className="layer-card__order">
          <button
            type="button"
            onClick={() => onMoveLayer(layer.id, 'up')}
            disabled={index === 0}
            className="layer-icon-button"
            title="Move up"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onMoveLayer(layer.id, 'down')}
            disabled={index === totalLayers - 1}
            className="layer-icon-button"
            title="Move down"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(layer.id)}
            className="layer-icon-button is-danger"
            title="Delete layer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="layer-card__actions">
        <input
          type="file"
          id={`layer-upload-${layer.id}`}
          onChange={(event) => onFileChange(layer.id, event)}
          accept="image/*"
          className="hidden"
        />
        <label htmlFor={`layer-upload-${layer.id}`} className="layer-action-button">
          <Upload className="w-4 h-4" />
          <span>{layer.texture ? 'Change Texture' : 'Upload Texture'}</span>
        </label>

        <button type="button" onClick={handleOpenUVEditor} className="layer-action-button">
          <Edit className="w-4 h-4" />
          <span>UV Edit</span>
        </button>
      </div>

      <div className="layer-form-grid">
        <label className="layer-field">
          <span>Material</span>
          <select
            value={layer.materialType || 'base'}
            onChange={(event) => onMaterialTypeChange(layer.id, event.target.value)}
          >
            <option value="base">Base</option>
            <option value="print">Print</option>
            <option value="embroidery">Embroidery</option>
            <option value="generic">Generic</option>
          </select>
        </label>

        <div className="layer-field">
          <span>Target</span>
          <button
            type="button"
            className="layer-target-button"
            onClick={() => setIsPartPickerOpen((open) => !open)}
            disabled={partGroups.length === 0}
          >
            <span>{targetSummary}</span>
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isPartPickerOpen ? (
        <div className="layer-part-picker">
          <div className="layer-part-picker__header">
            <span>Texture target</span>
            <button type="button" onClick={() => setIsPartPickerOpen(false)}>
              <X className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            className={`layer-part-row ${selectedParts.length === 0 ? 'is-selected' : ''}`}
            onClick={() => updateSelectedParts([])}
          >
            <span className="layer-part-check">
              {selectedParts.length === 0 ? <Check className="w-3 h-3" /> : null}
            </span>
            <span className="layer-part-label">All texture parts</span>
          </button>

          {partGroups.map((group) => {
            const isSelected =
              selectedParts.length > 0 && group.parts.every((part) => selectedParts.includes(part));

            return (
              <button
                key={group.id}
                type="button"
                className={`layer-part-row ${isSelected ? 'is-selected' : ''}`}
                onClick={() => togglePartGroup(group)}
              >
                <span className="layer-part-check">
                  {isSelected ? <Check className="w-3 h-3" /> : null}
                </span>
                <span className="layer-part-label">
                  {group.label}
                  <small>{group.parts.length > 1 ? `${group.parts.length} meshes` : '1 mesh'}</small>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {layer.materialType !== 'base' ? (
        <div className="layer-slider">
          <div>
            <span>Detail Scale</span>
            <strong>{localDetailScale.toFixed(2)}</strong>
          </div>
          <input
            type="range"
            min={0.1}
            max={2.0}
            step={0.1}
            value={localDetailScale}
            onChange={handleDetailScaleChange}
          />
        </div>
      ) : null}

      <div className="layer-slider">
        <div>
          <span>Opacity</span>
          <strong>{(localOpacity * 100).toFixed(0)}%</strong>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={localOpacity}
          onChange={handleOpacityChange}
        />
      </div>
    </div>
  );
}
