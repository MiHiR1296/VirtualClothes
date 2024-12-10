// sceneSetup.js
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class SceneManager {
  constructor(loadingManager, canvas) {
    this.loadingManager = loadingManager;
    this.canvas = canvas;
    this.modelCenter = new THREE.Vector3(0, 0, 0); // Initialize modelCenter
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

    // Set up gradient background and subtle fog
    const topColor = new THREE.Color(0x181818);
    const midColor = new THREE.Color(0x242424);
    const bottomColor = new THREE.Color(0x181818);

    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 2;

    const context = canvas.getContext('2d');
    const gradient = context.createLinearGradient(0, 0, 0, 2);
    gradient.addColorStop(0, `#${topColor.getHexString()}`);
    gradient.addColorStop(0.5, `#${midColor.getHexString()}`);
    gradient.addColorStop(1, `#${bottomColor.getHexString()}`);

    context.fillStyle = gradient;
    context.fillRect(0, 0, 2, 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    this.scene.background = texture;

    this.scene.fog = new THREE.Fog(topColor, 60, 100);
  }

  createCamera() {
    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );

    // Set default camera position
    this.camera.position.set(-30, 30, 35);
    this.camera.filmGauge = 35;
    this.camera.setFocalLength(50);
    
    // Look at the center point
    this.camera.lookAt(this.modelCenter);
  }

  createRenderer() {
    // Create renderer with optimized settings
    this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        powerPreference: "high-performance",
        stencil: false,
        depth: true,
        alpha: true
    });

    // Core settings
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Color management
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.6;
    
    // Optimizations
    this.renderer.sortObjects = true;
    this.renderer.physicallyCorrectLights = true;
    
    // Shadow optimizations
    this.renderer.shadowMap.autoUpdate = true;
    
    // Set background and clear settings
    this.renderer.setClearColor(0x000000, 0);
    
    // Enable debug mode for WebGL context loss
    this.renderer.debug.checkShaderErrors = true;

    // Set default size
    this.updateSize();

    return this.renderer;
}

updateSize() {
    if (!this.canvas) return;

    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    const needsResize = this.canvas.width !== width || this.canvas.height !== height;

    if (needsResize) {
        // Set size with pixel ratio capping
        this.renderer.setSize(width, height, false);
        
        // Update shadow map
        this.renderer.shadowMap.needsUpdate = true;

        // Clear any previous render targets
        if (this.renderer.getRenderTarget()) {
            this.renderer.setRenderTarget(null);
        }

        // Update camera
        if (this.camera) {
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
        }
    }
}

  createControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    this.controls.rotateSpeed = 0.8;
    this.controls.panSpeed = 0.8;
    this.controls.zoomSpeed = 0.8;

    this.controls.target.copy(this.modelCenter);
    this.controls.screenSpacePanning = true;

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
      this.updateSize();
    });
  }

  updateCameraForModel(model) {
    if (!model) return;

    const boundingBox = new THREE.Box3().setFromObject(model);
    const center = new THREE.Vector3();
    boundingBox.getCenter(center);
    this.modelCenter.copy(center);

    const size = new THREE.Vector3();
    boundingBox.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const distance = maxDim * 2;

    this.camera.position.set(
      center.x + distance,
      center.y + distance * 0.8,
      center.z + distance
    );

    this.controls.target.copy(center);
    this.controls.minDistance = maxDim;
    this.controls.maxDistance = maxDim * 5;

    this.camera.lookAt(center);
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
    this.modelCenter.copy(center);
    return center;
  }

  updateControlsTarget(target) {
    if (!target) return;
    this.modelCenter.copy(target);
    this.controls.target.copy(target);
    this.camera.lookAt(target);
    this.controls.update();
  }

  getComponents() {
    return {
      scene: this.scene,
      camera: this.camera,
      renderer: this.renderer,
      controls: this.controls
    };
  }

  dispose() {
    if (this.renderer) {
      this.renderer.dispose();
    }
    if (this.scene) {
      this.scene.traverse((object) => {
        if (object.geometry) {
          object.geometry.dispose();
        }
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
    }
    window.removeEventListener('resize', this.updateSize);
  }
}