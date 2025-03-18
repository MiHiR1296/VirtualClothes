import * as THREE from 'three';

export class MaterialManager {
    constructor() {
        this.textureLoader = new THREE.TextureLoader();
        this.loadedTextures = new Map();
        this.texturePath = '/Textures/';
        this.initialized = false;
        this.currentMaterial = null;
        
        // Combined material presets
        this.materialPresets = {
            cotton: {
                name: 'Cotton',
                baseColor: 0xffffff,
                roughness: 1,
                metalness: 0.0,
                normalScale: 1,
                sheen: 0.02,
                sheenRoughness: 0.8,
                clearcoat: 0.0,
                transmission: 0.0,
                textureSettings: {
                    scale: 10.0,
                    offset: { x: 0, y: 0 },
                    rotation: 0
                },
                texturePaths: {
                    normalMap: 'cotton/normal',
                    aoMap: 'cotton/ao',
                    diffuseMap: 'cotton/diffuse'
                }
            },
            nylon: {
                name: 'Nylon',
                baseColor: 0xffffff,
                roughness: 0.98,
                metalness: 0.0,
                normalScale: 1,
                sheen: 0.3,
                clearcoat: 0.0,
                transmission: 0.0,
                texturePaths: {
                    normalMap: 'nylon/normal',
                    roughnessMap: 'nylon/roughness',
                    aoMap: 'nylon/ao',
                    diffuseMap: 'nylon/diffuse'
                },
                textureSettings: {
                    scale: 10.0,
                    offset: { x: 0, y: 0 },
                    rotation: 0
                },
            },
            leather: {
                name: 'Leather',
                baseColor: 0xffffff,
                roughness: 0.7,
                metalness: 0.0,
                normalScale: 1,
                sheen: 0.05,
                sheenRoughness: 0.4,
                clearcoat: 0.5,
                clearcoatRoughness: 0.4,
                textureSettings: {
                    scale: 2.0,
                    offset: { x: 0, y: 0.2 },
                    rotation: 0
                },
                texturePaths: {
                    normalMap: 'leather/normal',
                    roughnessMap: 'leather/roughness',
                    aoMap: 'leather/ao',
                    diffuseMap: 'leather/diffuse'
                }
            },
            metal: {
                name: 'Metal',
                baseColor: 0x888888,
                roughness: 0.5,
                metalness: 1.0,
                normalScale: 0.5,
                sheen: 0.0
            },
            plastic: {
                name: 'Plastic',
                baseColor: 0xcccccc,
                roughness: 0.3,
                metalness: 0.0,
                normalScale: 0.3,
                sheen: 0.1,
                transmission: 0.1,
                ior: 1.4
            }
        };

        this.initializeUI();
        this.updateLoadingLog('Material presets configured');
    }

    updateLoadingLog(message) {
        const loadingLog = document.querySelector('.loading-log');
        if (loadingLog) {
            loadingLog.textContent = message;
        }
        console.log(message);
    }

    async tryLoadTexture(basePath, mapType) {
        const cacheKey = `${basePath}_${mapType}`;
        
        if (this.loadedTextures.has(cacheKey)) {
            return this.loadedTextures.get(cacheKey);
        }
    
        const extensions = ['png', 'jpg', 'jpeg'];
        
        for (const ext of extensions) {
            const fullPath = `${this.texturePath}${basePath}.${ext}`;
            
            try {
                const texture = await new Promise((resolve, reject) => {
                    this.textureLoader.load(
                        fullPath,
                        (tex) => {
                            // Handle texture properties based on type
                            if (mapType === 'normalMap') {
                                tex.colorSpace = THREE.NoColorSpace;
                            } else if (mapType === 'aoMap' || mapType === 'roughnessMap') {
                                tex.colorSpace = THREE.NoColorSpace;
                            } else {
                                tex.colorSpace = THREE.SRGBColorSpace;
                            }

                            tex.wrapS = THREE.RepeatWrapping;
                            tex.wrapT = THREE.RepeatWrapping;
                            tex.generateMipmaps = true;

                            resolve(tex);
                        },
                        undefined,
                        reject
                    );
                });
                
                this.loadedTextures.set(cacheKey, texture);
                return texture;
            } catch (error) {
                continue;
            }
        }
        
        return null;
    }

    async createMaterialWithTextures(presetName, preset) {
        const materialParams = {
            name: presetName,
            color: preset.baseColor,
            roughness: preset.roughness,
            metalness: preset.metalness,
            sheen: preset.sheen || 0,
            sheenRoughness: preset.sheenRoughness || 1.0,
            clearcoat: preset.clearcoat || 0,
            transmission: preset.transmission || 0,
            side: THREE.DoubleSide,
            transparent: true
        };
    
        const material = new THREE.MeshPhysicalMaterial(materialParams);
    
        // Apply environment map intensity from global config if available
        if (window.GLOBAL_ENV_INTENSITY !== undefined) {
            material.envMapIntensity = window.GLOBAL_ENV_INTENSITY;
        } else if (LIGHTING_CONFIG && LIGHTING_CONFIG.environmentMap) {
            material.envMapIntensity = LIGHTING_CONFIG.environmentMap.envMapIntensity || 0.5;
        }
    
        if (preset.texturePaths) {
            try {
                if (preset.texturePaths.normalMap) {
                    const normalMap = await this.tryLoadTexture(preset.texturePaths.normalMap, 'normalMap');
                    if (normalMap) {
                        material.normalMap = normalMap;
                        material.normalScale.set(preset.normalScale || 1, preset.normalScale || 1);
                    }
                }

                if (preset.texturePaths.aoMap) {
                    const aoMap = await this.tryLoadTexture(preset.texturePaths.aoMap, 'aoMap');
                    if (aoMap) {
                        material.aoMap = aoMap;
                        material.aoMapIntensity = 1.0;
                    }
                }

                if (preset.texturePaths.diffuseMap) {
                    const diffuseMap = await this.tryLoadTexture(preset.texturePaths.diffuseMap, 'diffuseMap');
                    if (diffuseMap) {
                        material.map = diffuseMap;
                    }
                }

                // Apply texture settings if provided
                if (preset.textureSettings) {
                    const maps = [material.map, material.normalMap, material.aoMap];
                    maps.forEach(map => {
                        if (map) {
                            map.repeat.set(
                                preset.textureSettings.scale,
                                preset.textureSettings.scale
                            );
                            map.offset.set(
                                preset.textureSettings.offset.x,
                                preset.textureSettings.offset.y
                            );
                            map.rotation = THREE.MathUtils.degToRad(preset.textureSettings.rotation);
                            map.needsUpdate = true;
                        }
                    });
                }
            } catch (error) {
                console.error('Error loading textures:', error);
            }
        }

        material.needsUpdate = true;
          // Store the exact property values in the material's userData for consistency
            material.userData = material.userData || {};
            material.userData.exactRoughness = material.roughness;
            material.userData.exactMetalness = material.metalness;
            
        return material;
    }

    async initializeUI() {
        if (this.initialized) return;

        // Create material select if it doesn't exist
        let materialSelect = document.getElementById('materialSelect');
        if (!materialSelect) {
            materialSelect = document.createElement('select');
            materialSelect.id = 'materialSelect';
            document.getElementById('materialSelect-container')?.appendChild(materialSelect);
        }

        materialSelect.innerHTML = '';
        
        // Add material options
        Object.entries(this.materialPresets).forEach(([key, preset]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = preset.name;
            materialSelect.appendChild(option);
        });

        const newSelect = materialSelect.cloneNode(true);
        materialSelect.parentNode?.replaceChild(newSelect, materialSelect);

        newSelect.addEventListener('change', async (event) => {
            if (window.selectedModelPart) {
                await this.updateMaterial(window.selectedModelPart, event.target.value);
            }
        });

        this.initialized = true;
    }

    async updateMaterial(object, materialType) {
        if (!object || !this.materialPresets[materialType]) return;
        
        const preset = this.materialPresets[materialType];
        const newMaterial = await this.createMaterialWithTextures(materialType, preset);
        
        if (object.material) {
            object.material.dispose();
        }
        
        object.material = newMaterial;
        
        // Store exact color in userData for consistent color picking
        if (object.material.color) {
            object.userData.exactColor = '#' + object.material.color.getHexString();
        }
        
        object.material.needsUpdate = true;
    }

    getPreset(materialType) {
        return this.materialPresets[materialType];
    }

    dispose() {
        this.loadedTextures.forEach(texture => texture.dispose());
        this.loadedTextures.clear();
    }
}