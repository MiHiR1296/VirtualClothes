import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class SceneManager {
  constructor(loadingManager, canvas) {
    this.loadingManager = loadingManager;
    this.canvas = canvas;
    this.modelCenter = new THREE.Vector3(0, 0, 0);
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
    
    // Add reference to this manager in scene's userData
    this.scene.userData.sceneManager = this;
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
    
    // Store initial position for reset functionality
    this.camera.userData.initialPosition = this.camera.position.clone();
    
    // Look at the center point
    this.camera.lookAt(this.modelCenter);
  }

  createRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: "high-performance",
      stencil: false,
      depth: true,
      alpha: true
    });

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.toneMapping = THREE.CineonToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.physicallyCorrectLights = true;

    this.updateSize();
  }

  createControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // Basic control settings
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.rotateSpeed = 0.8;
    this.controls.panSpeed = 0.8;
    this.controls.zoomSpeed = 0.8;
    this.controls.screenSpacePanning = true;

    // Store initial target for reset functionality
    this.controls.target.copy(this.modelCenter);
    this.controls.userData = {
      initialTarget: this.modelCenter.clone()
    };

    // Disable built-in key handling to use our custom controls
    this.controls.enableKeys = false;
    this.controls.listenToKeyEvents = false;

    this.setupControlLimits();
  }

  setupControlLimits() {
    if (this.controls) {
      this.controls.minDistance = 8;
      this.controls.maxDistance = 200;
      this.controls.maxPolarAngle = Math.PI / 1.8;
      this.controls.minPolarAngle = Math.PI / 6;
    }
  }

  setupResizeHandler() {
    window.addEventListener('resize', () => {
      this.updateSize();
    });
  }

  updateSize() {
    if (!this.canvas) return;

    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    const needsResize = this.canvas.width !== width || this.canvas.height !== height;

    if (needsResize) {
      this.renderer.setSize(width, height, false);
      
      if (this.camera) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
      }

      this.renderer.shadowMap.needsUpdate = true;
    }
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

    // Calculate new camera position
    const direction = new THREE.Vector3(-1, 1, 1).normalize();
    const position = center.clone().add(direction.multiplyScalar(distance));
    
    // Update camera
    this.camera.position.copy(position);
    this.controls.target.copy(center);
    
    // Update control limits based on model size
    this.controls.minDistance = maxDim;
    this.controls.maxDistance = maxDim * 5;

    // Look at center
    this.camera.lookAt(center);
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