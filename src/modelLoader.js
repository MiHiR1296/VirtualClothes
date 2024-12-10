import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ModelControls } from './ModelControls.js';

const MODEL_PATHS = {
    'model1': {
        directory: '/Models/Polo_T-shirt',
        materials: ['Backtex.glb', 'Buttons.glb', 'Fronttex.glb', 'Polo_T-shirt.glb', 'Threads.glb'],
        useDefaultMaterials: false,
        hasAnimations: true
    },
    'model2': {
        directory: '/Models/CrewNeck_HS_T-shirt_CasPants',
        materials: ['Backtex.glb', 'Fronttex.glb', 'Zipper.glb', 'Avatar.glb', 'Metal.glb', 'CrewNeck_HS.glb', 'Pants.glb'],
        useDefaultMaterials: false,
        hasAnimations: true
    },
    'model3': {
        directory: '/Models/VNeck_FS_CasPants',
        materials: ['Backtex.glb', 'Fronttex.glb', 'Zipper.glb', 'Avatar.glb', 'V-Neck.glb', 'Pants.glb'],
        useDefaultMaterials: false,
        hasAnimations: true
    },
    'model4': {
        directory: '/Models/Hoodie_Pants',
        materials: ['Backtex.glb', 'Fronttex.glb', 'Zipper.glb', 'Avatar.glb', 'Metal.glb', 'Pants.glb', 'Threads.glb', 'Hoodie.glb'],
        useDefaultMaterials: false,
        hasAnimations: true
    },
    'model5': {
        directory: '/Models/Kids_Tracksuite',
        materials: ['Fronttex.glb', 'Zipper.glb', 'Jacket.glb', 'Pants.glb'],
        useDefaultMaterials: true,
        hasAnimations: false
    },
    'model6': {
        directory: '/Models/Kids_Turtleneck',
        materials: ['Fronttex.glb', 'TurtleNeck.glb'],
        useDefaultMaterials: true,
        hasAnimations: false
    }
};

const MATERIAL_PRESETS = {
    'Avatar': {
        type: 'MeshPhysicalMaterial',
        properties: {
            color: 0xF5D0C5,
            roughness: 0.7,
            metalness: 0.0,
            sheen: 0.3,
            sheenRoughness: 1,
            clearcoat: 0.01
        }
    },
    'Pants': {
        type: 'MeshPhysicalMaterial',
        properties: {
            color: 0x1a237e,
            roughness: 1,
            metalness: 0.0,
            sheen: 0.01,
            sheenRoughness: 1
        }
    }
};

export class ModelLoader {
    constructor(scene, loadingManager, sceneManager) {
        this.scene = scene;
        this.loadingManager = loadingManager;
        this.sceneManager = sceneManager;
        this.modelControls = new ModelControls();
        this.gltfLoader = new GLTFLoader(loadingManager.createThreeJSManager());
        this.currentModel = null;
        this.loadedModelGroup = null;
    }

    createPresetMaterial(presetName) {
        const preset = MATERIAL_PRESETS[presetName];
        if (!preset) return null;

        let material;
        if (preset.type === 'MeshPhysicalMaterial') {
            material = new THREE.MeshPhysicalMaterial(preset.properties);
        } else {
            material = new THREE.MeshStandardMaterial(preset.properties);
        }

        return material;
    }

    applyPresetMaterial(object, objectName, useDefaultMaterials) {
        if (!useDefaultMaterials) {
            if (objectName.includes('Avatar') || objectName === 'Avatar') {
                const material = this.createPresetMaterial('Avatar');
                if (material) {
                    object.material = material;
                    object.material.needsUpdate = true;
                }
            }
        }
    }

    async loadModels(materialManager, selectedModel = 'model1') {
        try {
            const modelConfig = MODEL_PATHS[selectedModel];
            if (!modelConfig) {
                throw new Error('Invalid model selection');
            }
        
            // Set current model directory globally
            window.currentModelDirectory = modelConfig.directory;
            console.log('Set current model directory:', window.currentModelDirectory);
        
            // Start loading process with correct total count
            this.loadingManager.startLoading(modelConfig.materials.length);
            this.loadingManager.updateLog(`Loading model set: ${selectedModel}`);
            
            await this.clearCurrentModel();
            
            this.loadedModelGroup = new THREE.Group();
            this.loadedModelGroup.userData.isLoadedModel = true;
            this.scene.add(this.loadedModelGroup);
        
            const mixer = modelConfig.hasAnimations ? new THREE.AnimationMixer(this.loadedModelGroup) : null;
            
            try {
                for (const filename of modelConfig.materials) {
                    const modelPath = `${modelConfig.directory}/${filename}`;
                    await this.loadModelPart(modelPath, materialManager, modelConfig, mixer);
                    this.loadingManager.itemLoaded();
                    this.loadingManager.updateLog(`Loaded ${filename}`);
                }
    
                if (!this.validateModelLoaded()) {
                    throw new Error('Model failed to load properly');
                }
    
                this.loadingManager.updateLog('Model loaded successfully');
                return this.modelControls;
            } catch (error) {
                console.error('Error during model loading:', error);
                this.loadingManager.hide();
                throw error;
            }
        
        } catch (error) {
            console.error('Error in loadModels:', error);
            this.loadingManager.updateLog(`Error: ${error.message}`);
            this.loadingManager.hide();
            throw error;
        }
    }

    validateModelLoaded() {
        let hasVisibleMeshes = false;
        this.scene.traverse((object) => {
            if (object.isMesh && object.userData.isImported) {
                hasVisibleMeshes = true;
            }
        });
        return hasVisibleMeshes;
    }

    clearCurrentModel() {
        return new Promise((resolve) => {
            if (this.loadedModelGroup) {
                // Stop all animations first
                this.modelControls.clearMixers();
    
                // Dispose geometries and materials
                this.loadedModelGroup.traverse((object) => {
                    if (object.isMesh) {
                        if (object.geometry) object.geometry.dispose();
                        if (object.material) {
                            if (Array.isArray(object.material)) {
                                object.material.forEach(material => {
                                    if (material.map) material.map.dispose();
                                    material.dispose();
                                });
                            } else {
                                if (object.material.map) object.material.map.dispose();
                                object.material.dispose();
                            }
                        }
                    }
                });
    
                // Remove from scene
                this.scene.remove(this.loadedModelGroup);
                this.loadedModelGroup = null;
            }
    
            // Small delay to ensure cleanup is complete
            setTimeout(resolve, 100);
        });
    }

    async loadModelPart(url, materialManager, modelConfig, groupMixer) {
        return new Promise((resolve, reject) => {
            this.gltfLoader.load(
                url,
                async (gltf) => {
                    try {
                        this.loadingManager.updateLog(`Processing: ${url}`);
                        
                        gltf.scene.traverse(async (object) => {
                            if (object.isMesh) {
                                object.geometry.computeVertexNormals();
                                object.userData.isImported = true;
                                
                                await this.processMeshMaterial(
                                    object, 
                                    materialManager, 
                                    modelConfig
                                );
                                
                                object.castShadow = true;
                                object.receiveShadow = true;
                            }
                        });
    
                        if (this.loadedModelGroup) {
                            this.loadedModelGroup.add(gltf.scene);
                        }
    
                        // Updated animation handling
                        if (modelConfig.hasAnimations && gltf.animations?.length > 0 && groupMixer) {
                            gltf.animations.forEach(animation => {
                                const action = groupMixer.clipAction(animation);
                                this.modelControls.addMixer(groupMixer, action); // Changed from addAction to addMixer
                            });
                        }
    
                        resolve(gltf);
                    } catch (error) {
                        reject(error);
                    }
                },
                undefined,
                reject
            );
        });
    }

    async processMeshMaterial(object, materialManager, modelConfig) {
        try {
            if (object.name.includes("Fronttex") || object.name.includes("Backtex")) {
                const textureMaterial = new THREE.MeshPhysicalMaterial({
                    transparent: true,
                    side: THREE.FrontSide,
                    depthWrite: true,
                    depthTest: true,
                    alphaTest: 0.1,
                    roughness: 0,
                    clearcoat: 1,
                    clearcoatRoughness: 0,
                    color: 0xffffff
                });
    
                // Enable texture wrapping for potential repeating textures
                if (textureMaterial.map) {
                    textureMaterial.map.wrapS = THREE.RepeatWrapping;
                    textureMaterial.map.wrapT = THREE.RepeatWrapping;
                    textureMaterial.map.needsUpdate = true;
                }
    
                object.material = textureMaterial;
                object.renderOrder = 1;
            } else if (!modelConfig.useDefaultMaterials) {
                this.applyPresetMaterial(object, object.name, modelConfig.useDefaultMaterials);
                
                if (!MATERIAL_PRESETS[object.name]) {
                    await materialManager.updateMaterial(object, 'cotton');
                }
            }
        } catch (error) {
            console.error('Error processing mesh material:', error);
            throw error;
        }
    }
}