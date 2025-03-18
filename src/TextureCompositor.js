import * as THREE from 'three';
import { materialTypes, NORMAL_MAP_PATHS } from './MaterialTypeSelect';
import { loadNormalMap } from './textureUtils';

export class TextureCompositor {
    constructor() {
        this.loadedNormalMaps = new Map();
        this.width = 1024;
        this.height = 1024;
        this.scene = null; // Will be set on first use
        this.originalMaterials = new Map(); // Store original materials by object name
        this.appliedLayersByObject = new Map(); // Track which layers are applied to which objects
    }

    async updateMaterial(object, layers) {
        if (!object.isMesh) return;
    
        try {
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
    
            // Check if this is a texture mesh
            const isTextureMesh = object.name.startsWith("Fronttex_") || 
                                 object.name.includes("Fronttex") || 
                                 object.name.includes("Backtex");
                                 
            if (!isTextureMesh) return;
    
            // Store original material if not already stored
            if (!this.originalMaterials.has(object.name)) {
                // Clone the original material to preserve it
                if (object.material) {
                    const originalMaterial = object.material.clone();
                    this.originalMaterials.set(object.name, originalMaterial);
                    console.log(`Stored original material for ${object.name}`);
                }
            }
    
            // Extract part name from the object name with new naming convention
            let partName = '';
    
            // New naming convention - Fronttex_PartName
            if (object.name.startsWith("Fronttex_")) {
                // Extract the part after "Fronttex_"
                partName = object.name.substring(9); // Skip "Fronttex_"
                
                // Clean up the part name (remove underscores, etc.)
                partName = partName.replace(/_/g, ' ').trim();
            }
            // Traditional naming approach (fallback)
            else if (object.name.includes("_")) {
                const parts = object.name.split('_');
                if (parts.length > 1 && (parts[1].includes('Fronttex') || parts[1].includes('Backtex'))) {
                    partName = parts[0]; // Get the part name before underscore
                }
            }
    
            // Use other strategies if no part name found
            if (!partName) {
                // Try to match with known parts
                const knownParts = ['Outside', 'Inside', 'Collar', 'Button', 'Thread', 'Metal', 'Zipper', 'Sleeve'];
                for (const part of knownParts) {
                    if (object.name.toLowerCase().includes(part.toLowerCase())) {
                        partName = part;
                        break;
                    }
                }
            }
    
            // If still no part name, use a fallback
            if (!partName) {
                partName = object.name.replace('Fronttex', '').replace('Backtex', '').trim();
                if (!partName) {
                    partName = 'DefaultPart';
                }
            }
    
            // Debug part name extraction
            console.log(`Using part name "${partName}" for object "${object.name}"`);
    
            // Find layers that apply to this specific mesh based on selectedParts
            const applicableLayers = layers
                .filter(layer => {
                    // First check if layer is visible
                    if (!layer.visible) return false;
                    
                    // If layer has no texture, skip unless it's a base material type
                    if (!layer.texture && layer.materialType !== 'base') return false;
                    
                    // If layer has no selected parts or empty array, apply to all parts
                    if (!layer.selectedParts || layer.selectedParts.length === 0) {
                        return true;
                    }
                    
                    // Check if any selected part matches our part name
                    return layer.selectedParts.some(selectedPart => {
                        // Direct name comparison (case insensitive)
                        if (selectedPart.toLowerCase() === partName.toLowerCase()) {
                            return true;
                        }
                        
                        // Check if part name contains the selected part or vice versa
                        if (partName.toLowerCase().includes(selectedPart.toLowerCase()) ||
                            selectedPart.toLowerCase().includes(partName.toLowerCase())) {
                            return true;
                        }
                        
                        // Check for match with the original object name
                        if (object.name.toLowerCase().includes(selectedPart.toLowerCase()) ||
                            selectedPart.toLowerCase().includes(object.name.toLowerCase())) {
                            return true;
                        }
                        
                        return false;
                    });
                })
                .sort((a, b) => a.id - b.id); // Sort by ID to ensure consistent ordering
            
            // Track which layers are applied to this object
            this.appliedLayersByObject.set(object.name, applicableLayers.map(l => l.id));
    
            // If no applicable layers, restore the original material
            if (applicableLayers.length === 0) {
                const originalMaterial = this.originalMaterials.get(object.name);
                if (originalMaterial) {
                    // Clean up current material if it exists
                    if (object.material) {
                        object.material.dispose();
                    }
                    
                    // Clone the original to avoid modifying it
                    object.material = originalMaterial.clone();
                    object.material.needsUpdate = true;
                    console.log(`Restored original material for ${object.name}`);
                } else {
                    // Make it semi-transparent if no original material
                    if (object.material) {
                        object.material.opacity = 0.3;
                        object.material.transparent = true;
                        object.material.needsUpdate = true;
                    }
                }
                return;
            }
    
            // Create main canvas for texture composition
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = this.width;
            canvas.height = this.height;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
    
            // Get the environment map and intensity from the scene if available
            const envMap = this.scene ? this.scene.environment : null;
            let envMapIntensity = 1.0;
            
            // Find the outside material to match properties
            const outsideMaterial = this.findOutsideMaterial();
    
            // Process layers in reverse order (bottom to top)
            for (let i = applicableLayers.length - 1; i >= 0; i--) {
                const layer = applicableLayers[i];
                
                if (!layer.visible) continue;
    
                const layerCanvas = document.createElement('canvas');
                const layerCtx = layerCanvas.getContext('2d');
                layerCanvas.width = canvas.width;
                layerCanvas.height = canvas.height;
    
                // Only draw textures if the layer has a texture
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
    
            // Start with the original material properties if available
            const originalMaterial = this.originalMaterials.get(object.name);
            const baseProperties = originalMaterial 
                ? {
                    color: originalMaterial.color,
                    roughness: originalMaterial.roughness,
                    metalness: originalMaterial.metalness,
                    envMapIntensity: originalMaterial.envMapIntensity,
                    normalMap: originalMaterial.normalMap,
                    normalScale: originalMaterial.normalScale?.clone() || new THREE.Vector2(1, 1)
                }
                : {
                    color: new THREE.Color(0xffffff),
                    roughness: 0.8,
                    metalness: 0.1,
                    envMapIntensity: 1.0,
                    normalMap: null,
                    normalScale: new THREE.Vector2(1, 1)
                };
    
            // Create new material with the composed texture
            const newMaterial = new THREE.MeshPhysicalMaterial({
                map: texture,
                ...baseProperties,
                transparent: true,
                side: THREE.FrontSide,
                depthWrite: true,
                depthTest: true,
                alphaTest: 0.1
            });
    
            // Copy environment map settings from the scene
            if (envMap) {
                newMaterial.envMap = envMap;
                newMaterial.envMapIntensity = baseProperties.envMapIntensity;
            }
    
            // Apply material properties from the top visible layer
            if (applicableLayers.length > 0) {
                const topLayer = applicableLayers[0]; // First layer (topmost in rendering order)
                const materialProps = materialTypes[topLayer.materialType || 'base'].properties;
    
                if (topLayer.materialProperties) {
                    newMaterial.roughness = topLayer.materialProperties.roughness ?? materialProps.roughness;
                    newMaterial.metalness = topLayer.materialProperties.metalness ?? materialProps.metalness;
                    newMaterial.clearcoat = topLayer.materialProperties.clearcoat ?? (materialProps.clearcoat || 0);
                    newMaterial.clearcoatRoughness = topLayer.materialProperties.clearcoatRoughness ?? (materialProps.clearcoatRoughness || 0);
                    newMaterial.sheen = topLayer.materialProperties.sheen ?? (materialProps.sheen || 0);
                    newMaterial.sheenRoughness = topLayer.materialProperties.sheenRoughness ?? (materialProps.sheenRoughness || 0);
                }
            }
    
            // Clean up old material if different
            if (object.material && object.material !== newMaterial) {
                object.material.dispose();
            }
    
            // Apply new material
            object.material = newMaterial;
            object.material.needsUpdate = true;
            object.renderOrder = 1;
    
            // Log success
            console.log(`Updated material for ${object.name} with ${applicableLayers.length} layer(s)`);
    
        } catch (error) {
            console.error('Error updating material:', error);
        }
    }

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
    
    // Get parts that are already assigned to visible layers
    getAssignedParts() {
        const assignedParts = new Set();
        
        // Loop through all layer applications
        this.appliedLayersByObject.forEach((layerIds, objectName) => {
            // Extract part name from object name
            let partName = '';
            if (objectName.includes('_')) {
                const parts = objectName.split('_');
                if (parts.length > 1) {
                    partName = parts[0];
                }
            } else {
                const knownParts = ['Outside', 'Inside', 'Collar', 'Button', 'Thread', 'Metal', 'Zipper', 'Sleeve'];
                for (const part of knownParts) {
                    if (objectName.toLowerCase().includes(part.toLowerCase())) {
                        partName = part;
                        break;
                    }
                }
            }
            
            if (partName) {
                assignedParts.add(partName);
            }
        });
        
        return Array.from(assignedParts);
    }
    
    // Clear all stored data - call this when changing models
    reset() {
        this.originalMaterials.clear();
        this.appliedLayersByObject.clear();
    }
}