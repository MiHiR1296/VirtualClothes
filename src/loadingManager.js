import * as THREE from 'three';

export class LoadingManager {
    constructor() {
        this.loadingScreen = document.querySelector('.loading-screen');
        this.loadingLog = document.querySelector('.loading-log');
        this.isLoading = false;
    }

    show() {
        if (this.loadingScreen) {
            this.isLoading = true;
            this.loadingScreen.classList.remove('hidden');
        }
    }

    hide() {
        if (this.loadingScreen && this.isLoading) {
            this.isLoading = false;
            this.loadingScreen.classList.add('hidden');
        }
    }

    updateLog(message) {
        if (this.loadingLog) {
            this.loadingLog.textContent = message;
        }
        console.log(message);
    }

    createThreeJSManager() {
        const manager = new THREE.LoadingManager();
        
        manager.onStart = (url, itemsLoaded, itemsTotal) => {
            this.show();
            this.updateLog(`Loading: ${url}`);
        };

        manager.onLoad = () => {
            this.updateLog('Loading complete!');
            setTimeout(() => this.hide(), 500); // Slight delay before hiding
        };

        manager.onProgress = (url, itemsLoaded, itemsTotal) => {
            const progress = (itemsLoaded / itemsTotal * 100).toFixed(0);
            this.updateLog(`Loading: ${progress}% (${url})`);

            // Update loading bar if it exists
            const loadingBar = document.getElementById('loadingBar');
            if (loadingBar) {
                loadingBar.style.width = `${progress}%`;
            }
        };

        manager.onError = (url) => {
            this.updateLog(`Error loading: ${url}`);
        };

        return manager;
    }
}