import * as THREE from 'three';
import { LoadingManager } from './loadingManager.js';
import { SceneManager } from './sceneSetup.js';
import { LightingSystem } from './lighting.js';
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
        // Create a single loading manager instance
        this.loadingManager = new LoadingManager();
        this.initPromise = this.init();
    }

    async init() {
        try {
            this.loadingManager.show();

            // Pass the same loadingManager instance to SceneManager
            this.sceneManager = new SceneManager(this.loadingManager, this.canvas);
            const { scene, camera, renderer, controls } = this.sceneManager.getComponents();

            this.scene = scene;
            this.camera = camera;
            this.renderer = renderer;
            this.controls = controls;

            // Initialize systems with the same loadingManager instance
            this.lightingSystem = new LightingSystem(scene, renderer);
            this.materialManager = new MaterialManager();
            // Pass the single loadingManager instance
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
            animate(renderer, scene, camera, controls, this.modelLoader.modelControls);

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
        this.initialized = false;
    }
}