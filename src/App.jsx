import { logDebug, logInfo, logWarn, logError } from "./logger.js";
import React, { useRef, useEffect, useState } from 'react';
import {
  Brush,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Layers,
  Palette,
  Shirt,
} from 'lucide-react';
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
import TechPack from './TechPack';
import PantoneColorPicker from './PantoneColorPicker';

const PANEL_GROUPS = {
  left: [
    { id: 'garment', label: 'Garment' },
    { id: 'color', label: 'Color' },
    { id: 'fabric', label: 'Fabric' }
  ],
  right: [
    { id: 'layers', label: 'Layers' }
  ]
};

const INITIAL_PANEL_STATE = {
  garment: true,
  color: true,
  fabric: true,
  layers: true
};

const QUICK_SWATCHES = [
  '#f4f0e8',
  '#ddc797',
  '#c7a77a',
  '#dfaa9d',
  '#dc654f',
  '#d84d42',
  '#bf2451',
  '#9a235d',
  '#2f477d',
  '#dbc18d',
  '#315a92',
  '#69664c',
  '#1f6631',
  '#103443',
  '#041f42',
  '#171717'
];

const FABRIC_TEXTURES = {
  default: 'Plain',
  cotton: 'Cotton',
  nylon: 'Nylon',
  leather: 'Leather',
  metal: 'Metal',
  plastic: 'Plastic',
  cotton_100: 'Pique',
  cotton_95_lycra5: 'Jersey',
  cotton_60_poly40: 'Oxford',
  cotton_57_modal38_spandex5: 'Stretch'
};

const getVisibleModelOptions = () =>
  Object.entries(getModelsByCategory()).flatMap(([category, models]) =>
    models.map((model) => ({
      ...model,
      category
    }))
  );

const getGarmentLabel = (model) =>
  model.name
    .replace(/^Men's\s+/i, '')
    .replace(/^Women's\s+/i, "Women's ")
    .replace('Half Sleeve', '')
    .trim();

// Categorized Model Select Component
const CategorizedModelSelect = ({ selectedModel, onChange }) => {
  const categories = getModelsByCategory();
  
  return (
    <select 
      className="professional-input px-3 py-2 text-sm focus-ring"
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

const ConfiguratorPanel = ({
  id,
  title,
  icon: Icon,
  side,
  onCollapse,
  children
}) => (
  <section className={`config-panel config-panel--${id}`} data-side={side}>
    <button
      type="button"
      className="config-panel__heading"
      onClick={onCollapse}
      aria-label={`Hide ${title}`}
    >
      <span>
        {Icon ? <Icon className="config-panel__icon" /> : null}
        {title}
      </span>
      {side === 'left' ? (
        <ChevronLeft className="config-panel__collapse" />
      ) : (
        <ChevronRight className="config-panel__collapse" />
      )}
    </button>
    <div className="config-panel__body">{children}</div>
  </section>
);

const EdgeTabs = ({ side, panels, visibility, onRestore }) => {
  const hiddenPanels = panels.filter((panel) => !visibility[panel.id]);
  if (hiddenPanels.length === 0) return null;

  return (
    <div className={`edge-tabs edge-tabs--${side}`}>
      {hiddenPanels.map((panel) => (
        <button
          key={panel.id}
          type="button"
          className="edge-tab"
          onClick={() => onRestore(panel.id)}
        >
          {panel.label}
        </button>
      ))}
    </div>
  );
};

const GarmentPanel = ({ selectedModel, isLoading, onSelect }) => {
  const models = getVisibleModelOptions();

  return (
    <div className="garment-list">
      {models.map((model) => (
        <button
          key={model.id}
          type="button"
          disabled={isLoading}
          className={`garment-option ${
            selectedModel === model.id ? 'is-selected' : ''
          }`}
          onClick={() => onSelect(model.id)}
        >
          <span className="garment-option__icon">
            <Shirt className="w-6 h-6" />
          </span>
          <span>
            <span className="garment-option__label">{getGarmentLabel(model)}</span>
            <span className="garment-option__meta">{model.category}</span>
          </span>
          {selectedModel === model.id ? <Check className="garment-option__check" /> : null}
        </button>
      ))}
    </div>
  );
};

const ColorPanel = ({
  selectedColor,
  availableParts,
  selectedPartNames,
  onColorSelect,
  onSelectAll,
  onTogglePart
}) => (
  <div className="color-panel-flow">
    <div id="modelNameDisplay" className="selected-part-label">
      Scope: All parts
    </div>
    <div className="part-scope-list">
      <button
        type="button"
        className={`part-scope-row ${selectedPartNames.length === 0 ? 'is-selected' : ''}`}
        onClick={onSelectAll}
      >
        <span>All parts</span>
        <span className="part-scope-check">{selectedPartNames.length === 0 ? <Check className="w-4 h-4" /> : null}</span>
      </button>
      {availableParts.map((part) => {
        const isSelected = selectedPartNames.includes(part.name);
        return (
          <button
            key={part.id || part.name}
            type="button"
            className={`part-scope-row ${isSelected ? 'is-selected' : ''}`}
            onClick={() => onTogglePart(part.name)}
          >
            <span>{part.label || part.name}</span>
            <span className="part-scope-check">{isSelected ? <Check className="w-4 h-4" /> : null}</span>
          </button>
        );
      })}
    </div>
    <PantoneColorPicker currentColor={selectedColor} onColorSelect={onColorSelect} />
    <div className="pantone-grid" aria-label="Pantone swatches">
      {QUICK_SWATCHES.map((color) => (
        <button
          key={color}
          type="button"
          className={`pantone-swatch ${selectedColor === color ? 'is-selected' : ''}`}
          style={{ backgroundColor: color }}
          onClick={() => onColorSelect(color)}
          aria-label={color}
        >
          {selectedColor === color ? <Check className="w-4 h-4" /> : null}
        </button>
      ))}
    </div>
    <input
      type="color"
      id="colorPicker"
      className="native-color-input"
      value={selectedColor}
      onInput={(event) => onColorSelect(event.target.value)}
      aria-label="Custom color"
    />
  </div>
);

const FabricPanel = ({ selectedMaterial, selectedModel, isLoading, onSelect }) => {
  const options = FABRIC_OPTIONS[selectedModel] || FABRIC_OPTIONS.default;

  return (
    <div className="fabric-grid">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={isLoading}
          className={`fabric-option ${
            selectedMaterial === option.value ? 'is-selected' : ''
          }`}
          onClick={() => onSelect(option.value)}
        >
          <span className={`fabric-sample fabric-sample--${option.value}`} />
          <span className="fabric-option__name">
            {FABRIC_TEXTURES[option.value] || option.label}
          </span>
        </button>
      ))}
    </div>
  );
};

const BottomToolbar = ({ isCleanView, onToggleCleanView, onScreenshot }) => (
  <div className="bottom-toolbar">
    <button
      type="button"
      className="toolbar-icon-button"
      onClick={onToggleCleanView}
      aria-label={isCleanView ? 'Show interface' : 'Clean view'}
      title={isCleanView ? 'Show interface' : 'Clean view'}
    >
      {isCleanView ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
    </button>
    <button type="button" className="toolbar-button toolbar-button--light" onClick={onScreenshot}>
      <Camera className="w-5 h-5" />
      <span>Screenshot</span>
    </button>
  </div>
);

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
  const [selectedColor, setSelectedColor] = useState('#ffffff');
  const [panelVisibility, setPanelVisibility] = useState(INITIAL_PANEL_STATE);
  const [isLoading, setIsLoading] = useState(false);
  const [isAppReady, setIsAppReady] = useState(false);
  const [availableParts, setAvailableParts] = useState([]);
  const [selectedPartNames, setSelectedPartNames] = useState([]);

  useEffect(() => {
    if (!canvasRef.current || appRef.current) return;

    const initializeApp = async () => {
      try {
        const app = new ThreeApplication(canvasRef.current);
        appRef.current = app;

        await app.initPromise;
        setIsAppReady(true);

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
  }, [selectedModel]);

  useEffect(() => {
    const refreshSelectableParts = (event) => {
      const detail = event?.detail || {};
      const parts = detail.availableParts || window.getSelectableModelParts?.() || [];
      const selectedNames = new Set(detail.parts || window.selectedModelParts?.map((part) => part.name) || []);
      const selectedGroups = parts
        .filter((part) => part.partNames?.length && part.partNames.every((partName) => selectedNames.has(partName)))
        .map((part) => part.name);
      setAvailableParts(parts);
      setSelectedPartNames(selectedGroups);
    };
    
    window.addEventListener('model-part-selected', refreshSelectableParts);
    window.addEventListener('model-loaded', refreshSelectableParts);
    
    refreshSelectableParts();
    
    const intervalId = setInterval(refreshSelectableParts, 1000);
    
    return () => {
      window.removeEventListener('model-part-selected', refreshSelectableParts);
      window.removeEventListener('model-loaded', refreshSelectableParts);
      clearInterval(intervalId);
    };
  }, []);

  // Function to clear the selection
  const clearSelection = () => {
    if (typeof window.clearModelPartSelection === 'function') {
      window.clearModelPartSelection();
      setSelectedPartNames([]);
      return;
    }

    window.selectedModelPart = null;
    window.selectedModelParts = [];
    
    // This will trigger an update in the eventHandler
    if (appRef.current?.eventHandler) {
      appRef.current.eventHandler.selectedModelParts = [];
      appRef.current.eventHandler.updateModelNameDisplay('All parts');
    }
    
    setSelectedPartNames([]);
    window.dispatchEvent(new CustomEvent('model-part-selected', {
      detail: {
        count: 0,
        parts: [],
        availableParts
      }
    }));
  };

  const selectAllParts = () => {
    clearSelection();
  };

  const togglePartScope = (partName) => {
    const selectedSet = new Set(selectedPartNames);

    if (selectedPartNames.length === 0) {
      selectedSet.add(partName);
    } else if (selectedSet.has(partName)) {
      selectedSet.delete(partName);
    } else {
      selectedSet.add(partName);
    }

    const nextSelection = Array.from(selectedSet);
    setSelectedPartNames(nextSelection);
    window.setSelectedModelPartsByName?.(nextSelection);
  };

  const setPanelVisible = (panelId, isVisible) => {
    setPanelVisibility((current) => ({
      ...current,
      [panelId]: isVisible
    }));
  };

  const enterCleanView = () => {
    setPanelVisibility(
      Object.fromEntries(
        Object.keys(INITIAL_PANEL_STATE).map((panelId) => [panelId, false])
      )
    );
  };

  const showAllPanels = () => {
    setPanelVisibility({ ...INITIAL_PANEL_STATE });
  };

  const applyColorToTargets = (colorValue) => {
    const applyColor = (object) => {
      if (!object?.material || object.name?.includes('Fronttex') || object.name?.includes('Backtex')) {
        return;
      }

      if (!object.userData) object.userData = {};
      object.userData.exactColor = colorValue;
      object.material.color.set(colorValue);
      object.material.needsUpdate = true;
    };

    const selectedParts = window.selectedModelParts || [];
    if (selectedParts.length > 0) {
      selectedParts.forEach(applyColor);
      return;
    }

    if (window.selectedModelPart) {
      applyColor(window.selectedModelPart);
      return;
    }

    appRef.current?.scene?.traverse((object) => {
      if (object.isMesh && object.userData?.isImported) {
        applyColor(object);
      }
    });
  };

  const handleColorSelect = (colorValue) => {
    setSelectedColor(colorValue);
    applyColorToTargets(colorValue);
  };

  const loadModelById = async (modelId) => {
    if (!appRef.current || isLoading) return;

    try {
      setIsLoading(true);
      clearSelection();
      setSelectedModel(modelId);

      const defaultMat = getDefaultFabric(modelId);
      setSelectedMaterial(defaultMat);
      const variant = MODEL_VARIANTS[modelId]?.[defaultMat] || modelId;

      await appRef.current.loadModel(variant);
    } catch (error) {
      logError('Error loading model:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModelChange = async (e) => {
    await loadModelById(e.target.value);
  };

  const loadMaterialVariant = async (newMaterial) => {
    setSelectedMaterial(newMaterial);

    if (!appRef.current) return;
    try {
      setIsLoading(true);
      clearSelection();
      const variant = MODEL_VARIANTS[selectedModel]?.[newMaterial] || selectedModel;
      await appRef.current.loadModel(variant);
    } catch (error) {
      logError('Error loading variant model:', error);
    } finally {
      setIsLoading(false);
    }

    // Material updates are handled by the loaded model's textures
  };

  const handleMaterialChange = async (e) => {
    await loadMaterialVariant(e.target.value);
  };

  const captureScreenshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `virtual-clothes-${selectedModel}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const isCleanView = Object.values(panelVisibility).every((isVisible) => !isVisible);

  return (
    <TextureProvider>
      <div className={`configurator-shell ${isCleanView ? 'is-clean' : ''}`}>
        <div className="product-stage">
          <canvas ref={canvasRef} className="product-canvas" />
          <ControlsTooltip />
        </div>

        <div className="studio-brand">
          <span>Virtual Clothes Studio</span>
        </div>

        <div className="panel-stack panel-stack--left">
          {panelVisibility.garment && (
            <ConfiguratorPanel
              id="garment"
              title="Garment"
              icon={Shirt}
              side="left"
              onCollapse={() => setPanelVisible('garment', false)}
            >
              <GarmentPanel
                selectedModel={selectedModel}
                isLoading={isLoading}
                onSelect={loadModelById}
              />
            </ConfiguratorPanel>
          )}

          {panelVisibility.color && (
            <ConfiguratorPanel
              id="color"
              title="Color"
              icon={Brush}
              side="left"
              onCollapse={() => setPanelVisible('color', false)}
            >
              <ColorPanel
                selectedColor={selectedColor}
                availableParts={availableParts}
                selectedPartNames={selectedPartNames}
                onColorSelect={handleColorSelect}
                onSelectAll={selectAllParts}
                onTogglePart={togglePartScope}
              />
            </ConfiguratorPanel>
          )}

          {panelVisibility.fabric && (
            <ConfiguratorPanel
              id="fabric"
              title="Fabric"
              icon={Palette}
              side="left"
              onCollapse={() => setPanelVisible('fabric', false)}
            >
              <FabricPanel
                selectedMaterial={selectedMaterial}
                selectedModel={selectedModel}
                isLoading={isLoading}
                onSelect={loadMaterialVariant}
              />
            </ConfiguratorPanel>
          )}
        </div>

        <div className="panel-stack panel-stack--right">
          {panelVisibility.layers && (
            <ConfiguratorPanel
              id="layers"
              title="Layers"
              icon={Layers}
              side="right"
              onCollapse={() => setPanelVisible('layers', false)}
            >
              <TextureLayerManager />
            </ConfiguratorPanel>
          )}

          {isAppReady && appRef.current && (
            <div className="techpack-dock">
              <TechPack
                selectedModel={selectedModel}
                selectedMaterial={selectedMaterial}
                materialManager={appRef.current.materialManager}
                renderer={appRef.current.renderer}
                scene={appRef.current.scene}
                camera={appRef.current.camera}
                controls={appRef.current.controls}
              />
            </div>
          )}
        </div>

        <EdgeTabs
          side="left"
          panels={PANEL_GROUPS.left}
          visibility={panelVisibility}
          onRestore={(panelId) => setPanelVisible(panelId, true)}
        />
        <EdgeTabs
          side="right"
          panels={PANEL_GROUPS.right}
          visibility={panelVisibility}
          onRestore={(panelId) => setPanelVisible(panelId, true)}
        />

        <BottomToolbar
          isCleanView={isCleanView}
          onToggleCleanView={isCleanView ? showAllPanels : enterCleanView}
          onScreenshot={captureScreenshot}
        />

        <UVEditorContainer />

        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-card">
              <div className="loading-spinner"></div>
              <p>Loading model...</p>
            </div>
          </div>
        )}
      </div>
    </TextureProvider>
  );
}
