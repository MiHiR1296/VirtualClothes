import * as THREE from 'three';

export class EventHandler {
    constructor(scene, camera, renderer, controls, modelLoader, materialManager, sceneManager, loadingManager) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.controls = controls;
        this.modelLoader = modelLoader;
        this.materialManager = materialManager;
        this.sceneManager = sceneManager;
        this.loadingManager = loadingManager;

        // Initialize properties
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.loadedTexture = null;
        this.textureProperties = {
            scale: 1,
            rotation: 0,
            offsetX: 0,
            offsetY: 0
        };

        // Initialize global variable
        window.selectedModelPart = null;
        window.findTextureObjects = this.findTextureObjects.bind(this);

        // Setup all event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Set up sidebar toggle
        this.setupSidebar();

        // Set up model selection
        this.setupModelSelector();

        // Set up color controls
        this.setupColorControls();

        // Set up material controls
        this.setupMaterialControls();

        // Set up texture controls
        this.setupTextureControls();

        // Set up click handling
        this.setupClickHandler();

        // Set up keyboard controls
        this.setupKeyboardHandler();

        // Set up logo upload
        this.setupLogoUpload();
    }

    setupSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const menuToggle = document.querySelector('.menu-toggle');
        let sidebarOpen = false;

        if (menuToggle && sidebar) {
            menuToggle.addEventListener('click', () => {
                sidebarOpen = !sidebarOpen;
                sidebar.classList.toggle('open');
                this.sceneManager.updateCanvasSize(sidebarOpen);
            });
        }
    }

    setupModelSelector() {
        const modelSelector = document.getElementById('modelSelector');
        if (modelSelector) {
            modelSelector.addEventListener('change', async (event) => {
                // Reset selection
                window.selectedModelPart = null;
                this.updateModelNameDisplay('None');
                
                // Show loading screen
                this.loadingManager.show();
                
                try {
                    // Load new model
                    const modelControls = await this.modelLoader.loadModels(
                        this.materialManager,
                        event.target.value
                    );

                    // Ensure animations are playing
                    modelControls.playAllAnimations();

                    // Update camera position and controls
                    this.camera.position.set(-30, 30, 35);
                    const center = this.sceneManager.calculateSceneCenter();
                    this.sceneManager.updateControlsTarget(center);

                    // Apply stored texture if it exists
                    if (this.loadedTexture) {
                        this.applyStoredTextureToObjects(this.findTextureObjects());
                    }

                } catch (error) {
                    console.error('Error changing model:', error);
                    this.loadingManager.updateLog(`Error loading model: ${error.message}`);
                }
            });
        }
    }

    setupColorControls() {
        const colorPicker = document.getElementById('colorPicker');
        const backgroundColorPicker = document.getElementById('backgroundColorPicker');

        if (colorPicker) {
            colorPicker.addEventListener('input', (event) => {
                if (window.selectedModelPart) {
                    const material = window.selectedModelPart.material;
                    material.color.setStyle(event.target.value);
                    if (material.map) {
                        material.color.multiplyScalar(0.8);
                    }
                    material.needsUpdate = true;
                }
            });
        }

        if (backgroundColorPicker) {
            backgroundColorPicker.addEventListener('change', (event) => {
                this.scene.background = new THREE.Color(event.target.value);
                this.updateModelNameDisplayColor(event.target.value);
            });
        }
    }

    setupMaterialControls() {
        // Material controls are handled by MaterialManager
    }

    setupTextureControls() {
        // Remove old texture controls if they exist
        const oldControls = document.querySelectorAll('#textureScale, #textureRotation, #textureOffsetX, #textureOffsetY');
        oldControls.forEach(control => {
            if (control && control.parentNode) {
                control.parentNode.removeChild(control);
            }
        });
    }

    setupClickHandler() {
        this.renderer.domElement.addEventListener('click', (event) => {
            if (event.target.closest('.sidebar') || event.target.closest('.controls')) {
                return;
            }

            const rect = this.renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(this.scene.children, true);

            const selectableIntersect = intersects.find(intersect => 
                this.isSelectableObject(intersect.object)
            );

            if (selectableIntersect) {
                window.selectedModelPart = selectableIntersect.object;
                this.updateUIForSelection(selectableIntersect.object);
            }
        });
    }

    setupKeyboardHandler() {
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                window.selectedModelPart = null;
                this.updateModelNameDisplay('None');
            }
        });
    }

    setupLogoUpload() {
        const logoUpload = document.getElementById('logoUpload');
        if (logoUpload) {
            logoUpload.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (!file.type.match('image.*')) {
                    console.error('File is not an image.');
                    return;
                }

                const reader = new FileReader();
                reader.onload = (e) => {
                    new THREE.TextureLoader().load(e.target.result, (texture) => {
                        this.loadedTexture = texture;
                        this.loadedTexture.encoding = THREE.sRGBEncoding;
                        this.loadedTexture.flipY = false;
                        this.loadedTexture.needsUpdate = true;
                        
                        this.applyStoredTextureToObjects(this.findTextureObjects());
                    });
                };
                reader.readAsDataURL(file);
            });
        }
    }

    // Helper methods
    isSelectableObject(object) {
        return (
            object.isMesh && 
            !object.name.includes("Fronttex") && 
            !object.name.includes("Backtex") &&
            object.material.type !== 'ShadowMaterial' &&
            object.userData.isImported
        );
    }

    findTextureObjects() {
        const textureObjects = [];
        this.scene.traverse((object) => {
            if (object.isMesh && (object.name.includes("Fronttex") || object.name.includes("Backtex"))) {
                textureObjects.push(object);
            }
        });
        return textureObjects;
    }

    applyStoredTextureToObjects(objects) {
        if (!this.loadedTexture) return;

        objects.forEach(object => {
            const newMaterial = new THREE.MeshStandardMaterial({
                map: this.loadedTexture,
                transparent: true,
                side: THREE.FrontSide,
                depthWrite: true,
                depthTest: true,
                alphaTest: 0.1,
            });
            object.material = newMaterial;
            object.renderOrder = 1;

            if (object.material.map) {
                object.material.map.center.set(0.5, 0.5);  // Set center point for scaling
                object.material.map.needsUpdate = true;
            }
            object.material.needsUpdate = true;
        });
    }

    updateUIForSelection(object) {
        this.updateModelNameDisplay(object.name);
        this.updateMaterialControls(object);
    }

    updateModelNameDisplay(name) {
        const modelNameDisplay = document.getElementById('modelNameDisplay');
        if (modelNameDisplay) {
            modelNameDisplay.innerText = "Selected Model: " + name;
            modelNameDisplay.style.color = '#FFFFFF';
            modelNameDisplay.style.textShadow = '2px 2px #000000';
        }
    }

    updateModelNameDisplayColor(backgroundColor) {
        const modelNameDisplay = document.getElementById('modelNameDisplay');
        if (modelNameDisplay) {
            const color = new THREE.Color(backgroundColor);
            const luminance = 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
            modelNameDisplay.style.color = luminance > 0.5 ? '#000000' : '#FFFFFF';
        }
    }

    updateMaterialControls(object) {
        const colorPicker = document.getElementById('colorPicker');
        const roughnessSlider = document.getElementById('roughness');
        const metalnessSlider = document.getElementById('metalness');

        if (object.material && object.material.color) {
            if (colorPicker) {
                colorPicker.value = '#' + object.material.color.getHexString();
            }
            
            if (roughnessSlider && 'roughness' in object.material) {
                roughnessSlider.value = object.material.roughness;
            }
            if (metalnessSlider && 'metalness' in object.material) {
                metalnessSlider.value = object.material.metalness;
            }
        }
    }
}