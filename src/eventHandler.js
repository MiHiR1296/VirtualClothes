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
        
        // Add a new property to track multiple selected parts
        this.selectedModelParts = [];
        
        // Initialize global variable for multi-selection
        window.selectedModelParts = [];
        
        // Add this property for debouncing material updates
        this.lastMaterialUpdateTime = 0;
        
        // Flag to check if texture edit mode is active
        this.isTextureEditModeActive = false;
    
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
       
        const backgroundColorPicker = document.getElementById('backgroundColorPicker');
        const colorPicker = document.getElementById('colorPicker');

        
        if (colorPicker) {
            // Use the input event with debouncing
            let colorChangeTimeout = null;
            
            colorPicker.addEventListener('input', (event) => {
                // Clear any pending timeout
                if (colorChangeTimeout) {
                    clearTimeout(colorChangeTimeout);
                }
                
                // Set a new timeout to apply color changes after user stops changing
                colorChangeTimeout = setTimeout(() => {
                    const exactColor = event.target.value;
                    
                    // Check if we have multiple selections
                    if (window.selectedModelParts && window.selectedModelParts.length > 1) {
                        // Apply to all selected parts
                        window.colorManager.storeExactColor(window.selectedModelParts, exactColor);
                    } else if (window.selectedModelPart) {
                        // Apply to single selection
                        window.colorManager.storeExactColor(window.selectedModelPart, exactColor);
                    }
                }, 100); // Apply after 100ms of inactivity
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
                
                // Get the existing sliders
                const roughnessSlider = document.querySelector('input[type="range"][value="' + object.material.roughness + '"]');
                const metalSlider = document.querySelector('input[type="range"][value="' + object.material.metalness + '"]');
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
        // Don't update if object is null or undefined
        if (!object) return;
    
        // Update the model name display
        this.updateModelNameDisplay(object.name);
        
        // Update material UI controls
        this.updateMaterialControls(object, true);
        
        // Only update sliders if this is not a texture mesh
        if (!this.isTextureMesh(object)) {
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
            }
        }
        
        // Dispatch an event so that other components know the selection has changed
        window.dispatchEvent(new CustomEvent('model-part-selected', {
            detail: {
                count: 1,
                parts: [object.name]
            }
        }));
    }
    
    // Add a new method to update UI for multi-selection
    updateUIForMultiSelection() {
        if (!this.selectedModelParts || this.selectedModelParts.length === 0) {
            this.updateModelNameDisplay('None');
            return;
        }
        
        if (this.selectedModelParts.length === 1) {
            // Single object selected, use standard UI update
            this.updateUIForSelection(this.selectedModelParts[0]);
            return;
        }
        
        // Multiple objects selected
        const partNames = this.selectedModelParts.map(part => part.name);
        const displayText = `Multiple parts (${this.selectedModelParts.length}): ${partNames.slice(0, 2).join(', ')}${partNames.length > 2 ? '...' : ''}`;
        this.updateModelNameDisplay(displayText);
        
        // Get first selected object for color picker initialization
        const primarySelection = window.selectedModelPart;
        
        // For color picker, we show the first selected item's color
        if (primarySelection) {
            this.updateMaterialControls(primarySelection);
        }
        
        // Dispatch an event so that other components know the selection has changed
        window.dispatchEvent(new CustomEvent('model-part-selected', {
            detail: {
                count: this.selectedModelParts.length,
                parts: this.selectedModelParts.map(part => part.name)
            }
        }));
    }
    
    isTextureMesh(object) {
        return object.name.includes("Fronttex") || object.name.includes("Backtex");
    }

    setupModelControls() {
        const modelSelector = document.getElementById('modelSelector');
        if (modelSelector) {
            modelSelector.addEventListener('change', async (event) => {
                window.selectedModelPart = null;
                this.selectedModelParts = [];
                window.selectedModelParts = [];
                this.updateModelNameDisplay('None');
                
                // Dispatch event with zero count when model changes
                window.dispatchEvent(new CustomEvent('model-part-selected', {
                    detail: {
                        count: 0,
                        parts: []
                    }
                }));
                
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
                const clickedObject = selectableIntersect.object;
                
                // Check if Ctrl or Cmd key is pressed
                if (event.ctrlKey || event.metaKey) {
                    // Multi-selection mode
                    
                    // Check if the object is already selected
                    const existingIndex = this.selectedModelParts.findIndex(part => 
                        part.uuid === clickedObject.uuid
                    );
                    
                    if (existingIndex >= 0) {
                        // Object is already selected, remove it (toggle)
                        this.selectedModelParts.splice(existingIndex, 1);
                    } else {
                        // Add object to selection
                        this.selectedModelParts.push(clickedObject);
                    }
                    
                    // Always update primary selection for immediate UI feedback
                    window.selectedModelPart = clickedObject;
                    
                    // Update global array reference
                    window.selectedModelParts = this.selectedModelParts;
                    
                    // Update UI to show multiple selection
                    this.updateUIForMultiSelection();
                } else {
                    // Single selection mode
                    window.selectedModelPart = clickedObject;
                    
                    // Clear multi-selection array
                    this.selectedModelParts = [clickedObject];
                    window.selectedModelParts = this.selectedModelParts;
                    
                    // Update UI for single selection
                    this.updateUIForSelection(clickedObject);
                }
            } else {
                // No object selected, clear all selections
                window.selectedModelPart = null;
                this.selectedModelParts = [];
                window.selectedModelParts = this.selectedModelParts;
                this.updateModelNameDisplay('None');
                
                // Dispatch event with zero count
                window.dispatchEvent(new CustomEvent('model-part-selected', {
                    detail: {
                        count: 0,
                        parts: []
                    }
                }));
            }
        });
    }

    setupKeyboardHandler() {
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                window.selectedModelPart = null;
                this.selectedModelParts = [];
                window.selectedModelParts = this.selectedModelParts;
                this.updateModelNameDisplay('None');
                
                // Dispatch event with zero count when clearing selection with Escape
                window.dispatchEvent(new CustomEvent('model-part-selected', {
                    detail: {
                        count: 0,
                        parts: []
                    }
                }));
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
        // Don't update if object is null or undefined
        if (!object) return;
    
        // Update the model name display
        this.updateModelNameDisplay(object.name);
        
        // Apply the exact color if we have a color manager, but use debouncing
        if (window.colorManager) {
            window.colorManager.applyExactColor(object, true);
        }
        
        // Update material UI controls
        this.updateMaterialControls(object, true);
        
        // Only update sliders if this is not a texture mesh
        if (!this.isTextureMesh(object)) {
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
            }
        }
        
        // Dispatch an event so that other components know the selection has changed
        window.dispatchEvent(new CustomEvent('model-part-selected', {
            detail: {
                count: 1,
                parts: [object.name]
            }
        }));
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

   
    updateMaterialControls(object, useDebounce = true) {
        const colorPicker = document.getElementById('colorPicker');
        if (!colorPicker || !object.material) return;
        
        // Track if we've already updated recently to avoid excessive updates
        const now = Date.now();
        
        // If debouncing and we've updated recently, skip this update
        if (useDebounce && now - this.lastMaterialUpdateTime < 200) {
            return;
        }
        
        // Update last update time
        this.lastMaterialUpdateTime = now;
        
        // Always use the color manager if available to get the exact color
        if (window.colorManager) {
            const exactColor = window.colorManager.getExactColorForPicker(object);
            colorPicker.value = exactColor;
            
            // Only log when debugging is enabled
            if (window.DEBUG_COLOR_MANAGER) {
                console.log(`Set color picker to exact color: ${exactColor}`);
            }
            return;
        }
        
        // Fallback to original logic if color manager is unavailable
        if (object.userData && object.userData.exactColor) {
            colorPicker.value = object.userData.exactColor;
        }
        else if (object.material.color) {
            const hexColor = '#' + object.material.color.getHexString();
            colorPicker.value = hexColor;
            
            if (!object.userData) object.userData = {};
            object.userData.exactColor = hexColor;
        }
    }

    updateWorkspaceVisibility(workspaceId, isVisible) {
        const workspace = document.getElementById(`workspace-${workspaceId}`);
        if (workspace) {
            workspace.style.display = isVisible ? 'block' : 'none';
        }
    }
}