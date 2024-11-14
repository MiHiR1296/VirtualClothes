import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ModelControls } from './modelControls.js';

const MODEL_PATHS = {
    'model1': {
        directory: '/Models/Polo_T-shirt',
        materials: ['Backtex.glb', 'Buttons.glb', 'Fronttex.glb', 'Polo_T-shirt.glb', 'Threads.glb' ]
    },
    'model2': {
        directory: '/Models/CrewNeck_HS_T-shirt_CasPants',
        materials: ['Backtex.glb', 'Fronttex.glb', 'Zipper.glb', 'Avatar.glb', 'Metal.glb', 'CrewNeck_HS.glb', 'Pants.glb']
    },
    'model3': {
        directory: '/Models/VNeck_FS_CasPants',
        materials: ['Backtex.glb', 'Fronttex.glb', 'Zipper.glb', 'Avatar.glb', 'V-Neck.glb', 'Pants.glb']
    },
    'model4': {
        directory: '/Models/Hoodie_Pants',
        materials: ['Backtex.glb', 'Fronttex.glb', 'Zipper.glb', 'Avatar.glb', 'Metal.glb', 'Pants.glb', 'Threads.glb', 'Hoodie.glb']
    }
};

// Define material presets
const MATERIAL_PRESETS = {
    'Avatar': {
        type: 'MeshPhysicalMaterial',
        properties: {
            color: 0xF5D0C5,  // Skin tone color
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
            color: 0x1a237e,  // Deep blue color
            roughness: 1,
            metalness: 0.0,
            sheen: 0.01,
            sheenRoughness: 1
        }
    }
};

export class ModelLoader {
    constructor(scene, loadingManager) {
        this.scene = scene;
        this.loadingManager = loadingManager;
        this.modelControls = new ModelControls();
        this.gltfLoader = new GLTFLoader(loadingManager.createThreeJSManager());
        this.currentModel = null;
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

    applyPresetMaterial(object, objectName) {
        // Check if this object should have a preset material
        if (objectName.includes('Avatar') || objectName === 'Avatar') {
            const material = this.createPresetMaterial('Avatar');
            if (material) {
                object.material = material;
                object.material.needsUpdate = true;
            }
        // } else if (objectName.includes('Pants') || objectName === 'Pants') {
        //     const material = this.createPresetMaterial('Pants');
        //     if (material) {
        //         object.material = material;
        //         object.material.needsUpdate = true;
        //     }
        }
    }

    async loadModels(materialManager, selectedModel = 'model1') {
        this.loadingManager.show();
        this.loadingManager.updateLog(`Loading model set: ${selectedModel}`);
        
        // Clear existing models
        this.clearCurrentModel();
        
        const modelConfig = MODEL_PATHS[selectedModel];
        if (!modelConfig) {
            this.loadingManager.updateLog('Invalid model selection');
            return this.modelControls;
        }

        try {
            const modelPromises = modelConfig.materials.map((filename) => {
                const modelPath = `${modelConfig.directory}/${filename}`;
                return this.loadModelWithAnimation(modelPath, materialManager);
            });

            await Promise.all(modelPromises);
            
            this.loadingManager.updateLog('Starting animations...');
            
            // Start animations after all models are loaded
            setTimeout(() => {
                this.modelControls.playAllAnimations();
            }, 100);
            
            setTimeout(() => this.loadingManager.hide(), 500);
            return this.modelControls;

        } catch (error) {
            console.error('Error loading models:', error);
            this.loadingManager.updateLog(`Error loading models: ${error.message}`);
            setTimeout(() => this.loadingManager.hide(), 500);
            return this.modelControls;
        }
    }

    clearCurrentModel() {
        this.scene.children = this.scene.children.filter(child => {
            if (child.type === 'Group' && child.userData.isLoadedModel) {
                child.traverse((object) => {
                    if (object.isMesh) {
                        if (object.geometry) object.geometry.dispose();
                        if (object.material) {
                            if (Array.isArray(object.material)) {
                                object.material.forEach(material => material.dispose());
                            } else {
                                object.material.dispose();
                            }
                        }
                    }
                });
                return false;
            }
            return true;
        });

        this.modelControls.clearMixers();
    }

    async loadModelWithAnimation(url, materialManager) {
        this.loadingManager.updateLog(`Loading: ${url}`);
        
        return new Promise((resolve, reject) => {
            this.gltfLoader.load(url,
                async (gltf) => {
                    this.loadingManager.updateLog(`Processing: ${url}`);
                    
                    gltf.scene.traverse(async (object) => {
                        if (object.isMesh) {
                            if (object.geometry) {
                                object.geometry.computeVertexNormals();
                            }
                            
                            object.userData.isImported = true;
                            
                            if (object.name.includes("Fronttex") || object.name.includes("Backtex")) {
                                const textureMaterial = new THREE.MeshStandardMaterial({
                                    transparent: true,
                                    side: THREE.FrontSide,
                                    depthWrite: true,
                                    depthTest: true,
                                    alphaTest: 0.1,
                                    roughness: 0,
                                   
                                    clearcoat: 1,
                                    color: 0xffffff
                                });
                                object.material = textureMaterial;
                                object.renderOrder = 1;
                            } else {
                                // Apply preset materials first
                               this.applyPresetMaterial(object, object.name);
                                
                                // If no preset was applied, use the default material
                                if (!MATERIAL_PRESETS[object.name]) {
                                    await materialManager.updateMaterial(object, 'cotton');
                                }
                            }
                            
                            object.castShadow = true;
                            object.receiveShadow = true;
                        }
                    });

                    gltf.scene.userData.isLoadedModel = true;
                    this.scene.add(gltf.scene);

                    if (gltf.animations?.length > 0) {
                        const mixer = new THREE.AnimationMixer(gltf.scene);
                        const action = mixer.clipAction(gltf.animations[0]);
                        this.modelControls.addMixer(mixer, action);
                    }

                    resolve(gltf);
                },
                (progress) => {
                    if (progress.lengthComputable) {
                        const percentComplete = Math.round((progress.loaded / progress.total) * 100);
                        this.loadingManager.updateLog(`Loading ${url}: ${percentComplete}%`);
                    }
                },
                reject
            );
        });
    }
}