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
                    scale: 10.0,        // Single scale value for both X and Y
                    offset: { x: 0, y: 0 },  // Offset the texture slightly
                    rotation: 0        // No rotation
                },
                texturePaths: {
                    normalMap: 'cotton/normal',
                    //roughnessMap: 'cotton/roughness',
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
                    scale: 10.0,        // Single scale value for both X and Y
                    offset: { x: 0, y: 0 },  // Offset the texture slightly
                    rotation: 0        // No rotation
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
                    scale: 2.0,        // Single scale value for both X and Y
                    offset: { x: 0, y: 0.2 },  // Offset the texture slightly
                    rotation: 0        // No rotation
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
            this.updateLoadingLog(`Using cached texture for ${mapType}`);
            return this.loadedTextures.get(cacheKey);
        }

        this.updateLoadingLog(`Loading texture: ${mapType}`);
        
        const extensions = ['png', 'jpg', 'jpeg'];
        
        for (const ext of extensions) {
            const fullPath = `${this.texturePath}${basePath}.${ext}`;
            
            try {
                const texture = await new Promise((resolve, reject) => {
                    this.textureLoader.load(
                        fullPath,
                        (tex) => {
                            this.updateLoadingLog(`Loaded texture: ${basePath}`);
                            tex.encoding = THREE.sRGBEncoding;
                            tex.wrapS = THREE.RepeatWrapping;
                            tex.wrapT = THREE.RepeatWrapping;
                            resolve(tex);
                        },
                        (progress) => {
                            if (progress.lengthComputable) {
                                const percent = (progress.loaded / progress.total * 100).toFixed(2);
                                this.updateLoadingLog(`Loading ${basePath}: ${percent}%`);
                            }
                        },
                        reject
                    );
                });
                
                this.loadedTextures.set(cacheKey, texture);
                return texture;
            } catch (error) {
                continue;
            }
        }
        
        this.updateLoadingLog(`No texture found for ${basePath}`);
        return null;
    }

    async createMaterialWithTextures(presetName, preset) {
        this.updateLoadingLog(`Creating material: ${presetName}`);
        
        const material = new THREE.MeshPhysicalMaterial({
            name: presetName,
            color: preset.baseColor,
            roughness: preset.roughness,
            metalness: preset.metalness,
            normalScale: new THREE.Vector2(preset.normalScale, preset.normalScale),
            sheen: preset.sheen,
            side: THREE.DoubleSide,
            shadowSide : THREE.DoubleSide,
            transparent: true
        });

        if (preset.texturePaths) {
            const texturePromises = Object.entries(preset.texturePaths).map(async ([mapType, path]) => {
                const texture = await this.tryLoadTexture(path, mapType);
                if (texture) {
                    // Apply the fixed texture settings
                    const settings = preset.textureSettings;
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;
                    texture.repeat.set(settings.scale, settings.scale);
                    texture.offset.set(settings.offset.x, settings.offset.y);
                    texture.rotation = THREE.MathUtils.degToRad(settings.rotation);
                    
                    switch(mapType) {
                        case 'normalMap':
                            material.normalMap = texture;
                            break;
                        case 'roughnessMap':
                            material.roughnessMap = texture;
                            break;
                        case 'aoMap':
                            material.aoMap = texture;
                            material.aoMapIntensity = 1.0;
                            break;
                        case 'diffuseMap':
                            material.map = texture;
                            break;
                    }
                }
            });

            await Promise.all(texturePromises);
        }

        return material;
    }

    async initializeUI() {
        if (this.initialized) return;

        const materialSelect = document.getElementById('materialSelect');
        if (!materialSelect) {
            this.updateLoadingLog('Material select element not found');
            return;
        }

        materialSelect.innerHTML = '';
        
        for (const [key, preset] of Object.entries(this.materialPresets)) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = preset.name;
            materialSelect.appendChild(option);
        }

        const newSelect = materialSelect.cloneNode(true);
        materialSelect.parentNode.replaceChild(newSelect, materialSelect);

        newSelect.addEventListener('change', async (event) => {
            if (window.selectedModelPart) {
                await this.updateMaterial(window.selectedModelPart, event.target.value);
            }
        });

        this.initialized = true;
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
        }
    }

    updateUISliders(preset) {
        const roughnessSlider = document.getElementById('roughness');
        const metalnessSlider = document.getElementById('metalness');
        
        if (roughnessSlider) roughnessSlider.value = preset.roughness;
        if (metalnessSlider) metalnessSlider.value = preset.metalness;
    }
}
