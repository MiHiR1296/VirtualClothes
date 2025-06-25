import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Plus, Layers, RefreshCw } from 'lucide-react';
import LayerItem from './LayerItem';
import { useTextureContext } from './TextureContext';
import { TextureLoadingUtils } from './textureLoadingUtils';
import { materialTypes } from './MaterialTypeSelect';
import * as THREE from 'three';
import { TextureCompositor } from './TextureCompositor';

// Delay used for debounced texture refreshes (in milliseconds).
// Increase this value if heavy textures are causing early refreshes.
export const REFRESH_DELAY_MS = 150;

const DEFAULT_TRANSFORMATIONS = {
    offset: { x: 0, y: 0 },
    scale: 1,
    rotation: 0,
    repeat: false,
    flipX: 1,
    flipY: 1,
    detailScale: 1.0
};

// This function extracts the names from texture meshes for the dropdown
const extractTextureMeshParts = () => {
    const textureMeshParts = [];
    
    // Get texture objects using the findTextureObjects function
    const textureObjects = window.findTextureObjects?.() || [];
    
    if (textureObjects.length === 0) {
        console.warn("No texture mesh objects found in the scene");
        return ["No texture meshes found"];
    }
    
    // Process each texture object to create a user-friendly part name
    textureObjects.forEach(object => {
        // For the new naming convention (Fronttex_PartName)
        if (object.name.startsWith("Fronttex_")) {
            // Extract the part after "Fronttex_"
            const partBase = object.name.substring(9); // Skip "Fronttex_"
            
            // Create a friendly part name, removing underscores
            let partName = partBase.replace(/_/g, ' ');
            
            // Add to the list if not already there
            if (!textureMeshParts.includes(partName)) {
                textureMeshParts.push(partName);
            }
        }
        // Fallback for traditional naming
        else if (object.name.includes("Fronttex") || object.name.includes("Backtex")) {
            // Try to extract a meaningful name or use the full name
            let partName = object.name.replace("Fronttex", "").replace("Backtex", "").trim();
            
            if (!partName) {
                partName = object.name;
            }
            
            if (!textureMeshParts.includes(partName)) {
                textureMeshParts.push(partName);
            }
        }
    });
    
    console.log("Extracted texture mesh parts:", textureMeshParts);
    
    // Return with a fallback if nothing found
    if (textureMeshParts.length === 0) {
        return ["No texture parts found"];
    }
    
    return textureMeshParts;
};

export default function TextureLayerManager() {
    const { 
        layers, 
        setLayers, 
        activeLayer, 
        setActiveLayer, 
        updateTransformation,
        addLayer: contextAddLayer
    } = useTextureContext();
    
    const compositorRef = useRef(null);

    // State for texture mesh parts (ONLY parts from Fronttex meshes)
    const [textureMeshParts, setTextureMeshParts] = useState([]);
    
    // State to force re-render when layer selections change
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Timeout ref for scheduled refreshes
    const refreshTimeoutRef = useRef(null);

    // Full texture refresh logic extracted for reuse
    const refreshTextureForParts = useCallback(() => {
        console.log('Performing full texture refresh');

        // Get all texture objects from the scene
        const textureObjects = window.findTextureObjects?.() || [];
        if (textureObjects.length === 0) {
          console.warn('No texture objects found');
          return;
        }

        console.log(`Updating textures for ${textureObjects.length} objects with ${layers.length} layers`);

        // First explicitly reset materials to ensure proper visibility
        // THIS IS THE KEY STEP THAT MAKES IT WORK LIKE ADDING A NEW LAYER
        textureObjects.forEach(obj => {
          if (obj.material) {
            // Reset critical material properties
            obj.material.opacity = 1.0;
            obj.material.transparent = true;
            obj.material.alphaTest = 0.1;  // Ensure proper alpha testing
            obj.material.needsUpdate = true;
          }
        });

        // Get the compositor instance
        const compositor = compositorRef.current;
        if (!compositor) {
          console.warn('TextureCompositor instance not found');
          return;
        }

        // Reset the compositor but keep the originals so visibility toggles work
        compositor.reset(true);

        // Make a fresh copy of layers to ensure we're working with the most current state
        const currentLayers = [...layers];
        window.getAllTextureLayersForUpdate = () => currentLayers;

        // For each texture object, force a complete material update
        textureObjects.forEach(object => {
          try {
            // Restore the original material first to ensure we start clean
            const originalMaterial = compositor.originalMaterials.get(object.name);
            if (originalMaterial && object.material) {
              // First dispose of the current material
              object.material.dispose();

              // Then create a fresh clone of the original
              object.material = originalMaterial.clone();
              object.material.needsUpdate = true;
            }

            // Now apply the texture layers to this clean material
            compositor.updateMaterial(object, currentLayers);
          } catch (error) {
            console.error('Error updating material for object:', object.name, error);
          }
        });

        // Force a re-render to update available parts
        setRefreshTrigger(prev => prev + 1);

        // Show a subtle icon to indicate textures were refreshed
        const notification = document.createElement('div');
        notification.innerHTML = '&#x2714;';
        notification.style.position = 'fixed';
        notification.style.left = '12px';
        notification.style.bottom = '12px';
        notification.style.backgroundColor = 'rgba(0,0,0,0.6)';
        notification.style.color = 'white';
        notification.style.width = '22px';
        notification.style.height = '22px';
        notification.style.borderRadius = '50%';
        notification.style.fontSize = '12px';
        notification.style.display = 'flex';
        notification.style.alignItems = 'center';
        notification.style.justifyContent = 'center';
        notification.style.zIndex = '9999';
        document.body.appendChild(notification);

        // Remove notification after 3 seconds
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 3000);
    }, [layers]);

    // Debounced refresh to mimic manual refresh key usage.
    // The delay can be tweaked by changing REFRESH_DELAY_MS above.
    const scheduleRefresh = useCallback(() => {
        if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current);
        }
        refreshTimeoutRef.current = setTimeout(() => {
            refreshTextureForParts();
        }, REFRESH_DELAY_MS);
    }, [refreshTextureForParts]);

    // Clear any pending refresh on unmount
    useEffect(() => {
        return () => clearTimeout(refreshTimeoutRef.current);
    }, []);

    // Define updateMaterials EARLY in the component, before any useEffects that depend on it
    const updateMaterials = useCallback(async () => {
        const objects = window.findTextureObjects?.() || [];
        if (!compositorRef.current) return;

        for (const object of objects) {
            await compositorRef.current.updateMaterial(object, layers);
        }
    }, [layers]);

    // Function to calculate available parts for a given layer
    const calculateAvailablePartsForLayer = useCallback((textureParts, layers, currentLayerId, compositor) => {
        // If compositor is available, get already assigned parts
        const assignedParts = compositor?.getAssignedParts() || [];
        
        // First get parts that are already assigned in other visible layers
        const assignedPartsInOtherLayers = new Set();
        
        layers.forEach(layer => {
            // Skip current layer and hidden layers
            if (layer.id === currentLayerId || !layer.visible) return;
            
            // Add all parts from this layer to the assigned set
            if (layer.selectedParts && layer.selectedParts.length > 0) {
                layer.selectedParts.forEach(part => assignedPartsInOtherLayers.add(part));
            }
        });
        
        // Parts from compositor also count as assigned
        assignedParts.forEach(part => assignedPartsInOtherLayers.add(part));
        
        // Get current layer's selected parts
        const currentLayer = layers.find(l => l.id === currentLayerId);
        const currentSelectedParts = currentLayer?.selectedParts || [];
        
        // Filter out parts that are already assigned to other layers,
        // but keep the parts already selected in this layer
        return textureParts.filter(part => 
            !assignedPartsInOtherLayers.has(part) || currentSelectedParts.includes(part)
        );
    }, []);

    // Initialize compositor and set up event listeners
    useEffect(() => {
        if (!compositorRef.current) {
            compositorRef.current = new TextureCompositor();
            
            // Store in global scope for other components to access
            window._textureCompositor = compositorRef.current;
            
            // Function to handle model changes
            const handleModelChange = () => {
                // Reset compositor when model changes
                if (compositorRef.current) {
                    compositorRef.current.reset();
                }
                
                // Update texture mesh parts
                const parts = extractTextureMeshParts();
                console.log('Model changed, extracted texture parts:', parts);
                setTextureMeshParts(parts);
                
                // Force re-render of component
                setRefreshTrigger(prev => prev + 1);
            };
            
            // Add event listener for model changes
            window.addEventListener('model-loaded', handleModelChange);
            
            // Initial parts extraction
            const initialParts = extractTextureMeshParts();
            console.log('Initial texture parts:', initialParts);
            setTextureMeshParts(initialParts);
            
            // Clean up on unmount
            return () => {
                window.removeEventListener('model-loaded', handleModelChange);
                // Clean up global reference when component unmounts
                if (window._textureCompositor === compositorRef.current) {
                    window._textureCompositor = null;
                }
            };
        }
    }, []);

    // Update when refresh is triggered
    useEffect(() => {
        // This effect runs when refreshTrigger changes
        console.log('Refreshing layer manager with updated parts:', textureMeshParts);
    }, [refreshTrigger, textureMeshParts]);

    // Update materials whenever layers change - Note: updateMaterials is now defined before this
    useEffect(() => {
        // Prevent unnecessary material updates when just selecting a layer
        const shouldUpdateMaterials = layers.some(layer => layer.texture || layer.materialType !== 'base');
        
        if (shouldUpdateMaterials) {
            console.log('Layers changed, updating materials');
            updateMaterials();
            scheduleRefresh();
        }

        // Always force re-render to update available parts
        setRefreshTrigger(prev => prev + 1);
    }, [layers, updateMaterials]);

    // Get available parts for a specific layer - ONLY texture mesh parts
    const getAvailablePartsForLayer = useCallback((layerId) => {
        return calculateAvailablePartsForLayer(textureMeshParts, layers, layerId, compositorRef.current);
    }, [textureMeshParts, layers, calculateAvailablePartsForLayer]);


    // Handler for detail scale changes
    const handleDetailScaleChange = useCallback((layerId, newValue) => {
        updateTransformation(layerId, {
            transformations: { detailScale: Number(newValue) }
        });
    }, [updateTransformation]);

    // Handler for opacity changes
    const handleOpacityChange = useCallback((layerId, newValue) => {
        const layer = layers.find(l => l.id === layerId);
        if (layer) {
            const updatedLayer = { ...layer, opacity: Number(newValue) };
            setLayers(prev => prev.map(l => l.id === layerId ? updatedLayer : l));
        }
    }, [layers, setLayers]);

    // Handler for file changes (texture uploads)
    const handleFileChange = useCallback(async (layerId, event) => {
        try {
            const file = event.target.files?.[0];
            if (!file) return;
            
            const texture = await TextureLoadingUtils.loadTexture(file);

            // Flag to track if it's the first texture upload for this layer
            let isFirstUpload = false;
            
            setLayers(prev => {
                const updatedLayers = prev.map(layer => {
                    if (layer.id === layerId) {
                        // Check if this is the first texture upload for this layer
                        isFirstUpload = !layer.texture;
                        
                        const existingTransformations = layer.transformations || DEFAULT_TRANSFORMATIONS;
                        const existingMaterialProps = layer.materialProperties || {};
                        return {
                            ...layer,
                            texture,
                            name: file.name,
                            transformations: existingTransformations,
                            materialProperties: existingMaterialProps
                        };
                    }
                    return layer;
                });
                return updatedLayers;
            });

            // Handle first uploads by ensuring texture objects are visible
            if (isFirstUpload) {
                const texObjects = window.findTextureObjects?.() || [];
                texObjects.forEach(obj => {
                    if (obj.material) {
                        obj.material.opacity = 1.0;
                        obj.material.transparent = true;
                        obj.material.visible = true;
                        obj.material.needsUpdate = true;
                    }
                });
            }

            // Trigger a re-render so useEffect runs with the latest layers
            setRefreshTrigger(prev => prev + 1);

        } catch (error) {
            console.error('Error loading texture:', error);
        }
    }, [setLayers, updateMaterials]);

    // Handler for toggling layer visibility
    const toggleLayerVisibility = useCallback((id) => {
        setLayers(prev => prev.map(layer =>
            layer.id === id ? { ...layer, visible: !layer.visible } : layer
        ));
        
        // Simply trigger a re-render; material update will occur via useEffect
        setRefreshTrigger(prev => prev + 1);
    }, [setLayers, updateMaterials]);

    // Handler for moving layers up/down
    const moveLayer = useCallback((id, direction) => {
        const index = layers.findIndex(layer => layer.id === id);
        if (index === -1) return;
        
        const newLayers = [...layers];
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        
        if (newIndex >= 0 && newIndex < layers.length) {
            [newLayers[index], newLayers[newIndex]] = [newLayers[newIndex], newLayers[index]];
            setLayers(newLayers);
            
            // Force a re-render so the effect updates materials
            setRefreshTrigger(prev => prev + 1);
        }
    }, [layers, setLayers, updateMaterials]);

    // Handler for deleting layers
    const deleteLayer = useCallback((id) => {
        setLayers(prev => {
            return prev.filter(layer => layer.id !== id);
        });
        
        // Trigger a re-render so the effect handles cleanup
        setRefreshTrigger(prev => prev + 1);
    }, [setLayers, updateMaterials]);

    // Handler for changing material type
    const handleMaterialTypeChange = useCallback((id, type) => {
        setLayers(prev => prev.map(layer => {
            if (layer.id === id) {
                const materialPreset = materialTypes[type].properties;
                return {
                    ...layer,
                    materialType: type,
                    transformations: {
                        ...layer.transformations,
                        detailScale: materialPreset.defaultDetailScale || layer.transformations.detailScale
                    },
                    materialProperties: {
                        ...layer.materialProperties,
                        ...materialPreset
                    }
                };
            }
            return layer;
        }));
        
        // Trigger a re-render; material update will follow via useEffect
        setRefreshTrigger(prev => prev + 1);
    }, [setLayers, updateMaterials]);
    
    // Custom function to handle adding a layer
    const handleAddLayer = useCallback(() => {
        const newLayer = contextAddLayer();
        
        // Make texture objects visible after adding a layer
        const texObjects = window.findTextureObjects?.() || [];
        texObjects.forEach(obj => {
            if (obj.material) {
                obj.material.opacity = 1.0;
                obj.material.needsUpdate = true;
            }
        });
        
        // Trigger re-render so hooks update
        setRefreshTrigger(prev => prev + 1);

        return newLayer;
    }, [contextAddLayer]);

    return (
        <div className="p-4 bg-gray-900 rounded-lg">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <Layers className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-semibold text-white">Texture Layers</h2>
            </div>

            {/* Layer List */}
            <div className="space-y-2 my-4">
                {layers.map((layer, index) => (
                    <LayerItem
                        key={`${layer.id}-${refreshTrigger}`} // Force re-render when parts change
                        layer={layer}
                        index={index}
                        totalLayers={layers.length}
                        onToggleVisibility={toggleLayerVisibility}
                        onFileChange={handleFileChange}
                        onMoveLayer={moveLayer}
                        onDelete={deleteLayer}
                        onDetailScaleChange={handleDetailScaleChange}
                        onMaterialTypeChange={handleMaterialTypeChange}
                        onOpacityChange={handleOpacityChange}
                        availableParts={getAvailablePartsForLayer(layer.id)} // Only texture mesh parts
                    />
                ))}
            </div>

            <div className="flex justify-between items-center mb-4">
                <button
                    onClick={refreshTextureForParts}
                    className="px-2 py-1 bg-blue-600 text-white rounded-lg text-xs 
                            hover:bg-blue-700 transition-colors flex items-center gap-1"
                >
                    <RefreshCw className="w-3 h-3" />
                    Refresh Textures
                </button>
            </div>

            {/* Debug Text to show available parts */}
            {textureMeshParts.length > 0 && (
                <div className="text-xs text-gray-400 mb-2">
                    Available texture parts: {textureMeshParts.join(', ')}
                </div>
            )}

            {/* Add Layer Button */}
            <button
                onClick={handleAddLayer}
                className="w-full p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                         transition-colors flex items-center justify-center gap-2 mb-4"
            >
                <Plus className="w-4 h-4" />
                Add Layer
            </button>
        </div>
    );
}