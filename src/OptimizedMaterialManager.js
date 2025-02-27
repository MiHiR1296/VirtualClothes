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
            roughness: 0.8,
            metalness: 0.2,
            envMapIntensity: 1.0
        };

        // Material presets with texture paths
        this.materialPresets = {
            inside: {
                type: 'MeshPhysicalMaterial',
                color: new THREE.Color(0xffffff),
                roughness: 1.0,
                metalness: 0.0,
                sheen: 0.3,
                sheenRoughness: 0.8,
                side: THREE.DoubleSide,
                transparent: true,
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
                roughness: 0.8,
                metalness: 0.1,
                sheen: 0.1,
                sheenRoughness: 0.8,
                side: THREE.DoubleSide,
                transparent: true,
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
                texturePaths: {
                    baseColor: 'Threads_basecolor',
                    normal: 'Threads_normal'
                },
                isSharedMaterial: true,
                sharedTexturePath: '/VirtualClothes/Textures/Threads/'
            },
            button: {
                type: 'MeshStandardMaterial',
                color: new THREE.Color(0x2a2a2a),
                roughness: 0.3,
                metalness: 0.8,
                side: THREE.DoubleSide,
                transparent: true,
                isSharedMaterial: true,
                sharedTexturePath: '/VirtualClothes/Textures/Buttons/'
            },
            metal: {
                type: 'MeshStandardMaterial',
                color: new THREE.Color(0x888888),
                roughness: 0.2,
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
        console.log('\n📦 Starting Material Creation for:', modelConfig.directory);
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
    
    for (const type of modelConfig.materialTypes) {
        console.log(`Loading textures for type: ${type}`);
        
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
        
        // Create material with loaded textures
        const material = await this.createMaterialWithTextures(type, textures, materialConfig);
        
        materialSets.set(type, {
            material: material,
            textures: textures
        });
    }

    return materialSets;
}


    getMaterialConfig(type) {
        const preset = this.materialPresets[type];
        if (!preset) {
            console.warn(`No material preset found for type: ${type}`);
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
        
        console.log('Texture Loading Debug:', {
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
    
                    console.log(`Attempting to load ${textureType} texture:`, {
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
                        console.warn(`Could not load ${textureType} texture: ${fullPath}`);
                    }
                }
            }
        } catch (error) {
            console.error(`Error loading textures for ${type}:`, error);
        }
    
        return textures;
    }

    async tryLoadTexture(fullPath, textureType, isSharedMaterial) {
        return textureCache.loadTexture(fullPath, textureType);
    }

    async loadTexture(path) {
        return new Promise((resolve, reject) => {
            // Add error handler to check for HTML response
            const errorHandler = (error) => {
                if (error?.message?.includes('<!DOCTYPE')) {
                    console.warn(`Invalid response format for texture: ${path}`);
                    resolve(null);
                } else {
                    reject(error);
                }
            };
    
            this.textureLoader.load(
                path,
                (texture) => {
                    texture.flipY = false;
                    texture.generateMipmaps = true;
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;
                    
                    // Set proper color space based on texture type
                    texture.colorSpace = path.includes('normal') || 
                                       path.includes('roughness') || 
                                       path.includes('metallic') ? 
                        THREE.NoColorSpace : 
                        THREE.SRGBColorSpace;
                    
                    texture.needsUpdate = true;
                    resolve(texture);
                },
                undefined,
                errorHandler
            );
        });
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

    assignMaterialToMesh(mesh, materialSets, modelConfig) {
        const meshName = mesh.name.toLowerCase();
        let materialType = this.determineMaterialType(meshName, modelConfig.materialAssignments);
    
        if (!materialType || !materialSets.has(materialType)) {
            console.warn(`No material found for mesh: ${meshName}`);
            return false;
        }
    
        const materialSet = materialSets.get(materialType);
        mesh.material = materialSet.material;
        mesh.material.needsUpdate = true;
    
        // Add detailed logging
        console.log(`🎨 Material Assignment:`, {
            meshName: mesh.name,
            materialType: materialType,
            modelName: modelConfig.name,
            materialProperties: {
                color: mesh.material.color?.getHexString(),
                roughness: mesh.material.roughness,
                metalness: mesh.material.metalness
            }
        });
    
        return true;
    }

    determineMaterialType(meshName, materialAssignments) {
        for (const [type, patterns] of Object.entries(materialAssignments)) {
            if (patterns.some(pattern => meshName.includes(pattern))) {
                return type;
            }
        }
        return null;
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
    
    // Clear texture cache
    textureCache.clearCache();
}

}