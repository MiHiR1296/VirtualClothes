import * as THREE from 'three';
import { materialTypes, NORMAL_MAP_PATHS } from './MaterialTypeSelect';


export class TextureCompositor {
    constructor() {
        this.loadedNormalMaps = new Map();
        this.width = 2048; // Increased for even higher resolution
        this.height = 2048; // Increased for even higher resolution
        this.scene = null; // Will be set on first use
        this.originalMaterials = new Map(); // Store original materials by object name
        this.appliedLayersByObject = new Map(); // Track which layers are applied to which objects
        this.createdMaterials = new Set(); // Track materials created by updateMaterial
        this.loadNormalMapsForMaterialTypes();
    }

    /**
     * Apply the appropriate normal map to a material based on the selected
     * material type. This helper is used for both repeating and non-repeating
     * textures so the same logic runs regardless of layer configuration.
     *
     * @param {THREE.Material} newMaterial - Material to modify
     * @param {string} materialTypeName - Selected material type
     * @param {object} baseProperties - Properties of the original material
     * @param {THREE.Texture} [fallbackNormalMap] - Optional fallback map, typically from the outside material
     * @param {THREE.Vector2} [fallbackNormalScale] - Scale to use with the fallback normal map
     */
    applyNormalMapToMaterial(
        newMaterial,
        materialTypeName,
        baseProperties,
        fallbackNormalMap = null,
        fallbackNormalScale = null
    ) {
        const materialProps = materialTypes[materialTypeName].properties;
        const normalMap = this.loadedNormalMaps.get(materialTypeName);

        const assignNormalMap = (map, scale) => {
            newMaterial.normalMap = map;
            if (newMaterial.normalMap) {
                newMaterial.normalMap.colorSpace = THREE.NoColorSpace;
                newMaterial.normalMap.needsUpdate = true;
            }
            newMaterial.normalScale = scale.clone();
            newMaterial.needsUpdate = true;
        };

        if (materialTypeName === 'base') {
            if (baseProperties.normalMap) {
                assignNormalMap(baseProperties.normalMap, baseProperties.normalScale);
            } else if (fallbackNormalMap) {
                const intensity = materialProps.normalScale || 1.0;
                const scale =
                    fallbackNormalScale?.clone() ||
                    new THREE.Vector2(intensity, intensity);
                assignNormalMap(fallbackNormalMap, scale);
            } else if (normalMap) {
                const normalIntensity = materialProps.normalScale || 1.0;
                assignNormalMap(normalMap, new THREE.Vector2(normalIntensity, normalIntensity));
            }
        } else if (normalMap) {
            const normalIntensity = materialProps.normalScale || 1.0;
            assignNormalMap(normalMap, new THREE.Vector2(normalIntensity, normalIntensity));
        } else if (baseProperties.normalMap) {
            assignNormalMap(baseProperties.normalMap, baseProperties.normalScale);
        }
    }

    async loadNormalMapsForMaterialTypes() {
        const loader = new THREE.TextureLoader();
        
        for (const [materialType, path] of Object.entries(NORMAL_MAP_PATHS)) {
            if (path) {
                try {
                    const normalMap = await new Promise((resolve, reject) => {
                        loader.load(
                            path,
                            texture => {
                                texture.wrapS = THREE.RepeatWrapping;
                                texture.wrapT = THREE.RepeatWrapping;
                                texture.flipY = false;
                                texture.colorSpace = THREE.NoColorSpace;
                                resolve(texture);
                            },
                            undefined,
                            error => reject(error)
                        );
                    });
                    
                    // Convert the key to lowercase to match materialType values
                    this.loadedNormalMaps.set(materialType.toLowerCase(), normalMap);
                    console.log(`Loaded normal map for ${materialType}`);
                    console.log('Available normal maps:', Array.from(this.loadedNormalMaps.keys()));
                } catch (error) {
                    console.error(`Failed to load normal map for ${materialType}:`, error);
                }
            }
        }
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
                if (object.material) {
                    const originalMaterial = object.material.clone();

                    // Clone any existing textures so they remain valid even if
                    // the original material is later disposed
                    const textureProps = [
                        'map',
                        'normalMap',
                        'roughnessMap',
                        'metalnessMap',
                        'aoMap',
                        'emissiveMap',
                        'alphaMap',
                        'bumpMap'
                    ];

                    textureProps.forEach(prop => {
                        if (object.material[prop]) {
                            originalMaterial[prop] = object.material[prop].clone();
                        }
                    });

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
                        // Exact match (case insensitive)
                        if (selectedPart.toLowerCase() === partName.toLowerCase()) {
                            return true;
                        }
                        
                        // Check for exact match in the object name
                        if (object.name.toLowerCase().includes(`_${selectedPart.toLowerCase()}_`) || 
                            object.name.toLowerCase().endsWith(`_${selectedPart.toLowerCase()}`) ||
                            object.name.toLowerCase().startsWith(`${selectedPart.toLowerCase()}_`)) {
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
                // Get the original material if available
                const originalMaterial = this.originalMaterials.get(object.name);
                
                if (originalMaterial) {
                    // Clean up current material if it exists and was created by this compositor
                    if (object.material && this.createdMaterials.has(object.material)) {
                        object.material.dispose();
                        this.createdMaterials.delete(object.material);
                    }
                    
                    // Clone the original material but make it transparent
                    const invisibleMaterial = originalMaterial.clone();
                    invisibleMaterial.transparent = true;
                    invisibleMaterial.opacity = 0;
                    invisibleMaterial.depthWrite = false;  // Don't write to depth buffer
                    invisibleMaterial.needsUpdate = true;

                    object.material = invisibleMaterial;
                    this.createdMaterials.add(invisibleMaterial);
                } else {
                    // Create a completely transparent material if no original
                    if (object.material) {
                        object.material.transparent = true;
                        object.material.opacity = 0;
                        object.material.depthWrite = false;
                        object.material.needsUpdate = true;
                    }
                }
                return;
            }

            // If there are applicable layers but none have textures yet, simply
            // restore the original material to avoid showing a white placeholder
            const hasTextureLayer = applicableLayers.some(l => l.texture);
            if (!hasTextureLayer) {
                const originalMaterial = this.originalMaterials.get(object.name);
                if (originalMaterial) {
                    if (object.material && this.createdMaterials.has(object.material)) {
                        object.material.dispose();
                        this.createdMaterials.delete(object.material);
                    }
                    object.material = originalMaterial.clone();
                    object.material.needsUpdate = true;
                }
                return;
            }
    
            // Get the environment map and intensity from the scene if available
            const envMap = this.scene ? this.scene.environment : null;
            let envMapIntensity = 1.0;
            
            // Find the outside material to match properties
            const outsideMaterial = this.findOutsideMaterial();
            
            // Create texture directly with Three.js instead of using canvas for repeating patterns
            // This avoids seams in the 3D view when repeating patterns are used
            const topLayer = applicableLayers[0]; // First layer (topmost in rendering order)
            
            if (topLayer && topLayer.texture && topLayer.transformations?.repeat) {
                // For repeat mode, create a specialized seamless repeating texture
                this.createRepeatingTextureMaterial(object, topLayer, applicableLayers, outsideMaterial, envMap);
                return;
            }
            
            // For non-repeating textures, continue with canvas compositing approach
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', { alpha: true });
            canvas.width = this.width;
            canvas.height = this.height;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
    
            // Process layers in reverse order (bottom to top)
            for (let i = applicableLayers.length - 1; i >= 0; i--) {
                const layer = applicableLayers[i];
                
                if (!layer.visible) continue;
    
                const layerCanvas = document.createElement('canvas');
                const layerCtx = layerCanvas.getContext('2d', { alpha: true });
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
    
                    // For standard non-repeating rendering
                    layerCtx.save();
                    
                    layerCtx.translate(canvas.width / 2, canvas.height / 2);
                    
                    // Apply offset
                    const offsetX = transformations.offset.x * canvas.width;
                    const offsetY = transformations.offset.y * canvas.height;
                    layerCtx.translate(offsetX, offsetY);
                    
                    // Apply rotation
                    layerCtx.rotate(transformations.rotation * Math.PI / 180);
                    
                    // Apply scale and flip
                    layerCtx.scale(
                        transformations.flipX * transformations.scale,
                        transformations.flipY * transformations.scale
                    );
                    
                    // Calculate image dimensions while preserving aspect ratio
                    const imgWidth = canvas.width * 0.8;
                    const imgHeight = canvas.height * 0.8;
                    
                    // Use better image rendering quality
                    layerCtx.imageSmoothingEnabled = true;
                    layerCtx.imageSmoothingQuality = 'high';
                    
                    // Draw the image
                    layerCtx.drawImage(
                        layer.texture.image,
                        -imgWidth / 2,
                        -imgHeight / 2,
                        imgWidth,
                        imgHeight
                    );
                    
                    layerCtx.restore();
    
                    // Apply layer opacity and draw to the main canvas
                    ctx.globalAlpha = layer.opacity || 1;
                    ctx.drawImage(layerCanvas, 0, 0);
                }
            }
            
            // Color correction to fix color inconsistency between UV editor and 3D model
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // Only process non-transparent pixels
            for (let i = 0; i < data.length; i += 4) {
                if (data[i + 3] > 0) {  // If pixel has any opacity
                    // Color correction factors
                    const colorCorrection = 1.02;  // Slightly higher boost
                    const contrastBoost = 1.01;    // Subtle contrast enhancement
                    
                    // Apply correction to RGB channels
                    for (let j = 0; j < 3; j++) {
                        // Apply contrast (center around 128)
                        let value = data[i + j];
                        value = ((value / 255 - 0.5) * contrastBoost + 0.5) * 255;
                        
                        // Apply brightness/saturation
                        value = value * colorCorrection;
                        
                        // Clamp to valid range
                        data[i + j] = Math.max(0, Math.min(255, Math.round(value)));
                    }
                }
            }
            
            // Put the processed imageData back to the canvas
            ctx.putImageData(imageData, 0, 0);
    
            // Create a high-quality texture from the canvas
            const texture = new THREE.CanvasTexture(canvas);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.flipY = false;
            
            // Use higher quality settings for better appearance
            texture.generateMipmaps = true;
            texture.minFilter = THREE.LinearMipmapLinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.colorSpace = THREE.SRGBColorSpace;
            
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
        this.createdMaterials.add(newMaterial);
    
            // Copy environment map settings from the scene
            if (envMap) {
                newMaterial.envMap = envMap;
                newMaterial.envMapIntensity = baseProperties.envMapIntensity;
            }
    
           // Apply material properties from the top visible layer
           if (applicableLayers.length > 0) {
            const topLayer = applicableLayers[0]; // First layer (topmost in rendering order)
            const materialTypeName = topLayer.materialType || 'base';
            const materialProps = materialTypes[materialTypeName].properties;
        
            if (topLayer.materialProperties) {
                newMaterial.roughness = topLayer.materialProperties.roughness ?? materialProps.roughness;
                newMaterial.metalness = topLayer.materialProperties.metalness ?? materialProps.metalness;
                newMaterial.clearcoat = topLayer.materialProperties.clearcoat ?? (materialProps.clearcoat || 0);
                newMaterial.clearcoatRoughness = topLayer.materialProperties.clearcoatRoughness ?? (materialProps.clearcoatRoughness || 0);
                newMaterial.sheen = topLayer.materialProperties.sheen ?? (materialProps.sheen || 0);
                newMaterial.sheenRoughness = topLayer.materialProperties.sheenRoughness ?? (materialProps.sheenRoughness || 0);
            }
            
            // Apply the appropriate normal map
            this.applyNormalMapToMaterial(
                newMaterial,
                materialTypeName,
                baseProperties,
                outsideMaterial?.normalMap || null,
                outsideMaterial?.normalScale || null
            );
        }
    
            // Clean up old material if different and managed by this compositor
            if (
                object.material &&
                object.material !== newMaterial &&
                object.material !== originalMaterial &&
                this.createdMaterials.has(object.material)
            ) {
                object.material.dispose();
                this.createdMaterials.delete(object.material);
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

    // Create a specialized material for repeating textures using THREE.js built-in texture repeating
    // This avoids seams that appear when using canvas-based repeating
    createRepeatingTextureMaterial(object, layer, allLayers, outsideMaterial, envMap) {
        try {
            if (!layer || !layer.texture) {
                console.warn('Cannot create repeating texture without a valid texture');
                return;
            }
            
            const transformations = {
                offset: { x: 0, y: 0 },
                scale: 1,
                rotation: 0,
                repeat: true,
                flipX: 1,
                flipY: 1,
                ...layer.transformations
            };
            
            // Clone the texture to avoid modifying the original
            const texture = layer.texture.clone();
            
            // Configure texture wrapping for seamless repeating
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            
            // Apply high-quality filtering to prevent pixelation
            texture.generateMipmaps = true;
            texture.minFilter = THREE.LinearMipmapLinearFilter;
            texture.magFilter = THREE.LinearFilter;
            
            // Calculate repeat based on scale - same formula as in UVEditor
            // In THREE.js, smaller scale = more repetitions (1/scale)
            const repeatFactor = 1.0 / Math.max(0.1, transformations.scale);
            texture.repeat.set(repeatFactor, repeatFactor);
            
            // Apply offset directly from transformations
            // Note: Offset in THREE.js goes from 0-1 (UV space)
            texture.offset.x = -transformations.offset.x;
            texture.offset.y = -transformations.offset.y;
            
            // Apply rotation
            if (transformations.rotation !== 0) {
                // Convert degrees to radians
                const angle = transformations.rotation * Math.PI / 180;
                texture.rotation = angle;
                
                // Center the rotation point
                texture.center.set(0.5, 0.5);
            }
            
            // Apply flipping through texture matrix
            if (transformations.flipX < 0 || transformations.flipY < 0) {
                // We need to modify the texture coordinate mapping
                texture.matrixAutoUpdate = false;
                
                // Create a matrix to handle flipping
                const matrix = new THREE.Matrix3();
                
                // Start with identity matrix
                matrix.set(
                    1, 0, 0,
                    0, 1, 0,
                    0, 0, 1
                );
                
                // Apply flipping
                if (transformations.flipX < 0) {
                    matrix.elements[0] = -1; // Negate X scale
                    matrix.elements[6] = 1;  // Offset to compensate
                }
                
                if (transformations.flipY < 0) {
                    matrix.elements[4] = -1; // Negate Y scale
                    matrix.elements[7] = 1;  // Offset to compensate
                }
                
                // Set matrix to texture
                texture.matrix.setFromMatrix3(matrix);
            }
            
            // Ensure texture updates are applied
            texture.needsUpdate = true;
            
            // Start with the original material properties
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
            
            // Create new material with the repeating texture
            const newMaterial = new THREE.MeshPhysicalMaterial({
                map: texture,
                ...baseProperties,
                transparent: true,
                side: THREE.FrontSide,
                depthWrite: true,
                depthTest: true,
                alphaTest: 0.1
            });
            this.createdMaterials.add(newMaterial);
            
            // Apply opacity from the layer
            newMaterial.opacity = layer.opacity || 1;
            
            // Copy environment map settings
            if (envMap) {
                newMaterial.envMap = envMap;
                newMaterial.envMapIntensity = baseProperties.envMapIntensity;
            }
            
            // Apply material properties from layer settings
           // Apply material properties from layer settings
                const materialTypeName = layer.materialType || 'base';
                const materialProps = materialTypes[materialTypeName].properties;

                if (layer.materialProperties) {
                    newMaterial.roughness = layer.materialProperties.roughness ?? materialProps.roughness;
                    newMaterial.metalness = layer.materialProperties.metalness ?? materialProps.metalness;
                    newMaterial.clearcoat = layer.materialProperties.clearcoat ?? (materialProps.clearcoat || 0);
                    newMaterial.clearcoatRoughness = layer.materialProperties.clearcoatRoughness ?? (materialProps.clearcoatRoughness || 0);
                    newMaterial.sheen = layer.materialProperties.sheen ?? (materialProps.sheen || 0);
                    newMaterial.sheenRoughness = layer.materialProperties.sheenRoughness ?? (materialProps.sheenRoughness || 0);
                }

                // Apply the appropriate normal map
                this.applyNormalMapToMaterial(
                    newMaterial,
                    materialTypeName,
                    baseProperties,
                    outsideMaterial?.normalMap || null,
                    outsideMaterial?.normalScale || null
                );
            
        // Clean up old material if different and managed by this compositor
        if (
            object.material &&
            object.material !== newMaterial &&
            object.material !== originalMaterial &&
            this.createdMaterials.has(object.material)
        ) {
            object.material.dispose();
            this.createdMaterials.delete(object.material);
        }
            
            // Apply new material
            object.material = newMaterial;
            object.material.needsUpdate = true;
            object.renderOrder = 1;
            
            console.log(`Applied repeating texture to ${object.name}:`, {
                scale: transformations.scale,
                repeatFactor,
                offset: transformations.offset,
                rotation: transformations.rotation,
                flipX: transformations.flipX,
                flipY: transformations.flipY
            });
            
        } catch (error) {
            console.error('Error creating repeating texture material:', error);
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
    reset(preserveOriginalMaterials = false) {
        // Store a backup of original materials if requested
        const originalMaterialsBackup = preserveOriginalMaterials ? 
            new Map(this.originalMaterials) : null;
        
        // Clear tracking maps
        this.appliedLayersByObject.clear();

        // Dispose of materials created by this compositor
        this.createdMaterials.forEach(mat => mat.dispose());
        this.createdMaterials.clear();
        
        // Clear or restore original materials
        if (preserveOriginalMaterials && originalMaterialsBackup) {
            // Just keep the original materials
            console.log("Preserving original materials during reset");
        } else {
            // Complete reset
            this.originalMaterials.clear();
            console.log("Complete reset of texture compositor state");
        }
        
        // Restore original materials if requested
        if (preserveOriginalMaterials && originalMaterialsBackup) {
            this.originalMaterials = originalMaterialsBackup;
        }
    }
}