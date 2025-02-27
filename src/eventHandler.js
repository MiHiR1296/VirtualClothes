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
        this.setupWorkspaceControls();
        this.setupModelControls();
        this.setupTextureControls();
        this.setupClickHandler();
        this.setupKeyboardHandler();
        this.setupSidebar();
    }

    setupWorkspaceControls() {
        const colorPicker = document.getElementById('colorPicker');
        const backgroundColorPicker = document.getElementById('backgroundColorPicker');
        
        if (colorPicker) {
            colorPicker.addEventListener('input', (event) => {
                if (window.selectedModelPart) {
                    const material = window.selectedModelPart.material;
                    const hexColor = event.target.value;
                    
                    // Store the exact hex color in a dedicated property
                    window.selectedModelPart.userData.exactColor = hexColor;
                    
                    // Convert hex to THREE.js color
                    material.color.set(hexColor);
                    material.needsUpdate = true;
                    
                    // Log for debugging
                    console.log(`Applied color ${hexColor} to ${window.selectedModelPart.name}`);
                }
            });
        }
    
        if (backgroundColorPicker) {
            backgroundColorPicker.addEventListener('change', (event) => {
                this.scene.background = new THREE.Color(event.target.value);
                this.updateModelNameDisplayColor(event.target.value);
            });
        }

        // Add individual control for model part material properties
        this.setupModelMaterialControls();
    }

    setupModelMaterialControls() {
        const propertiesContainer = document.getElementById('workspace-colors');
        if (propertiesContainer) {
            // Remove existing roughness and metalness sliders if they exist
            const existingRoughnessSlider = document.getElementById('modelPartRoughnessSlider');
            const existingMetalnessSlider = document.getElementById('modelPartMetalnessSlider');
            if (existingRoughnessSlider) existingRoughnessSlider.parentElement.remove();
            if (existingMetalnessSlider) existingMetalnessSlider.parentElement.remove();
    
            // Create roughness slider
            const roughnessSlider = document.createElement('input');
            roughnessSlider.type = 'range';
            roughnessSlider.min = '0';
            roughnessSlider.max = '1';
            roughnessSlider.step = '0.01';
            roughnessSlider.id = 'modelPartRoughnessSlider';
    
            // Create metalness slider
            const metalSlider = document.createElement('input');
            metalSlider.type = 'range';
            metalSlider.min = '0';
            metalSlider.max = '1';
            metalSlider.step = '0.01';
            metalSlider.id = 'modelPartMetalnessSlider';
    
            // Add event listeners for roughness slider
            roughnessSlider.addEventListener('input', (e) => {
                if (window.selectedModelPart && !this.isTextureMesh(window.selectedModelPart)) {
                    window.selectedModelPart.material.roughness = parseFloat(e.target.value);
                    window.selectedModelPart.material.needsUpdate = true;
                }
            });
    
            // Add event listeners for metalness slider
            metalSlider.addEventListener('input', (e) => {
                if (window.selectedModelPart && !this.isTextureMesh(window.selectedModelPart)) {
                    window.selectedModelPart.material.metalness = parseFloat(e.target.value);
                    window.selectedModelPart.material.needsUpdate = true;
                }
            });
    
            // Create containers for sliders
            const roughnessContainer = document.createElement('div');
            roughnessContainer.className = 'space-y-1';
            roughnessContainer.innerHTML = `
                <div class="flex justify-between text-xs text-gray-400">
                    <span>Model Part Roughness</span>
                    <span id="modelRoughnessValue">0.80</span>
                </div>
            `;
            roughnessContainer.appendChild(roughnessSlider);
    
            const metalnessContainer = document.createElement('div');
            metalnessContainer.className = 'space-y-1';
            metalnessContainer.innerHTML = `
                <div class="flex justify-between text-xs text-gray-400">
                    <span>Model Part Metalness</span>
                    <span id="modelMetalnessValue">0.10</span>
                </div>
            `;
            metalnessContainer.appendChild(metalSlider);
    
            // Append containers to properties container
            // propertiesContainer.appendChild(roughnessContainer);
            // propertiesContainer.appendChild(metalnessContainer);
    
            // Update value displays
            roughnessSlider.addEventListener('input', (e) => {
                document.getElementById('modelRoughnessValue').textContent = parseFloat(e.target.value).toFixed(2);
            });
    
            metalSlider.addEventListener('input', (e) => {
                document.getElementById('modelMetalnessValue').textContent = parseFloat(e.target.value).toFixed(2);
            });
        }
    }
    
    isTextureMesh(object) {
        return object.name.includes("Fronttex") || object.name.includes("Backtex");
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
                } finally {
                    this.loadingManager.hide();
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
                        this.loadedTexture.colorSpace = THREE.SRGBColorSpace;
                        this.loadedTexture.flipY = false;
                        this.loadedTexture.needsUpdate = true;
                        
                        this.applyStoredTextureToObjects(this.findTextureObjects());
                    });
                };
                reader.readAsDataURL(file);
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
                
                // Update roughness and metalness sliders for model part
                const roughnessSlider = document.getElementById('modelPartRoughnessSlider');
                const metalSlider = document.getElementById('modelPartMetalnessSlider');
                const roughnessValue = document.getElementById('modelRoughnessValue');
                const metalValue = document.getElementById('modelMetalnessValue');

                if (roughnessSlider && metalSlider && roughnessValue && metalValue) {
                    const material = selectableIntersect.object.material;
                    roughnessSlider.value = material.roughness;
                    metalSlider.value = material.metalness;
                    roughnessValue.textContent = material.roughness.toFixed(2);
                    metalValue.textContent = material.metalness.toFixed(2);
                }
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
                object.material.map.center.set(0.5, 0.5);
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
        if (!colorPicker || !object.material) return;
        
        // If we have the stored exact color, use that directly
        if (object.userData.exactColor) {
            colorPicker.value = object.userData.exactColor;
            console.log(`Retrieved stored color ${object.userData.exactColor} for ${object.name}`);
        }
        // Otherwise get the string from the material color
        else if (object.material.color) {
            // Convert the THREE.js color to hex string
            const hexColor = '#' + object.material.color.getHexString();
            colorPicker.value = hexColor;
            
            // Also store it for future reference
            object.userData.exactColor = hexColor;
            console.log(`Set initial color ${hexColor} for ${object.name}`);
        }
    }

    updateWorkspaceVisibility(workspaceId, isVisible) {
        const workspace = document.getElementById(`workspace-${workspaceId}`);
        if (workspace) {
            workspace.style.display = isVisible ? 'block' : 'none';
        }
    }
}