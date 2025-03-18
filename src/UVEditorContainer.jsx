import React, { useState, useEffect } from 'react';
import { Maximize2, Minimize2, X } from 'lucide-react';
import UVEditor from './UVEditor';
import { useTextureContext } from './TextureContext';

const UVEditorContainer = () => {
  const [mode, setMode] = useState('hidden');
  const [editingLayer, setEditingLayer] = useState(null);
  const { layers, updateTransformation } = useTextureContext();

  // Effect to handle global open UV editor event
  useEffect(() => {
    const openUVEditor = (event) => {
      // Get the layer ID from the event detail
      const { layerId, layerData } = event.detail || {};
      
      if (layerId) {
        // If layerData is provided directly, use it
        if (layerData) {
          setEditingLayer(layerData);
        } else {
          // Otherwise find the layer in the context
          const layerToEdit = layers.find(l => l.id === layerId);
          if (layerToEdit) {
            setEditingLayer(layerToEdit);
          }
        }
        setMode('floating');
      }
    };

    window.addEventListener('open-uv-editor', openUVEditor);

    return () => {
      window.removeEventListener('open-uv-editor', openUVEditor);
    };
  }, [layers]);

  // If no layer to edit, don't render anything
  if (!editingLayer) return null;

  const handleTransformChange = (layerId, updateData) => {
    // Pass through to the context method
    updateTransformation(layerId, updateData);
  };

  const handleClose = () => {
    setMode('hidden');
    setEditingLayer(null);
  };

  return (
    <div
      className={`fixed right-6 bottom-20 w-[600px] bg-gray-900 rounded-lg shadow-xl 
                transform transition-transform duration-300 ease-in-out z-40
                ${mode === 'floating' ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
    >
      <div className="flex items-center justify-between p-4 bg-gray-800 rounded-t-lg">
        <h3 className="text-lg font-semibold text-white">UV Editor - {editingLayer.name || 'Layer'}</h3>
        <div className="flex gap-2">
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>
      <div className="p-6">
        <UVEditor
          activeLayer={editingLayer}
          onTransformChange={handleTransformChange}
          className="w-full"
        />
      </div>
    </div>
  );
};

export default UVEditorContainer;