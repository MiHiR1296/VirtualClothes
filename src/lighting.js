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
        toneMapping: 'CineonToneMapping',
        toneMappingExposure: 1.0,
        shadowMapType: 'PCFSoftShadowMap',
        physicallyCorrectLights: true,
        outputEncoding: 'sRGBEncoding',
        shadowMapSizeMultiplier: 2
    },
    environmentMap: {
        enabled: true,
        path: getTexturePath('lebombo_2k.exr'),
        intensity: 0.42,
        envMapIntensity: 0.42,
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
            intensity: 500,
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
            intensity: 250,
            color: 0xfffdfa,
            angle: Math.PI / 3,
            penumbra: 1,
            distance: 50,
            castShadow: false
        },
        rimLight: {
            type: 'SpotLight',
            enabled: false,
            position: { x: -15, y: 18, z: -6 },
            intensity: 150,
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
            enabled: false,
            position: { x: -10, y: 5, z: -14 },
            intensity: 250,
            color: 0xfffdfa,
            angle: Math.PI / 3,
            penumbra: 1,
            distance: 50
        },
        rimLight2: {
            type: 'SpotLight',
            enabled: true,
            position: { x: 15, y: 15, z: -3 },
            intensity: 150,
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
        this.defaultBackground = new THREE.Color(0x1a1a1a);
        this.showHDRIBackground = false;
        this.currentEnvironmentMap = null;
        this.currentIntensity = LIGHTING_CONFIG.environmentMap.intensity; // Store the current intensity
        
        this.setupRenderer();
        this.initializeEnvironmentMap(this.currentIntensity); // Use the stored intensity
        this.setupShadowCatcher();
        this.setupLights();
    }

    debugLightingState() {
        console.log('=== LIGHTING SYSTEM DEBUG ===');
        console.log('Current Intensity:', this.currentIntensity);
        console.log('Config Intensity:', LIGHTING_CONFIG.environmentMap.intensity);
        console.log('Config envMapIntensity:', LIGHTING_CONFIG.environmentMap.envMapIntensity);
        console.log('Environment Map:', this.scene.environment ? 'Loaded' : 'Not loaded');
        console.log('Environment Rotation:', this.environmentRotation);
        console.log('Show HDRI Background:', this.showHDRIBackground);
        
        // Check a sample of materials in the scene
        let materialCount = 0;
        this.scene.traverse((object) => {
          if (object.material && materialCount < 5) {
            console.log(`Material ${object.name} envMapIntensity:`, 
                        object.material.envMapIntensity);
            materialCount++;
          }
        });
        console.log('=========================');
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

    
// Update the loadHDRI method to properly store and apply the intensity
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

        // Apply intensity with priority:
        // 1. Use the provided intensity parameter if available
        // 2. Use the intensity from the HDRI_OPTIONS for this specific HDRI
        // 3. Fall back to current intensity if available
        // 4. Use the default intensity from config

        // Try to find the HDRI option based on the path to get its default intensity
        let hdriDefaultIntensity = undefined;
        Object.values(HDRI_OPTIONS).forEach(option => {
            if (path.includes(option.path) || option.path.includes(path)) {
                hdriDefaultIntensity = option.defaultIntensity;
            }
        });
        
        // Determine which intensity to use, with priority
        const intensityToUse = intensity !== undefined ? intensity : 
                             hdriDefaultIntensity !== undefined ? hdriDefaultIntensity :
                             this.currentIntensity !== undefined ? this.currentIntensity :
                             LIGHTING_CONFIG.environmentMap.intensity;
                             
        // Store and apply the determined intensity
        this.currentIntensity = intensityToUse;
        this.updateEnvironmentMapIntensity(intensityToUse);

        // Apply any existing rotation after setting the new environment
        if (this.environmentRotation) {
            this.rotateEnvironment(this.environmentRotation);
        }

        texture.dispose();
        pmremGenerator.dispose();

        this.initialCameraPosition = null;
        this.initialControlsTarget = null;
        this.initialModelRotation = null;
        
        console.log(`HDRI loaded with intensity: ${intensityToUse}`);

    } catch (error) {
        console.error('Error loading HDRI:', error);
    }
}

rotateEnvironment(angle) {
    this.environmentRotation = angle;
    
    // Convert degrees to radians
    const radians = THREE.MathUtils.degToRad(angle);
    
    // Find the camera and controls
    const camera = this.scene.userData.camera;
    const controls = this.scene.userData.controls;
    if (!camera || !controls) {
        console.warn("Camera or controls not found for rotation");
        return;
    }
    
    // Find the model (cloth)
    let modelGroup = null;
    this.scene.traverse((object) => {
        if (object.userData && object.userData.isLoadedModel) {
            modelGroup = object;
        }
    });
    
    if (!modelGroup) {
        console.warn("Model not found for rotation");
        return;
    }
    
    // Calculate the model's center as the pivot point
    const modelCenter = new THREE.Vector3();
    const modelBox = new THREE.Box3().setFromObject(modelGroup);
    modelBox.getCenter(modelCenter);
    
    // Store initial positions if not already stored
    if (!this.initialCameraPosition) {
        this.initialCameraPosition = camera.position.clone();
        this.initialControlsTarget = controls.target.clone();
        this.initialModelRotation = modelGroup.rotation.y;
    }
    
    // Calculate the initial relative camera position from the model center
    const relativePosition = this.initialCameraPosition.clone().sub(modelCenter);
    
    // Rotate the camera around the model center
    // Use negative radians so camera rotates in the same visual direction as the model
    const rotatedPosition = relativePosition.clone();
    rotatedPosition.applyAxisAngle(new THREE.Vector3(0, 1, 0), -radians);
    rotatedPosition.add(modelCenter);
    
    // Update camera position
    camera.position.copy(rotatedPosition);
    
    // Keep the camera's target on the model center
    controls.target.copy(modelCenter);
    
    // Rotate the model in the same direction for consistent movement
    modelGroup.rotation.y = this.initialModelRotation - radians;
    
    // Update the controls
    controls.update();
    
    console.log("Rotated camera and model around model center:", angle, "degrees");
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
    
    // Determine which intensity to use (provided, or from config)
    const intensityToUse = intensity !== undefined ? intensity : LIGHTING_CONFIG.environmentMap.intensity;
    
    // Store the intensity we'll be using
    this.currentIntensity = intensityToUse;
    console.log(`Initializing environment with intensity: ${intensityToUse}`);

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
            
            // Set initial intensity using the stored value
            this.updateEnvironmentMapIntensity(this.currentIntensity);

            // Store the texture for later use
            this.currentHDRI = texture;
            this.environmentRotation = 0;

            texture.dispose();
            pmremGenerator.dispose();
            
            console.log("Environment map initialized successfully with intensity:", this.currentIntensity);
        }
    );
}



updateEnvironmentMapIntensity(value) {
    // Safety check for invalid values
    if (value === undefined || value === null || isNaN(value)) {
        console.warn('Invalid intensity value:', value, 'using default:', LIGHTING_CONFIG.environmentMap.intensity);
        value = LIGHTING_CONFIG.environmentMap.intensity;
    }
    
    // Store the current intensity
    this.currentIntensity = value;
    
    // Update config
    LIGHTING_CONFIG.environmentMap.envMapIntensity = value;
    LIGHTING_CONFIG.environmentMap.intensity = value;
    
    // Log current state for debugging
    console.log(`Updating environment map intensity to ${value}`);
    
    // Update all materials in the scene
    let updatedMaterials = 0;
    this.scene.traverse((object) => {
        if (object.isMaterial) {
            object.envMapIntensity = value;
            object.needsUpdate = true;
            updatedMaterials++;
        }
        if (object.material) {
            if (Array.isArray(object.material)) {
                object.material.forEach(mat => {
                    if (mat.envMapIntensity !== undefined) {
                        mat.envMapIntensity = value;
                        mat.needsUpdate = true;
                        updatedMaterials++;
                    }
                });
            } else if (object.material.envMapIntensity !== undefined) {
                object.material.envMapIntensity = value;
                object.material.needsUpdate = true;
                updatedMaterials++;
            }
        }
    });

    // Update the environment map if it exists
    if (this.envMap) {
        this.envMap.intensity = value;
    }
    
    if (this.scene.environment) {
        // For Three.js environment maps that support intensity
        this.scene.environment.intensity = value;
    }

    console.log(`Environment map intensity updated: ${value} (${updatedMaterials} materials updated)`);
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