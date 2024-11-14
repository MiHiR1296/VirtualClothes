// main.js
import * as THREE from 'three';
import { initScene, initControls, setupEnvironmentMap, updateControlsTarget } from './sceneSetup.js';
import { initLighting, updateLightHelpers } from './lighting.js';
import { ModelLoader } from './modelLoader.js';
import { initMaterials } from './materials.js';
import { setupEventListeners } from './eventListeners.js';
import { animate } from './animation.js';
import { MaterialManager } from './materialManager.js';


async function init() {

    console.warn('Starting application initialization');

    // Create a LoadingManager
    const manager = new THREE.LoadingManager();
    
    // Setup loading manager events
    manager.onStart = function (url, itemsLoaded, itemsTotal) {
        console.log(`Started loading: ${url}. Loaded ${itemsLoaded} of ${itemsTotal} files.`);
    };

    manager.onLoad = function () {
        console.log('All resources loaded.');
        document.getElementById('loadingBarContainer').style.display = 'none';
    };

    manager.onProgress = function (url, itemsLoaded, itemsTotal) {
        const progress = (itemsLoaded / itemsTotal) * 100;
        console.log(`Loading progress: ${progress}%`);
        document.getElementById('loadingBar').style.width = `${progress}%`;
    };

    manager.onError = function (url) {
        console.log(`There was an error loading ${url}`);
    };

    // Initialize scene, camera, and renderer
    const { scene, camera, renderer } = initScene();
    
    // Initialize controls
    const controls = initControls(camera, renderer);
    
    // Setup environment map
    setupEnvironmentMap(scene);
    
    // Initialize lighting
    initLighting(scene);
    
    // Initialize MaterialManager - this will handle its own UI setup
    const materialManager = new MaterialManager();
    // Wait for initialization if needed
    await new Promise(resolve => setTimeout(resolve, 100));
        
    // Initialize materials
    const { pbrMaterial, simpleMaterial } = await initMaterials();
    
    // Create model loader instance
    const modelLoader = new ModelLoader(scene);
    
    // Load models and get model controls
    const modelControls = await modelLoader.loadModels(
        pbrMaterial,
        simpleMaterial,
        'model1'
    );
    
    // Update controls target
    updateControlsTarget(scene, controls);

    // Setup event listeners - pass materialManager as parameter
    const eventHandlers = setupEventListeners(
        scene, 
        pbrMaterial, 
        simpleMaterial, 
        camera, 
        renderer,
        controls,
        modelLoader,
        materialManager
    );
    
    // Initialize keyboard controls
    window.keys = {};
    window.addEventListener('keydown', (event) => {
        window.keys[event.key] = true;
    });
    window.addEventListener('keyup', (event) => {
        window.keys[event.key] = false;
    });
    
    // Setup animation toggle button
    const toggleAnimationButton = document.createElement('button');
    toggleAnimationButton.textContent = 'Pause Animations';
    toggleAnimationButton.style.position = 'fixed';
    toggleAnimationButton.style.bottom = '10px';
    toggleAnimationButton.style.right = '10px';
    document.body.appendChild(toggleAnimationButton);

    let animationsPlaying = true;

    toggleAnimationButton.addEventListener('click', () => {
        if (animationsPlaying) {
            modelControls.pauseAllAnimations();
            toggleAnimationButton.textContent = 'Play Animations';
        } else {
            modelControls.playAllAnimations();
            toggleAnimationButton.textContent = 'Pause Animations';
        }
        animationsPlaying = !animationsPlaying;
    });

    // Start animation loop
    animate(renderer, scene, camera, controls, modelControls);
}

// Start the application with error handling
init().catch(error => {
    console.error('Initialization error:', error);
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
});