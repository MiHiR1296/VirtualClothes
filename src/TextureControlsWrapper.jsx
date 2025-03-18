import React, { useState, useEffect, useRef } from 'react';
import { Move, RotateCw, Maximize2, CornerUpLeft, Eye, EyeOff } from 'lucide-react';
import { useTextureContext } from './TextureContext';
import { DirectTextureManipulator } from './DirectTextureManipulator';

const TextureControlsWrapper = () => {
  const [isActive, setIsActive] = useState(false);
  const [activeTool, setActiveTool] = useState('move');
  const [manipulatorInitialized, setManipulatorInitialized] = useState(false);
  const manipulatorRef = useRef(null);
  
  // Get the texture context
  const textureContext = useTextureContext();
  const { activeLayer, updateTransformation } = textureContext;

  // Initialize or get the manipulator
  useEffect(() => {
    // First check if we already have an instance
    if (window.textureManipulator) {
      manipulatorRef.current = window.textureManipulator;
      setManipulatorInitialized(true);
      return;
    }
    
    // Check if scene objects are available
    if (window.scene && window.camera && window.renderer) {
      console.log('Initializing texture manipulator...');
      
      try {
        // Create a new manipulator instance
        const manipulator = new DirectTextureManipulator(
          window.scene,
          window.camera,
          window.renderer,
          textureContext
        );
        
        // Store globally and in local ref
        window.textureManipulator = manipulator;
        manipulatorRef.current = manipulator;
        setManipulatorInitialized(true);
        
        console.log('Texture manipulator initialized successfully');
      } catch (error) {
        console.error('Failed to initialize texture manipulator:', error);
      }
    } else {
      console.warn('Scene objects not available for texture manipulator');
    }
  }, []);
  
  // Update texture context when it changes
  useEffect(() => {
    if (manipulatorRef.current) {
      manipulatorRef.current.textureContext = textureContext;
    }
  }, [textureContext, activeLayer]);

  // Toggle direct manipulation
  const handleToggle = () => {
    if (!manipulatorRef.current) {
      console.warn('Cannot toggle: Manipulator not initialized');
      return;
    }
    
    const newActiveState = !isActive;
    setIsActive(newActiveState);
    
    if (newActiveState) {
      manipulatorRef.current.enable();
    } else {
      manipulatorRef.current.disable();
    }
  };

  // Handle tool change
  const handleToolChange = (tool) => {
    setActiveTool(tool);
    
    if (manipulatorRef.current) {
      manipulatorRef.current.setTool(tool);
    }
  };

  // Reset transformations
  const handleReset = () => {
    if (!activeLayer) return;
    
    // Reset transformation
    const defaultTransform = {
      transformations: {
        offset: { x: 0, y: 0 },
        scale: 1,
        rotation: 0
      }
    };
    
    updateTransformation(activeLayer.id, defaultTransform);
  };

  // Manual initialization if needed
  const initializeManipulator = () => {
    if (window.scene && window.camera && window.renderer) {
      console.log('Manually initializing texture manipulator...');
      
      try {
        // Create a new manipulator instance
        const manipulator = new DirectTextureManipulator(
          window.scene,
          window.camera,
          window.renderer,
          textureContext
        );
        
        // Store globally and in local ref
        window.textureManipulator = manipulator;
        manipulatorRef.current = manipulator;
        setManipulatorInitialized(true);
        
        console.log('Texture manipulator initialized successfully');
      } catch (error) {
        console.error('Failed to initialize texture manipulator:', error);
      }
    } else {
      console.warn('Scene objects not available for texture manipulator');
      alert('Scene objects not available. Make sure the 3D model is loaded first.');
    }
  };

  // Check if we can enable direct manipulation
  const canEnable = activeLayer !== null && manipulatorInitialized;

  return (
    <div className="mt-4 p-4 bg-gray-800 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">Direct Texture Manipulation</h3>
        {manipulatorInitialized ? (
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
            {isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        ) : (
          <button
            onClick={initializeManipulator}
            className="p-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs"
          >
            Initialize
          </button>
        )}
      </div>

      {!manipulatorInitialized && (
        <div className="p-2 bg-yellow-800/30 rounded text-yellow-300 text-xs mb-3">
          <p>Texture manipulation controls need to be initialized. Click the Initialize button.</p>
        </div>
      )}

      {manipulatorInitialized && isActive && (
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
              onClick={handleReset}
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

export default TextureControlsWrapper;