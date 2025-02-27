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

  // Updated transformation handler that works with both object and individual properties
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

      // Update active layer if it's the same
      if (activeLayer?.id === layerId) {
        setActiveLayer(prev => ({
          ...prev,
          transformations: {
            ...(prev.transformations || DEFAULT_TRANSFORMATIONS),
            [updateData]: value
          }
        }));
      }
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
          } : {})
        };
      });
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

 // In TextureContext.jsx - update the addLayer function
const addLayer = () => {
  // Find the outside material to get its normal map
  let outsideNormalMap = null;
  const findOutsideMaterial = () => {
      if (typeof window !== 'undefined' && window.scene) {
          let foundNormalMap = null;
          window.scene.traverse((object) => {
              if (object.isMesh && 
                  object.material && 
                  object.name.toLowerCase().includes('outside') &&
                  object.material.normalMap) {
                  foundNormalMap = object.material.normalMap;
              }
          });
          return foundNormalMap;
      }
      return null;
  };
  
  outsideNormalMap = findOutsideMaterial();

  const newLayer = {
      id: Date.now(),
      opacity: 1,
      texture: null,
      name: `Layer ${layers.length + 1}`,
      isActive: layers.length === 0,
      visible: true,
      materialType: 'base', // Change from 'print' to 'base'
      modelDirectory: window.currentModelDirectory,
      transformations: { ...DEFAULT_TRANSFORMATIONS },
      materialProperties: {
          roughness: 0.8,
          metalness: 0.1,
          clearcoat: 0.0,
          clearcoatRoughness: 0.0,
          sheen: 0.0,
          sheenRoughness: 0.8,
          outsideNormalMap // Include the outside normal map
      }
  };

  setLayers(prev => [...prev, newLayer]);
  if (layers.length === 0) {
      setActiveLayer(newLayer);
  }
  
  // Make texture objects visible after adding a layer
  const texObjects = window.findTextureObjects?.() || [];
  texObjects.forEach(obj => {
      if (obj.material) {
          obj.material.opacity = 1.0;
          obj.material.needsUpdate = true;
      }
  });
};

  

  const removeLayer = (layerId) => {
    setLayers(prev => {
      const newLayers = prev.filter(layer => layer.id !== layerId);
      if (newLayers.length > 0 && prev.find(l => l.id === layerId)?.isActive) {
        const newActiveLayer = newLayers[0];
        newActiveLayer.isActive = true;
        setActiveLayer(newActiveLayer);
      }
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
    
    setLayers(prev => prev.map(layer => ({
      ...layer,
      isActive: layer.id === layerId
    })));
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