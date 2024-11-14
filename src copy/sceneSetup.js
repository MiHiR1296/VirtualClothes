import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { lightingConfig } from './lightingConfig.js';

export function initScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x8FBCD4); // Light blue background
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 15, 15);

    const canvas = document.querySelector('canvas.threejs');
    const renderer = new THREE.WebGLRenderer({ canvas });
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Apply renderer settings from config
    renderer.toneMapping = THREE[lightingConfig.renderer.toneMapping];
    renderer.toneMappingExposure = lightingConfig.renderer.toneMappingExposure;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE[lightingConfig.renderer.shadowMapType];
    renderer.physicallyCorrectLights = lightingConfig.renderer.physicallyCorrectLights;
    renderer.outputEncoding = THREE[lightingConfig.renderer.outputEncoding];

    // Inside your init function or after setting up the scene
    const shadowCatcher = createShadowCatcher();
    scene.add(shadowCatcher);
    
    



    return { scene, camera, renderer };
}

export function initControls(camera, renderer) {
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.screenSpacePanning = false;
    return controls;
}

// Target control

export function updateControlsTarget(scene, controls) {
    const boundingBox = new THREE.Box3();
    scene.traverse((object) => {
        if (object.isMesh) {
            boundingBox.expandByObject(object);
        }
    });
    const center = boundingBox.getCenter(new THREE.Vector3());
    controls.target.set(center.x, center.y, center.z);
    controls.update();
}
//Shadowcathcersetup
// 
function createShadowCatcher() {
    const planeGeometry = new THREE.PlaneGeometry(1000, 1000);
    const shadowCatcherMaterial = new THREE.ShadowMaterial({ 
        opacity: 0.1  // Adjust this value to control shadow intensity
    });
    const shadowCatcher = new THREE.Mesh(planeGeometry, shadowCatcherMaterial);
    shadowCatcher.rotation.x = -Math.PI / 2;
    shadowCatcher.position.y = 0.01;
    shadowCatcher.receiveShadow = true;
    
    // Create a "fake" light just for shadow direction
    const shadowLight = new THREE.DirectionalLight(0xffffff, 0);
    // Adjust these values to change shadow direction
    shadowLight.position.set(-30, 40, -30); // This controls shadow direction
    shadowLight.castShadow = false;
    
    // Configure shadow quality
    shadowLight.shadow.mapSize.width = 2048;
    shadowLight.shadow.mapSize.height = 2048;
    shadowLight.shadow.camera.near = 0.5;
    shadowLight.shadow.camera.far = 500;
    shadowLight.shadow.radius = 18; // Controls shadow softness
    shadowLight.shadow.bias = -0.0001;

    // Optional: Add helpers during development (comment out in production)
    // const helper = new THREE.DirectionalLightHelper(shadowLight, 5);
    // const shadowHelper = new THREE.CameraHelper(shadowLight.shadow.camera);
    // scene.add(helper);
    // scene.add(shadowHelper);

    // Group the shadow catcher and its light
    const shadowSystem = new THREE.Group();
    shadowSystem.add(shadowCatcher);
    shadowSystem.add(shadowLight);
    

    return shadowSystem;
}




// Add environment map setup as a separate function
export function setupEnvironmentMap(scene, manager) {
    const exrLoader = new EXRLoader();
    exrLoader.load('/Textures/photo_studio_london_hall_2k.exr', (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = null; //texture;
        scene.environmentIntensity = 0.000;
        texture.mapping = THREE.EquirectangularReflectionMapping;
        //scene.background = texture;
        
    }, undefined, (error) => {
        console.error('An error occurred while loading the EXR texture:', error);
    });
}
