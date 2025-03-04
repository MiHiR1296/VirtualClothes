import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { View, RotateCw, Download } from 'lucide-react';
import * as THREE from 'three';

// This component captures multiple views of the garment with transparent backgrounds
const MultiViewCapture = forwardRef(({ scene, camera, renderer, controls }, ref) => {
  // Expose captureMultipleViews method to parent components
  useImperativeHandle(ref, () => ({
    captureMultipleViews
  }));
  const [captures, setCaptures] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false);
  
  // Store original camera position and rotation
  const originalCameraState = {
    position: null,
    rotation: null,
    target: null
  };

  // Capture views from different angles
  const captureMultipleViews = async () => {
    setIsCapturing(true);
    
    try {
      // Store original camera state
      saveOriginalCameraState();
      
      // Store original background
      const originalBackground = scene.background;
      
      // Set transparent background for capture
      scene.background = null;
      
      // Define different views to capture
      const views = [
        { name: 'Front', rotation: 0, position: [0, 0, 10] },
        { name: 'Back', rotation: Math.PI, position: [0, 0, -10] },
        { name: 'Left', rotation: Math.PI / 2, position: [-10, 0, 0] },
        { name: 'Right', rotation: -Math.PI / 2, position: [10, 0, 0] }
      ];
      
      const newCaptures = [];
      
      // Capture each view
      for (const view of views) {
        await positionCameraForView(view);
        
        // Allow time for render to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Render the scene with transparent background
        renderer.setClearColor(0x000000, 0); // Set to transparent
        renderer.render(scene, camera);
        
        // Capture the canvas with preserveDrawingBuffer enabled
        const canvas = renderer.domElement;
        const imageUrl = canvas.toDataURL('image/png');
        
        newCaptures.push({
          name: view.name,
          url: imageUrl
        });
      }
      
      setCaptures(newCaptures);
      
      // Restore original background
      scene.background = originalBackground;
      
      // Reset renderer clear color
      renderer.setClearColor(0x000000, 1);
      
      // Restore original camera position
      restoreOriginalCameraState();
      
    } catch (error) {
      console.error('Error capturing views:', error);
    } finally {
      setIsCapturing(false);
    }
  };
  
  // Save original camera state
  const saveOriginalCameraState = () => {
    originalCameraState.position = camera.position.clone();
    originalCameraState.rotation = camera.rotation.clone();
    
    // If using OrbitControls, also save the target
    if (controls) {
      originalCameraState.target = controls.target.clone();
    }
  };
  
  // Position camera for a specific view
  const positionCameraForView = async (view) => {
    // Calculate center of the scene
    const center = new THREE.Vector3();
    const boundingBox = new THREE.Box3().setFromObject(scene);
    boundingBox.getCenter(center);
    
    // Set camera position
    camera.position.set(
      center.x + view.position[0],
      center.y + view.position[1],
      center.z + view.position[2]
    );
    
    // Look at the center of the scene
    camera.lookAt(center);
    
    // If using OrbitControls, update target
    if (controls) {
      controls.target.copy(center);
      controls.update();
    }
    
    // Allow time for camera to update
    await new Promise(resolve => setTimeout(resolve, 100));
  };
  
  // Restore original camera state
  const restoreOriginalCameraState = () => {
    if (originalCameraState.position) {
      camera.position.copy(originalCameraState.position);
      camera.rotation.copy(originalCameraState.rotation);
      
      // If using OrbitControls, restore the target
      if (controls && originalCameraState.target) {
        controls.target.copy(originalCameraState.target);
        controls.update();
      }
      
      // Render with restored camera
      renderer.render(scene, camera);
    }
  };
  
  // Download a captured image
  const downloadCapture = (capture) => {
    const link = document.createElement('a');
    link.href = capture.url;
    link.download = `${capture.name}_view.png`;
    link.click();
  };
  
  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">View Captures</h3>
        <button
          onClick={captureMultipleViews}
          disabled={isCapturing}
          className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                   transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
        >
          {isCapturing ? (
            <>
              <RotateCw className="w-4 h-4 animate-spin" />
              Capturing...
            </>
          ) : (
            <>
              <View className="w-4 h-4" />
              Capture Views
            </>
          )}
        </button>
      </div>
      
      {captures.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {captures.map((capture, index) => (
            <div key={index} className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="p-2 border-b border-gray-700 flex items-center justify-between">
                <span className="text-sm font-medium">{capture.name} View</span>
                <button
                  onClick={() => downloadCapture(capture)}
                  className="p-1 text-blue-400 hover:text-blue-300"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
              <div className="p-2 bg-gray-700 bg-opacity-50 flex justify-center items-center">
                <img 
                  src={capture.url} 
                  alt={`${capture.name} view`} 
                  className="w-full h-auto rounded"
                  style={{ objectFit: 'contain', maxHeight: '200px' }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export default MultiViewCapture;