import { logDebug, logInfo, logWarn, logError } from "./logger.js";
// TextureCache.js
import * as THREE from 'three';

export class TextureCache {
    constructor() {
        this.textureCache = new Map();
        this.failedTextures = new Set();
        this.textureLoader = new THREE.TextureLoader();
    }

    generateCacheKey(path, type) {
        return `${type}:${path}`;
    }

    async loadTexture(path, type = 'diffuse') {
        const cacheKey = this.generateCacheKey(path, type);

        // Check if texture is already cached
        if (this.textureCache.has(cacheKey)) {
            return this.textureCache.get(cacheKey);
        }

        // Check if texture loading previously failed
        if (this.failedTextures.has(cacheKey)) {
            return null;
        }

        try {
            const texture = await new Promise((resolve, reject) => {
                this.textureLoader.load(
                    path,
                    (texture) => {
                        // Set appropriate color space based on texture type
                        if (type === 'normal' || type === 'roughness' || type === 'metallic') {
                            texture.colorSpace = THREE.NoColorSpace;
                        } else {
                            texture.colorSpace = THREE.SRGBColorSpace;
                        }
                        
                        texture.flipY = false;
                        texture.wrapS = THREE.RepeatWrapping;
                        texture.wrapT = THREE.RepeatWrapping;
                        texture.generateMipmaps = true;
                        texture.needsUpdate = true;
                        
                        resolve(texture);
                    },
                    undefined,
                    () => {
                        // Store failed attempts to avoid retrying
                        this.failedTextures.add(cacheKey);
                        resolve(null);
                    }
                );
            });

            if (texture) {
                this.textureCache.set(cacheKey, texture);
            }
            return texture;

        } catch (error) {
            logWarn(`Failed to load texture: ${path}`, error);
            this.failedTextures.add(cacheKey);
            return null;
        }
    }

    // Method to preload a set of textures
    async preloadTextures(textureConfigs) {
        const loadPromises = textureConfigs.map(config => 
            this.loadTexture(config.path, config.type)
        );
        return Promise.all(loadPromises);
    }

    clearCache() {
        // Dispose of all cached textures
        this.textureCache.forEach(texture => texture.dispose());
        this.textureCache.clear();
        this.failedTextures.clear();
    }
}

// Create a singleton instance
export const textureCache = new TextureCache();