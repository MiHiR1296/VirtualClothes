import * as THREE from 'three';
import { LoadingManager } from './loadingManager.js';
import { SceneManager } from './sceneSetup.js';
import { LightingSystem, LIGHTING_CONFIG } from './lighting.js';
import { ModelLoader } from './modelLoader.js';
import { MaterialManager } from './materialManager.js';
import { PostProcessing } from './postProcessing.js';
import { animate } from './Animation.jsx';
import { EventHandler } from './eventHandler.js';

export class ThreeApplication {
    constructor(canvas) {
        this.canvas = canvas;
        this.initialized = false;
        this.currentModelId = null;
        this.loadingManager = new LoadingManager();
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

            // Initialize lighting system with new optimized version
            this.lightingSystem = new LightingSystem(scene, renderer);

            // Set initial environment intensity
            this.lightingSystem.updateEnvironmentMapIntensity(LIGHTING_CONFIG.environmentMap.envMapIntensity);

            // // Set initial environment intensity
            // this.lightingSystem.updateEnvironmentMapIntensity(LIGHTING_CONFIG.environmentMap.intensity);
            
            // Pass the lighting system to other components that need it
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

            // Modify your animate function to include lighting system updates
            const animate = () => {
                requestAnimationFrame(animate);
                
                // Update lighting system
                this.lightingSystem.update(this.camera);
                
                // Simple performance logging
                if (Date.now() % 5000 < 16) {  // Every 5 seconds
                    const renderTime = this.renderer.info.render;
                    console.log('Render Performance:', {
                        triangles: this.renderer.info.render.triangles,
                        calls: this.renderer.info.render.calls,
                        points: this.renderer.info.render.points,
                        lines: this.renderer.info.render.lines,
                        totalMemory: this.renderer.info.memory.geometries + 
                                    this.renderer.info.memory.textures
                    });
                    
                    // Optional: Reset render info after logging
                    this.renderer.info.reset();
                }

                
   

                // Rest of your animation code
                controls.update();
                renderer.composer.render();
            };

            animate();

            this.initialized = true;
            await this.loadModel('model1');

            return true;
        } catch (error) {
            console.error('Initialization error:', error);
            this.loadingManager.updateLog(`Error: ${error.message}`);
            this.loadingManager.hide();
            throw error;
        }
    }

     // Log the environment intensity after 5 seconds
     logEnvironmentIntensity() {
        const intensity = this.lightingSystem.getEnvironmentIntensity();
        console.log('Environment light intensity:', intensity);
    }

    // In ThreeApplication.js
async loadModel(modelId) {
    try {
        // Wait for initialization
        if (!this.initialized) {
            await this.initPromise;
        }

        // Skip if same model
        if (this.currentModelId === modelId) {
            console.log('Model already loaded:', modelId);
            return;
        }

        this.loadingManager.show();
        this.currentModelId = modelId;

        try {
            // This loads the actual model
            const modelControls = await this.modelLoader.loadModels(
                this.materialManager,
                modelId
            );

            // Update scene after successful load
            const center = this.sceneManager.calculateSceneCenter();
            this.sceneManager.updateControlsTarget(center);
            this.sceneManager.updateCameraForModel(this.modelLoader.loadedModelGroup);

            // Start animations if available
            if (modelControls) {
                modelControls.playAllAnimations();
            }

            this.logEnvironmentIntensity();

            return modelControls;
        } finally {
            // Ensure loading screen is hidden whether success or failure
            this.loadingManager.hide();
        }

    } catch (error) {
        console.error('Error in ThreeApplication loadModel:', error);
        this.loadingManager.updateLog(`Error loading model: ${error.message}`);
        throw error;
    }
}

dispose() {
    if (this.sceneManager) {
        this.sceneManager.dispose();
    }
    if (this.postProcessing?.composer) {
        this.postProcessing.composer.dispose();
    }
    if (this.modelLoader) {
        this.modelLoader.clearCurrentModel();
    }
    // Add disposal of lighting system
    if (this.lightingSystem) {
        this.lightingSystem.dispose();
    }
    this.initialized = false;
}

// You can also add methods to control lighting settings
updateLightingSettings(settings) {
    if (this.lightingSystem) {
        if (settings.shadowUpdateInterval) {
            this.lightingSystem.shadowUpdateInterval = settings.shadowUpdateInterval;
        }
        if (settings.environmentIntensity !== undefined) {
            this.lightingSystem.updateEnvironmentIntensity(settings.environmentIntensity);
            console.log('Environment light intensity updated:', settings.environmentIntensity);
        }
    }
}
}