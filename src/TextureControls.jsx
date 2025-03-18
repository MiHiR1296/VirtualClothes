import React, { useState, useEffect } from 'react';
import { Move, RotateCw, Maximize2, CornerUpLeft, Eye, EyeOff } from 'lucide-react';
import { useTextureContext } from './TextureContext';

const TextureControls = ({ manipulator }) => {
  const [isActive, setIsActive] = useState(false);
  const [activeTool, setActiveTool] = useState('move');
  const { activeLayer } = useTextureContext();

  useEffect(() => {
    // Update enabled state when component mounts or active layer changes
    if (manipulator) {
      setIsActive(manipulator.enabled);
    }
  }, [manipulator, activeLayer]);

  // Toggle direct manipulation mode
  const handleToggle = () => {
    if (manipulator) {
      const newState = manipulator.toggle();
      setIsActive(newState);
    }
  };

  // Set active tool
  const handleToolChange = (tool) => {
    setActiveTool(tool);
    if (manipulator) {
      manipulator.setTool(tool);
    }
  };

  // Handle tool keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isActive) return;

      switch (e.key.toLowerCase()) {
        case 'm':
          handleToolChange('move');
          break;
        case 'r':
          handleToolChange('rotate');
          break;
        case 's':
          handleToolChange('scale');
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive]);

  // Check if we can enable direct manipulation
  const canEnable = activeLayer !== null;

  return (
    <div className="mt-4 p-4 bg-gray-800 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">Direct Texture Manipulation</h3>
        <button
          onClick={handleToggle}
          disabled={!canEnable}
          className={`p-2 rounded transition-colors ${
            isActive 
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-gray-700 hover:bg-gray-600'
          } ${!canEnable ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={isActive ? 'Disable Direct Manipulation' : 'Enable Direct Manipulation'}
        >
          {isActive ? (
            <Eye className="w-4 h-4" />
          ) : (
            <EyeOff className="w-4 h-4" />
          )}
        </button>
      </div>

      {isActive && (
        <>
          <div className="space-y-1 mb-3">
            <label className="text-xs text-gray-400">
              Edit textures directly on the 3D model
            </label>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleToolChange('move')}
              className={`p-2 rounded ${
                activeTool === 'move' ? 'bg-blue-500' : 'bg-gray-700'
              } hover:bg-opacity-80 transition-colors`}
              title="Move Tool (M)"
            >
              <Move className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleToolChange('rotate')}
              className={`p-2 rounded ${
                activeTool === 'rotate' ? 'bg-blue-500' : 'bg-gray-700'
              } hover:bg-opacity-80 transition-colors`}
              title="Rotate Tool (R)"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleToolChange('scale')}
              className={`p-2 rounded ${
                activeTool === 'scale' ? 'bg-blue-500' : 'bg-gray-700'
              } hover:bg-opacity-80 transition-colors`}
              title="Scale Tool (S)"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (manipulator && activeLayer) {
                  // Reset transformation
                  const defaultTransform = {
                    offset: { x: 0, y: 0 },
                    scale: 1,
                    rotation: 0
                  };
                  manipulator.textureContext.updateTransformation(
                    activeLayer.id, 
                    { transformations: defaultTransform }
                  );
                }
              }}
              className="p-2 rounded bg-gray-700 hover:bg-opacity-80 transition-colors"
              title="Reset Transform"
            >
              <CornerUpLeft className="w-4 h-4" />
            </button>
          </div>
          
          <div className="mt-3 text-xs text-gray-400">
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-block w-5 h-5 rounded border border-gray-600 flex items-center justify-center text-gray-400">M</span>
              <span>Switch to Move tool</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-block w-5 h-5 rounded border border-gray-600 flex items-center justify-center text-gray-400">R</span>
              <span>Switch to Rotate tool</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-block w-5 h-5 rounded border border-gray-600 flex items-center justify-center text-gray-400">S</span>
              <span>Switch to Scale tool</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-block w-5 h-5 rounded border border-gray-600 flex items-center justify-center text-gray-400">Esc</span>
              <span>Deselect texture</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TextureControls;
