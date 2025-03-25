import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ModelControls } from './modelControls.js';
import { OptimizedMaterialManager } from './OptimizedMaterialManager.js';
import { getModelPath, getTexturePath } from './paths.js';

export const MODEL_PATHS = {
    // Men's Collection
   'men_polo_hs': {
    name: "Men's Polo Half Sleeve",
    directory: 'Models/Men_Polo_shirt_HS',
    materials: ['Fronttex.glb', 'Inside.glb', 'Back.glb', 'Front.glb', 'Sleeve_L.glb', 'Sleeve_R.glb', 'Buttons.glb', 'Button-Stitches.glb', 'Collar_L.glb', 'Collar_U.glb', 'Placket_I.glb','Placket_U.glb'],
    useOptimizedMaterials: true,
    hasAnimations: false,
    category: "men",
    materialTypes: ['inside', 'outside', 'button', 'thread'],
    materialAssignments: {
        'inside': ['inside', 'collar_l','placket_i'],
        'outside': ['back', 'front', 'sleeve_l', 'sleeve_r', 'placket_u', 'collar_u'],
        'button': ['buttons'],
        'thread': ['button-stitches'],
    }
},
    'men_round_hs': {
        name: "Men's Round Neck Half Sleeve",
        directory: 'Models/Men_RoundNeck_T-shirt_HS',
        materials: ['Fronttex.glb', 'Inside.glb', 'Outside.glb'],
        useOptimizedMaterials: true,
        hasAnimations: false,
        category: "men",
        materialTypes: ['inside', 'outside', ],
        materialAssignments: {
            'inside': ['inside', '_inside_', 'collar', '_collar_'],
            'outside': ['outside', '_outside_', 'zipper', '_zipper_'],
            
        
            
        }
    },
    'men_hoodie': {
        name: "Men's Hoodie",
        directory: 'Models/Men_Hoodie',
        materials: ['Fronttex.glb', 'Inside.glb', 'Outside.glb', 'Zipper.glb', 'Metal.glb'],
        useOptimizedMaterials: true,
        hasAnimations: false,
        category: "men",
        materialTypes: ['inside', 'outside', 'button', 'thread', 'metal'],
        materialAssignments: {
            'inside': ['inside', '_inside_', 'collar', '_collar_'],
            'outside': ['outside', '_outside_', 'zipper', '_zipper_'],
            'button': ['button', '_button_'],
            
            'metal': ['metal', '_metal_']
        }
    },
    'men_jacket': {
        name: "Men's Jacket",
        directory: 'Models/Men_Jacket',
        materials: ['Fronttex.glb', 'Inside.glb', 'Outside.glb', 'Zipper.glb', 'Metal.glb', 'Threads.glb'],
        useOptimizedMaterials: true,
        hasAnimations: false,
        category: "men",
        materialTypes: ['inside', 'outside', 'metal'],
        materialAssignments: {
            'inside': ['inside', '_inside_', 'collar', '_collar_'],
            'outside': ['outside', '_outside_', 'zipper', '_zipper_'],
        
            'metal': ['metal', '_metal_']
        }
    },

    // Women's Collection
    'women_polo_hs': {
        name: "Women's Polo Half Sleeve",
        directory: 'Models/Women_Polo_shirt_HS',
        materials: ['Fronttex.glb', 'Inside.glb', 'Outside.glb', 'Buttons.glb', 'Collar.glb', 'Threads.glb'],
        useOptimizedMaterials: true,
        hasAnimations: false,
        category: "women",
        materialTypes: ['inside', 'outside', 'button', 'thread'],
        materialAssignments: {
            'inside': ['inside', '_inside_', 'collar', '_collar_'],
            'outside': ['outside', '_outside_', 'zipper', '_zipper_'],
            'button': ['button', '_button_'],
            'thread': ['thread', '_thread_'],
        
        }
    },
    'women_round_hs': {
        name: "Women's Round Neck Half Sleeve",
        directory: 'Models/Women_RoundNeck_T-shirt_HS',
        materials: ['Fronttex.glb', 'Inside.glb', 'Outside.glb', 'Collar.glb', 'Threads.glb'],
        useOptimizedMaterials: true,
        hasAnimations: false,
        category: "women",
        materialTypes: ['inside', 'outside' ],
        materialAssignments: {
            'inside': ['inside', '_inside_', 'collar', '_collar_'],
            'outside': ['outside', '_outside_', 'zipper', '_zipper_'],
          
        }
    }
};

export const getModelsByCategory = () => {
    const categories = {};
    
    Object.entries(MODEL_PATHS).forEach(([id, model]) => {
        const category = model.category || 'other';
        if (!categories[category]) {
            categories[category] = [];
        }
        categories[category].push({
            id,
            ...model
        });
    });
    
    return categories;
};

function updateModelConfigs(models) {
    const updatedModels = {};
    
    for (const [key, model] of Object.entries(models)) {
        const hasButtons = model.materials.some(m => m.includes('Button'));
        const hasZipper = model.materials.some(m => m.includes('Zipper'));
        const hasMetal = model.materials.some(m => m.includes('Metal'));
        
        // Base material types always present
        const materialTypes = ['inside', 'outside'];
        
        if (hasButtons) materialTypes.push('button');
        if (hasMetal) materialTypes.push('metal');
        
        // Build material assignments
        const materialAssignments = {
            'inside': ['inside', '_inside_', 'collar', '_collar_'],
            'outside': ['outside', '_outside_'],
            
        };
        
        if (hasButtons) {
            materialAssignments.button = ['button', '_button_'];
        }
        
        if (hasZipper) {
            materialAssignments.outside.push('zipper', '_zipper_');
        }
        
        if (hasMetal) {
            materialAssignments.metal = ['metal', '_metal_'];
        }
        
        updatedModels[key] = {
            ...model,
            materialTypes,
            materialAssignments
        };
    }
    
    return updatedModels;
}



export class ModelLoader {
    constructor(scene, loadingManager, sceneManager) {
        this.scene = scene;
        this.loadingManager = loadingManager;
        this.sceneManager = sceneManager;
        this.modelControls = new ModelControls();
        this.gltfLoader = new GLTFLoader(loadingManager.createThreeJSManager());
        this.currentModel = null;
        this.loadedModelGroup = null;
        this.optimizedMaterialManager = new OptimizedMaterialManager();

        // Add base path handling
        this.basePath = import.meta.env.BASE_URL || '/VirtualClothes/';
    }

    getFullPath(path) {
        if (!path) return null;
        
        // Remove leading slash if present and combine with base path
        const cleanPath = path.startsWith('/') ? path.slice(1) : path;
        return `${this.basePath}${cleanPath}`;
    }
    
    async  loadModelPart(url, modelConfig, mixer, materialSets = null) {
        return new Promise((resolve, reject) => {
            const fullPath = this.getFullPath(url);
            console.log('Loading model from:', fullPath);
            
            this.gltfLoader.load(
                fullPath,
                async (gltf) => {
                    try {
                        // Store the filename in userData for reference
                        gltf.userData = { fileName: url.split('/').pop() };
                        
                        await this.processLoadedModel(gltf, modelConfig, materialSets, mixer);
                        resolve(gltf);
                    } catch (error) {
                        console.error('Error processing model:', error);
                        reject(error);
                    }
                },
                (progress) => {
                    console.log(`Loading progress: ${(progress.loaded / progress.total * 100).toFixed(2)}%`);
                },
                reject
            );
        });
    }
    

    async loadModels(materialManager, selectedModel = 'men_polo_hs') {
        try {
            const modelConfig = MODEL_PATHS[selectedModel];
            if (!modelConfig) {
                throw new Error(`Invalid model selection: ${selectedModel}`);
            }
    
            // Use simple path joining
            const modelDirectory = `./${modelConfig.directory}`;
            console.log('Loading model from directory:', modelDirectory);
            
            // Set global variables for access by other components
            window.currentModel = selectedModel;
            window.currentModelDirectory = modelDirectory;
            
            this.loadingManager.startLoading(modelConfig.materials.length);
            await this.clearCurrentModel();
    
            this.loadedModelGroup = new THREE.Group();
            this.loadedModelGroup.userData.isLoadedModel = true;
            this.scene.add(this.loadedModelGroup);
    
            let materialSets = null;
            if (modelConfig.useOptimizedMaterials) {
                this.loadingManager.updateLog('Loading optimized materials...');
                materialSets = await this.optimizedMaterialManager.createMaterialsForModel(modelConfig);
            }
    
            // Load each model part
            for (const filename of modelConfig.materials) {
                const modelPath = `${modelDirectory}/${filename}`;
                console.log('Loading model part:', modelPath);
                
                try {
                    await this.loadModelPart(modelPath, modelConfig, null, materialSets);
                    this.loadingManager.itemLoaded();
                    this.loadingManager.updateLog(`Loaded ${filename}`);
                } catch (error) {
                    console.error(`Error loading model part ${filename}:`, error);
                    throw error;
                }
            }
    
            if (!this.validateModelLoaded()) {
                throw new Error('Model failed to load properly');
            }
            
            // Calculate center and update camera
            const center = this.sceneManager.calculateSceneCenter();
            this.sceneManager.updateControlsTarget(center);
            
            // Dispatch a custom event to notify other components that model has changed
            window.dispatchEvent(new CustomEvent('model-loaded', {
                detail: {
                    modelId: selectedModel,
                    modelConfig: modelConfig,
                    parts: modelConfig.materials
                        .map(material => material.replace('.glb', ''))
                        .filter(part => !part.includes('Fronttex') && !part.includes('Backtex')),
                    textureParts: modelConfig.textureMeshNames || []
                }
            }));
            
            console.log('Dispatched model-loaded event with parts:', 
                modelConfig.materials
                    .map(material => material.replace('.glb', ''))
                    .filter(part => !part.includes('Fronttex') && !part.includes('Backtex')),
                'and texture parts:',
                modelConfig.textureMeshNames || []
            );
    
            return this.modelControls;
        } catch (error) {
            console.error('Error in loadModels:', error);
            this.loadingManager.updateLog(`Error: ${error.message}`);
            throw error;
        } finally {
            this.loadingManager.hide();
        }
    }
    // async loadModelPart(url, modelConfig, mixer, materialSets = null) {
    //     return new Promise((resolve, reject) => {
    //         if (!url) {
    //             reject(new Error('Invalid model URL'));
    //             return;
    //         }
    
    //         console.log('Attempting to load model from:', url);
    
    //         this.gltfLoader.load(
    //             url,
    //             async (gltf) => {
    //                 try {
    //                     await this.processLoadedModel(gltf, modelConfig, materialSets, mixer);
    //                     resolve(gltf);
    //                 } catch (error) {
    //                     console.error('Error processing loaded model:', error);
    //                     reject(error);
    //                 }
    //             },
    //             (progress) => {
    //                 const percent = (progress.loaded / progress.total * 100).toFixed(1);
    //                 this.loadingManager.updateLog(`Loading ${url.split('/').pop()}: ${percent}%`);
    //             },
    //             (error) => {
    //                 console.error('Error loading model:', error);
    //                 reject(error);
    //             }
    //         );
    //     });
    // }

    extractTextureMeshNames(gltf) {
        const meshNames = [];
        
        // Traverse the loaded model to find texture meshes and extract their names
        gltf.scene.traverse((object) => {
            if (object.isMesh) {
                const name = object.name;
                // Check if this mesh is inside a Fronttex or Backtex model
                if (name.includes('Fronttex') || name.includes('Backtex')) {
                    // Look for a name format like 'Outside_Fronttex' or similar
                    if (name.includes('_')) {
                        const parts = name.split('_');
                        if (parts.length > 1) {
                            const partName = parts[0]; // The part name (e.g., 'Outside')
                            
                            // Create a unique texture part name
                            const texturePart = `${partName}_tex`;
                            if (!meshNames.includes(texturePart)) {
                                meshNames.push(texturePart);
                            }
                        }
                    } else {
                        // For meshes without underscore, use the full name
                        if (!meshNames.includes(name)) {
                            meshNames.push(name);
                        }
                    }
                }
            }
        });
        
        return meshNames;
    }
    
    async processLoadedModel(gltf, modelConfig, materialSets, mixer) {
        // Extract texture mesh names first, if this is a texture model
        let textureMeshNames = [];
        const fileName = gltf.userData?.fileName || '';
        if (fileName.includes('Fronttex') || fileName.includes('Backtex')) {
            textureMeshNames = this.extractTextureMeshNames(gltf);
            
            // Store these names in the model config for later use
            if (!modelConfig.textureMeshNames) {
                modelConfig.textureMeshNames = [];
            }
            modelConfig.textureMeshNames.push(...textureMeshNames);
        }
    
        // Continue with existing processing
        gltf.scene.traverse(async (object) => {
            if (object.isMesh) {
                object.geometry.computeVertexNormals();
                object.userData.isImported = true;
    
                if (object.name.includes('Fronttex') || object.name.includes('Backtex')) {
                    await this.createTextureMaterial(object);
                } else if (modelConfig.useOptimizedMaterials && materialSets) {
                    await this.optimizedMaterialManager.assignMaterialToMesh(
                        object,
                        materialSets,
                        modelConfig
                    );
                } else {
                    await this.createDefaultMaterial(object);
                }
    
                object.castShadow = true;
                object.receiveShadow = true;
            }
        });
        if (this.loadedModelGroup) {
            this.loadedModelGroup.add(gltf.scene);
        }

        if (modelConfig.hasAnimations && gltf.animations?.length > 0 && mixer) {
            gltf.animations.forEach(animation => {
                const action = mixer.clipAction(animation);
                this.modelControls.addAction(mixer, action);
            });
        }
    }

    async createDefaultMaterial(object) {
        if (object.name.includes('Fronttex') || object.name.includes('Backtex')) {
            return this.createTextureMaterial(object);
        }

        const material = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            roughness: 0.8,
            metalness: 0.1,
            side: THREE.DoubleSide,
            transparent: true
        });

        object.material = material;
        object.material.needsUpdate = true;
    }

    createTextureMaterial(object) {
        // Get the normal map from the outside material if available
        const outsideMaterial = this.findOutsideMaterial();
        
        const material = new THREE.MeshPhysicalMaterial({
            transparent: true,
            side: THREE.FrontSide,
            depthWrite: true,
            depthTest: true,
            alphaTest: 0.1,
            roughness: 1,
            clearcoat: 0,
            clearcoatRoughness: 1,
            color: 0xffffff,
            opacity: 0
        });

        // Apply normal map from outside material if available
        if (outsideMaterial?.normalMap) {
            material.normalMap = outsideMaterial.normalMap.clone();
            material.normalScale = new THREE.Vector2(0.5, 0.5);
            material.normalMap.wrapS = THREE.RepeatWrapping;
            material.normalMap.wrapT = THREE.RepeatWrapping;
            material.normalMap.needsUpdate = true;
        } else if (object.material?.normalMap) {
            material.normalMap = object.material.normalMap.clone();
            material.normalScale = new THREE.Vector2(0.5, 0.5);
            material.normalMap.wrapS = THREE.RepeatWrapping;
            material.normalMap.wrapT = THREE.RepeatWrapping;
            material.normalMap.needsUpdate = true;
        }

        // Store original UV coordinates if available
        if (object.geometry.attributes.uv) {
            object.userData.originalUV = object.geometry.attributes.uv.clone();
        }

        object.material = material;
        object.material.needsUpdate = true;
        object.renderOrder = 1;
    }

    findOutsideMaterial() {
        let outsideMaterial = null;
        this.scene.traverse((object) => {
            if (object.isMesh && 
                object.material && 
                object.name.toLowerCase().includes('outside')) {
                outsideMaterial = object.material;
            }
        });
        return outsideMaterial;
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

    async clearCurrentModel() {
        return new Promise((resolve) => {
            if (this.loadedModelGroup) {
                this.modelControls.clearMixers();

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

                this.scene.remove(this.loadedModelGroup);
                this.loadedModelGroup = null;
            }

            setTimeout(resolve, 100);
        });
    }

    dispose() {
        this.clearCurrentModel();
        if (this.optimizedMaterialManager) {
            this.optimizedMaterialManager.dispose();
        }
    }
}