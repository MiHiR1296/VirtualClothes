import React, { useEffect } from 'react';
import { Plus, Layers } from 'lucide-react';
import * as THREE from 'three';
import LayerItem from './LayerItem';
import { useTextureContext } from './TextureContext';

export default function TextureLayerManager() {
  const { layers, setLayers, activeLayer, setActiveLayer } = useTextureContext();

  // Initialize single layer if none exist
  useEffect(() => {
    if (layers.length === 0) {
      addLayer();
    }
  }, []);

  // Update materials whenever layers change
  useEffect(() => {
    updateMaterials();
  }, [layers]);

  const updateMaterials = () => {
    const objects = window.findTextureObjects?.() || [];
    
    objects.forEach(object => {
      if (!object.isMesh) return;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size to power of 2 for better texture performance
      canvas.width = 1024;
      canvas.height = 1024;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Apply layers from bottom to top
      layers.slice().reverse().forEach(layer => {
        if (!layer.visible || !layer.texture || !layer.texture.image) return;

        const layerCanvas = document.createElement('canvas');
        const layerCtx = layerCanvas.getContext('2d');
        if (!layerCtx) return;

        layerCanvas.width = canvas.width;
        layerCanvas.height = canvas.height;

        if (layer.transformations.repeat) {
          // Create repeating pattern
          const patternSize = canvas.width / (4 / layer.transformations.scale);
          const tempCanvas = document.createElement('canvas');
          const tempCtx = tempCanvas.getContext('2d');
          tempCanvas.width = patternSize;
          tempCanvas.height = patternSize;
          
          // Draw scaled image to temp canvas
          tempCtx.drawImage(layer.texture.image, 0, 0, patternSize, patternSize);
          
          // Create pattern
          const pattern = layerCtx.createPattern(tempCanvas, 'repeat');
          if (pattern) {
            // Apply transformations to pattern
            const matrix = new DOMMatrix()
              .translateSelf(
                layer.transformations.offset.x * canvas.width,
                layer.transformations.offset.y * canvas.height
              )
              .rotateSelf(layer.transformations.rotation)
              .scaleSelf(
                layer.transformations.flipX || 1,
                layer.transformations.flipY || 1
              );
            
            pattern.setTransform(matrix);
            layerCtx.fillStyle = pattern;
            layerCtx.fillRect(0, 0, canvas.width, canvas.height);
          }
        } else {
          // Draw single image with transformations
          layerCtx.save();
          layerCtx.translate(canvas.width / 2, canvas.height / 2);
          layerCtx.rotate(layer.transformations.rotation * Math.PI / 180);
          layerCtx.scale(
            (layer.transformations.flipX || 1) * layer.transformations.scale,
            (layer.transformations.flipY || 1) * layer.transformations.scale
          );

          const imgWidth = canvas.width * 0.8;
          const imgHeight = canvas.height * 0.8;
          layerCtx.drawImage(
            layer.texture.image,
            -imgWidth / 2 + (layer.transformations.offset.x * canvas.width),
            -imgHeight / 2 + (layer.transformations.offset.y * canvas.height),
            imgWidth,
            imgHeight
          );
          layerCtx.restore();
        }

        // Composite the layer onto main canvas
        ctx.globalAlpha = layer.opacity;
        ctx.drawImage(layerCanvas, 0, 0);
      });

      // Create texture and apply to material
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      
      // Set repeat based on scale if repeating is enabled
      if (activeLayer?.transformations?.repeat) {
        const repeatFactor = 1 / activeLayer.transformations.scale;
        texture.repeat.set(repeatFactor, repeatFactor);
      } else {
        texture.repeat.set(1, 1);
      }
      
      texture.flipY = false;
      texture.needsUpdate = true;

      // Create new material with the updated texture
      const newMaterial = new THREE.MeshPhysicalMaterial({
        map: texture,
        transparent: true,
        side: THREE.FrontSide,
        depthWrite: true,
        depthTest: true,
        alphaTest: 0.1,
        roughness: 0,
        clearcoat: 1,
        clearcoatRoughness: 0,
        color: 0xffffff
      });

      object.material = newMaterial;
      object.material.needsUpdate = true;
      object.renderOrder = 1;
    });
  };

  const handleSetActive = (id) => {
    const layer = layers.find(l => l.id === id);
    setActiveLayer(layer);
    
    setLayers(prev => prev.map(layer => ({
      ...layer,
      isActive: layer.id === id
    })));
  };

  const addLayer = () => {
    const newLayer = {
      id: Date.now(),
      opacity: 1,
      texture: null,
      name: `Layer ${layers.length + 1}`,
      isActive: layers.length === 0,
      visible: true,
      modelDirectory: window.currentModelDirectory,
      transformations: {
        offset: { x: 0, y: 0 },
        scale: 1,
        rotation: 0,
        repeat: false,
        flipX: 1,
        flipY: 1
      }
    };
    
    setLayers(prev => [...prev, newLayer]);
  };

  const handleFileChange = async (layerId, event) => {
    const file = event.target.files?.[0];
    if (!file?.type.match('image.*')) {
      console.error('File is not an image.');
      return;
    }

    const textureLoader = new THREE.TextureLoader();
    const url = URL.createObjectURL(file);

    try {
      const texture = await new Promise((resolve, reject) => {
        textureLoader.load(
          url,
          (loadedTexture) => {
            loadedTexture.colorSpace = THREE.SRGBColorSpace;
            loadedTexture.flipY = false;
            loadedTexture.premultiplyAlpha = true;
            resolve(loadedTexture);
          },
          undefined,
          reject
        );
      });

      const updatedLayer = {
        id: layerId,
        texture,
        name: file.name,
        isActive: true,
        visible: true,
        opacity: 1,
        modelDirectory: window.currentModelDirectory,
        transformations: {
          offset: { x: 0, y: 0 },
          scale: 1,
          rotation: 0,
          repeat: false,
          flipX: 1,
          flipY: 1
        }
      };

      setLayers(prev => prev.map(layer => 
        layer.id === layerId ? updatedLayer : { ...layer, isActive: false }
      ));
      setActiveLayer(updatedLayer);

    } catch (error) {
      console.error('Error loading texture:', error);
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const toggleLayerVisibility = (id) => {
    setLayers(prev => prev.map(layer =>
      layer.id === id ? { ...layer, visible: !layer.visible } : layer
    ));
  };

  const updateLayerOpacity = (id, opacity) => {
    setLayers(prev => prev.map(layer =>
      layer.id === id ? { ...layer, opacity } : layer
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
        newLayers[0].isActive = true;
      }
      return newLayers;
    });
  };

  return (
    <div className="p-4 bg-gray-900 rounded-lg">
      <div className="flex items-center gap-2 mb-4">
        <Layers className="w-5 h-5 text-blue-400" />
        <h2 className="text-lg font-semibold text-white">Texture Layers</h2>
      </div>

      <div className="space-y-2 mb-4">
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
            onOpacityChange={updateLayerOpacity}
          />
        ))}
      </div>

      <button
        onClick={addLayer}
        className="w-full p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Add Layer
      </button>
    </div>
  );
}