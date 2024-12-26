import * as THREE from 'three';

export class MaterialManager {
    constructor() {
        this.textureLoader = new THREE.TextureLoader();
        this.loadedTextures = new Map();
        this.texturePath = '/Textures/';
        this.initialized = false;
        
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
            //envMapIntensity: LIGHTING_CONFIG.environmentMap.envMapIntensity,
            sheenRoughness: preset.sheenRoughness || 0.8,
            clearcoat: preset.clearcoat || 0,
            transmission: preset.transmission || 0,
            side: THREE.DoubleSide,
            transparent: true
        };

        const material = new THREE.MeshPhysicalMaterial(materialParams);

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

        // Create controls
        this.createMaterialControls();

        const newSelect = materialSelect.cloneNode(true);
        materialSelect.parentNode?.replaceChild(newSelect, materialSelect);

        newSelect.addEventListener('change', async (event) => {
            if (window.selectedModelPart) {
                await this.updateMaterial(window.selectedModelPart, event.target.value);
            }
        });

        this.initialized = true;
    }

    createMaterialControls() {
        const container = document.getElementById('workspace-colors');
        if (!container) return;

        // Create roughness slider
        if (!document.getElementById('roughness')) {
            const roughnessGroup = document.createElement('div');
            roughnessGroup.className = 'control-group';
            
            const roughnessLabel = document.createElement('label');
            roughnessLabel.className = 'control-label';
            roughnessLabel.textContent = 'Roughness';
            
            const roughnessSlider = document.createElement('input');
            roughnessSlider.type = 'range';
            roughnessSlider.id = 'roughness';
            roughnessSlider.min = '0';
            roughnessSlider.max = '1';
            roughnessSlider.step = '0.01';
            roughnessSlider.className = 'w-full accent-blue-500';

            roughnessGroup.appendChild(roughnessLabel);
            roughnessGroup.appendChild(roughnessSlider);
            container.appendChild(roughnessGroup);

            roughnessSlider.addEventListener('input', (event) => {
                if (window.selectedModelPart?.material) {
                    window.selectedModelPart.material.roughness = parseFloat(event.target.value);
                    window.selectedModelPart.material.needsUpdate = true;
                }
            });
        }

        // Create metalness slider
        if (!document.getElementById('metalness')) {
            const metalnessGroup = document.createElement('div');
            metalnessGroup.className = 'control-group';
            
            const metalnessLabel = document.createElement('label');
            metalnessLabel.className = 'control-label';
            metalnessLabel.textContent = 'Metalness';
            
            const metalnessSlider = document.createElement('input');
            metalnessSlider.type = 'range';
            metalnessSlider.id = 'metalness';
            metalnessSlider.min = '0';
            metalnessSlider.max = '1';
            metalnessSlider.step = '0.01';
            metalnessSlider.className = 'w-full accent-blue-500';

            metalnessGroup.appendChild(metalnessLabel);
            metalnessGroup.appendChild(metalnessSlider);
            container.appendChild(metalnessGroup);

            metalnessSlider.addEventListener('input', (event) => {
                if (window.selectedModelPart?.material) {
                    window.selectedModelPart.material.metalness = parseFloat(event.target.value);
                    window.selectedModelPart.material.needsUpdate = true;
                }
            });
        }
    }

    async updateMaterial(object, presetName) {
        this.updateLoadingLog(`Updating material for ${object.name}`);
        
        try {
            const preset = this.materialPresets[presetName];
            if (!preset) {
                throw new Error(`Material preset '${presetName}' not found`);
            }

            const currentColor = object.material?.color?.getHex() ?? preset.baseColor;
            
            const material = await this.createMaterialWithTextures(presetName, {
                ...preset,
                baseColor: currentColor
            });

            object.material = material;
            object.material.needsUpdate = true;

            this.updateUISliders(preset);
            
            this.updateLoadingLog(`Updated material for ${object.name}`);

        } catch (error) {
            this.updateLoadingLog(`Error updating material: ${error.message}`);
            console.error('Error updating material:', error);
        }
    }

    updateUISliders(preset) {
        const roughnessSlider = document.getElementById('roughness');
        const metalnessSlider = document.getElementById('metalness');
        
        if (roughnessSlider) roughnessSlider.value = preset.roughness;
        if (metalnessSlider) metalnessSlider.value = preset.metalness;
    }
}