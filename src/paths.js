const BASE_URL = import.meta.env.BASE_URL || '/VirtualClothes/';

export const getAssetPath = (path) => {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${BASE_URL}${cleanPath}`;
};

export const getModelPath = (modelPath) => {
    return getAssetPath(`Models/${modelPath}`);
};

export const getTexturePath = (texturePath, modelDirectory = '') => {
    // Remove leading and trailing slashes, and replace multiple slashes
    const cleanPath = texturePath
        .replace(/^\/+/, '')     // Remove leading slashes
        .replace(/\/+$/, '')     // Remove trailing slashes
        .replace(/\/+/g, '/');   // Replace multiple consecutive slashes
    
    // Special handling for specific file types
    const imageExtensions = ['png', 'jpg', 'jpeg', 'exr', 'webp', 'tiff'];
    const ext = cleanPath.split('.').pop().toLowerCase();
    
    // If it's already a full path, return it
    if (cleanPath.startsWith('http') || cleanPath.startsWith('blob:')) {
        return cleanPath;
    }

    if (cleanPath.startsWith('thread/')) {
        // Replace 'thread/' with 'Threads/' for these specific textures
        const threadPath = cleanPath.replace('thread/', 'Threads/');
        return `${BASE_URL}Textures/${threadPath}`;
    }
    
    // If the file extension is not provided, try to resolve it
    if (!imageExtensions.includes(ext)) {
        // Try different extensions
        for (const extension of imageExtensions) {
            const pathWithExt = `${cleanPath}.${extension}`;
            
            // If a model directory is provided, check model-specific path
            if (modelDirectory) {
                const cleanModelDir = modelDirectory
                    .replace(/^Models\//, '')      // Remove leading 'Models/'
                    .replace(/\/Textures$/, '')    // Remove trailing '/Textures'
                    .replace(/\/+$/, '');          // Remove any trailing slashes
                
                const fullPath = `${BASE_URL}Models/${cleanModelDir}/Textures/${pathWithExt}`;
                console.log('Checking Model-Specific Texture Path:', {
                    originalPath: texturePath,
                    pathWithExt,
                    fullPath
                });
                
                // You might want to add a way to check if the file exists
                return fullPath;
            }
            
            // Check global textures folder
            const globalPath = `${BASE_URL}Textures/${pathWithExt}`;
            console.log('Checking Global Texture Path:', {
                originalPath: texturePath,
                pathWithExt,
                globalPath
            });
            
            return globalPath;
        }
    }
    
    // If a model directory is provided, construct model-specific texture path
    if (modelDirectory) {
        const cleanModelDir = modelDirectory
            .replace(/^Models\//, '')      // Remove leading 'Models/'
            .replace(/\/Textures$/, '')    // Remove trailing '/Textures'
            .replace(/\/+$/, '');          // Remove any trailing slashes
        
        const fullPath = `${BASE_URL}Models/${cleanModelDir}/Textures/${cleanPath}`;
        
        console.log('Model-Specific Texture Path:', {
            texturePath,
            modelDirectory,
            cleanModelDir,
            cleanPath,
            fullPath
        });
        
        return fullPath;
    }
    
    // Fallback to global textures folder
    const globalPath = `${BASE_URL}Textures/${cleanPath}`;
    
    console.log('Global Texture Path:', {
        texturePath,
        cleanPath,
        globalPath
    });
    
    return globalPath;
};