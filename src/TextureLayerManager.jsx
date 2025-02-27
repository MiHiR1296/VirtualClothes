import React, { useEffect, useRef, useState } from 'react';
import { Plus, Layers, Settings, ChevronRight } from 'lucide-react';
import LayerItem from './LayerItem';
import { useTextureContext } from './TextureContext';
import { TextureLoadingUtils } from './textureLoadingUtils';
import { materialTypes } from './MaterialTypeSelect';
import { TextureCompositor } from './TextureCompositor';

const DEFAULT_TRANSFORMATIONS = {
    offset: { x: 0, y: 0 },
    scale: 1,
    rotation: 0,
    repeat: false,
    flipX: 1,
    flipY: 1,
    detailScale: 1.0
};

const MaterialProperties = ({ onChange, initialProperties }) => {
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [properties, setProperties] = useState({
        roughness: initialProperties?.roughness ?? 0.8,
        metalness: initialProperties?.metalness ?? 0.1,
        clearcoat: initialProperties?.clearcoat ?? 0.0,
        clearcoatRoughness: initialProperties?.clearcoatRoughness ?? 0.0,
        sheen: initialProperties?.sheen ?? 0.0,
        sheenRoughness: initialProperties?.sheenRoughness ?? 0.8
    });

    // Update properties when initialProperties changes
    useEffect(() => {
        if (initialProperties) {
            setProperties({
                roughness: initialProperties.roughness ?? 0.8,
                metalness: initialProperties.metalness ?? 0.1,
                clearcoat: initialProperties.clearcoat ?? 0.0,
                clearcoatRoughness: initialProperties.clearcoatRoughness ?? 0.0,
                sheen: initialProperties.sheen ?? 0.0,
                sheenRoughness: initialProperties.sheenRoughness ?? 0.8
            });
        }
    }, [initialProperties]);

    const handleChange = (property, value) => {
        const newValue = parseFloat(value);
        setProperties(prev => ({
            ...prev,
            [property]: newValue
        }));
        onChange(property, newValue);
    };

    return (
        <div className="mt-4 p-4 bg-gray-800 rounded-lg">
            <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 w-full px-2 py-1 text-sm text-gray-300 
                         hover:bg-gray-700 rounded-lg transition-colors mb-2"
            >
                <ChevronRight 
                    className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
                />
                <Settings className="w-4 h-4" />
                Material Properties
            </button>

            {showAdvanced && (
                <div className="space-y-4 mt-2">
                    {/* Roughness Slider */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-400">
                            <span>Roughness</span>
                            <span>{properties.roughness.toFixed(2)}</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={properties.roughness}
                            onChange={(e) => handleChange('roughness', e.target.value)}
                            className="w-full accent-blue-500"
                        />
                    </div>

                    {/* Metalness Slider */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-400">
                            <span>Metalness</span>
                            <span>{properties.metalness.toFixed(2)}</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={properties.metalness}
                            onChange={(e) => handleChange('metalness', e.target.value)}
                            className="w-full accent-blue-500"
                        />
                    </div>

                    {/* Clearcoat Slider */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-400">
                            <span>Clearcoat</span>
                            <span>{properties.clearcoat.toFixed(2)}</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={properties.clearcoat}
                            onChange={(e) => handleChange('clearcoat', e.target.value)}
                            className="w-full accent-blue-500"
                        />
                    </div>

                    {/* Sheen Slider */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-400">
                            <span>Sheen</span>
                            <span>{properties.sheen.toFixed(2)}</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={properties.sheen}
                            onChange={(e) => handleChange('sheen', e.target.value)}
                            className="w-full accent-blue-500"
                        />
                    </div>

                    {/* Sheen Roughness Slider */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-400">
                            <span>Sheen Roughness</span>
                            <span>{properties.sheenRoughness.toFixed(2)}</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={properties.sheenRoughness}
                            onChange={(e) => handleChange('sheenRoughness', e.target.value)}
                            className="w-full accent-blue-500"
                        />
                    </div>
                </div>
            )}
        </div>
    );
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

    useEffect(() => {
        if (!compositorRef.current) {
            compositorRef.current = new TextureCompositor();
        }
    }, []);

    useEffect(() => {
        updateMaterials();
    }, [layers]);

    const updateMaterials = async () => {
        const objects = window.findTextureObjects?.() || [];
        if (!compositorRef.current) return;

        for (const object of objects) {
            await compositorRef.current.updateMaterial(object, layers);
        }
    };

    const handleMaterialPropertyChange = (property, value) => {
        if (!activeLayer) return;
        
        // Use the updated method for material property changes
        updateTransformation(activeLayer.id, {
            materialProperties: { [property]: value }
        });

        // Apply to all texture objects
        const objects = window.findTextureObjects?.() || [];
        objects.forEach(object => {
            if (object.name.includes('Fronttex') && object.material) {
                object.material[property] = value;
                object.material.needsUpdate = true;
            }
        });
    };

    const handleDetailScaleChange = (layerId, newValue) => {
        updateTransformation(layerId, {
            transformations: { detailScale: Number(newValue) }
        });
    };

    const handleOpacityChange = (layerId, newValue) => {
        updateTransformation(layerId, {}, 'opacity', Number(newValue));
    };

    const handleFileChange = async (layerId, event) => {
        try {
            const file = event.target.files?.[0];
            const texture = await TextureLoadingUtils.loadTexture(file);

            setLayers(prev => prev.map(layer => {
                if (layer.id === layerId) {
                    const existingTransformations = layer.transformations || DEFAULT_TRANSFORMATIONS;
                    const existingMaterialProps = layer.materialProperties || {};
                    return {
                        ...layer,
                        texture,
                        name: file.name,
                        isActive: true,
                        transformations: existingTransformations,
                        materialProperties: existingMaterialProps
                    };
                }
                return { 
                    ...layer, 
                    isActive: false 
                };
            }));

            const updatedLayer = layers.find(l => l.id === layerId);
            if (updatedLayer) {
                setActiveLayer({
                    ...updatedLayer,
                    texture,
                    name: file.name
                });
            }

        } catch (error) {
            console.error('Error loading texture:', error);
        }
    };

    const handleSetActive = (id) => {
        const targetLayer = layers.find(l => l.id === id);
        if (!targetLayer) return;

        setLayers(prev => prev.map(layer => ({
            ...layer,
            isActive: layer.id === id
        })));
        
        setActiveLayer(targetLayer);
    };

    const toggleLayerVisibility = (id) => {
        setLayers(prev => prev.map(layer =>
            layer.id === id ? { ...layer, visible: !layer.visible } : layer
        ));
    };

    const moveLayer = (id, direction) => {
        const index = layers.findIndex(layer => layer.id === id);
        if (index === -1) return;
        
        const newLayers = [...layers];
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        
        if (newIndex >= 0 && newIndex < layers.length) {
            [newLayers[index], newLayers[newIndex]] = [newLayers[newIndex], newLayers[index]];
            setLayers(newLayers);
        }
    };

    const deleteLayer = (id) => {
        setLayers(prev => {
            const newLayers = prev.filter(layer => layer.id !== id);
            if (newLayers.length > 0 && prev.find(l => l.id === id)?.isActive) {
                const firstLayer = newLayers[0];
                firstLayer.isActive = true;
                setActiveLayer(firstLayer);
            }
            return newLayers;
        });
    };

    const handleMaterialTypeChange = (id, type) => {
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
    };

    return (
        <div className="p-4 bg-gray-900 rounded-lg">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <Layers className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-semibold text-white">Texture Layers</h2>
            </div>

            {/* Global Material Properties */}
            <MaterialProperties 
                onChange={handleMaterialPropertyChange} 
                initialProperties={activeLayer?.materialProperties}
            />

            {/* Layer List */}
            <div className="space-y-2 my-4">
                {layers.map((layer, index) => (
                    <LayerItem
                        key={layer.id}
                        layer={layer}
                        index={index}
                        totalLayers={layers.length}
                        onToggleVisibility={toggleLayerVisibility}
                        onFileChange={handleFileChange}
                        onSetActive={handleSetActive}
                        onMoveLayer={moveLayer}
                        onDelete={deleteLayer}
                        onDetailScaleChange={handleDetailScaleChange}
                        onMaterialTypeChange={handleMaterialTypeChange}
                        onOpacityChange={handleOpacityChange}
                    />
                ))}
            </div>

            {/* Add Layer Button */}
            <button
                onClick={contextAddLayer}
                className="w-full p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                         transition-colors flex items-center justify-center gap-2"
            >
                <Plus className="w-4 h-4" />
                Add Layer
            </button>
        </div>
    );
}