import React, { useEffect, useRef, useState } from 'react';
import { TextureLoadingUtils } from './textureLoadingUtils';

const UVMapForTechPack = ({ modelDirectory, selectedModel }) => {
  const canvasRef = useRef(null);
  const [uvMapLoaded, setUvMapLoaded] = useState(false);
  
  useEffect(() => {
    // Load the UV map for the current model
    const loadUVMap = async () => {
      try {
        const uvMap = await TextureLoadingUtils.loadUVMap(
          modelDirectory,
          (image) => {
            if (image && canvasRef.current) {
              drawUVMap(image);
              setUvMapLoaded(true);
            }
          }
        );
        
        if (!uvMap) {
          console.warn('Could not load UV map for tech pack');
        }
      } catch (error) {
        console.error('Error loading UV map for tech pack:', error);
      }
    };
    
    loadUVMap();
  }, [modelDirectory, selectedModel]);
  
  const drawUVMap = (image) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = 800;
    canvas.height = 800;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw UV map background with high contrast
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    
    // Add borders to the UV map for better visibility
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    
    // Enhance UV map visibility (optional)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Enhance contrast slightly
    for (let i = 0; i < data.length; i += 4) {
      // Skip transparent pixels
      if (data[i + 3] === 0) continue;
      
      // Adjust contrast
      const contrast = 1.2; // Adjust as needed
      for (let j = 0; j < 3; j++) {
        const color = data[i + j];
        data[i + j] = Math.max(0, Math.min(255, 
          (color - 128) * contrast + 128
        ));
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
  };
  
  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-3">Garment Technical Drawing</h3>
      <div className="bg-gray-800 p-4 rounded-lg flex justify-center">
        <canvas 
          ref={canvasRef} 
          className="max-w-full h-auto border border-gray-700 rounded"
        />
      </div>
      {!uvMapLoaded && (
        <div className="text-center mt-4 text-gray-400">
          Loading technical drawing...
        </div>
      )}
    </div>
  );
};

export default UVMapForTechPack;