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
        
        // Flag to check if texture edit mode is active
        // this.isTextureEditModeActive = false;

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.setupWorkspaceControls();
        this.setupModelControls();
        this.setupTextureControls();
        this.setupClickHandler();
        this.setupKeyboardHandler();
        this.setupSidebar();
        
        // Add listener for texture edit mode changes
        // window.addEventListener('texture-edit-mode-change', (event) => {
        //     this.isTextureEditModeActive = event.detail.active;
        // });
    }

    setupWorkspaceControls() {
        const colorPicker = document.getElementById('colorPicker');
        const backgroundColorPicker = document.getElementById('backgroundColorPicker');
        
        if (colorPicker) {
            colorPicker.addEventListener('input', (event) => {
                if (window.selectedModelPart) {
                    const hexColor = event.target.value;
                    
                    // Use the global color manager if available
                    if (window.colorManager) {
                        window.colorManager.storeExactColor(window.selectedModelPart, hexColor);
                    } else {
                        // Fallback to direct application
                        const material = window.selectedModelPart.material;
                        window.selectedModelPart.userData.exactColor = hexColor;
                        material.color.set(hexColor);
                        material.needsUpdate = true;
                    }
                    
                    console.log(`Applied color ${hexColor} to ${window.selectedModelPart.name}`);
                }
            });
        }
        
        // Keep the rest of the method unchanged
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
    const updateMaterialUI = (object) => {
        if (!object || !object.material) return;
        
        // Get the existing sliders from App.jsx
        const roughnessSlider = document.getElementById('modelPartRoughnessSlider');
        const metalSlider = document.getElementById('modelPartMetalnessSlider');
        const roughnessValue = document.getElementById('modelRoughnessValue');
        const metalValue = document.getElementById('modelMetalnessValue');
        
        if (roughnessSlider && metalSlider && roughnessValue && metalValue) {
            // Get stored exact values or use material values
            const roughness = object.userData.exactRoughness !== undefined 
                ? object.userData.exactRoughness 
                : object.material.roughness;
                
            const metalness = object.userData.exactMetalness !== undefined
                ? object.userData.exactMetalness
                : object.material.metalness;
            
            // Update the UI
            roughnessSlider.value = roughness;
            metalSlider.value = metalness;
            roughnessValue.textContent = roughness.toFixed(2);
            metalValue.textContent = metalness.toFixed(2);
            
            console.log(`Updated material UI - Roughness: ${roughness}, Metalness: ${metalness}`);
        }
    };
    
    // Store the update function for later use
    this.updateMaterialUI = updateMaterialUI;
}

// Also update the updateUIForSelection method to use our helper method
updateUIForSelection(object) {
    this.updateModelNameDisplay(object.name);
    
    // Apply the exact color if we have a color manager
    if (window.colorManager) {
        window.colorManager.applyExactColor(object);
    }
    
    this.updateMaterialControls(object);
    
    // Update material sliders using our helper method
    if (this.updateMaterialUI) {
        this.updateMaterialUI(object);
    }
    
    // We can also still ensure the UI is updated directly
    const roughnessSlider = document.getElementById('modelPartRoughnessSlider');
    const metalSlider = document.getElementById('modelPartMetalnessSlider');
    const roughnessValue = document.getElementById('modelRoughnessValue');
    const metalValue = document.getElementById('modelMetalnessValue');

    if (roughnessSlider && metalSlider && roughnessValue && metalValue && object.material) {
        // Get stored values or default to material values
        const roughness = object.userData.exactRoughness !== undefined 
            ? object.userData.exactRoughness 
            : (object.material.roughness !== undefined ? object.material.roughness : 0.8);
            
        const metalness = object.userData.exactMetalness !== undefined
            ? object.userData.exactMetalness
            : (object.material.metalness !== undefined ? object.material.metalness : 0.1);
        
        // Update UI
        roughnessSlider.value = roughness;
        metalSlider.value = metalness;
        roughnessValue.textContent = roughness.toFixed(2);
        metalValue.textContent = metalness.toFixed(2);
        
        console.log('Current material values:', {
            roughness: roughness,
            metalness: metalness
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
            // Skip if texture edit mode is active
            if (this.isTextureEditModeActive) {
                return;
            }
            
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
        // With the new naming convention, we can simply check if the name starts with "Fronttex_"
        if (object.name.startsWith("Fronttex_")) {
            return false;
        }
        
        // Also check for traditional "Fronttex" and "Backtex" naming that might still exist
        if (object.name.includes("Fronttex") || object.name.includes("Backtex")) {
            return false;
        }
        
        // The original remaining conditions
        return (
            object.isMesh && 
            object.material.type !== 'ShadowMaterial' &&
            object.userData.isImported
        );
    }

    findTextureObjects() {
    const textureObjects = [];
    
    // The new naming convention makes this much simpler
    this.scene.traverse((object) => {
        if (object.isMesh) {
            // Check for the new naming convention
            if (object.name.startsWith("Fronttex_")) {
                textureObjects.push(object);
                // Mark as texture mesh for easy identification later
                object.userData.isTextureMesh = true;
            }
            // Also check traditional naming as a fallback
            else if (object.name.includes("Fronttex") || object.name.includes("Backtex")) {
                textureObjects.push(object);
                object.userData.isTextureMesh = true;
            }
        }
    });
    
    console.log(`Found ${textureObjects.length} texture objects:`, 
        textureObjects.map(o => o.name));
        
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
        
        // Apply the exact color if we have a color manager
        if (window.colorManager) {
            window.colorManager.applyExactColor(object);
        }
        
        this.updateMaterialControls(object);
    
        
        // Update roughness and metalness sliders for model part
        const roughnessSlider = document.getElementById('modelPartRoughnessSlider');
        const metalSlider = document.getElementById('modelPartMetalnessSlider');
        const roughnessValue = document.getElementById('modelRoughnessValue');
        const metalValue = document.getElementById('modelMetalnessValue');

        if (roughnessSlider && metalSlider && roughnessValue && metalValue && object.material) {
            // Ensure we're reading the correct values from the material
            const material = object.material;
            roughnessSlider.value = material.roughness !== undefined ? material.roughness : 0.8;
            metalSlider.value = material.metalness !== undefined ? material.metalness : 0.1;
            roughnessValue.textContent = material.roughness !== undefined ? material.roughness.toFixed(2) : '0.80';
            metalValue.textContent = material.metalness !== undefined ? material.metalness.toFixed(2) : '0.10';
            
            // Log the current material values
            console.log('Current material values:', {
                roughness: material.roughness,
                metalness: material.metalness
            });
        }
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
        
        // Always use the color manager if available to get the exact color
        if (window.colorManager) {
          const exactColor = window.colorManager.getExactColorForPicker(object);
          colorPicker.value = exactColor;
          console.log(`Set color picker to exact color: ${exactColor}`);
          return;
        }
        
        // Fallback to original logic if color manager is unavailable
        if (object.userData && object.userData.exactColor) {
            colorPicker.value = object.userData.exactColor;
            console.log(`Retrieved stored color ${object.userData.exactColor} for ${object.name}`);
        }
        else if (object.material.color) {
            const hexColor = '#' + object.material.color.getHexString();
            colorPicker.value = hexColor;
            
            if (!object.userData) object.userData = {};
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