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

export default function App() {
  const canvasRef = useRef(null);
  const appRef = useRef(null);
  const [selectedModel, setSelectedModel] = useState('men_polo_hs');
  const [selectedMaterial, setSelectedMaterial] = useState('cotton');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
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
            material.roughness = roughness;
            material.metalness = metalness;
            material.needsUpdate = true;
            setSelectedModelRoughness(roughness);
            setSelectedModelMetalness(metalness);
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
      if (selectedModelRoughness !== 0.8 || selectedModelMetalness !== 0.1) {
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

          {/* Sidebar */}
          <div 
            className={`fixed right-0 top-14 bottom-0 w-80 bg-gray-800 border-l border-gray-700 
                      transform transition-transform duration-300 ease-in-out z-10 overflow-y-auto
                      ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}
          >
            <div className="h-full overflow-y-auto p-6 space-y-6">
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
                        onColorSelect={(color) => {
                          if (window.selectedModelPart) {
                            const material = window.selectedModelPart.material;
                            // Store exact color in userData for consistent color picking
                            window.selectedModelPart.userData.exactColor = color;
                            // Update actual material color
                            material.color.set(color);
                            material.needsUpdate = true;
                            // Update color picker UI
                            document.getElementById('colorPicker').value = color;
                          }
                        }} 
                      />
                      <input 
                        type="color" 
                        id="colorPicker"
                        className="w-full h-10 rounded bg-gray-700 border border-gray-600" 
                      />
                    </div>

                  {/* Advanced Settings */}
                  <div>
                    <button
                      onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 
                               bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      <ChevronRight 
                        className={`w-4 h-4 transition-transform ${showAdvancedSettings ? 'rotate-90' : ''}`}
                      />
                      Advanced Settings
                    </button>

                    {showAdvancedSettings && (
                      <div className="mt-2 space-y-4 p-3 bg-gray-700/50 rounded-lg">
                        {/* Model Part Roughness Slider */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-gray-400">
                            <span>Model Part Roughness</span>
                            <span>{selectedModelRoughness.toFixed(2)}</span>
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
                            <span>{selectedModelMetalness.toFixed(2)}</span>
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
              </div>

              {/* Texture Layer Manager */}
              <div id="materialSelect-container"></div>
              <TextureLayerManager />
              
              {/* TechPack Generator - Moved to bottom */}
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
            </div>
          </div>
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