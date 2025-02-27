import * as THREE from 'three';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { getTexturePath } from './paths.js';

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
        path: getTexturePath('lebombo_2k.exr'),
        intensity: 0.5,
        envMapIntensity: 0.5,
        showBackground: false
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
            intensity: 500,
            color: 0xfffdfa,
            angle: Math.PI / 3,
            penumbra: 1,
            distance: 50
        },
        rimLight2: {
            type: 'SpotLight',
            enabled: true,
            position: { x: 15, y: 15, z: -3 },
            intensity: 300,
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
        this.currentHDRI = null;
        this.environmentRotation = 0;
        this.defaultBackground = new THREE.Color(0x1a1a1a); // Dark gray
        this.showHDRIBackground = false;
        this.currentEnvironmentMap = null;
        
        this.setupRenderer();
        this.initializeEnvironmentMap(0.05);
        this.setupShadowCatcher();
        this.setupLights();
    }
    
    createGradientBackground() {
        const canvas = document.createElement('canvas');
        canvas.width = 2;
        canvas.height = 2;

        const context = canvas.getContext('2d');
        const gradient = context.createLinearGradient(0, 0, 0, 2);
        
        // Define gradient colors
        gradient.addColorStop(0, '#1a1a1a');    // Dark gray at top
        gradient.addColorStop(0.5, '#2a2a2a');  // Slightly lighter in middle
        gradient.addColorStop(1, '#1a1a1a');    // Dark gray at bottom

        context.fillStyle = gradient;
        context.fillRect(0, 0, 2, 2);

        const texture = new THREE.CanvasTexture(canvas);
        return texture;
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

    getPerformanceStats() {
        return {
            activeLights: this.lights.size,
            environmentMapIntensity: this.scene.environment?.intensity || 0,
            shadowsEnabled: this.renderer.shadowMap.enabled,
            shadowMapType: this.renderer.shadowMap.type
        };
    }

    getEnvironmentIntensity() {
        return LIGHTING_CONFIG.environmentMap.envMapIntensity;
    }

    // In lighting.js - Update loadHDRI method to accept intensity parameter
async loadHDRI(path, intensity) {
    if (!path) return;

    try {
        const texture = await new Promise((resolve, reject) => {
            new EXRLoader().load(
                path,
                resolve,
                undefined,
                reject
            );
        });

        texture.mapping = THREE.EquirectangularReflectionMapping;
        
        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        const envMap = pmremGenerator.fromEquirectangular(texture).texture;
        
        // Store the environment map
        if (this.currentEnvironmentMap) {
            this.currentEnvironmentMap.dispose();
        }
        this.currentEnvironmentMap = envMap;

        // Always set the environment map for reflections
        this.scene.environment = envMap;

        // Only set as background if showHDRIBackground is true
        if (this.showHDRIBackground) {
            this.scene.background = envMap;
        }

        // Apply any existing rotation
        if (this.environmentRotation) {
            this.rotateEnvironment(this.environmentRotation);
        }

        // Apply intensity if provided
        if (intensity !== undefined) {
            this.updateEnvironmentMapIntensity(intensity);
        }

        texture.dispose();
        pmremGenerator.dispose();

    } catch (error) {
        console.error('Error loading HDRI:', error);
    }
}

    rotateEnvironment(angle) {
        this.environmentRotation = angle;

        // Convert degrees to radians for offset calculation
        const rotation = THREE.MathUtils.degToRad(angle);
        
        if (this.currentEnvironmentMap) {
            // Calculate offset (dividing by 2π converts radians to 0-1 range)
            const offset = -rotation / (2 * Math.PI);
            this.currentEnvironmentMap.offset.x = offset;
            this.currentEnvironmentMap.needsUpdate = true;

            // If background is visible, update it too
            if (this.showHDRIBackground) {
                this.scene.background = this.currentEnvironmentMap;
            }
        }
    }

    toggleBackground(show) {
        this.showHDRIBackground = show;
        
        if (show && this.currentEnvironmentMap) {
            this.scene.background = this.currentEnvironmentMap;
            console.log("Showing HDRI background");
        } else {
            // Use gradient background
            this.scene.background = this.createGradientBackground();
            console.log("Showing gradient background");
        }
    }

    
    // Update the existing initializeEnvironmentMap method
    initializeEnvironmentMap(intensity) {
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
                texture.mapping = THREE.EquirectangularReflectionMapping;
                const envMap = pmremGenerator.fromEquirectangular(texture).texture;
                
                // Store the environment map first
                this.currentEnvironmentMap = envMap;
                
                // Set as environment always
                this.scene.environment = envMap;
                
                // Only set as background if showHDRIBackground is true
                if (this.showHDRIBackground) {
                    this.scene.background = envMap;
                } else {
                    // Use gradient background as fallback
                    this.scene.background = this.createGradientBackground();
                }
                
                // Set initial intensity
                this.updateEnvironmentMapIntensity(intensity);
    
                // Store the texture for later use
                this.currentHDRI = texture;
                this.environmentRotation = 0;
    
                texture.dispose();
                pmremGenerator.dispose();
                
                console.log("Environment map initialized successfully");
            }
        );
    }


    updateEnvironmentMapIntensity(value) {
        // Update config
        LIGHTING_CONFIG.environmentMap.envMapIntensity = value;
        
        // Update all materials in the scene
        this.scene.traverse((object) => {
            if (object.isMaterial) {
                object.envMapIntensity = value;
                object.needsUpdate = true;
            }
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(mat => {
                        mat.envMapIntensity = value;
                        mat.needsUpdate = true;
                    });
                } else {
                    object.material.envMapIntensity = value;
                    object.material.needsUpdate = true;
                }
            }
        });

        // Update the environment map if it exists
        if (this.envMap) {
            this.envMap.intensity = value;
        }

        console.log('Environment map intensity updated:', value);
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
        this.lights.forEach(light => {
            if (light.target) this.scene.remove(light.target);
            this.scene.remove(light);
        });
        this.lights.clear();

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
        this.lights.forEach(light => {
            if (light.target) this.scene.remove(light.target);
            if (light.shadow?.map) {
                light.shadow.map.dispose();
            }
            this.scene.remove(light);
        });
        this.lights.clear();
    
        if (this.envMap) {
            this.envMap.dispose();
        }
        if (this.background) {
            this.background.dispose();
        }
        if (this.envMapMaterial) {
            this.envMapMaterial.dispose();
        }
        if (this.currentHDRI) {
            this.currentHDRI.dispose();
        }
    
        this.helpers.forEach(helper => {
            this.scene.remove(helper);
        });
        this.helpers.clear();
    
        this.scene.environment = null;
        this.scene.background = null;
    }
}