import { logDebug, logInfo, logWarn, logError } from "./logger.js";
// textureLoadingUtils.js
import * as THREE from 'three';

export class TextureLoadingUtils {
    static async loadUVMap(currentModelDirectory, onLoad) {
        if (!currentModelDirectory) {
            logWarn('No model directory provided for UV map loading');
            return null;
        }
        
        // Debug information about environment
        logDebug('Environment Debug:', {
            isDevelopment: import.meta.env.DEV,
            isProduction: import.meta.env.PROD,
            baseUrl: import.meta.env.BASE_URL,
            currentModelDirectory
        });
        
        // Clean up the model directory path
        const cleanModelDir = currentModelDirectory
            .replace(/^\.\//, '')      // Remove leading ./
            .replace(/^Models\//, '')   // Remove leading Models/
            .replace(/\/+$/, '');       // Remove trailing slashes
        
        // Try multiple paths with different formats and prefixes
        const possiblePaths = [
            // With base URL from env
            `${import.meta.env.BASE_URL || '/'}Models/${cleanModelDir}/UVmap.png`,
            // Direct from public folder in dev environment
            `/Models/${cleanModelDir}/UVmap.png`,
            // Try with public prefix
            `/public/Models/${cleanModelDir}/UVmap.png`,
            // Check different case
            `${import.meta.env.BASE_URL || '/'}models/${cleanModelDir}/uvmap.png`,
            // Try with the direct base path
            `/VirtualClothes/Models/${cleanModelDir}/UVmap.png`,
        ];
        
        logDebug('Attempting to load UV map from these paths:', possiblePaths);
        
        // Try each path until one works
        for (const path of possiblePaths) {
            try {
                const loadedImage = await new Promise((resolve, reject) => {
                    const img = new Image();
                    
                    img.onload = () => {
                        logDebug('Successfully loaded UV map from:', path);
                        resolve(img);
                    };
                    
                    img.onerror = () => {
                        logWarn(`Failed to load UV map from: ${path}`);
                        reject(new Error(`Failed to load UV map from: ${path}`));
                    };
                    
                    img.src = path;
                });
                
                if (onLoad) onLoad(loadedImage);
                return loadedImage;
                
            } catch (error) {
                // Continue trying other paths
                continue;
            }
        }
        
        // If all attempts fail, provide a fallback placeholder
        logDebug('Creating UV map placeholder as fallback');
        
        // Generate a blank placeholder UV map
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 512;
            const ctx = canvas.getContext('2d');
            
            // Draw a grid to indicate it's a placeholder
            ctx.fillStyle = '#333';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.strokeStyle = '#666';
            ctx.lineWidth = 1;
            
            // Draw grid lines
            const gridSize = 32;
            for (let i = 0; i <= canvas.width; i += gridSize) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i, canvas.height);
                ctx.stroke();
                
                ctx.beginPath();
                ctx.moveTo(0, i);
                ctx.lineTo(canvas.width, i);
                ctx.stroke();
            }
            
            // Add text to indicate it's a placeholder
            ctx.fillStyle = '#999';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('UV Map Placeholder', canvas.width/2, canvas.height/2);
            
            const img = new Image();
            img.src = canvas.toDataURL();
            
            img.onload = () => {
                if (onLoad) onLoad(img);
            };
            
            return img;
        } catch (fallbackError) {
            logError('Even the fallback generation failed:', fallbackError);
            return null;
        }
    }

    static async loadTexture(file) {
        if (!file?.type.match('image.*')) {
            throw new Error('File is not an image.');
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const textureLoader = new THREE.TextureLoader();
                const dataURL = e.target.result;
                
                textureLoader.load(
                    dataURL,
                    (texture) => {
                        texture.colorSpace = THREE.SRGBColorSpace;
                        texture.flipY = false;
                        texture.premultiplyAlpha = true;
                        texture.needsUpdate = true;
                        resolve(texture);
                    },
                    undefined,
                    (error) => {
                        logError('Error loading texture:', error);
                        reject(error);
                    }
                );
            };
            
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
}