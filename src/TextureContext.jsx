import React, { createContext, useContext, useState } from 'react';
import { materialTypes } from './MaterialTypeSelect';

export const TextureContext = createContext(null);

export const TextureProvider = ({ children }) => {
  const [layers, setLayers] = useState([]);
  const [activeLayer, setActiveLayer] = useState(null);
  const [activeWorkspace, setActiveWorkspace] = useState('colors');
  const [expandedSections, setExpandedSections] = useState(['colors']);

  const updateTransformation = (layerId, type, value) => {
    setLayers(prevLayers => 
      prevLayers.map(layer => {
        if (layer.id === layerId) {
          return {
            ...layer,
            transformations: {
              ...layer.transformations,
              ...value
            }
          };
        }
        return layer;
      })
    );
  };

  const updateMaterialType = (layerId, materialType) => {
    setLayers(prevLayers =>
      prevLayers.map(layer => {
        if (layer.id === layerId) {
          return {
            ...layer,
            materialType,
            materialProperties: materialTypes[materialType].properties
          };
        }
        return layer;
      })
    );
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const value = {
    layers,
    setLayers,
    activeLayer,
    setActiveLayer,
    updateTransformation,
    updateMaterialType,
    activeWorkspace,
    setActiveWorkspace,
    expandedSections,
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