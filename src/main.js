import * as THREE from 'three';
import { LoadingManager } from './loadingManager.js';
import { SceneManager } from './sceneSetup.js';
import { LightingSystem } from './lighting.js';
import { ModelLoader } from './modelLoader.js';
import { MaterialManager } from './materialManager.js';
import { PostProcessing } from './postProcessing.js';
import { animate } from './animation.js';
import { EventHandler } from './eventHandler.js';
import { createRoot } from 'react-dom/client';
import React from 'react';
import TextureControls from './textureControls.jsx';

class Application {
    constructor() {
        this.init();
    }

    async init() {
        try {
            this.loadingManager = new LoadingManager();
            this.loadingManager.show();
            this.loadingManager.updateLog('Initializing application...');

            // Initialize scene and get components
            this.sceneManager = new SceneManager(this.loadingManager);
            const { scene, camera, renderer, controls } = this.sceneManager.getComponents();

            // Initialize post-processing
            this.postProcessing = new PostProcessing(scene, camera, renderer);
            
            // Initialize lighting
            this.lightingSystem = new LightingSystem(scene, renderer);

            // Initialize material manager
            this.materialManager = new MaterialManager();
            this.loadingManager.updateLog('Material system initialized');

            // Initialize model loader
            this.modelLoader = new ModelLoader(scene, this.loadingManager);

            // Initialize event handler
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

            // Initial model load
            const modelControls = await this.modelLoader.loadModels(this.materialManager, 'model1');
            
            const center = this.sceneManager.calculateSceneCenter();
            this.sceneManager.updateControlsTarget(center);
            
            const offset = new THREE.Vector3(-30, 30, 35);
            camera.position.copy(center).add(offset);

            this.setupKeyboardControls();
            this.createAnimationToggleButton(modelControls);

            // Start animation loop with post-processing
            renderer.composer = this.postProcessing.composer;
            animate(renderer, scene, camera, controls, this.modelLoader.modelControls);

            this.loadingManager.updateLog('Application ready!');
            setTimeout(() => this.loadingManager.hide(), 500);

            // Initialize React component after everything else is ready
            this.initializeTextureControls();

        } catch (error) {
            console.error('Initialization error:', error);
            this.loadingManager.updateLog(`Error: ${error.message}`);
            this.showErrorMessage();
        }
    }

    setupKeyboardControls() {
        window.keys = {};
        window.addEventListener('keydown', (event) => {
            window.keys[event.key] = true;
        });
        window.addEventListener('keyup', (event) => {
            window.keys[event.key] = false;
        });
    }

    initializeTextureControls() {
        const textureControlsContainer = document.getElementById('texture-controls');
        if (textureControlsContainer) {
            const root = createRoot(textureControlsContainer);
            root.render(React.createElement(TextureControls));
        }
    }

    createAnimationToggleButton(modelControls) {
        const toggleAnimationButton = document.createElement('button');
        toggleAnimationButton.textContent = 'Pause Animations';
        toggleAnimationButton.style.position = 'fixed';
        toggleAnimationButton.style.bottom = '20px';
        toggleAnimationButton.style.right = '20px';
        toggleAnimationButton.style.padding = '10px 20px';
        toggleAnimationButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        toggleAnimationButton.style.color = 'white';
        toggleAnimationButton.style.border = 'none';
        toggleAnimationButton.style.borderRadius = '5px';
        toggleAnimationButton.style.cursor = 'pointer';
        toggleAnimationButton.style.zIndex = '1000';
        document.body.appendChild(toggleAnimationButton);

        let animationsPlaying = true;
        toggleAnimationButton.addEventListener('click', () => {
            if (animationsPlaying) {
                this.modelLoader.modelControls.pauseAllAnimations();
                toggleAnimationButton.textContent = 'Play Animations';
            } else {
                this.modelLoader.modelControls.playAllAnimations();
                toggleAnimationButton.textContent = 'Pause Animations';
            }
            animationsPlaying = !animationsPlaying;
        });
    }

    showErrorMessage() {
        const errorDiv = document.createElement('div');
        errorDiv.style.position = 'fixed';
        errorDiv.style.top = '50%';
        errorDiv.style.left = '50%';
        errorDiv.style.transform = 'translate(-50%, -50%)';
        errorDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
        errorDiv.style.padding = '20px';
        errorDiv.style.color = 'white';
        errorDiv.style.borderRadius = '5px';
        errorDiv.textContent = 'Error loading the application. Please check the console for details.';
        document.body.appendChild(errorDiv);
    }
}

// Start the application
window.addEventListener('DOMContentLoaded', () => {
    new Application();
});