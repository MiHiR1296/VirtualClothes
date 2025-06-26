import { logDebug, logInfo, logWarn, logError } from "./logger.js";
import React, { useRef, useEffect, useState } from 'react';
import { Layers, Palette, Settings, Move, Menu, ChevronRight } from 'lucide-react';
import { ThreeApplication } from './ThreeApplication';
import { TextureProvider } from './TextureContext';
import TextureLayerManager from './TextureLayerManager';
import UVEditorContainer from './UVEditorContainer';
import ControlsTooltip from './ControlsTooltip';
import { getModelsByCategory } from './modelLoader';

const FABRIC_OPTIONS = {
  default: [
    { value: 'cotton', label: 'Cotton' },
    { value: 'nylon', label: 'Nylon' },
    { value: 'leather', label: 'Leather' },
    { value: 'metal', label: 'Metal' },
    { value: 'plastic', label: 'Plastic' }
  ],
  men_polo_hs: [
    { value: 'default', label: 'Default' },
    { value: 'cotton_100', label: '100% Cotton, (180 g/m2)' },
    { value: 'cotton_95_lycra5', label: '95% Cotton, 5% Lycra, (290 g/m2)' },
    { value: 'cotton_60_poly40', label: '60% Cotton, 40% Polyester, (175 g/m2)' },
    { value: 'cotton_57_modal38_spandex5', label: '57% Cotton, 38% Modal, 5% Spandex, (275 g/m2)' }
  ],
  men_round_hs: [
    { value: 'default', label: 'Default' },
    { value: 'cotton_100', label: '100% Cotton, (180 g/m2)' },
    { value: 'cotton_95_lycra5', label: '95% Cotton, 5% Lycra, (290 g/m2)' },
    { value: 'cotton_60_poly40', label: '60% Cotton, 40% Polyester, (175 g/m2)' },
    { value: 'cotton_57_modal38_spandex5', label: '57% Cotton, 38% Modal, 5% Spandex, (275 g/m2)' }
  ]
};

const MODEL_VARIANTS = {
  men_polo_hs: {
    default: 'men_polo_hs',
    cotton_100: 'men_polo_hs_1',
    cotton_95_lycra5: 'men_polo_hs_2',
    cotton_60_poly40: 'men_polo_hs_3',
    cotton_57_modal38_spandex5: 'men_polo_hs_4'
  },
  men_round_hs: {
    default: 'men_round_hs',
    cotton_100: 'men_round_hs_1',
    cotton_95_lycra5: 'men_round_hs_2',
    cotton_60_poly40: 'men_round_hs_3',
    cotton_57_modal38_spandex5: 'men_round_hs_4'
  }
};

const getDefaultFabric = (modelId) => {
  return FABRIC_OPTIONS[modelId]?.[0].value || FABRIC_OPTIONS.default[0].value;
};
import HDRIControls from './HDRIControls';
import TechPack from './TechPack';
import PantoneColorPicker from './PantoneColorPicker';
import ResizableSidebar from './ResizableSidebar';
import MultiSelectionIndicator from './MultiSelectionIndicator';

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

// colormanager
// This goes in App.jsx - replace the entire window.colorManager object
window.colorManager = {
  // Track the last update time to implement a simple debounce
  lastUpdateTime: 0,
  updateDelay: 100, // ms between allowed updates
  
  // Apply the color to material, with optional debouncing
  applyExactColor: function(object, debounce = true) {
    if (!object || !object.material) return false;
    
    // Skip if debouncing is enabled and we updated recently
    if (debounce) {
      const now = Date.now();
      if (now - this.lastUpdateTime < this.updateDelay) {
        return false;
      }
      this.lastUpdateTime = now;
    }
    
    // If we have a stored exact color, use it
    if (object.userData && object.userData.exactColor) {
      // Apply it directly to the material
      object.material.color.set(object.userData.exactColor);
      object.material.needsUpdate = true;
      
      // Log only when debug is enabled
      if (window.DEBUG_COLOR_MANAGER) {
        logDebug(`Applied stored color ${object.userData.exactColor} to ${object.name}`);
      }
      return true;
    }
    return false;
  },
  
  // Store and apply a new color - handles both single object and arrays
  storeExactColor: function(object, colorValue) {
    // Debounce color updates
    const now = Date.now();
    if (now - this.lastUpdateTime < this.updateDelay) {
      return false;
    }
    this.lastUpdateTime = now;
    
    // Check if we're dealing with an array of objects (multi-selection)
    if (Array.isArray(object)) {
      // Apply to each object in the array
      object.forEach(obj => {
        this._applyColorToSingleObject(obj, colorValue);
      });
      return true;
    }
    
    // Handle single object
    return this._applyColorToSingleObject(object, colorValue);
  },

  // Private method to apply color to a single object
  _applyColorToSingleObject: function(object, colorValue) {
    if (!object || !object.material) return false;
    
    // Store the exact color
    if (!object.userData) object.userData = {};
    object.userData.exactColor = colorValue;
    
    // Apply it to the material
    object.material.color.set(colorValue);
    object.material.needsUpdate = true;
    
    // Log only when debug is enabled
    if (window.DEBUG_COLOR_MANAGER) {
      logDebug(`Stored and applied color ${colorValue} to ${object.name}`);
    }
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

// Default debug mode to false
window.DEBUG_COLOR_MANAGER = false;

export default function App() {
  const canvasRef = useRef(null);
  const appRef = useRef(null);
  const [selectedModel, setSelectedModel] = useState('men_polo_hs');
  const [selectedMaterial, setSelectedMaterial] = useState(getDefaultFabric('men_polo_hs'));
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedModelRoughness, setSelectedModelRoughness] = useState(1.0);
  const [selectedModelMetalness, setSelectedModelMetalness] = useState(0.05);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPartsCount, setSelectedPartsCount] = useState(0);

  useEffect(() => {
    if (!canvasRef.current || appRef.current) return;

    const initializeApp = async () => {
      try {
        const app = new ThreeApplication(canvasRef.current);
        appRef.current = app;

        await app.initPromise;

        // Setup global reference for model roughness/metalness update
        window.updateSelectedModelMaterial = () => {
          if (!window.selectedModelPart) return;
          
          if (window.selectedModelPart.name.includes('Fronttex') || 
              window.selectedModelPart.name.includes('Backtex')) return;
          
          // Make sure we have userData
          if (!window.selectedModelPart.userData) {
            window.selectedModelPart.userData = {};
          }
          
          // Use preset values
          const presetRoughness = 1.0;
          const presetMetalness = 0.05;
          
          // Store the values in userData
          window.selectedModelPart.userData.exactRoughness = presetRoughness;
          window.selectedModelPart.userData.exactMetalness = presetMetalness;
          
          // Check if the material exists
          if (window.selectedModelPart.material) {
            // Capture original values we want to preserve
            const origOpacity = window.selectedModelPart.material.opacity !== undefined ? 
                                window.selectedModelPart.material.opacity : 1.0;
            const origTransparent = window.selectedModelPart.material.transparent !== undefined ? 
                                  window.selectedModelPart.material.transparent : false;
            
            // Apply the preset values
            window.selectedModelPart.material.roughness = presetRoughness;
            window.selectedModelPart.material.metalness = presetMetalness;
            
            // Restore original opacity/transparency values
            window.selectedModelPart.material.opacity = origOpacity;
            window.selectedModelPart.material.transparent = origTransparent;
            
            // Force material update
            window.selectedModelPart.material.needsUpdate = true;
            
            // Update React state
            setSelectedModelRoughness(presetRoughness);
            setSelectedModelMetalness(presetMetalness);
            
            logDebug(`Material set to preset values: roughness=${presetRoughness}, metalness=${presetMetalness}`);
          }
        };
        
        // Make MODEL_PATHS accessible globally for techpack generation
        import('./modelLoader.js').then(module => {
          window.MODEL_PATHS = module.MODEL_PATHS;
        });
      } catch (error) {
        logError('Failed to initialize application:', error);
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

  // Ensure selected material matches the current garment
  useEffect(() => {
    const defaultMat = getDefaultFabric(selectedModel);
    setSelectedMaterial(defaultMat);
    if (appRef.current?.materialManager) {
      appRef.current.materialManager.updateMaterial(defaultMat);
    }
  }, [selectedModel]);

  // Add an effect to watch for changes to the selection
  useEffect(() => {
    // Function to update the selection count
    const updateSelectionCount = () => {
      const partsCount = window.selectedModelParts?.length || 0;
      setSelectedPartsCount(partsCount);
    };
    
    // Set up event listener for selection changes
    window.addEventListener('model-part-selected', updateSelectionCount);
    
    // Initial check
    updateSelectionCount();
    
    // Set up an interval to check the selection count (as a fallback)
    const intervalId = setInterval(updateSelectionCount, 500);
    
    return () => {
      window.removeEventListener('model-part-selected', updateSelectionCount);
      clearInterval(intervalId);
    };
  }, []);

  // Function to clear the selection
  const clearSelection = () => {
    window.selectedModelPart = null;
    window.selectedModelParts = [];
    
    // This will trigger an update in the eventHandler
    if (appRef.current?.eventHandler) {
      appRef.current.eventHandler.selectedModelParts = [];
      appRef.current.eventHandler.updateModelNameDisplay('None');
    }
    
    setSelectedPartsCount(0);
  };

  const applyPresetsToAllParts = () => {
    if (!appRef.current || !appRef.current.scene) return;
    
    // Find all mesh objects that aren't texture meshes
    appRef.current.scene.traverse((object) => {
      if (object.isMesh && 
          !object.name.includes('Fronttex') && 
          !object.name.includes('Backtex') &&
          object.userData.isImported) {
        
        // Save the current object as selected
        const previousSelected = window.selectedModelPart;
        
        // Temporarily set this object as selected
        window.selectedModelPart = object;
        
        // Apply preset values
        window.updateSelectedModelMaterial();
        
        // Restore previous selection
        window.selectedModelPart = previousSelected;
      }
    });
    
    logDebug("Applied preset material properties to all model parts");
  };

  const handleModelChange = async (e) => {
    if (!appRef.current || isLoading) return;

    try {
      setIsLoading(true);
      const modelId = e.target.value;
      setSelectedModel(modelId);

      const defaultMat = getDefaultFabric(modelId);
      setSelectedMaterial(defaultMat);
      const variant = MODEL_VARIANTS[modelId]?.[defaultMat] || modelId;

      await appRef.current.loadModel(variant);
      if (appRef.current?.materialManager) {
        appRef.current.materialManager.updateMaterial(defaultMat);
      }

      // Apply preset material values after model loads
      setTimeout(() => {
        // Set state values to match presets
        setSelectedModelRoughness(1.0);
        setSelectedModelMetalness(0.05);
        
        // Apply to selected parts if any
        if (window.selectedModelPart) {
          window.updateSelectedModelMaterial();
        }
        
        // Apply to all model parts for consistency
        applyPresetsToAllParts();
      }, 500); // Short delay to ensure model is fully loaded
    } catch (error) {
      logError('Error loading model:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMaterialChange = async (e) => {
    const newMaterial = e.target.value;
    setSelectedMaterial(newMaterial);

    if (!appRef.current) return;
    try {
      setIsLoading(true);
      const variant = MODEL_VARIANTS[selectedModel]?.[newMaterial] || selectedModel;
      await appRef.current.loadModel(variant);
      setTimeout(() => {
        setSelectedModelRoughness(1.0);
        setSelectedModelMetalness(0.05);
        if (window.selectedModelPart) {
          window.updateSelectedModelMaterial();
        }
        applyPresetsToAllParts();
      }, 500);
    } catch (error) {
      logError('Error loading variant model:', error);
    } finally {
      setIsLoading(false);
    }

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

            {/* Fabric Selection */}
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Palette className="w-4 h-4" /> Fabric Options
              </h2>
              <select
                id="materialSelect"
                className="w-full bg-gray-700 rounded px-3 py-2 mb-3 border border-gray-600"
                value={selectedMaterial}
                onChange={handleMaterialChange}
              >
                {(FABRIC_OPTIONS[selectedModel] || FABRIC_OPTIONS.default).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
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
                
                {/* Multi-Selection Indicator */}
                <MultiSelectionIndicator 
                  count={selectedPartsCount} 
                  onClear={clearSelection} 
                />
                
                {/* Color Picker */}
                <div>
                  <label className="block mb-2 text-sm">Color</label>
                  
                  <PantoneColorPicker 
                    currentColor={window.selectedModelPart 
                      ? window.colorManager.getExactColorForPicker(window.selectedModelPart) 
                      : "#ffffff"}
                    onColorSelect={(color) => {
                      if (window.selectedModelPart) {
                        // Check if we have multiple selections
                        if (window.selectedModelParts && window.selectedModelParts.length > 1) {
                          // Use the global color manager to store and apply the color to all selected parts
                          window.colorManager.storeExactColor(window.selectedModelParts, color);
                        } else {
                          // Apply to single selection
                          window.colorManager.storeExactColor(window.selectedModelPart, color);
                        }
                        
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
                      // Get the color value directly from the input
                      const exactColor = e.target.value;
                      
                      // Check if we have multiple selections
                      if (window.selectedModelParts && window.selectedModelParts.length > 1) {
                        // Apply to all selected parts
                        window.colorManager.storeExactColor(window.selectedModelParts, exactColor);
                      } else if (window.selectedModelPart) {
                        // Apply to single selection
                        window.colorManager.storeExactColor(window.selectedModelPart, exactColor);
                      }
                    }}
                  />
                </div>
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