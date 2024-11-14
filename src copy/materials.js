import * as THREE from 'three';

export function initMaterials() {
    const textureLoader = new THREE.TextureLoader();
    
    // Helper function to load textures with proper error handling
    const loadTexture = (path, callback) => {
        return new Promise((resolve, reject) => {
            textureLoader.load(
                path,
                (texture) => {
                    if (callback) callback(texture);
                    resolve(texture);
                },
                undefined,
                (error) => {
                    console.error(`Error loading texture ${path}:`, error);
                    reject(error);
                }
            );
        });
    };

    // Configure texture settings
    const configureTexture = (texture, repeatX = 1, repeatY = 1) => {
        texture.repeat.set(repeatX, repeatY);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    };

    // Base paths - update these to use relative paths
    const TEXTURE_PATH = '/Textures/';

    const pbrMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xFF0000 ,
        roughness: 0.8,
        metalness: 0.05,
        normalScale: new THREE.Vector2(1, 1),
        //envMapIntensity: 0.1,
        sheen: 0.13,
        sheenColor: new THREE.Color(0xffffff), // Optional: change the sheen color
    });

    // Load textures asynchronously
    Promise.all([
        loadTexture(`${TEXTURE_PATH}fabric_125_normal-2K.jpg`, (texture) => {
            configureTexture(texture, 50, 50);
            pbrMaterial.normalMap = texture;
        }),
        // loadTexture(`${TEXTURE_PATH}fabric_125_normal-2K.jpg`, (texture) => {
        //     configureTexture(texture, 50, 50);
        //     texture.encoding = THREE.sRGBEncoding;
        //     pbrMaterial.map = texture;
        // })
    ]).catch(error => console.error('Error loading textures:', error));

    const simpleMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.5,
        metalness: 0.0,
        transparent: true,
        side: THREE.DoubleSide
    });

    const buttonMaterial = new THREE.MeshStandardMaterial({
        color: 0xCCCCCC,
        roughness: 0.3,
        metalness: 0.6,
    });

    const threadMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFD700,
        roughness: 0.1,
        metalness: 0.2,
    });

    const zipperMaterial = new THREE.MeshStandardMaterial({
        color: 0xAAAAAA,
        roughness: 0.4,
        metalness: 0.5,
    });

    const metalMaterial = new THREE.MeshStandardMaterial({
        color: 0x888888,
        roughness: 0.5,
        metalness: 1.0,
    });

    const avatarMaterial = new THREE.MeshStandardMaterial({
        color: 0x008000,
        roughness: 1.0,
        metalness: 0.1,
    });

    // Load pants material textures
    const pantsMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x000000,
        roughness: 0.8,
        metalness: 0.05,
        normalScale: new THREE.Vector2(1, 1),
        sheen: 0.02,
        sheenColor: new THREE.Color(0xffffff), // Optional: change the sheen color
    });

    loadTexture(`${TEXTURE_PATH}fabric_125_normal-2K.jpg`, (texture) => {
        configureTexture(texture, 1, 1);
        pantsMaterial.normalMap = texture;
    }).catch(error => console.error('Error loading pants texture:', error));

    // Name all materials
    const materials = {
        pbrMaterial,
        simpleMaterial,
        buttonMaterial,
        threadMaterial,
        zipperMaterial,
        metalMaterial,
        avatarMaterial,
        pantsMaterial
    };

    // Set names for all materials
    Object.entries(materials).forEach(([key, material]) => {
        material.name = key;
    });

    return materials;
}