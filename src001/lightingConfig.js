// lightingConfig.js
export const lightingConfig = {
    // Renderer settings
    renderer: {
        toneMapping: 'ReinhardToneMapping',  // Options: 'NoToneMapping', 'ReinhardToneMapping', 'CineonToneMapping', 'ACESFilmicToneMapping'
        toneMappingExposure: 1.0,
        shadowMapType: 'PCFSoftShadowMap',   // Options: 'BasicShadowMap', 'PCFShadowMap', 'PCFSoftShadowMap'
        physicallyCorrectLights: true,
        outputEncoding: 'sRGBEncoding'
    },

    // Environment Map
    environmentMap: {
        enabled: false,
        path: '/Textures/photo_studio_london_hall_2k.exr',
        intensity: 0.2
    },

    // Shadow Catcher
    shadowCatcher: {
        enabled: true,
        size: 1000,
        opacity: 0.1,
        position: { x: 0, y: 0.01, z: 0 }
    },

    // Main Lighting Setup
    lights: {
        // Key Light (main illumination)
        keyLight: {
            type: 'SpotLight',
            enabled: true,
            position: { x: 40, y: -70, z: -50 },
            intensity: 6000,
            color: 0xfffaea,
            angle: Math.PI / 4,
            penumbra: 1,
            castShadow: false,
            shadowRadius: 10,
            target: { x: 0, y: 10, z: 0 }
        },

        // Fill Light (soften shadows)
        fillLight: {
            type: 'SpotLight',
            enabled: true,
            position: { x: -30, y: -20, z: -40 },
            intensity: 2000,
            color: 0xe6f0ff,
            angle: Math.PI / 3,
            penumbra: 1,
            castShadow: false,
            shadowRadius: 150,
            target: { x: 0, y: 10, z: 0 }
        },

        // Rim Light (edge highlighting)
        rimLight: {
            type: 'SpotLight',
            enabled: true,
            position: { x: -30, y: -30, z: 50 },
            intensity: 6000,
            color: 0xffffff,
            angle: Math.PI / 6,
            penumbra: 1,
            castShadow: false,
            shadowRadius: 12,
            target: { x: 0, y: 10, z: 0 }
        },

        // Ambient Light (global illumination)
        ambientLight: {
            type: 'AmbientLight',
            enabled: true,
            intensity: 0.2,
            color: 0xffffff
        },

        // Shadow Light (dedicated shadow caster)
        shadowLight: {
            type: 'DirectionalLight',
            enabled: true,
            position: { x: -30, y: 40, z: -30 },
            intensity: 0,
            castShadow: false,
            shadowRadius: 18,
            shadowMapSize: 2048,
            shadowBias: -0.0001
        }
    },

    // Shadow settings that apply to all shadow-casting lights
    shadowDefaults: {
        mapSize: 2048,
        camera: {
            near: 0.5,
            far: 500
        },
        bias: -0.0001
    },

    // Helper visibility
    helpers: {
        enabled: true,
        showSpotlightHelpers: false,
        showShadowCameraHelpers: false,
        showDirectionalLightHelpers: false,
    }
};
