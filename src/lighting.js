import * as THREE from 'three';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';

// Custom shader for environment intensity control
const envMapShader = {
    uniforms: {
        envMap: { value: null },
        intensity: { value: 1.0 }
    },
    vertexShader: `
        varying vec3 vWorldNormal;
        varying vec3 vWorldPosition;
        
        void main() {
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPos.xyz;
            vWorldNormal = normalize(mat3(modelMatrix) * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform samplerCube envMap;
        uniform float intensity;
        varying vec3 vWorldNormal;
        
        void main() {
            vec3 envColor = textureCube(envMap, vWorldNormal).rgb;
            gl_FragColor = vec4(envColor * intensity, 1.0);
        }
    `
};

export const LIGHTING_CONFIG = {
    renderer: {
        toneMapping: 'ACESFilmicToneMapping',
        toneMappingExposure: 0.1,
        shadowMapType: 'PCFSoftShadowMap',
        physicallyCorrectLights: true,
        outputEncoding: 'sRGBEncoding',
        shadowMapSizeMultiplier: 2
    },
    environmentMap: {
        enabled: true,
        path: '/Textures/lebombo._2k.exr',
        //intensity: 0,
        envMapIntensity: 0.0001,      // Now can be any positive number
        showBackground: false // Controls if HDR is visible in background
    },
    shadowCatcher: {
        enabled: true,
        size: 100,
        opacity: 0.01,
        position: { x: 0, y: -0.001, z: 0 }
    },
    lights: {
        keyLight: {
            type: 'SpotLight',
            enabled: true,
            position: { x: 5, y: 20, z: 15 },
            intensity: 1000,
            color: 0xfffdfa,
            angle: Math.PI / 3,
            penumbra: 0.5,
            distance: 50,
            castShadow: true,
            shadowMapSize: 1024,
            shadowBias: -0.0001,
            normalBias: 0.001,
            shadowRadius: 15
        },
        fillLight: {
            type: 'SpotLight',
            enabled: true,
            position: { x: -15, y: 18, z: 1 },
            intensity: 500,
            color: 0xfffdfa,
            angle: Math.PI / 3,
            penumbra: 1,
            distance: 50,
            castShadow: false
        },
        rimLight: {
            type: 'SpotLight',
            enabled: true,
            position: { x: -15, y: 18, z: -6 },
            intensity: 300,
            color: 0xfffaee,
            angle: Math.PI / 3,
            penumbra: 1,
            distance: 250,
            castShadow: false
        },
        ambientLight: {
            type: 'HemisphereLight',
            enabled: true,
            skyColor: 0xffffff,
            groundColor: 0xadadad,
            intensity: 0.2
        },
        fillLight3: {
            type: 'SpotLight',
            enabled: true,
            position: { x: -10, y: 5, z: -14 },
            intensity: 500, // Reduced from 150
            color: 0xfffdfa,
            angle: Math.PI / 3,
            penumbra: 1,
            distance: 50
        },
        rimLight2: {
            type: 'SpotLight',
            enabled: true,
            position: { x: 15, y: 15, z: -3 },
            intensity: 300, // Reduced from 500
            color: 0xfffaee,
            angle: Math.PI / 3,
            penumbra: 1,
            distance: 250
        }
    }
};

export class LightingSystem {
    constructor(scene, renderer) {
        this.scene = scene;
        this.renderer = renderer;
        this.lights = new Map();
        this.helpers = new Map();
        this.envMap = null;
        this.envMapMaterial = null;
        this.background = null;
        
        
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
        this.renderer.physicallyCorrectLights = true;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    }

    // In lighting.js, add to the LightingSystem class
    getPerformanceStats() {
        return {
            activeLights: this.lights.size,
            environmentMapIntensity: this.scene.environment?.intensity || 0,
            shadowsEnabled: this.renderer.shadowMap.enabled,
            shadowMapType: this.renderer.shadowMap.type
        };
    }

    getEnvironmentIntensity() {
        let intensity = null;
        this.scene.traverse((object) => {
            if (object.isMaterial && intensity === null) {
                intensity = object.envMapIntensity;
            }
        });
        return intensity;
    }

    setupEnvironmentMap() {
        if (!LIGHTING_CONFIG.environmentMap.enabled) {
            this.scene.environment = null;
            this.scene.background = null;
            return;
        }
    
        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        pmremGenerator.compileEquirectangularShader();
    
        new EXRLoader().load(
            LIGHTING_CONFIG.environmentMap.path,
            (texture) => {
                const envMap = pmremGenerator.fromEquirectangular(texture).texture;
    
                this.scene.environment = envMap;
                this.scene.background = LIGHTING_CONFIG.environmentMap.showBackground ? envMap : null;
    
                // Set the initial envMapIntensity on all materials
                this.scene.traverse((object) => {
                    if (object.isMaterial) {
                        object.envMapIntensity = LIGHTING_CONFIG.environmentMap.envMapIntensity;
                        object.needsUpdate = true;
                    }
                });
    
                texture.dispose();
                pmremGenerator.dispose();
            }
        );
    }

    updateEnvironmentMapIntensity(value) {
        LIGHTING_CONFIG.environmentMap.envMapIntensity = value;
        this.scene.traverse((object) => {
            if (object.isMaterial) {
                object.envMapIntensity = value;
                object.needsUpdate = true;
            }
        });
    }

    setEnvironmentIntensity(intensity) {
        if (this.envMapMaterial) {
            this.envMapMaterial.uniforms.intensity.value = intensity;
            this.envMapMaterial.needsUpdate = true;
        }
        // Also adjust scene's indirect light intensity
        if (this.envMap) {
            this.envMap.intensity = intensity;
        }
    }

    createSpotLight(config) {
        const light = new THREE.SpotLight(config.color, config.intensity);
        light.position.set(config.position.x, config.position.y, config.position.z);
        
        light.angle = config.angle;
        light.penumbra = config.penumbra;
        light.decay = 2;
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

        const target = new THREE.Object3D();
        target.position.set(0, 12, 0);
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
        
        this.helpers.forEach(helper => {
            helper.update();
        });
    }

    dispose() {
        // Clean up lights
        this.lights.forEach(light => {
            if (light.target) this.scene.remove(light.target);
            if (light.shadow?.map) {
                light.shadow.map.dispose();
            }
            this.scene.remove(light);
        });
        this.lights.clear();

        // Clean up environment maps
        if (this.envMap) {
            this.envMap.dispose();
        }
        if (this.background) {
            this.background.dispose();
        }
        if (this.envMapMaterial) {
            this.envMapMaterial.dispose();
        }

        // Clean up helpers
        this.helpers.forEach(helper => {
            this.scene.remove(helper);
        });
        this.helpers.clear();

        // Clear scene references
        this.scene.environment = null;
        this.scene.background = null;
    }
}