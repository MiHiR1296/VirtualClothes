import * as THREE from 'three';

export class MaterialManager {
    constructor() {
        console.warn('MaterialManager: Starting initialization'); // Using warn for more visibility
        
        this.textureLoader = new THREE.TextureLoader();
        this.loadedTextures = new Map();
        this.texturePath = '/Textures/'; // Changed to absolute path
        this.initialized = false;
        
        // Default material presets with fallback values
        this.materialPresets = {
            cotton: {
                name: 'Cotton',
                baseColor: 0xffffff,
                roughness: 0.9,
                metalness: 0.0,
                normalScale: 1.0,
                sheen: 0.1,
                texturePaths: {
                    normalMap: 'cotton/normal',
                    roughnessMap: 'cotton/roughness',
                    aoMap: 'cotton/ao',
                    diffuseMap: 'cotton/diffuse'
                }
            },
            nylon: {
                name: 'Nylon',
                baseColor: 0xffffff,
                roughness: 0.4,
                metalness: 0.1,
                normalScale: 0.5,
                sheen: 0.3,
                texturePaths: {
                    normalMap: 'nylon/normal',
                    roughnessMap: 'nylon/roughness',
                    aoMap: 'nylon/ao',
                    diffuseMap: 'nylon/diffuse'
                }
            },
            leather: {
                name: 'Leather',
                baseColor: 0xffffff,
                roughness: 0.7,
                metalness: 0.0,
                normalScale: 1.5,
                sheen: 0.05,
                texturePaths: {
                    normalMap: 'leather/normal',
                    roughnessMap: 'leather/roughness',
                    aoMap: 'leather/ao',
                    diffuseMap: 'leather/diffuse'
                }
            }
        };

        console.log('MaterialManager: Preset materials configured:', Object.keys(this.materialPresets));
        
        // Initialize UI after DOM is loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeUI());
        } else {
            this.initializeUI();
        }
    }

    async tryLoadTexture(basePath, mapType) {
        const cacheKey = `${basePath}_${mapType}`;
        
        // Check cache first
        if (this.loadedTextures.has(cacheKey)) {
            console.log(`Using cached texture for ${mapType}`);
            return this.loadedTextures.get(cacheKey);
        }

        console.log(`Attempting to load ${mapType} texture from ${basePath}`);
        
        const extensions = ['png', 'jpg', 'jpeg'];
        
        for (const ext of extensions) {
            const fullPath = `${this.texturePath}${basePath}.${ext}`;
            console.log(`Trying path: ${fullPath}`);
            
            try {
                const texture = await new Promise((resolve, reject) => {
                    this.textureLoader.load(
                        fullPath,
                        (tex) => {
                            console.log(`✅ Successfully loaded texture: ${fullPath}`);
                            // Configure texture
                            tex.encoding = THREE.sRGBEncoding;
                            tex.wrapS = THREE.RepeatWrapping;
                            tex.wrapT = THREE.RepeatWrapping;
                            resolve(tex);
                        },
                        (progress) => {
                            if (progress.lengthComputable) {
                                const percent = (progress.loaded / progress.total * 100).toFixed(2);
                                console.log(`Loading progress for ${fullPath}: ${percent}%`);
                            }
                        },
                        (error) => {
                            console.warn(`Failed to load texture: ${fullPath}`, error);
                            reject(error);
                        }
                    );
                });
                
                // Cache the successfully loaded texture
                this.loadedTextures.set(cacheKey, texture);
                return texture;
            } catch (error) {
                console.log(`Failed with extension ${ext}, trying next...`);
                continue;
            }
        }
        
        console.warn(`❌ No texture found for ${basePath} with any extension`);
        return null;
    }

    async createMaterialWithTextures(presetName, preset) {
        console.log(`Creating material for ${presetName}`);
        
        const material = new THREE.MeshPhysicalMaterial({
            name: presetName,
            color: preset.baseColor,
            roughness: preset.roughness,
            metalness: preset.metalness,
            normalScale: new THREE.Vector2(preset.normalScale, preset.normalScale),
            sheen: preset.sheen,
            side: THREE.DoubleSide,
            transparent: true
        });

        let hasTextures = false;

        if (preset.texturePaths) {
            const texturePromises = Object.entries(preset.texturePaths).map(async ([mapType, path]) => {
                console.log(`Processing ${mapType} for ${presetName}`);
                
                const texture = await this.tryLoadTexture(path, mapType);
                if (texture) {
                    console.log(`Applying ${mapType} to material`);
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
                    hasTextures = true;
                }
            });

            await Promise.all(texturePromises);
        }

        console.log(`Material creation ${hasTextures ? 'completed with' : 'completed without'} textures for ${presetName}`);
        return material;
    }

    async initializeUI() {
        if (this.initialized) {
            console.log('MaterialManager: UI already initialized');
            return;
        }

        console.log('MaterialManager: Starting UI initialization');
        
        const materialSelect = document.getElementById('materialSelect');
        if (!materialSelect) {
            console.error('MaterialManager: Material select element not found');
            console.log('Available elements with IDs:', 
                Array.from(document.querySelectorAll('[id]')).map(el => el.id)
            );
            return;
        }

        // Clear existing options
        materialSelect.innerHTML = '';
        
        // Create and add options
        for (const [key, preset] of Object.entries(this.materialPresets)) {
            console.log(`Adding material option: ${preset.name}`);
            const option = document.createElement('option');
            option.value = key;
            option.textContent = preset.name;
            materialSelect.appendChild(option);
        }

        // Remove any existing listeners to prevent duplicates
        const newSelect = materialSelect.cloneNode(true);
        materialSelect.parentNode.replaceChild(newSelect, materialSelect);

        // Add event listener
        newSelect.addEventListener('change', async (event) => {
            console.log(`Material selection changed to: ${event.target.value}`);
            if (window.selectedModelPart) {
                await this.updateMaterial(window.selectedModelPart, event.target.value);
            } else {
                console.warn('Please select a part of the model first');
            }
        });

        this.initialized = true;
        console.log('MaterialManager: UI initialization complete');
    }

    async updateMaterial(object, presetName) {
        console.log(`Updating material for ${object.name} to ${presetName}`);
        
        try {
            const preset = this.materialPresets[presetName];
            if (!preset) {
                throw new Error(`Material preset '${presetName}' not found`);
            }

            // Preserve current color if it exists
            const currentColor = object.material?.color?.getHex() ?? preset.baseColor;
            
            // Create new material
            const material = await this.createMaterialWithTextures(presetName, {
                ...preset,
                baseColor: currentColor
            });

            // Update the object's material
            object.material = material;
            object.material.needsUpdate = true;

            // Update UI sliders
            this.updateUISliders(preset);
            
            console.log(`Successfully updated material for ${object.name}`);

        } catch (error) {
            console.error('Error updating material:', error);
        }
    }

    updateUISliders(preset) {
        const roughnessSlider = document.getElementById('roughness');
        const metalnessSlider = document.getElementById('metalness');
        
        if (roughnessSlider) {
            roughnessSlider.value = preset.roughness;
            console.log(`Updated roughness slider to ${preset.roughness}`);
        } else {
            console.warn('Roughness slider not found');
        }

        if (metalnessSlider) {
            metalnessSlider.value = preset.metalness;
            console.log(`Updated metalness slider to ${preset.metalness}`);
        } else {
            console.warn('Metalness slider not found');
        }
    }
}