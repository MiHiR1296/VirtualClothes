import { logDebug, logInfo, logWarn, logError } from "./logger.js";
import React, { useEffect, useState } from 'react';
import { useTextureContext } from './TextureContext';

// This component handles initialization of texture objects after model loads
const TextureInitializer = () => {
  const { addLayer, layers } = useTextureContext();
  const [hasInitialized, setHasInitialized] = useState(false);
  
  useEffect(() => {
    // Check for texture objects on mount
    const checkForTextureObjects = () => {
      const textureObjects = window.findTextureObjects?.() || [];
      
      // If texture objects exist and we have no layers yet, create one
      if (textureObjects.length > 0 && layers.length === 0 && !hasInitialized) {
        logDebug('TextureInitializer: Found texture objects, creating initial layer');
        addLayer();
        setHasInitialized(true);
      }
    };
    
    // Try immediately in case objects are already loaded
    checkForTextureObjects();
    
    // Set up an interval to check for texture objects
    const intervalId = setInterval(() => {
      checkForTextureObjects();
    }, 1000);
    
    // Listen for model loaded event
    const handleModelLoaded = () => {
      // Reset initialization flag when a new model is loaded
      setHasInitialized(false);
      
      // Set a timeout to check for texture objects after model loading
      setTimeout(() => {
        checkForTextureObjects();
      }, 500);
    };
    
    // Add event listener
    window.addEventListener('model-loaded', handleModelLoaded);
    
    // Clean up
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('model-loaded', handleModelLoaded);
    };
  }, [addLayer, layers.length, hasInitialized]);
  
  // This is a utility component, it doesn't render anything
  return null;
};

export default TextureInitializer;