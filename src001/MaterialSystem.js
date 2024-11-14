import * as THREE from 'three';

export class MaterialSystem {
    constructor() {
        this.textureLoader = new THREE.TextureLoader();
        this.materialPresets = new Map();
        this.loadedTextures = new Map();
        this.supportedFormats = ['jpg', 'png', 'jpeg', 'webp'];
        this.TEXTURE_BASE_PATH = '/Textures/';
    }

    async loadTexture(basePath, textureName, formats) {
        const cacheKey = `${basePath}_${textureName}`;
        if (this.loadedTextures.has(cacheKey)) {
            return this.loadedTextures.get(cacheKey);
        }

        for (const format of formats) {
            const path = `${this.TEXTURE_BASE_PATH}${basePath}/${textureName}.${format}`;
            try {
                const texture = await new Promise((resolve, reject) => {
                    this.textureLoader.load(
                        path,
                        (texture) => {
                            console.log(`✅ Loaded ${textureName} texture from: ${path}`);
                            resolve(texture);
                        },
                        (progress) => {
                            console.log(`📊 Loading ${textureName}: ${Math.round((progress.loaded / progress.total) * 100)}%`);
                        },
                        (error) => reject(error)
                    );
                });

                this.loadedTextures.set(cacheKey, texture);
                return texture;
            } catch (error) {
                console.log(`⚠️ Couldn't load ${path}, trying next format...`);
                continue;
            }
        }
        console.log(`❌ Failed to load ${textureName} texture for ${basePath} in any format`);
        return null;
    }

    configureTexture(texture, settings = {}) {
        const {
            repeatX = 1,
            repeatY = 1,
            wrapS = THREE.RepeatWrapping,
            wrapT = THREE.RepeatWrapping,
            encoding = THREE.sRGBEncoding
        } = settings;

        if (texture) {
            texture.repeat.set(repeatX, repeatY);
            texture.wrapS = wrapS;
            texture.wrapT = wrapT;
            texture.encoding = encoding;
            texture.needsUpdate = true;
        }
        return texture;
    }

    async createMaterial(materialName, baseColor = 0xffffff) {
        console.log(`🏗️ Creating PBR material for: ${materialName}`);
        
        const material = new THREE.MeshPhysicalMaterial({
            color: baseColor,
            roughness: 0.5,
            metalness: 0.0,
            envMapIntensity: 1.0,
            normalScale: new THREE.Vector2(1, 1),
            aoMapIntensity: 1.0,
            side: THREE.DoubleSide
        });

        try {
            // Load all possible textures
            const texturePromises = {
                diffuse: this.loadTexture(materialName, 'diffuse', this.supportedFormats),
                normal: this.loadTexture(materialName, 'normal', this.supportedFormats),
                roughness: this.loadTexture(materialName, 'roughness', this.supportedFormats),
                ao: this.loadTexture(materialName, 'ao', this.supportedFormats),
                metalness: this.loadTexture(materialName, 'metalness', this.supportedFormats)
            };

            const textures = await Promise.all(Object.values(texturePromises));
            const textureMap = {};

            // Process each loaded texture
            for (const [type, promise] of Object.entries(texturePromises)) {
                const texture = await promise;
                if (texture) {
                    this.configureTexture(texture);
                    textureMap[type] = texture;
                }
            }

            // Apply textures to material
            if (textureMap.diffuse) {
                material.map = textureMap.diffuse;
                // Set up for color multiplication with diffuse map
                material.color.setHex(baseColor);
                material.map.encoding = THREE.sRGBEncoding;
            }

            if (textureMap.normal) {
                material.normalMap = textureMap.normal;
            }

            if (textureMap.roughness) {
                material.roughnessMap = textureMap.roughness;
            }

            if (textureMap.ao) {
                material.aoMap = textureMap.ao;
            }

            if (textureMap.metalness) {
                material.metalnessMap = textureMap.metalness;
            }

            // Store the material preset
            this.materialPresets.set(materialName, {
                material,
                textureMap,
                updateColor: (color) => {
                    material.color.setHex(color);
                    if (material.map) {
                        // Preserve diffuse map details while updating color
                        material.color.convertSRGBToLinear();
                    }
                }
            });

            console.log(`✅ Successfully created PBR material: ${materialName}`);
            return this.materialPresets.get(materialName);

        } catch (error) {
            console.error(`❌ Error creating material ${materialName}:`, error);
            return null;
        }
    }

    // Method to get or create a material
    async getMaterial(materialName, color) {
        if (this.materialPresets.has(materialName)) {
            const preset = this.materialPresets.get(materialName);
            if (color !== undefined) {
                preset.updateColor(color);
            }
            return preset;
        }
        return await this.createMaterial(materialName, color);
    }

    // Method to update material color
    updateMaterialColor(materialName, color) {
        const preset = this.materialPresets.get(materialName);
        if (preset) {
            preset.updateColor(color);
        }
    }
}

// Example usage
export async function initMaterials() {
    const materialSystem = new MaterialSystem();
    
    // Initialize base materials
    const materials = {};
    const materialTypes = [
        'cotton',
        'nylon',
        'leather',
        'denim',
        'metal',
        'plastic'
    ];

    // Create all materials
    await Promise.all(materialTypes.map(async (type) => {
        const materialPreset = await materialSystem.createMaterial(type);
        if (materialPreset) {
            materials[type] = materialPreset.material;
        }
    }));

    // Export both the materials and the system for future updates
    return {
        materials,
        materialSystem
    };
}
