// lighting.js
import * as THREE from 'three';
import { lightingConfig } from './lightingConfig.js';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';

export function initLighting(scene) {
    setupEnvironmentMap(scene);
    setupShadowCatcher(scene);
    setupLights(scene);
}

function setupEnvironmentMap(scene) {
    if (!lightingConfig.environmentMap.enabled) return;

    const exrLoader = new EXRLoader();
    exrLoader.load(lightingConfig.environmentMap.path, (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = texture;
        scene.environmentIntensity = lightingConfig.environmentMap.intensity;
    });
}

function setupShadowCatcher(scene) {
    if (!lightingConfig.shadowCatcher.enabled) return;

    const config = lightingConfig.shadowCatcher;
    const geometry = new THREE.PlaneGeometry(config.size, config.size);
    const material = new THREE.ShadowMaterial({ 
        opacity: config.opacity 
    });

    const shadowCatcher = new THREE.Mesh(geometry, material);
    shadowCatcher.rotation.x = -Math.PI / 2;
    shadowCatcher.position.set(
        config.position.x,
        config.position.y,
        config.position.z
    );
    shadowCatcher.receiveShadow = true;
    scene.add(shadowCatcher);
}

function setupLights(scene) {
    const targetObject = new THREE.Object3D();
    scene.add(targetObject);

    Object.entries(lightingConfig.lights).forEach(([name, config]) => {
        if (!config.enabled) return;

        let light;
        switch (config.type) {
            case 'SpotLight':
                light = createSpotLight(config, targetObject);
                break;
            case 'DirectionalLight':
                light = createDirectionalLight(config);
                break;
            case 'AmbientLight':
                light = new THREE.AmbientLight(config.color, config.intensity);
                break;
        }

        if (light) {
            light.name = name;
            scene.add(light);

            // Add helpers if enabled
            if (lightingConfig.helpers.enabled) {
                addHelpers(scene, light, config.type);
            }
        }
    });
}

function createSpotLight(config, target) {
    const light = new THREE.SpotLight(
        config.color,
        config.intensity,
        config.distance || 0,
        config.angle,
        config.penumbra,
        config.decay || 2
    );

    light.position.set(config.position.x, config.position.y, config.position.z);
    light.castShadow = config.castShadow;
    
    if (config.castShadow) {
        setupShadowProperties(light);
    }

    target.position.set(config.target.x, config.target.y, config.target.z);
    light.target = target;

    return light;
}

function createDirectionalLight(config) {
    const light = new THREE.DirectionalLight(config.color, config.intensity);
    light.position.set(config.position.x, config.position.y, config.position.z);
    light.castShadow = config.castShadow;
    
    if (config.castShadow) {
        setupShadowProperties(light);
    }

    return light;
}

function setupShadowProperties(light) {
    const shadowConfig = lightingConfig.shadowDefaults;
    light.shadow.mapSize.width = shadowConfig.mapSize;
    light.shadow.mapSize.height = shadowConfig.mapSize;
    light.shadow.camera.near = shadowConfig.camera.near;
    light.shadow.camera.far = shadowConfig.camera.far;
    light.shadow.bias = shadowConfig.bias;
}

function addHelpers(scene, light, type) {
    if (type === 'SpotLight' && lightingConfig.helpers.showSpotlightHelpers) {
        const helper = new THREE.SpotLightHelper(light);
        scene.add(helper);
    }
    if (light.castShadow && lightingConfig.helpers.showShadowCameraHelpers) {
        const shadowHelper = new THREE.CameraHelper(light.shadow.camera);
        scene.add(shadowHelper);
    }
}

export function updateLightHelpers(scene) {
    scene.traverse((object) => {
        if (object.isHelper) {
            object.update();
        }
    });
}