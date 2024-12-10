import * as THREE from 'three';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';

const LIGHTING_CONFIG = {
    renderer: {
        toneMapping: 'ACESFilmicToneMapping',
        toneMappingExposure: 0.8, // Reduced from 1.0
        shadowMapType: 'PCFSoftShadowMap',
        physicallyCorrectLights: true,
        outputEncoding: 'sRGBEncoding',
        shadowMapSizeMultiplier: 2
    },
    environmentMap: {
        enabled: true,
        path: '/Textures/lebombo_2k.exr',
        intensity: 0.0, // Increased from 0.2
    },
    shadowCatcher: {
        enabled: true,
        size: 100,
        opacity: 0.1, // Increased slightly for better ground contact
        position: { x: 0, y: -0.001, z: 0 }
    },
    lights: {
        keyLight: {
            type: 'SpotLight',
            enabled: true,
            position: { x: 5, y: 10, z: 15 },
            intensity: 0, // Reduced intensity
            color: 0xfffdfa,
            angle: Math.PI / 3,
            penumbra: 0.5,
            distance: 50
        },
        fillLight: {
            type: 'SpotLight',
            enabled: true,
            position: { x: -5, y: 18, z: 12 },
            intensity: 0, // Reduced from 150
            color: 0xfffdfa,
            angle: Math.PI / 3,
            penumbra: 1,
            distance: 50
        },
        shadowlight: {
            type: 'SpotLight',
            enabled: true,
            position: { x: 10, y: 40, z: 28 },
            intensity: 0, // Reduced from 1
            color: 0xfffdfa,
            angle: Math.PI / 3,
            penumbra: 1,
            distance: 50,
            castShadow: true,
            shadowMapSize: 1024,
            shadowBias: -0.0001, // Adjusted for softer shadows
            normalBias: 0.001,
            shadowRadius: 15
        },
        fillLight3: {
            type: 'SpotLight',
            enabled: true,
            position: { x: 5, y: 18, z: 14 },
            intensity: 0, // Reduced from 150
            color: 0xfffdfa,
            angle: Math.PI / 3,
            penumbra: 1,
            distance: 50
        },
        rimLight: {
            type: 'SpotLight',
            enabled: true,
            position: { x: -15, y: 18, z: -6 },
            intensity: 0, // Reduced from 500
            color: 0xfffaee,
            angle: Math.PI / 3,
            penumbra: 1,
            distance: 250
        },
        rimLight2: {
            type: 'SpotLight',
            enabled: true,
            position: { x: 15, y: 15, z: -6 },
            intensity: 0, // Reduced from 500
            color: 0xfffaee,
            angle: Math.PI / 3,
            penumbra: 1,
            distance: 250
        },
        ambientLight: {
            type: 'HemisphereLight',
            enabled: true,
            skyColor: 0xffffff,
            groundColor: 0xadadad,
            intensity: 0.0 // Increased from 0.2 for better shadow fill
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
        
        this.renderer.toneMapping = THREE[config.toneMapping];
        this.renderer.toneMappingExposure = config.toneMappingExposure;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE[config.shadowMapType];
        this.renderer.physicallyCorrectLights = config.physicallyCorrectLights;
        // Replace outputEncoding with outputColorSpace
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
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
                this.scene.environment = envMap;
                this.scene.environmentIntensity = LIGHTING_CONFIG.environmentMap.intensity;
                texture.dispose();
                pmremGenerator.dispose();
            });
    }

    createSpotLight(config) {
        const light = new THREE.SpotLight(config.color, config.intensity);
        light.position.set(config.position.x, config.position.y, config.position.z);
        
        light.angle = config.angle;
        light.penumbra = config.penumbra;
        light.decay = 2; // Physical decay
        light.distance = config.distance;
        
        if (config.castShadow) {
            light.castShadow = true;
            light.shadow.mapSize.width = config.shadowMapSize;
            light.shadow.mapSize.height = config.shadowMapSize;
            light.shadow.bias = config.shadowBias;
            light.shadow.normalBias = config.normalBias;
            light.shadow.radius = config.shadowRadius;
            light.shadow.camera.near = 0.1;
            light.shadow.camera.far = config.distance;
            light.shadow.camera.fov = THREE.MathUtils.radToDeg(config.angle) * 2;
            light.shadow.camera.updateProjectionMatrix();
        }

        // Add and configure target
        const target = new THREE.Object3D();
        target.position.set(0, 12, 0); // Target the center
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

        // Add new lights
        Object.entries(LIGHTING_CONFIG.lights).forEach(([name, config]) => {
            if (!config.enabled) return;

            let light;
            switch (config.type) {
                case 'SpotLight':
                    light = this.createSpotLight(config);
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
                
                // Add helper for debugging (uncomment if needed)
                /*if (config.type === 'SpotLight') {
                    const helper = new THREE.SpotLightHelper(light);
                    this.scene.add(helper);
                    this.helpers.set(name, helper);
                }*/
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
        this.lights.forEach(light => {
            if (light.shadow && light.shadow.map) {
                light.shadow.map.needsUpdate = true;
            }
        });
        
        // Update helpers if they exist
        this.helpers.forEach(helper => {
            helper.update();
        });
    }
}