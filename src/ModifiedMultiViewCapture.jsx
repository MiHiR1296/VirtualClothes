import React, { useState, forwardRef, useImperativeHandle, useEffect, useRef } from 'react';
import { View, RotateCw, Download, ZoomIn, Camera } from 'lucide-react';
import * as THREE from 'three';

// MultiViewCapture with adjustable camera distance
const ModifiedMultiViewCapture = forwardRef(({ scene, camera, renderer, controls }, ref) => {
  // Expose methods to parent components
  useImperativeHandle(ref, () => ({
    captureMultipleViews,
    captures,
    previewView
  }));
  
  const [captures, setCaptures] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraDistance, setCameraDistance] = useState(2.0); // Default camera distance multiplier
  const [currentViewIndex, setCurrentViewIndex] = useState(0); // Current view for preview
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  
  // Store original camera state
  const originalCameraState = useRef({
    position: null,
    rotation: null,
    target: null
  }).current;
  
  // Define view configurations - using names that match what TechPack expects
  const viewConfigs = [
    { name: 'Front', rotation: 0 },
    { name: '3/4 View', rotation: -Math.PI / 4 }, // Adjusted for a true 3/4 view
    { name: 'Side', rotation: -Math.PI / 2 },
    { name: 'Back', rotation: Math.PI }
  ];
  
  // Store original light state and temporary lights
  const originalLightState = {
    lights: [],
    materials: new Map()
  };
  const tempLights = [];

  // Enhance lighting for better renders
  const enhanceLighting = () => {
    // Store and enhance existing lights
    scene.traverse(obj => {
      if (obj.isLight) {
        originalLightState.lights.push({
          light: obj,
          intensity: obj.intensity,
          castShadow: obj.castShadow || false
        });
        
        // Boost light intensity but don't add shadows to hemisphere lights
        obj.intensity *= 5.5;
        if (!(obj.isHemisphereLight || obj.isAmbientLight)) {
          obj.castShadow = true;
        }
      }
      
      // Enhance material reflectivity
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(mat => {
            if (mat.envMapIntensity !== undefined) {
              const uuid = mat.uuid;
              if (!originalLightState.materials.has(uuid)) {
                originalLightState.materials.set(uuid, {
                  envMapIntensity: mat.envMapIntensity
                });
                mat.envMapIntensity = Math.min(mat.envMapIntensity * 2.0, 2.0);
                mat.needsUpdate = true;
              }
            }
          });
        } else if (obj.material.envMapIntensity !== undefined) {
          const uuid = obj.material.uuid;
          if (!originalLightState.materials.has(uuid)) {
            originalLightState.materials.set(uuid, {
              envMapIntensity: obj.material.envMapIntensity
            });
            obj.material.envMapIntensity = Math.min(obj.material.envMapIntensity * 2.0, 2.0);
            obj.material.needsUpdate = true;
          }
        }
      }
    });
    
    // Add temporary lights
    
    // Front fill light
    const frontFill = new THREE.DirectionalLight(0xffffff, 1.5);
    frontFill.position.set(0, 2, 5);
    frontFill.castShadow = true;
    scene.add(frontFill);
    tempLights.push(frontFill);
    
    // Back rim light
    const backRim = new THREE.DirectionalLight(0xffffff, 0.8);
    backRim.position.set(0, 3, -5);
    backRim.castShadow = true;
    scene.add(backRim);
    tempLights.push(backRim);
    
    // Top light
    const topLight = new THREE.DirectionalLight(0xffffff, 1.0);
    topLight.position.set(0, 8, 0);
    topLight.castShadow = true;
    scene.add(topLight);
    tempLights.push(topLight);
    
    // Add ambient light to brighten shadows
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    tempLights.push(ambientLight);
  };
  
  // Restore original lighting state
  const restoreLighting = () => {
    // Remove temporary lights
    tempLights.forEach(light => {
      scene.remove(light);
    });
    tempLights.length = 0;
    
    // Restore original light intensities
    originalLightState.lights.forEach(({ light, intensity, castShadow }) => {
      light.intensity = intensity;
      light.castShadow = castShadow;
    });
    originalLightState.lights = [];
    
    // Restore original material properties
    originalLightState.materials.forEach((props, uuid) => {
      scene.traverse(obj => {
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(mat => {
              if (mat.uuid === uuid && mat.envMapIntensity !== undefined) {
                mat.envMapIntensity = props.envMapIntensity;
                mat.needsUpdate = true;
              }
            });
          } else if (obj.material.uuid === uuid && obj.material.envMapIntensity !== undefined) {
            obj.material.envMapIntensity = props.envMapIntensity;
            obj.material.needsUpdate = true;
          }
        }
      });
    });
    originalLightState.materials.clear();
  };

  // Preview a specific view to adjust camera distance
  const previewView = async (viewIndex = 0) => {
    try {
      // Store original camera state if not in preview mode
      if (!isPreviewMode) {
        saveOriginalCameraState();
        setIsPreviewMode(true);
      }
      
      // Make sure viewIndex is valid
      const selectedViewIndex = Math.max(0, Math.min(viewConfigs.length - 1, viewIndex));
      setCurrentViewIndex(selectedViewIndex);
      
      // Get the model and center the camera
      const modelGroup = findModelGroup();
      if (modelGroup) {
        await positionCameraForView(modelGroup, viewConfigs[selectedViewIndex].rotation);
        renderer.render(scene, camera);
      }
    } catch (error) {
      console.error('Error previewing view:', error);
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
  
  // Find the model group in the scene
  const findModelGroup = () => {
    let modelGroup = null;
    scene.traverse((object) => {
      if (object.userData && object.userData.isLoadedModel) {
        modelGroup = object;
      }
    });
    
    if (!modelGroup) {
      console.warn("Model group not found, using entire scene");
      modelGroup = scene;
    }
    
    return modelGroup;
  };
  
  // Update camera when distance changes
  useEffect(() => {
    if (isPreviewMode) {
      previewView(currentViewIndex);
    }
  }, [cameraDistance]);
  
  // Exit preview mode and restore camera
  const exitPreviewMode = () => {
    if (isPreviewMode) {
      restoreOriginalCameraState();
      setIsPreviewMode(false);
    }
  };
  
  // Capture views from different angles
  const captureMultipleViews = async () => {
    setIsCapturing(true);
    
    try {
      const wasInPreviewMode = isPreviewMode;
      
      // Store original camera state if not already in preview mode
      if (!wasInPreviewMode) {
        saveOriginalCameraState();
      }
      
      // Store original background
      const originalBackground = scene.background;
      
      // Enhance lighting
      enhanceLighting();
      
      // Set white background for better contrast
      scene.background = new THREE.Color(0xffffff);
      
      // Find the model
      const modelGroup = findModelGroup();
      
      const newCaptures = [];
      
      // Capture each view
      for (let i = 0; i < viewConfigs.length; i++) {
        const view = viewConfigs[i];
        
        // Position camera for this view
        await positionCameraForView(modelGroup, view.rotation);
        
        // Allow time for render to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Render the scene
        renderer.setClearColor(0xffffff, 1);
        renderer.render(scene, camera);
        
        // Capture the canvas
        const canvas = renderer.domElement;
        // Use both url and dataUrl properties to ensure compatibility
        const imageUrl = canvas.toDataURL('image/jpeg', 0.92);
        
        newCaptures.push({
          name: view.name,
          url: imageUrl,
          dataUrl: imageUrl // Add dataUrl property for compatibility
        });
      }
      
      setCaptures(newCaptures);
      
      // Restore original background
      scene.background = originalBackground;
      
      // Reset renderer clear color
      renderer.setClearColor(0x000000, 1);
      
      // Restore lighting to original state
      restoreLighting();
      
      // If we were not in preview mode before, restore camera
      if (!wasInPreviewMode) {
        restoreOriginalCameraState();
      } else {
        // Otherwise, just update the current preview view
        previewView(currentViewIndex);
      }
      
      return newCaptures; // Return captures for direct use
      
    } catch (error) {
      console.error('Error capturing views:', error);
      return [];
    } finally {
      setIsCapturing(false);
    }
  };
  
  // Position camera for a specific view
  const positionCameraForView = async (model, rotation) => {
    // Calculate model dimensions
    const boundingBox = new THREE.Box3().setFromObject(model);
    const center = new THREE.Vector3();
    boundingBox.getCenter(center);
    
    const size = new THREE.Vector3();
    boundingBox.getSize(size);
    
    // Use adjustable camera distance multiplier
    const maxDim = Math.max(size.x, size.y, size.z);
    const distance = maxDim * cameraDistance;
    
    // Calculate position based on rotation
    const position = new THREE.Vector3(
      center.x + Math.sin(rotation) * distance,
      center.y, // Keep camera at same height as model center
      center.z + Math.cos(rotation) * distance
    );
    
    // Update camera
    camera.position.copy(position);
    camera.lookAt(center);
    
    // Update controls
    controls.target.copy(center);
    controls.update();
    
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
    link.download = `${capture.name}_view.jpg`;
    link.click();
  };
  
  // Next view in preview mode
  const nextView = () => {
    const newIndex = (currentViewIndex + 1) % viewConfigs.length;
    previewView(newIndex);
  };
  
  // Previous view in preview mode
  const prevView = () => {
    const newIndex = (currentViewIndex - 1 + viewConfigs.length) % viewConfigs.length;
    previewView(newIndex);
  };
  
  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">View Captures</h3>
        <div className="flex items-center gap-2">
          {isPreviewMode ? (
            <button
              onClick={exitPreviewMode}
              className="px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Exit Preview
            </button>
          ) : (
            <button
              onClick={() => previewView(0)}
              className="px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Preview View
            </button>
          )}
          
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
                <Camera className="w-4 h-4" />
                Capture Views
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Camera distance slider */}
      <div className="bg-gray-800 p-4 rounded-lg mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm flex items-center gap-1">
            <ZoomIn className="w-4 h-4" /> Camera Distance
          </label>
          <span className="text-sm">{cameraDistance.toFixed(1)}×</span>
        </div>
        <input
          type="range"
          min="0.8"
          max="3.0"
          step="0.1"
          value={cameraDistance}
          onChange={(e) => setCameraDistance(parseFloat(e.target.value))}
          className="w-full accent-blue-500"
        />
        <p className="text-xs text-gray-400 mt-2">Adjust slider to control camera distance from model. Lower values bring camera closer.</p>
      </div>
      
      {/* Preview controls */}
      {isPreviewMode && (
        <div className="bg-gray-800 p-4 rounded-lg mb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium">Preview: {viewConfigs[currentViewIndex].name}</h4>
            <div className="flex gap-2">
              <button
                onClick={prevView}
                className="p-1 bg-gray-700 rounded hover:bg-gray-600"
              >
                Previous
              </button>
              <button
                onClick={nextView}
                className="p-1 bg-gray-700 rounded hover:bg-gray-600"
              >
                Next
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-400">Adjust the camera distance and preview each view before capturing.</p>
        </div>
      )}
      
      {/* Captures grid */}
      {captures.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {captures.map((capture, index) => (
            <div key={index} className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="p-2 border-b border-gray-700 flex items-center justify-between">
                <span className="text-sm font-medium">{capture.name}</span>
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
                  alt={`${capture.name}`} 
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

export default ModifiedMultiViewCapture;