import * as THREE from 'three';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';

const LIGHTING_CONFIG = {
    renderer: {
        toneMapping: 'ACESFilmicToneMapping',
        toneMappingExposure: 1.0,
        shadowMapType: 'PCFSoftShadowMap',
        physicallyCorrectLights: true,
        outputEncoding: 'sRGBEncoding',
        shadowMapSizeMultiplier: 2  // Increased shadow map resolution
    },
    environmentMap: {
        enabled: true,
        path: '/Textures/lebombo_2k.exr',
        intensity: 0.2
    },
    shadowCatcher: {
        enabled: true,
        size: 100,
        opacity: 0.1,
        position: { x: 0, y: -0.001, z: 0 }
    },
    lights: {
        keyLight: {
            type: 'DirectionalLight',
            enabled: true,
            position: { x: 5, y: 40, z: 15 },
            intensity: 2,
            color: 0xfffaee,
            
            castShadow: true,
            shadowMapSize: 1024,  // Increased resolution
            shadowArea: 15,
            shadowBias: -0.0005,
            normalBias: 0.005,
            shadowRadius: 15
        },
        fillLight: {
            type: 'DirectionalLight',
            enabled: true,
            position: { x: -5, y: 42, z: 10 },
            intensity: 1,
            color: 0xfffaee,
            // castShadow: false,
            // shadowArea: 15,
            // shadowBias: -0.0005,
            // shadowMapSize: 2048,
            // normalBias: 0.005,
            // shadowRadius: 2.5
        },
        rimLight: {
            type: 'DirectionalLight',
            enabled: true,
            position: { x: -15, y: 8, z: -12 },
            intensity: 2,
            color: 0xeef1ff,
            // castShadow: false,
            // shadowArea: 15,
            // shadowBias: -0.0005,
            // shadowMapSize: 2048,
            // normalBias: 0.005,
            // shadowRadius: 2.5
        },
        ambientLight: {
            type: 'HemisphereLight',
            enabled: true,
            skyColor: 0xffffff,
            groundColor: 0x444444,
            intensity: 0.5

        }
    }
};

export class LightingSystem {
    constructor(scene, renderer) {
        this.scene = scene;
        this.renderer = renderer;
        this.lights = new Map();
        this.helpers = new Map();
        
        this.setupRenderer();
        this.setupEnvironmentMap();
        this.setupShadowCatcher();
        this.setupLights();
    }

    setupRenderer() {
        const config = LIGHTING_CONFIG.renderer;
        
        // Enhanced renderer settings
        this.renderer.toneMapping = THREE[config.toneMapping];
        this.renderer.toneMappingExposure = config.toneMappingExposure;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE[config.shadowMapType];
        this.renderer.physicallyCorrectLights = true;
        this.renderer.outputEncoding = THREE[config.outputEncoding];
        
        // Additional quality settings
        this.renderer.gammaFactor = 2.2;
        this.renderer.gammaOutput = true;
        this.renderer.shadowMap.autoUpdate = true;
    }

    setupEnvironmentMap() {
        if (!LIGHTING_CONFIG.environmentMap.enabled) {
            this.scene.environment = null;
            return;
        }

        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        pmremGenerator.compileEquirectangularShader();

        new EXRLoader()
            .load(LIGHTING_CONFIG.environmentMap.path, (texture) => {
                const envMap = pmremGenerator.fromEquirectangular(texture).texture;
                
                // Set the environment map
                this.scene.environment = envMap;
                
                // Set the environment intensity
                this.scene.environmentIntensity = LIGHTING_CONFIG.environmentMap.intensity;
                
                // Clear background if intensity is 0
                if (LIGHTING_CONFIG.environmentMap.intensity === 0) {
                    this.scene.environment = null;
                }
                
                texture.dispose();
                pmremGenerator.dispose();
            });
    }

    // Method to update environment intensity dynamically
    setEnvironmentIntensity(intensity) {
        LIGHTING_CONFIG.environmentMap.intensity = intensity;
        if (this.scene) {
            this.scene.environmentIntensity = intensity;
            if (intensity === 0) {
                this.scene.environment = null;
            } else if (!this.scene.environment) {
                // Reload environment map if it was previously null
                this.setupEnvironmentMap();
            }
        }
    }

    createDirectionalLight(config) {
        const light = new THREE.DirectionalLight(config.color, config.intensity);
        light.position.set(config.position.x, config.position.y, config.position.z);
        
        if (config.castShadow) {
            light.castShadow = true;
            
            // Enhanced shadow settings
            light.shadow.mapSize.width = config.shadowMapSize;
            light.shadow.mapSize.height = config.shadowMapSize;
            
            const d = config.shadowArea;
            light.shadow.camera.left = -d;
            light.shadow.camera.right = d;
            light.shadow.camera.top = d;
            light.shadow.camera.bottom = -d;
            light.shadow.camera.near = 0.1;
            light.shadow.camera.far = 50;
            
            light.shadow.bias = config.shadowBias;
            light.shadow.normalBias = config.normalBias;
            light.shadow.radius = config.shadowRadius;
            
            // Enable percentage-closer soft shadows
            light.shadow.blurSamples = 128;
            
            light.shadow.camera.updateProjectionMatrix();
        }

        // Add and configure target
        const target = new THREE.Object3D();
        target.position.set(0, 5, 0);
        this.scene.add(target);
        light.target = target;

        return light;
    }

    setupLights() {
        // Clear existing lights
        this.lights.forEach(light => {
            if (light.target) this.scene.remove(light.target);
            this.scene.remove(light);
        });
        this.lights.clear();

        Object.entries(LIGHTING_CONFIG.lights).forEach(([name, config]) => {
            if (!config.enabled) return;

            let light;
            switch (config.type) {
                case 'DirectionalLight':
                    light = this.createDirectionalLight(config);
                    break;
                case 'HemisphereLight':
                    light = new THREE.HemisphereLight(
                        config.skyColor,
                        config.groundColor,
                        config.intensity
                    );
                    break;
            }

            if (light) {
                this.lights.set(name, light);
                this.scene.add(light);
            }
        });
    }

    setupShadowCatcher() {
        if (!LIGHTING_CONFIG.shadowCatcher.enabled) return;

        const config = LIGHTING_CONFIG.shadowCatcher;
        const geometry = new THREE.PlaneGeometry(config.size, config.size);
        const material = new THREE.ShadowMaterial({
            opacity: config.opacity,
            color: 0x000000,
            transparent: true,
            depthWrite: false
        });

        const shadowCatcher = new THREE.Mesh(geometry, material);
        shadowCatcher.rotation.x = -Math.PI / 2;
        shadowCatcher.position.set(
            config.position.x,
            config.position.y,
            config.position.z
        );
        shadowCatcher.receiveShadow = true;
        this.scene.add(shadowCatcher);
    }

    update() {
        // Update any dynamic lighting elements if needed
        this.lights.forEach(light => {
            if (light.shadow && light.shadow.map) {
                light.shadow.map.needsUpdate = true;
            }
        });
    }
}