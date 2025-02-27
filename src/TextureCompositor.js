import * as THREE from 'three';
import { materialTypes, NORMAL_MAP_PATHS } from './MaterialTypeSelect';
import { loadNormalMap } from './textureUtils';

export class TextureCompositor {
    constructor() {
        this.loadedNormalMaps = new Map();
        this.width = 1024;
        this.height = 1024;
        this.scene = null; // Will be set on first use
    }

    async updateMaterial(object, layers) {
        if (!object.isMesh) return;
    
        try {
            const isTextureMesh = object.name.includes("Fronttex") || object.name.includes("Backtex");
    
            if (!isTextureMesh) return;
    
            // Store scene reference if not already stored
            if (!this.scene && object.parent) {
                let currentObject = object;
                while (currentObject.parent && !this.scene) {
                    currentObject = currentObject.parent;
                    if (currentObject.type === 'Scene') {
                        this.scene = currentObject;
                    }
                }
            }
    
            // Create main canvas
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = this.width;
            canvas.height = this.height;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
    
            // Store original maps if not already stored
            if (!object.userData.originalNormalMap && object.material.normalMap) {
                object.userData.originalNormalMap = object.material.normalMap.clone();
                object.userData.originalNormalScale = object.material.normalScale.clone();
            }
    
            // Get the environment map and intensity from the scene if available
            const envMap = this.scene ? this.scene.environment : null;
            let envMapIntensity = 1.0;
            
            // Find the outside material to match properties
            const outsideMaterial = this.findOutsideMaterial();
    
            // Process layers in reverse order (bottom to top)
            for (const layer of [...layers].reverse()) {
                if (!layer.visible || (!layer.texture && layer.materialType !== 'base')) continue;
    
                const layerCanvas = document.createElement('canvas');
                const layerCtx = layerCanvas.getContext('2d');
                layerCanvas.width = canvas.width;
                layerCanvas.height = canvas.height;
    
                // Only draw textures for non-base material types or if base has a texture
                if (layer.texture && layer.texture.image) {
                    // Use layer's own transformations
                    const transformations = {
                        offset: { x: 0, y: 0 },
                        scale: 1,
                        rotation: 0,
                        repeat: false,
                        flipX: 1,
                        flipY: 1,
                        ...layer.transformations
                    };

                if (transformations.repeat) {
                    const patternSize = canvas.width / (4 / transformations.scale);
                    const tempCanvas = document.createElement('canvas');
                    const tempCtx = tempCanvas.getContext('2d');
                    tempCanvas.width = patternSize;
                    tempCanvas.height = patternSize;
                    
                    tempCtx.drawImage(layer.texture.image, 0, 0, patternSize, patternSize);
                    
                    const pattern = layerCtx.createPattern(tempCanvas, 'repeat');
                    if (pattern) {
                        const matrix = new DOMMatrix()
                            .translateSelf(
                                transformations.offset.x * canvas.width,
                                transformations.offset.y * canvas.height
                            )
                            .rotateSelf(transformations.rotation)
                            .scaleSelf(transformations.flipX, transformations.flipY);
                        
                        pattern.setTransform(matrix);
                        layerCtx.fillStyle = pattern;
                        layerCtx.fillRect(0, 0, canvas.width, canvas.height);
                    }
                } else {
                    layerCtx.save();
                    
                    layerCtx.translate(canvas.width / 2, canvas.height / 2);
                    
                    const imgWidth = canvas.width * 0.8;
                    const imgHeight = canvas.height * 0.8;
                    
                    const offsetX = transformations.offset.x * canvas.width;
                    const offsetY = transformations.offset.y * canvas.height;
                    layerCtx.translate(offsetX, offsetY);
                    
                    layerCtx.rotate(transformations.rotation * Math.PI / 180);
                    layerCtx.scale(
                        transformations.flipX * transformations.scale,
                        transformations.flipY * transformations.scale
                    );
                    
                    layerCtx.drawImage(
                        layer.texture.image,
                        -imgWidth / 2,
                        -imgHeight / 2,
                        imgWidth,
                        imgHeight
                    );
                    
                    layerCtx.restore();
                }

                // Apply layer opacity
                ctx.globalAlpha = layer.opacity || 1;
                ctx.drawImage(layerCanvas, 0, 0);
            }
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.flipY = false;
        texture.needsUpdate = true;

        // Create base material with matching properties from the outside material
        const newMaterial = new THREE.MeshPhysicalMaterial({
            map: texture,
            transparent: true,
            side: THREE.FrontSide,
            depthWrite: true,
            depthTest: true,
            alphaTest: 0.1
        });

        // Copy environment map settings from the scene
        if (envMap) {
            newMaterial.envMap = envMap;
            newMaterial.envMapIntensity = envMapIntensity;
        }

        // Copy lighting properties from outside material if available
        if (outsideMaterial) {
            newMaterial.envMapIntensity = outsideMaterial.envMapIntensity || 1.0;
            newMaterial.metalness = outsideMaterial.metalness;
            newMaterial.roughness = outsideMaterial.roughness;
            newMaterial.reflectivity = outsideMaterial.reflectivity || 1.0;
        }

        // Apply normal maps based on visible layers
        const visibleLayers = layers.filter(l => l.visible);
        if (visibleLayers.length > 0) {
            const topLayer = visibleLayers[visibleLayers.length - 1];
            const materialProps = materialTypes[topLayer.materialType || 'base'].properties;

            // Apply material properties from the top visible layer - only if they exist
            if (topLayer.materialProperties) {
                newMaterial.roughness = topLayer.materialProperties.roughness ?? materialProps.roughness;
                newMaterial.metalness = topLayer.materialProperties.metalness ?? materialProps.metalness;
                newMaterial.clearcoat = topLayer.materialProperties.clearcoat ?? (materialProps.clearcoat || 0);
                newMaterial.clearcoatRoughness = topLayer.materialProperties.clearcoatRoughness ?? (materialProps.clearcoatRoughness || 0);
                newMaterial.sheen = topLayer.materialProperties.sheen ?? (materialProps.sheen || 0);
                newMaterial.sheenRoughness = topLayer.materialProperties.sheenRoughness ?? (materialProps.sheenRoughness || 0);
            }

            // Special handling for base material type
            if (topLayer.materialType === 'base') {
                // First try to use the outsideNormalMap from the layer properties
                if (topLayer.materialProperties?.outsideNormalMap) {
                    newMaterial.normalMap = topLayer.materialProperties.outsideNormalMap;
                    newMaterial.normalScale.set(0.5, 0.5);
                } 
                // Then try original normal map from the object
                else if (object.userData.originalNormalMap) {
                    newMaterial.normalMap = object.userData.originalNormalMap;
                    newMaterial.normalScale.copy(object.userData.originalNormalScale || new THREE.Vector2(0.5, 0.5));
                }
                // Finally try the outside material's normal map
                else if (outsideMaterial && outsideMaterial.normalMap) {
                    newMaterial.normalMap = outsideMaterial.normalMap;
                    newMaterial.normalScale.set(0.5, 0.5);
                }
            } else {
                // For non-base material types, use the existing normal map logic
                let normalMap = topLayer.materialProperties?.outsideNormalMap;

                if (!normalMap) {
                    const normalMapPath = materialProps.normalMap;
                    if (normalMapPath) {
                        normalMap = this.loadedNormalMaps.get(normalMapPath);
                        if (!normalMap) {
                            try {
                                normalMap = await loadNormalMap(normalMapPath);
                                this.loadedNormalMaps.set(normalMapPath, normalMap);
                            } catch (error) {
                                console.error('Error loading normal map:', error);
                            }
                        }
                    }
                }

                if (normalMap) {
                    const detailScale = topLayer.transformations?.detailScale ?? 1;
                    normalMap.wrapS = THREE.RepeatWrapping;
                    normalMap.wrapT = THREE.RepeatWrapping;
                    normalMap.repeat.set(1 / detailScale, 1 / detailScale);
                    
                    newMaterial.normalMap = normalMap;
                    newMaterial.normalScale.set(
                        materialProps.normalScale || 0.5,
                        materialProps.normalScale || 0.5
                    );
                }
            }
        }

        // Clean up old material
        if (object.material) {
            object.material.dispose();
        }

        // Apply new material
        object.material = newMaterial;
        object.material.needsUpdate = true;
        object.renderOrder = 1;

    } catch (error) {
        console.error('Error updating material:', error);
    }
}

// If not already there, add this method to TextureCompositor class
findOutsideMaterial() {
    let outsideMaterial = null;
    if (this.scene) {
        this.scene.traverse((object) => {
            if (object.isMesh && 
                object.material && 
                object.name.toLowerCase().includes('outside')) {
                outsideMaterial = object.material;
            }
        });
    }
    return outsideMaterial;
}
}