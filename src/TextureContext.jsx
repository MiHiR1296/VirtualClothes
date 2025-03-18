import React, { createContext, useContext, useState } from 'react';
import { materialTypes } from './MaterialTypeSelect';

export const TextureContext = createContext(null);

const DEFAULT_TRANSFORMATIONS = {
  offset: { x: 0, y: 0 },
  scale: 1,
  rotation: 0,
  repeat: false,
  flipX: 1,
  flipY: 1,
  detailScale: 1.0
};

export const TextureProvider = ({ children }) => {
  const [layers, setLayers] = useState([]); // Initialize with empty array
  const [activeLayer, setActiveLayer] = useState(null);
  const [activeWorkspace, setActiveWorkspace] = useState('colors');
  const [expandedSections, setExpandedSections] = useState(['colors']);


  const updateTexturesForSelectedParts = (layerId) => {
    // Find the layer that was updated
    const updatedLayer = layers.find(layer => layer.id === layerId);
    
    // Only proceed if we found the layer and it has a texture
    if (!updatedLayer || !updatedLayer.texture) return;
    
    // Get all texture objects from the scene
    const textureObjects = window.findTextureObjects?.() || [];
    if (textureObjects.length === 0) return;
    
    console.log(`Updating textures for ${textureObjects.length} objects based on part selection for layer ${layerId}`);
    
    // Get the compositor instance (this assumes it's available in the global scope)
    const compositor = window.textureCompositor || window._textureCompositor;
    if (!compositor) {
      console.warn('TextureCompositor instance not found in global scope');
      return;
    }
    
    // Update materials for all texture objects
    textureObjects.forEach(async (object) => {
      await compositor.updateMaterial(object, layers);
    });
  };
  

  // Updated transformation handler that works with both object and individual properties
  
// Then update the updateTransformation function to call this when selectedParts change
const updateTransformation = (layerId, updateData, value) => {
  // Handle the legacy format first (type, value)
  if (typeof updateData === 'string' && value !== undefined) {
    // Legacy call with (layerId, type, value)
    setLayers(prevLayers => 
      prevLayers.map(layer => {
        if (layer.id === layerId) {
          return {
            ...layer,
            transformations: {
              ...(layer.transformations || DEFAULT_TRANSFORMATIONS),
              [updateData]: value
            }
          };
        }
        return layer;
      })
    );
    return;
  }

  // Handle the new unified format
  setLayers(prevLayers => 
    prevLayers.map(layer => {
      if (layer.id === layerId) {
        return {
          ...layer,
          // Update transformations if included
          ...(updateData.transformations ? {
            transformations: {
              ...(layer.transformations || DEFAULT_TRANSFORMATIONS),
              ...updateData.transformations
            }
          } : {}),
          // Update material properties if included
          ...(updateData.materialProperties ? {
            materialProperties: {
              ...(layer.materialProperties || {}),
              ...updateData.materialProperties
            }
          } : {}),
          // Update selected parts if included
          ...(updateData.selectedParts !== undefined ? {
            selectedParts: updateData.selectedParts
          } : {})
        };
      }
      return layer;
    })
  );

  // Update active layer if it's the same
  if (activeLayer?.id === layerId) {
    setActiveLayer(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        // Update transformations if included
        ...(updateData.transformations ? {
          transformations: {
            ...(prev.transformations || DEFAULT_TRANSFORMATIONS),
            ...updateData.transformations
          }
        } : {}),
        // Update material properties if included
        ...(updateData.materialProperties ? {
          materialProperties: {
            ...(prev.materialProperties || {}),
            ...updateData.materialProperties
          }
        } : {}),
        // Update selected parts if included
        ...(updateData.selectedParts !== undefined ? {
          selectedParts: updateData.selectedParts
        } : {})
      };
    });
  }
  
  if (updateData.selectedParts !== undefined) {
    // Add a slight delay to ensure state is updated
    setTimeout(() => updateTexturesForSelectedParts(layerId), 50);
  }
};

  const updateMaterialType = (layerId, materialType) => {
    setLayers(prevLayers =>
      prevLayers.map(layer => {
        if (layer.id === layerId) {
          const materialPreset = materialTypes[materialType].properties;
          return {
            ...layer,
            materialType,
            transformations: {
              ...layer.transformations,
              detailScale: materialPreset.defaultDetailScale || layer.transformations.detailScale
            },
            materialProperties: {
              ...layer.materialProperties,
              ...materialPreset
            }
          };
        }
        return layer;
      })
    );
    
    // Update active layer if it's the same
    if (activeLayer?.id === layerId) {
      setActiveLayer(prev => {
        const materialPreset = materialTypes[materialType].properties;
        return {
          ...prev,
          materialType,
          transformations: {
            ...prev.transformations,
            detailScale: materialPreset.defaultDetailScale || prev.transformations.detailScale
          },
          materialProperties: {
            ...prev.materialProperties,
            ...materialPreset
          }
        };
      });
    }
  };

  const addLayer = () => {
    // Extract available parts from the current model
    let availableParts = [];
    
    if (window.MODEL_PATHS && window.currentModel) {
      availableParts = window.MODEL_PATHS[window.currentModel]?.materials
        .map(material => material.replace('.glb', ''))
        .filter(part => part !== 'Fronttex' && part !== 'Backtex') || [];
    }

    const newLayer = {
      id: Date.now(),
      opacity: 1,
      texture: null,
      name: `Layer ${layers.length + 1}`,
      visible: true,
      materialType: 'base',
      selectedParts: [], // Default to no specific parts (applies to all)
      modelDirectory: window.currentModelDirectory,
      transformations: { ...DEFAULT_TRANSFORMATIONS },
      materialProperties: {
        roughness: 0.8,
        metalness: 0.1,
        clearcoat: 0.0,
        clearcoatRoughness: 0.0,
        sheen: 0.0,
        sheenRoughness: 0.8
      }
    };

    setLayers(prev => [...prev, newLayer]);
    
    // Make texture objects visible after adding a layer
    const texObjects = window.findTextureObjects?.() || [];
    texObjects.forEach(obj => {
      if (obj.material) {
        obj.material.opacity = 1.0;
        obj.material.needsUpdate = true;
      }
    });

    return newLayer;
  };

  const removeLayer = (layerId) => {
    setLayers(prev => {
      const newLayers = prev.filter(layer => layer.id !== layerId);
      return newLayers;
    });
  };

  const updateLayerVisibility = (layerId, visible) => {
    setLayers(prev =>
      prev.map(layer => 
        layer.id === layerId ? { ...layer, visible } : layer
      )
    );
  };

  const updateLayerOpacity = (layerId, opacity) => {
    setLayers(prev =>
      prev.map(layer => 
        layer.id === layerId ? { ...layer, opacity } : layer
      )
    );
  };

  const moveLayer = (layerId, direction) => {
    const index = layers.findIndex(layer => layer.id === layerId);
    if (index === -1) return;
    
    const newLayers = [...layers];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex >= 0 && newIndex < layers.length) {
      [newLayers[index], newLayers[newIndex]] = [newLayers[newIndex], newLayers[index]];
      setLayers(newLayers);
    }
  };

  const setLayerActive = (layerId) => {
    const layer = layers.find(l => l.id === layerId);
    setActiveLayer(layer);
  };

  const updateLayerTexture = async (layerId, texture) => {
    setLayers(prev => prev.map(layer => {
      if (layer.id === layerId) {
        return {
          ...layer,
          texture,
          transformations: {
            ...(layer.transformations || DEFAULT_TRANSFORMATIONS),
            scale: 1 // Reset scale when new texture is loaded
          }
        };
      }
      return layer;
    }));

    // Update active layer if it's the same
    if (activeLayer?.id === layerId) {
      setActiveLayer(prev => ({
        ...prev,
        texture,
        transformations: {
          ...(prev.transformations || DEFAULT_TRANSFORMATIONS),
          scale: 1
        }
      }));
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const value = {
    // State
    layers,
    activeLayer,
    activeWorkspace,
    expandedSections,
    
    // Setters
    setLayers,
    setActiveLayer,
    setActiveWorkspace,
    
    // Layer operations
    addLayer,
    removeLayer,
    moveLayer,
    setLayerActive,
    updateLayerTexture,
    updateLayerVisibility,
    updateLayerOpacity,
    
    // Transformations and material
    updateTransformation,
    updateMaterialType,
    
    // UI
    toggleSection
  };

  return (
    <TextureContext.Provider value={value}>
      {children}
    </TextureContext.Provider>
  );
};

export const useTextureContext = () => {
  const context = useContext(TextureContext);
  if (!context) {
    throw new Error('useTextureContext must be used within a TextureProvider');
  }
  return context;
};

export default TextureContext;