import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class SceneManager {
    constructor(loadingManager) {
        this.loadingManager = loadingManager;
        this.init();
    }

    init() {
        this.createScene();
        this.createCamera();
        this.createRenderer();
        this.createControls();
        this.setupResizeHandler();
    }

    createScene() {
        this.scene = new THREE.Scene();
        
        // Create a gradient background
        const topColor = new THREE.Color(0xecebe5);  
        const bottomColor = new THREE.Color(0x21277e);  
        const canvas = document.createElement('canvas');
        canvas.width = 2;
        canvas.height = 2;
        
        const context = canvas.getContext('2d');
        const gradient = context.createLinearGradient(0, 0, 0, 2);
        gradient.addColorStop(0, `#${topColor.getHexString()}`);
        gradient.addColorStop(1, `#${bottomColor.getHexString()}`);
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, 2, 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        this.scene.background = texture;
        
        // Add subtle fog for depth
        this.scene.fog = new THREE.Fog(topColor, 40, 300);
    }

    createCamera() {
        this.camera = new THREE.PerspectiveCamera(
            50,
            window.innerWidth / window.innerHeight,
            0.1,
            2000
        );
        
        this.camera.position.set(-30, 30, 35);
        this.camera.filmGauge = 35;
        this.camera.setFocalLength(50);
    }

    createRenderer() {
        const canvas = document.querySelector('canvas.threejs');
        this.renderer = new THREE.WebGLRenderer({ 
            canvas,
            antialias: true,
            powerPreference: "high-performance",
            stencil: false
        });
        
        this.renderer.physicallyCorrectLights = true;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Adjusted tone mapping for less contrast
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.8;  // Reduced exposure
        
        // Change to linear encoding for less saturation
        this.renderer.outputEncoding = THREE.LinearEncoding;
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    createControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.rotateSpeed = 0.8;
        this.controls.panSpeed = 0.8;
        this.controls.zoomSpeed = 0.8;
        this.controls.screenSpacePanning = false;
        this.setupControlLimits();
    }

    setupControlLimits() {
        this.controls.minDistance = 8;
        this.controls.maxDistance = 200;
        this.controls.maxPolarAngle = Math.PI / 1.8;
        this.controls.minPolarAngle = Math.PI / 6;
    }

    setupResizeHandler() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        });
    }

    updateControlsTarget(target) {
        this.controls.target.copy(target);
        this.controls.update();
    }

    calculateSceneCenter() {
        const boundingBox = new THREE.Box3();
        this.scene.traverse((object) => {
            if (object.isMesh) {
                boundingBox.expandByObject(object);
            }
        });
        const center = new THREE.Vector3();
        boundingBox.getCenter(center);
        return center;
    }

    updateCanvasSize(sidebarOpen) {
        const canvas = this.renderer.domElement;
        const sidebarWidth = sidebarOpen ? 240 : 0;
        
        canvas.style.marginLeft = `${sidebarWidth}px`;
        canvas.style.width = `calc(100% - ${sidebarWidth}px)`;
        
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        
        const needsResize = canvas.width !== width || canvas.height !== height;
        if (needsResize) {
            this.renderer.setSize(width, height, false);
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
        }
    }

    getComponents() {
        return {
            scene: this.scene,
            camera: this.camera,
            renderer: this.renderer,
            controls: this.controls
        };
    }
}