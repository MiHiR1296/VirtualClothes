import * as THREE from 'three';
import { LoadingManager } from './loadingManager.js';
import { SceneManager } from './sceneSetup.js';
import { LightingSystem, LIGHTING_CONFIG } from './lighting.js';
import { ModelLoader } from './modelLoader.js';
import { MaterialManager } from './materialManager.js';
import { PostProcessing } from './postProcessing.js';
import { animate } from './Animation.jsx';
import { EventHandler } from './eventHandler.js';
import { MODEL_PATHS } from './modelLoader.js'; // Add this import
import { textureCache } from './TextureCache';
import { getTexturePath } from './paths.js';

export class ThreeApplication {
    constructor(canvas) {
        this.canvas = canvas;
        this.initialized = false;
        this.currentModelId = null;
        this.loadingManager = new LoadingManager();
        this.loadedModels = new Map();
        this.initPromise = this.init();
    }

    async init() {
        try {
            this.loadingManager.show();
            
            this.sceneManager = new SceneManager(this.loadingManager, this.canvas);
            const { scene, camera, renderer, controls } = this.sceneManager.getComponents();

            this.scene = scene;
            this.camera = camera;
            this.renderer = renderer;
            this.controls = controls;

            this.scene.userData.camera = this.camera;
            this.scene.userData.controls = this.controls;

            // Expose these objects to the global scope for the texture manipulator
            window.scene = scene;
            window.camera = camera;
            window.renderer = renderer;
            window.controls = controls;

            this.lightingSystem = new LightingSystem(scene, renderer);
            this.materialManager = new MaterialManager();
            this.modelLoader = new ModelLoader(scene, this.loadingManager, this.sceneManager);
            this.postProcessing = new PostProcessing(scene, camera, renderer);
            

            this.eventHandler = new EventHandler(
                scene,
                camera,
                renderer,
                controls,
                this.modelLoader,
                this.materialManager,
                this.sceneManager,
                this.loadingManager
            );

            renderer.composer = this.postProcessing.composer;

            animate(
                this.renderer,
                this.scene,
                this.camera,
                this.controls,
                this.modelLoader.modelControls
            );

            this.initialized = true;
            
            // Load default model
            const defaultModel = 'men_polo_hs';
            await this.loadModel(defaultModel);

            return true;
        } catch (error) {
            console.error('Initialization error:', error);
            this.loadingManager.updateLog(`Error: ${error.message}`);
            this.loadingManager.hide();
            throw error;
        }
    }



    logEnvironmentIntensity() {
        if (this.lightingSystem) {
            const intensity = this.lightingSystem.getEnvironmentIntensity();
            console.log('Environment light intensity:', intensity);
        }
    }

    async loadModel(modelId) {
        try {
            if (!modelId) {
                throw new Error('No model ID provided');
            }
    
            if (!MODEL_PATHS[modelId]) {
                throw new Error(`Invalid model ID: ${modelId}. Available models are: ${Object.keys(MODEL_PATHS).join(', ')}`);
            }
    
            if (!this.initialized) {
                await this.initPromise;
            }
    
            // Don't reload if it's the same model
            if (this.currentModelId === modelId && this.loadedModels.has(modelId)) {
                console.log('Model already loaded:', modelId);
                return this.loadedModels.get(modelId);
            }
    
            this.loadingManager.show();
            
            // Clear previous model's resources if switching models
            if (this.currentModelId && this.currentModelId !== modelId) {
                await this.clearPreviousModel();
            }
    
            this.currentModelId = modelId;
    
            console.log('Loading model:', modelId);
            const modelControls = await this.modelLoader.loadModels(
                this.materialManager,
                modelId
            );
    
            // Cache the loaded model
            this.loadedModels.set(modelId, modelControls);
    
            const center = this.sceneManager.calculateSceneCenter();
            this.sceneManager.updateControlsTarget(center);
            this.sceneManager.updateCameraForModel(this.modelLoader.loadedModelGroup);
    
            if (modelControls) {
                modelControls.playAllAnimations();
            }
            
            // Store current lighting values before applying them to the new model
            let currentEnvMapIntensity = null;
            let currentEnvMapRotation = null;
            
            if (this.lightingSystem) {
                // Store current values
                currentEnvMapIntensity = this.lightingSystem.currentIntensity;
                currentEnvMapRotation = this.lightingSystem.environmentRotation;
                
                // Reset variables to ensure proper reapplication
                this.lightingSystem.initialCameraPosition = null;
                this.lightingSystem.initialControlsTarget = null;
                this.lightingSystem.initialModelRotation = null;
                
                // Apply environment rotation if needed
                if (currentEnvMapRotation !== 0) {
                    this.lightingSystem.rotateEnvironment(currentEnvMapRotation);
                }
                
                // Apply environment intensity
                if (currentEnvMapIntensity !== null) {
                    this.lightingSystem.updateEnvironmentMapIntensity(currentEnvMapIntensity);
                }
            }
    
            return modelControls;
    
        } catch (error) {
            console.error('Error in ThreeApplication loadModel:', error);
            this.loadingManager.updateLog(`Error loading model: ${error.message}`);
            throw error;
        } finally {
            this.loadingManager.hide();
        }
    }

    async clearPreviousModel() {
        if (this.currentModelId) {
            // Remove from scene but keep in cache
            if (this.modelLoader.loadedModelGroup) {
                this.scene.remove(this.modelLoader.loadedModelGroup);
            }
            
            // Stop any running animations
            if (this.modelLoader.modelControls) {
                this.modelLoader.modelControls.clearMixers();
            }
        }
    }

    async clearAllResources() {
        // Clear all loaded models
        this.loadedModels.clear();
        
        // Clear material manager cache
        if (this.materialManager) {
            this.materialManager.dispose();
        }
        
        // Clear texture cache
        textureCache.clearCache();
        
        // Clear current model
        if (this.modelLoader) {
            await this.modelLoader.clearCurrentModel();
        }
        
        this.currentModelId = null;
    }


    updateLightingSettings(settings) {
        if (this.lightingSystem) {
            if (settings.environmentIntensity !== undefined) {
                this.lightingSystem.updateEnvironmentMapIntensity(settings.environmentIntensity);
            }
            // Add other lighting settings here if needed
        }
    }
    dispose() {
        // Clean up global references
        window.scene = null;
        window.camera = null;
        window.renderer = null;
        window.controls = null;
        
        this.clearAllResources();
        
        if (this.sceneManager) {
            this.sceneManager.dispose();
        }
        if (this.postProcessing?.composer) {
            this.postProcessing.composer.dispose();
        }
        
        this.initialized = false;
    }
}