import { logDebug, logInfo, logWarn, logError } from "./logger.js";
import * as THREE from 'three';
import { getTexturePath } from './paths.js'; 
import { textureCache } from './TextureCache';

export class OptimizedMaterialManager {
    constructor() {
        this.textureLoader = new THREE.TextureLoader();
        this.materials = new Map();
        this.textures = new Map();
        this.materialCache = new Map();
        this.loadingPromises = new Map();
        this.materialSettings = {
            normalScale: 1.0,
            roughness: 1.0,
            metalness: 0.1,
            envMapIntensity: 0.2
        };
        
        // Debug flag
        this.debug = true;

        // Material presets with texture paths
        this.materialPresets = {
            inside: {
                type: 'MeshPhysicalMaterial',
                color: new THREE.Color(0xffffff),
                roughness: 1.0,
                metalness: 0.0,
                sheen: 0.6,
                sheenRoughness: 1.0,
                transmission: 0.15,
                side: THREE.FrontSide,
                transparent: true,
                clearcoat: 0,
                texturePaths: {
                    baseColor: 'inside_basecolor',
                    normal: 'inside_normal',
                    roughnessMap: 'roughness',
                    metalnessMap: 'metallic'
                }
            },
            outside: {
                type: 'MeshPhysicalMaterial',
                color: new THREE.Color(0xffffff),
                roughness: 1.0,
                metalness: 0.1,
                sheen: 0.6,
                sheenRoughness: 1.0,
                side: THREE.DoubleSide,
                transparent: true,
                transmission: 0.1,
                clearcoat: 0,
                texturePaths: {
                    baseColor: 'outside_basecolor',
                    normal: 'outside_normal',
                    roughnessMap: 'roughness',
                    metalnessMap: 'metallic'
                }
            },
            thread: {
                type: 'MeshPhysicalMaterial',
                color: new THREE.Color(0xffffff),
                roughness: 1.0,
                metalness: 0.0,
                sheen: 0.5,
                sheenRoughness: 1.0,
                side: THREE.DoubleSide,
                transparent: true,
                // Thread textures use JPG files
                texturePaths: {
                    baseColor: 'Threads_basecolor.jpg',
                    normal: 'Threads_normal.jpg'
                },
                isSharedMaterial: true,
                sharedTexturePath: '/VirtualClothes/Textures/Threads/'
            },
            button: {
                type: 'MeshStandardMaterial',
                color: new THREE.Color(0x2a2a2a),
                roughness: 0.6,
                metalness: 0.8,
                side: THREE.DoubleSide,
                transparent: true,
                isSharedMaterial: true,
                sharedTexturePath: '/VirtualClothes/Textures/Buttons/'
            },
            metal: {
                type: 'MeshStandardMaterial',
                color: new THREE.Color(0x888888),
                roughness: 0.02,
                metalness: 1.0,
                side: THREE.DoubleSide,
                isSharedMaterial: true,
                sharedTexturePath: '/VirtualClothes/Textures/Metal/',
                texturePaths: {
                    baseColor: 'metal_basecolor',
                    normal: 'metal_normal',
                    roughnessMetallic: 'metal_roughness'
                }
            }
        };
        
        // Track materials created per mesh file
        this.meshMaterials = new Map();
        
        // Track mesh names to material assignments for debugging
        this.meshAssignments = new Map();
    }

    async createMaterialsForModel(modelConfig) {
        const cacheKey = modelConfig.directory;
        
        // Check if already loading
        if (this.loadingPromises.has(cacheKey)) {
            return this.loadingPromises.get(cacheKey);
        }

        // Check cache first
        if (this.materialCache.has(cacheKey)) {
            return this.materialCache.get(cacheKey);
        }

        try {
            logDebug('\n📦 Starting Material Creation for:', modelConfig.directory);
            const loadingPromise = this._loadMaterialsForModel(modelConfig);
            this.loadingPromises.set(cacheKey, loadingPromise);
            
            const materialSets = await loadingPromise;
            this.materialCache.set(cacheKey, materialSets);
            
            return materialSets;
        } finally {
            this.loadingPromises.delete(cacheKey);
        }
    }

    async _loadMaterialsForModel(modelConfig) {
        const materialSets = new Map();
        const baseTexturePath = `${modelConfig.directory}/Textures`;
        
        // Create a map to store textures by type
        const texturesByType = new Map();
        
        // Reset mesh materials tracking for this model
        this.meshMaterials.clear();
        this.meshAssignments.clear();
        
        for (const type of modelConfig.materialTypes) {
            logDebug(`Loading textures for type: ${type}`);
            
            const materialConfig = this.getMaterialConfig(type);
            if (!materialConfig) continue;

            // Load textures based on material type
            const textures = await this.loadTexturesForType(
                baseTexturePath, 
                type, 
                materialConfig
            );
            
            // Store the textures for this type
            texturesByType.set(type, textures);
            
            // Create base material with loaded textures
            const baseMaterial = await this.createMaterialWithTextures(type, textures, materialConfig);
            
            // Color-code different material types for debugging
            if (this.debug) {
                switch(type) {
                    case 'inside':
                        baseMaterial.color.set(0xf5d000); // Light blue
                        break;
                    case 'outside':
                        baseMaterial.color.set(0xf5d000); // Light green
                        break;
                    case 'zipper':
                        baseMaterial.color.set(0xfff000); // Light green
                        break;
                    case 'button':
                        baseMaterial.color.set(0xce2029); // Light pink
                        break;
                    case 'thread':
                        baseMaterial.color.set(0xeecc88); // Light orange
                        break;
                    case 'metal':   
                        baseMaterial.color.set(0x000000); // Light gray
                        break;
                }
            }
            
            materialSets.set(type, {
                material: baseMaterial,
                textures: textures
            });
        }

        return materialSets;
    }

    getMaterialConfig(type) {
        const preset = this.materialPresets[type];
        if (!preset) {
            logWarn(`No material preset found for type: ${type}`);
            return null;
        }
        return preset;
    }
    
    async loadTexturesForType(baseTexturePath, type, materialConfig) {
        const textures = {};
        const isSharedMaterial = materialConfig.isSharedMaterial;
        
        // Extract the model directory, carefully removing 'Models/' and '/Textures'
        const modelDirectory = baseTexturePath
            .replace('./Models/', '')     // Remove leading './Models/'
            .replace(/\/Textures$/, '');  // Remove trailing '/Textures'
        
        logDebug('Texture Loading Debug:', {
            baseTexturePath,
            type,
            isSharedMaterial,
            modelDirectory,
            texturePaths: materialConfig.texturePaths
        });
        
        try {
            if (materialConfig.texturePaths) {
                for (const [textureType, fileName] of Object.entries(materialConfig.texturePaths)) {
                    let fullPath;
                    
                    if (isSharedMaterial) {
                        // For shared materials, use the shared textures folder
                        fullPath = getTexturePath(`${type}/${fileName}`);
                    } else {
                        // Updated path resolution for separate roughness and metalness maps
                        let adjustedFileName = fileName;
                        
                        // Special handling for roughness and metalness maps
                        if (textureType === 'roughnessMap') {
                            adjustedFileName = `roughness_${type === 'inside' ? '0' : '1'}`;
                        }
                        
                        if (textureType === 'metalnessMap') {
                            adjustedFileName = `metallic_${type === 'inside' ? '0' : '1'}`;
                        }
                        
                        fullPath = getTexturePath(adjustedFileName, modelDirectory);
                    }
    
                    logDebug(`Attempting to load ${textureType} texture:`, {
                        fileName,
                        fullPath,
                        isSharedMaterial
                    });
    
                    const texture = await this.tryLoadTexture(
                        fullPath,
                        textureType,
                        isSharedMaterial
                    );
    
                    if (texture) {
                        textures[textureType] = texture;
                    } else {
                        logWarn(`Could not load ${textureType} texture: ${fullPath}`);
                    }
                }
            }
        } catch (error) {
            logError(`Error loading textures for ${type}:`, error);
        }
    
        return textures;
    }

    async tryLoadTexture(fullPath, textureType, isSharedMaterial) {
        // Attempt to load the texture using the provided path first
        let texture = await textureCache.loadTexture(fullPath, textureType);

        // If loading failed and no explicit extension is present, try common ones
        if (!texture && !/\.[a-zA-Z]+$/.test(fullPath)) {
            const extensions = ['png', 'jpg', 'jpeg', 'webp'];
            for (const ext of extensions) {
                const attemptPath = `${fullPath}.${ext}`;
                texture = await textureCache.loadTexture(attemptPath, textureType);
                if (texture) {
                    break;
                }
            }
        }

        // Also try swapping between png/jpg if the path already has one extension
        if (!texture && /\.png$/.test(fullPath)) {
            const attemptPath = fullPath.replace(/\.png$/, '.jpg');
            texture = await textureCache.loadTexture(attemptPath, textureType);
        } else if (!texture && /\.jpg$/.test(fullPath)) {
            const attemptPath = fullPath.replace(/\.jpg$/, '.png');
            texture = await textureCache.loadTexture(attemptPath, textureType);
        }

        return texture;
    }

    async createMaterialWithTextures(type, textures, materialConfig) {
        const {
            texturePaths,
            isSharedMaterial,
            sharedTexturePath,
            ...materialParams
        } = materialConfig;
    
        // Create material with valid THREE.js properties only
        const material = new THREE[materialConfig.type || 'MeshPhysicalMaterial'](materialParams);
    
        // Add textures if they exist
        if (textures.baseColor) {
            material.map = textures.baseColor;
        }
        if (textures.normal) {
            material.normalMap = textures.normal;
            material.normalScale = new THREE.Vector2(
                this.materialSettings.normalScale,
                this.materialSettings.normalScale
            );
        }
    
        // Separate roughness and metalness maps
        if (textures.roughnessMap) {
            material.roughnessMap = textures.roughnessMap;
        }
        if (textures.metalnessMap) {
            material.metalnessMap = textures.metalnessMap;
        }
    
        material.needsUpdate = true;
        return material;
    }

    /**
     * Create a duplicate of a material
     * @param {THREE.Material} sourceMaterial - The source material to clone
     * @param {string} suffix - A suffix to add to the name (optional)
     * @returns {THREE.Material} A new material instance
     */
    createMaterialDuplicate(sourceMaterial, suffix = '') {
        // Create a new material of the same type
        const materialType = sourceMaterial.type;
        const materialClass = THREE[materialType];
        
        if (!materialClass) {
            logError(`Unknown material type: ${materialType}`);
            return sourceMaterial.clone(); // Fallback to simple clone
        }
        
        // Create a new material instance
        const newMaterial = new materialClass();
        
        // Copy all properties from the source material
        Object.keys(sourceMaterial).forEach(key => {
            if (key !== 'id' && key !== 'uuid' && key !== 'name') {
                try {
                    // Handle texture objects (need to be cloned)
                    if (sourceMaterial[key] && 
                        sourceMaterial[key].isTexture) {
                        newMaterial[key] = sourceMaterial[key].clone();
                    } else if (sourceMaterial[key] && 
                               typeof sourceMaterial[key] === 'object' && 
                               sourceMaterial[key].clone) {
                        // Handle other cloneable objects (Vector2, Color, etc.)
                        newMaterial[key] = sourceMaterial[key].clone();
                    } else {
                        // Handle primitive values
                        newMaterial[key] = sourceMaterial[key];
                    }
                } catch (e) {
                    logWarn(`Could not copy property ${key}:`, e);
                }
            }
        });
        
        // Set a new name if provided
        if (suffix && sourceMaterial.name) {
            newMaterial.name = `${sourceMaterial.name}_${suffix}`;
        }
        
        newMaterial.needsUpdate = true;
        return newMaterial;
    }

    /**
     * Assign material to mesh with per-GLB-file differentiation
     * This creates unique materials for each GLB file to allow independent modification
     */
    assignMaterialToMesh(mesh, materialSets, modelConfig) {
        const meshName = mesh.name.toLowerCase();
        
        // Add debug log for mesh name
        if (this.debug) {
            logDebug(`Attempting to assign material to mesh: ${mesh.name}`);
        }
        
        // Find material type based on mesh name
        let materialType = this.determineMaterialType(meshName, modelConfig.materialAssignments);
        
        if (!materialType || !materialSets.has(materialType)) {
            if (this.debug) {
                logWarn(`No material type found for mesh: ${mesh.name}, materialType=${materialType}`);
            }
            return false;
        }
        
        if (this.debug) {
            logDebug(`Determined material type for mesh ${mesh.name}: ${materialType}`);
        }
    
        const materialSet = materialSets.get(materialType);
        
        // Determine which GLB file this mesh came from
        const meshFileName = this.determineMeshFileName(mesh);
        
        // Create a key for this material type + GLB file combination
        const materialKey = `${materialType}_${meshFileName}`;
        
        if (this.debug) {
            logDebug(`Material key for ${mesh.name}: ${materialKey}`);
            
            // Store mesh assignment for debugging
            this.meshAssignments.set(mesh.name, {
                meshName: mesh.name,
                materialType: materialType,
                meshFileName: meshFileName,
                materialKey: materialKey
            });
        }
        
        // Check if we already created a material for this GLB file
        if (!this.meshMaterials.has(materialKey)) {
            // Create a duplicate of the base material for this specific GLB file
            const duplicateMaterial = this.createMaterialDuplicate(
                materialSet.material, 
                meshFileName
            );
            
            // Store this duplicate for future meshes from the same GLB file
            this.meshMaterials.set(materialKey, duplicateMaterial);
            
            logDebug(`🎨 Created duplicate material for ${materialKey}`);
        }
        
        // Assign the duplicate material to the mesh
        mesh.material = this.meshMaterials.get(materialKey);
        mesh.material.needsUpdate = true;
    
        return true;
    }

    /**
     * Extract the name of the GLB file that this mesh came from
     * This is stored in the parent object's userData when loaded 
     */
    determineMeshFileName(mesh) {
        // Try to get filename from mesh's userData
        if (mesh.userData && mesh.userData.fileName) {
            const fileName = this.cleanFileName(mesh.userData.fileName);
            if (this.debug) {
                logDebug(`Got filename from mesh.userData: ${mesh.userData.fileName} -> ${fileName}`);
            }
            return fileName;
        }
        
        // Try to get filename from parent's userData
        let parent = mesh.parent;
        while (parent) {
            if (parent.userData && parent.userData.fileName) {
                const fileName = this.cleanFileName(parent.userData.fileName);
                if (this.debug) {
                    logDebug(`Got filename from parent.userData: ${parent.userData.fileName} -> ${fileName}`);
                }
                return fileName;
            }
            parent = parent.parent;
        }
        
        // If we can't determine the file, use the mesh name as a fallback
        // Remove any numbers or special characters to get a clean part name
        const partName = mesh.name.replace(/[0-9_\.]/g, '').replace(/\s+/g, '-').toLowerCase();
        if (this.debug) {
            logDebug(`Falling back to partName from mesh.name: ${mesh.name} -> ${partName}`);
        }
        return partName || 'unknown';
    }
    
    /**
     * Clean up a filename to use as a material identifier
     * This is the critical function that was causing issues
     */
    cleanFileName(fileName) {
        // Enhanced fileName cleaning with better extension handling
        if (!fileName) return 'unknown';
        
        // First, extract just the base filename without path
        let baseName = fileName;
        
        // Remove path if present
        if (baseName.includes('/')) {
            baseName = baseName.split('/').pop();
        } else if (baseName.includes('\\')) {
            baseName = baseName.split('\\').pop();
        }
        
        // Remove the .glb extension but preserve other periods
        // (e.g., "Sleeve.L.glb" -> "Sleeve.L")
        baseName = baseName.replace(/\.glb$/i, '');
        
        // Now clean up the result to make a valid identifier
        // Convert periods to underscores for consistency
        baseName = baseName.replace(/\./g, '_');
        
        // Replace other invalid chars with underscores
        baseName = baseName.replace(/[^a-zA-Z0-9_]/g, '_');
        
        return baseName.toLowerCase(); // Return lowercase for case-insensitive comparison
    }

    determineMaterialType(meshName, materialAssignments) {
        // Convert meshName to lowercase for case-insensitive comparison
        meshName = meshName.toLowerCase();
        
        if (this.debug) {
            logDebug(`Finding material type for mesh: ${meshName}`);
        }
        
        for (const [type, patterns] of Object.entries(materialAssignments)) {
            if (this.debug) {
                logDebug(`Checking type: ${type} with patterns:`, patterns);
            }
            
            if (patterns.some(pattern => {
                // Convert pattern to lowercase for case-insensitive comparison
                const patternLower = pattern.toLowerCase();
                const isMatch = meshName.includes(patternLower);
                
                if (this.debug) {
                    logDebug(`  Pattern: ${patternLower}, isMatch: ${isMatch}`);
                }
                
                return isMatch;
            })) {
                return type;
            }
        }
        return null;
    }
    
    // Debug method to dump all mesh assignments
    dumpMeshAssignments() {
        logDebug("===== MESH MATERIAL ASSIGNMENTS =====");
        const assignments = {};
        
        this.meshAssignments.forEach((data, meshName) => {
            assignments[meshName] = data;
        });
        
        console.table(assignments);
        return assignments;
    }

    dispose() {
        // Dispose existing materials and textures
        this.textures.forEach(texture => texture.dispose());
        this.textures.clear();
        this.materials.forEach(material => material.dispose());
        this.materials.clear();
        
        // Clear caches
        this.materialCache.forEach(materialSet => {
            materialSet.forEach(({ material, textures }) => {
                material.dispose();
                Object.values(textures).forEach(texture => texture.dispose());
            });
        });
        this.materialCache.clear();
        this.loadingPromises.clear();
        
        // Clear mesh materials
        this.meshMaterials.forEach(material => material.dispose());
        this.meshMaterials.clear();
        
        // Clear mesh assignments
        this.meshAssignments.clear();
        
        // Clear texture cache
        textureCache.clearCache();
    }
}