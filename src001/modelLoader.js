import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ModelControls } from './modelControls.js';
import { initMaterials } from './materials.js';

const MODEL_PATHS = {
    'model1': {
        directory: '/Models/Polo_T-shirt',
        materials: ['Backtex.glb', 'Buttons.glb', 'Fronttex.glb', 'Polo_T-shirt.glb', 'Threads.glb']
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

export class ModelLoader {
    constructor(scene, manager) {
        this.scene = scene;
        this.modelControls = new ModelControls();
        this.manager = manager;
        this.materialManager = null; // Will be set from main.js
    }

    async loadModels(pbrMaterial, simpleMaterial, selectedModel = 'model1') {
        console.log(`Loading models for: ${selectedModel}`);
        
        // Clear existing models and animations
        this.scene.children = this.scene.children.filter(child => 
            !(child.type === 'Group' && child.userData.isLoadedModel));
        this.modelControls.clearMixers();

        const modelConfig = MODEL_PATHS[selectedModel];
        if (!modelConfig) {
            console.error('Invalid model selection:', selectedModel);
            return this.modelControls;
        }

        const loadModelWithAnimation = async (url, material) => {
            console.log(`Loading model from URL: ${url}`);
        
            return new Promise((resolve, reject) => {
                const loader = new GLTFLoader(this.manager);
                loader.load(url, async (gltf) => {
                    console.log(`Model loaded: ${url}`);
                    
                    gltf.scene.traverse(async (object) => {
                        if (object.isMesh) {
                            object.userData.isImported = true;
                            
                            // Handle different types of meshes
                            if (object.name.includes("Fronttex") || object.name.includes("Backtex")) {
                                // For texture meshes, use simple material
                                const textureMaterial = new THREE.MeshStandardMaterial({
                                    transparent: true,
                                    side: THREE.FrontSide, // Single sided for texture meshes
                                    depthWrite: true,
                                    depthTest: true,
                                    alphaTest: 0.1,
                                    color: 0xffffff
                                });
                                object.material = textureMaterial;
                                object.renderOrder = 1;
                            } else if (material === simpleMaterial) {
                                // For simple material meshes
                                const newMaterial = material.clone();
                                newMaterial.side = THREE.DoubleSide; // Double sided for all other meshes
                                object.material = newMaterial;
                            } else {
                                // For PBR materials
                                if (this.materialManager) {
                                    await this.materialManager.updateMaterial(object, 'cotton');
                                } else {
                                    const newMaterial = material.clone();
                                    newMaterial.side = THREE.DoubleSide; // Double sided for all other meshes
                                    object.material = newMaterial;
                                }
                            }
                            
                            object.castShadow = true;
                            object.receiveShadow = true;
                        }
                    });
        
                    gltf.scene.userData.isLoadedModel = true;
                    this.scene.add(gltf.scene);
        
                    if (gltf.animations && gltf.animations.length > 0) {
                        const mixer = new THREE.AnimationMixer(gltf.scene);
                        const action = mixer.clipAction(gltf.animations[0]);
                        this.modelControls.addMixer(mixer, action);
                    }
        
                    resolve(gltf);
                }, undefined, reject);
            });
        };

        try {
            const modelPromises = modelConfig.materials.map((filename) => {
                const modelPath = `${modelConfig.directory}/${filename}`;
                let material;

                if (filename.includes('Fronttex') || filename.includes('Backtex')) {
                    material = simpleMaterial;
                } else if (filename.includes('Button')) {
                    material = this.materials?.buttonMaterial || pbrMaterial;
                } else if (filename.includes('Zipper')) {
                    material = this.materials?.zipperMaterial || pbrMaterial;
                } else if (filename.includes('Thread')) {
                    material = this.materials?.threadMaterial || pbrMaterial;
                } else if (filename.includes('Metal')) {
                    material = this.materials?.metalMaterial || pbrMaterial;
                } else if (filename.includes('Avatar')) {
                    material = this.materials?.avatarMaterial || pbrMaterial;
                } else if (filename.includes('Pants')) {
                    material = this.materials?.pantsMaterial || pbrMaterial;
                } else {
                    material = pbrMaterial;
                }

                return loadModelWithAnimation(modelPath, material);
            });

            await Promise.all(modelPromises);
            console.log('All models loaded, playing animations');
            this.modelControls.playAllAnimations();

            return this.modelControls;
        } catch (error) {
            console.error('Error loading models:', error);
            return this.modelControls;
        }
    }
}