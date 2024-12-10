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
        this.animationsPlaying = true;
        
        // Initialize global variable
        window.selectedModelPart = null;
        window.findTextureObjects = this.findTextureObjects.bind(this);

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Move setup methods to workspace-specific setups
        this.setupWorkspaceControls();
        this.setupModelControls();
        this.setupTextureControls();
        this.setupClickHandler();
        this.setupKeyboardHandler();
        this.setupSidebar();
        this.setupAnimationToggleButton();
    }

    setupWorkspaceControls() {
        // Handle workspace-specific controls
        const colorPicker = document.getElementById('colorPicker');
        const backgroundColorPicker = document.getElementById('backgroundColorPicker');
        const materialSelect = document.getElementById('materialSelect');

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

        if (materialSelect) {
            materialSelect.addEventListener('change', async (event) => {
                if (window.selectedModelPart) {
                    await this.materialManager.updateMaterial(
                        window.selectedModelPart, 
                        event.target.value
                    );
                }
            });
        }
    }

    setupAnimationToggleButton() {
        const toggleAnimationButton = document.createElement('button');
        toggleAnimationButton.textContent = 'Pause Animations';
        toggleAnimationButton.style.position = 'fixed';
        toggleAnimationButton.style.bottom = '10px';
        toggleAnimationButton.style.right = '10px';
        document.body.appendChild(toggleAnimationButton);

        toggleAnimationButton.addEventListener('click', () => {
            this.animationsPlaying = !this.animationsPlaying;
            toggleAnimationButton.textContent = this.animationsPlaying ? 'Pause Animations' : 'Play Animations';
            if (this.animationsPlaying) {
                this.modelLoader.playAllAnimations();
            } else {
                this.modelLoader.pauseAllAnimations();
            }
        });
    }

    setupModelControls() {
        const modelSelector = document.getElementById('modelSelector');
        if (modelSelector) {
            modelSelector.addEventListener('change', async (event) => {
                window.selectedModelPart = null;
                this.updateModelNameDisplay('None');
                
                this.loadingManager.show();
                
                try {
                    const modelControls = await this.modelLoader.loadModels(
                        this.materialManager,
                        event.target.value
                    );
                    modelControls.playAllAnimations();
                    
                    const center = this.sceneManager.calculateSceneCenter();
                    this.sceneManager.updateControlsTarget(center);

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

    setupTextureControls() {
        const logoUpload = document.getElementById('logoUpload');
        const textureScaleSlider = document.getElementById('textureScale');
        const textureRotationSlider = document.getElementById('textureRotation');
        const textureOffsetXSlider = document.getElementById('textureOffsetX');
        const textureOffsetYSlider = document.getElementById('textureOffsetY');

        if (logoUpload) {
            logoUpload.addEventListener('change', (event) => {
                const file = event.target.files?.[0];
                if (!file?.type.match('image.*')) {
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

        if (textureScaleSlider) {
            textureScaleSlider.addEventListener('input', (event) => {
                // Update texture scale
            });
        }

        if (textureRotationSlider) {
            textureRotationSlider.addEventListener('input', (event) => {
                // Update texture rotation
            });
        }

        if (textureOffsetXSlider) {
            textureOffsetXSlider.addEventListener('input', (event) => {
                // Update texture offset X
            });
        }

        if (textureOffsetYSlider) {
            textureOffsetYSlider.addEventListener('input', (event) => {
                // Update texture offset Y
            });
        }
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
            modelNameDisplay.innerText = `Selected: ${name}`;
            modelNameDisplay.style.color = '#FFFFFF';
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

    updateWorkspaceVisibility(workspaceId, isVisible) {
        const workspace = document.getElementById(`workspace-${workspaceId}`);
        if (workspace) {
            workspace.style.display = isVisible ? 'block' : 'none';
        }
    }
}