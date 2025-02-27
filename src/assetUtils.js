export class AssetLoader {
    static async loadTexture(path) {
        const textureLoader = new THREE.TextureLoader();
        const driveId = getGoogleDriveId(path);
        const url = driveId ? `${config.baseURL}${driveId}` : path;
        
        return new Promise((resolve, reject) => {
            textureLoader.load(url, resolve, undefined, reject);
        });
    }

    static async loadModel(path) {
        const driveId = getGoogleDriveId(path);
        const url = driveId ? `${config.baseURL}${driveId}` : path;
        
        return fetch(url)
            .then(response => response.arrayBuffer())
            .then(buffer => buffer);
    }
}