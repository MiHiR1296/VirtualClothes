import React, { useRef, useEffect, useState } from 'react';
import { Layers, Palette, Settings, Move, Menu, ChevronRight } from 'lucide-react';
import { ThreeApplication } from './ThreeApplication';
import { TextureProvider } from './TextureContext';
import TextureLayerManager from './TextureLayerManager';
import UVEditorContainer from './UVEditorContainer';
import ControlsTooltip from './ControlsTooltip';
import { getModelsByCategory } from './modelLoader';
import HDRIControls from './HDRIControls';
import TechPack from './TechPack';
import PantoneColorPicker from './PantoneColorPicker';
import ResizableSidebar from './ResizableSidebar';

// Categorized Model Select Component
const CategorizedModelSelect = ({ selectedModel, onChange }) => {
  const categories = getModelsByCategory();
  
  return (
    <select 
      className="bg-gray-700 rounded px-3 py-1 text-sm border border-gray-600"
      value={selectedModel}
      onChange={onChange}
    >
      {Object.entries(categories).map(([category, models]) => (
        <optgroup key={category} label={category.charAt(0).toUpperCase() + category.slice(1)}>
          {models.map(model => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
};

window.colorManager = {
  // Apply the exact color from userData to a material
  applyExactColor: function(object) {
    if (!object || !object.material) return false;
    
    // If we have a stored exact color, use it
    if (object.userData && object.userData.exactColor) {
      // Apply it directly to the material
      object.material.color.set(object.userData.exactColor);
      object.material.needsUpdate = true;
      
      console.log(`Applied stored color ${object.userData.exactColor} to ${object.name}`);
      return true;
    }
    return false;
  },
  
  // Store and apply a new color
  storeExactColor: function(object, colorValue) {
    if (!object || !object.material) return false;
    
    // Store the exact color
    if (!object.userData) object.userData = {};
    object.userData.exactColor = colorValue;
    
    // Apply it to the material
    object.material.color.set(colorValue);
    object.material.needsUpdate = true;
    
    console.log(`Stored and applied color ${colorValue} to ${object.name}`);
    return true;
  },

  getExactColorForPicker: function(object) {
    // Always return the stored exact color if available
    if (object && object.userData && object.userData.exactColor) {
      return object.userData.exactColor;
    }
    // Otherwise, fall back to the material color
    else if (object && object.material && object.material.color) {
      const hexColor = '#' + object.material.color.getHexString();
      // Store it for future use
      if (!object.userData) object.userData = {};
      object.userData.exactColor = hexColor;
      return hexColor;
    }
    // Default fallback
    return "#ffffff";
  }

};

export default function App() {
  const canvasRef = useRef(null);
  const appRef = useRef(null);
  const [selectedModel, setSelectedModel] = useState('men_polo_hs');
  const [selectedMaterial, setSelectedMaterial] = useState('cotton');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(true);
  const [selectedModelRoughness, setSelectedModelRoughness] = useState(0.8);
  const [selectedModelMetalness, setSelectedModelMetalness] = useState(0.1);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || appRef.current) return;

    const initializeApp = async () => {
      try {
        const app = new ThreeApplication(canvasRef.current);
        appRef.current = app;

        await app.initPromise;

        // Setup global reference for model roughness/metalness update
        window.updateSelectedModelMaterial = (roughness, metalness) => {
          if (window.selectedModelPart && !window.selectedModelPart.name.includes('Fronttex') && 
              !window.selectedModelPart.name.includes('Backtex')) {
            const material = window.selectedModelPart.material;
            
            // Store exact values in userData to ensure consistency
            window.selectedModelPart.userData.exactRoughness = roughness;
            window.selectedModelPart.userData.exactMetalness = metalness;
            
            // Apply values to material
            material.roughness = roughness;
            material.metalness = metalness;
            material.needsUpdate = true;
            
            // Update UI state
            setSelectedModelRoughness(roughness);
            setSelectedModelMetalness(metalness);
            
            // Update any sliders created in eventHandler
            const roughnessSlider = document.getElementById('modelPartRoughnessSlider');
            const metalSlider = document.getElementById('modelPartMetalnessSlider');
            const roughnessValue = document.getElementById('modelRoughnessValue');
            const metalValue = document.getElementById('modelMetalnessValue');
            
            if (roughnessSlider) roughnessSlider.value = roughness;
            if (metalSlider) metalSlider.value = metalness;
            if (roughnessValue) roughnessValue.textContent = roughness.toFixed(2);
            if (metalValue) metalValue.textContent = metalness.toFixed(2);
            
            console.log(`Material properties updated - Roughness: ${roughness}, Metalness: ${metalness}`);
          }
        };
        
        // Make MODEL_PATHS accessible globally for techpack generation
        import('./modelLoader.js').then(module => {
          window.MODEL_PATHS = module.MODEL_PATHS;
        });
      } catch (error) {
        console.error('Failed to initialize application:', error);
      }
    };

    initializeApp();

    return () => {
      if (appRef.current) {
        appRef.current.dispose();
        appRef.current = null;
      }
    };
  }, []);

  const handleModelChange = async (e) => {
    if (!appRef.current || isLoading) return;

    try {
      setIsLoading(true);
      const modelId = e.target.value;
      setSelectedModel(modelId);
      
      await appRef.current.loadModel(modelId);

      // Restore material settings if they were customized
      if (selectedModelRoughness !== 1.0 || selectedModelMetalness !== 0.1) {
        window.updateSelectedModelMaterial?.(selectedModelRoughness, selectedModelMetalness);
      }
    } catch (error) {
      console.error('Error loading model:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMaterialChange = async (e) => {
    const newMaterial = e.target.value;
    setSelectedMaterial(newMaterial);
    if (appRef.current?.materialManager) {
      appRef.current.materialManager.updateMaterial(newMaterial);
    }
  };

  const handleHDRIChange = (path, intensity) => {
    if (appRef.current?.lightingSystem) {
      appRef.current.lightingSystem.loadHDRI(path, intensity);
    }
  };

  const handleHDRIRotation = (angle) => {
    if (appRef.current?.lightingSystem) {
      appRef.current.lightingSystem.rotateEnvironment(angle);
    }
  };

  const handleHDRIIntensity = (intensity) => {
    if (appRef.current?.lightingSystem) {
      appRef.current.lightingSystem.updateEnvironmentMapIntensity(intensity);
    }
  };

  return (
    <TextureProvider>
      <div className="relative min-h-screen bg-gray-900 text-white">
        {/* Top Navigation */}
        <nav className="fixed top-0 left-0 right-0 bg-gray-800 border-b border-gray-700 z-20">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <h1 className="text-xl font-bold">3D Model Viewer</h1>
            <div className="flex items-center gap-4">
              <CategorizedModelSelect 
                selectedModel={selectedModel}
                onChange={handleModelChange}
              />
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                disabled={isLoading}
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </nav>

        {/* Main Content Area */}
        <div className="flex h-screen pt-14">
          {/* Canvas */}
          <div className="flex-1 relative">
            <canvas ref={canvasRef} className="w-full h-full" />
            <ControlsTooltip />
          </div>

          {/* Resizable Sidebar */}
          <ResizableSidebar isOpen={isSidebarOpen}>
            {/* HDRI Controls */}
            <div className="mb-6 border-b border-gray-700 pb-6">
              <HDRIControls
                onHDRIChange={(path, intensity) => handleHDRIChange(path, intensity)}
                onRotationChange={handleHDRIRotation}
                onIntensityChange={handleHDRIIntensity}
                onBackgroundToggle={(show) => {
                    if (appRef.current?.lightingSystem) {
                        appRef.current.lightingSystem.toggleBackground(show);
                    }
                }}
              />
            </div>

            {/* Material Selection */}
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Palette className="w-4 h-4" /> Materials
              </h2>
              <select 
                id="materialSelect"
                className="w-full bg-gray-700 rounded px-3 py-2 mb-3 border border-gray-600"
                value={selectedMaterial}
                onChange={handleMaterialChange}
              >
                <option value="cotton">Cotton</option>
                <option value="nylon">Nylon</option>
                <option value="leather">Leather</option>
                <option value="metal">Metal</option>
                <option value="plastic">Plastic</option>
              </select>
            </div>

            {/* Material Properties */}
            <div id="workspace-colors">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4" /> Properties
              </h2>
              <div className="space-y-4">
                {/* Selected Model Display */}
                <div id="modelNameDisplay" className="text-sm text-gray-400">
                  Selected: None
                </div>
                
               
                
                {/* Color Picker */}
                <div>
                  <label className="block mb-2 text-sm">Color</label>
                  
                  <PantoneColorPicker 
                    currentColor={window.selectedModelPart 
                      ? window.colorManager.getExactColorForPicker(window.selectedModelPart) 
                      : "#ffffff"}
                    onColorSelect={(color) => {
                      if (window.selectedModelPart) {
                        // Use the global color manager to store and apply the color
                        window.colorManager.storeExactColor(window.selectedModelPart, color);
                        
                        // Update color picker UI
                        const colorPicker = document.getElementById('colorPicker');
                        if (colorPicker) {
                          colorPicker.value = color;
                        }
                      }
                    }} 
                  />
                  <input 
                    type="color" 
                    id="colorPicker"
                    className="w-full h-10 rounded bg-gray-700 border border-gray-600" 
                    onInput={(e) => {
                      // IMPORTANT: Directly use the event.target.value without any conversion
                      if (window.selectedModelPart) {
                        const exactColor = e.target.value;
                        window.colorManager.storeExactColor(window.selectedModelPart, exactColor);
                      }
                    }}
                  />
                </div>

                 {/* Toggle for Advanced Settings */}
                 <button
                  onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                  className="w-full px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 
                          text-gray-300 rounded flex items-center justify-between"
                >
                  <span>Advanced Material Properties</span>
                  <ChevronRight 
                    className={`w-4 h-4 transition-transform ${showAdvancedSettings ? 'rotate-90' : ''}`}
                  />
                </button>

                {showAdvancedSettings && (
                  <div className="mt-2 space-y-4 p-3 bg-gray-700/50 rounded-lg">
                    {/* Model Part Roughness Slider */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>Model Part Roughness</span>
                        <span id="modelRoughnessValue">{selectedModelRoughness.toFixed(2)}</span>
                      </div>
                      <input 
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={selectedModelRoughness}
                        onChange={(e) => {
                          const roughness = parseFloat(e.target.value);
                          window.updateSelectedModelMaterial?.(roughness, selectedModelMetalness);
                        }}
                        className="w-full accent-blue-500"
                      />
                    </div>

                    {/* Model Part Metalness Slider */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>Model Part Metalness</span>
                        <span id="modelMetalnessValue">{selectedModelMetalness.toFixed(2)}</span>
                      </div>
                      <input 
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={selectedModelMetalness}
                        onChange={(e) => {
                          const metalness = parseFloat(e.target.value);
                          window.updateSelectedModelMaterial?.(selectedModelRoughness, metalness);
                        }}
                        className="w-full accent-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

              {/* Texture Layer Manager */}
            <div id="materialSelect-container"></div>
            <TextureLayerManager />
            
            {/* TechPack Generator */}
            {appRef.current && (
              <TechPack 
                selectedModel={selectedModel}
                selectedMaterial={selectedMaterial}
                materialManager={appRef.current.materialManager}
                renderer={appRef.current.renderer}
                scene={appRef.current.scene}
                camera={appRef.current.camera}
                controls={appRef.current.controls}
              />
            )}
          </ResizableSidebar>
        </div>

        {/* UV Editor Container */}
        <UVEditorContainer />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
              <p className="mt-2 text-sm text-gray-300">Loading model...</p>
            </div>
          </div>
        )}
      </div>
    </TextureProvider>
  );
}