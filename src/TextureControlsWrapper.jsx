import React, { useState, useEffect, useRef } from 'react';
import { Move, RotateCw, Maximize2, CornerUpLeft, Eye, EyeOff } from 'lucide-react';
import { useTextureContext } from './TextureContext';
import { DirectTextureManipulator } from './DirectTextureManipulator';

const TextureControlsWrapper = () => {
  const [isActive, setIsActive] = useState(false);
  const [activeTool, setActiveTool] = useState('move');
  const [manipulatorInitialized, setManipulatorInitialized] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const manipulatorRef = useRef(null);
  
  // Get the texture context
  const textureContext = useTextureContext();
  const { activeLayer, updateTransformation } = textureContext;

  // Check if scene objects are ready
  useEffect(() => {
    // Function to check if all required objects are available
    const checkSceneObjects = () => {
      const hasScene = !!window.scene;
      const hasCamera = !!window.camera;
      const hasRenderer = !!window.renderer;
      return hasScene && hasCamera && hasRenderer;
    };

    // Initial check
    setSceneReady(checkSceneObjects());

    // If not ready, set up a listener for model-loaded event
    if (!checkSceneObjects()) {
      const handleModelLoaded = () => {
        // Check again after model is loaded
        console.log('Model loaded, checking scene objects availability...');
        const ready = checkSceneObjects();
        setSceneReady(ready);
        if (ready) {
          console.log('Scene objects are now available');
        }
      };

      window.addEventListener('model-loaded', handleModelLoaded);
      
      // Also set up an interval to periodically check (as a fallback)
      const intervalId = setInterval(() => {
        if (checkSceneObjects()) {
          setSceneReady(true);
          clearInterval(intervalId);
          console.log('Scene objects found via interval check');
        }
      }, 1000);
      
      // Clean up
      return () => {
        window.removeEventListener('model-loaded', handleModelLoaded);
        clearInterval(intervalId);
      };
    }
  }, []);

  // Initialize manipulator once scene is ready
  useEffect(() => {
    if (sceneReady && !manipulatorInitialized) {
      console.log('Initializing texture manipulator with scene objects...');
      
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
    }
  }, [sceneReady, manipulatorInitialized, textureContext]);
  
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
    if (!sceneReady) {
      alert('Scene objects not available. Please wait for the 3D model to fully load first.');
      return;
    }
    
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
      alert('Error initializing texture manipulator: ' + error.message);
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
            disabled={!sceneReady}
            className={`p-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs ${!sceneReady ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Initialize
          </button>
        )}
      </div>

      {!sceneReady && (
        <div className="p-2 bg-yellow-800/30 rounded text-yellow-300 text-xs mb-3">
          <p>Waiting for 3D model to load... Scene objects not yet available.</p>
        </div>
      )}

      {sceneReady && !manipulatorInitialized && (
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