import * as THREE from 'three';
import { ModelLoader } from '/modelLoader.js';
import { updateControlsTarget } from '/sceneSetup.js';

// Helper Functions
function isSelectableObject(object) {
    return (
        object.isMesh && 
        !object.name.includes("Fronttex") && 
        !object.name.includes("Backtex") &&
        object.material.type !== 'ShadowMaterial' &&
        object.userData.isImported
    );
}

function getLuminance(hex) {
    const rgb = hex.startsWith('#') ? hex.substring(1) : hex;
    const r = parseInt(rgb.substring(0, 2), 16) / 255;
    const g = parseInt(rgb.substring(2, 4), 16) / 255;
    const b = parseInt(rgb.substring(4, 6), 16) / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function findTextureObjects(scene) {
    const textureObjects = [];
    scene.traverse((object) => {
        if (object.isMesh && (object.name.includes("Fronttex") || object.name.includes("Backtex"))) {
            textureObjects.push(object);
        }
    });
    return textureObjects;
}

// Helper function to safely get DOM elements
function getElement(selector, fallback = null) {
    const element = document.querySelector(selector);
    if (!element && !fallback) {
        console.warn(`Element with selector "${selector}" not found`);
    }
    return element || fallback;
}

export function setupEventListeners(scene, pbrMaterial, simpleMaterial, camera, renderer, controls, modelLoader, materialManager) {
    // State Management
    let currentMixers = [];
    let currentActions = [];
    let loadedTexture = null;
    let textureProperties = {
        scale: 1,
        rotation: 0,
        offsetX: 0,
        offsetY: 0
    };
    window.selectedModelPart = null;

    // Raycaster Setup
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Get required DOM elements
    const canvas = renderer.domElement;
    const sidebar = getElement('.sidebar');
    const menuToggle = getElement('.menu-toggle');
    let sidebarOpen = false;

    // UI Update Functions
    function updateUIForSelection(object) {
        const modelNameDisplay = getElement('#modelNameDisplay');
        if (modelNameDisplay) {
            modelNameDisplay.innerText = "Selected Model: " + object.name;
            modelNameDisplay.style.fontSize = '2em';
            modelNameDisplay.style.color = '#FFFFFF';
            modelNameDisplay.style.textShadow = '2px 2px #000000';
        }

        const colorPicker = getElement('#colorPicker');
        const roughnessSlider = getElement('#roughness');
        const metalnessSlider = getElement('#metalness');

        if (object.material && object.material.color) {
            if (colorPicker) {
                colorPicker.value = "#" + object.material.color.getHexString();
            }
            
            if (roughnessSlider && 'roughness' in object.material) {
                roughnessSlider.value = object.material.roughness;
            }
            if (metalnessSlider && 'metalness' in object.material) {
                metalnessSlider.value = object.material.metalness;
            }
        }
    }

    // Update canvas position based on sidebar state
    function updateCanvasPosition() {
        if (!canvas) return;
        
        if (sidebarOpen) {
            canvas.style.marginLeft = '240px';
            canvas.style.width = 'calc(100% - 240px)';
        } else {
            canvas.style.marginLeft = '0';
            canvas.style.width = '100%';
        }
        
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
    }

    // Function to apply stored texture to new models
    function applyStoredTextureToObjects(objects) {
        if (!loadedTexture) return;

        objects.forEach(object => {
            const newMaterial = new THREE.MeshStandardMaterial({
                map: loadedTexture,
                transparent: true,
                side: THREE.FrontSide,
                depthWrite: true,
                depthTest: true,
                alphaTest: 0.1,
            });
            object.material = newMaterial;
            object.renderOrder = 1;

            // Apply stored texture properties
            if (object.material.map) {
                object.material.map.repeat.set(textureProperties.scale, textureProperties.scale);
                object.material.map.rotation = THREE.MathUtils.degToRad(textureProperties.rotation);
                object.material.map.offset.set(textureProperties.offsetX, textureProperties.offsetY);
                object.material.map.needsUpdate = true;
            }
            object.material.needsUpdate = true;
        });
    }

    // Logo/Texture Upload
    const logoUpload = getElement('#logoUpload');
    if (logoUpload) {
        logoUpload.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (!file.type.match('image.*')) {
                console.error('File is not an image.');
                return;
            }

            const reader = new FileReader();
            reader.onload = function(e) {
                new THREE.TextureLoader().load(e.target.result, function(tex) {
                    console.log('Texture loaded, applying to texture meshes');
                    
                    // Store the texture and its initial properties
                    loadedTexture = tex;
                    loadedTexture.encoding = THREE.sRGBEncoding;
                    loadedTexture.flipY = false;
                    loadedTexture.needsUpdate = true;
                    
                    // Apply to current texture objects
                    const textureObjects = findTextureObjects(scene);
                    applyStoredTextureToObjects(textureObjects);
                });
            };
            reader.readAsDataURL(file);
        });
    }

    // Texture Controls Setup
    const textureControls = {
        scale: getElement('#textureScale'),
        rotation: getElement('#textureRotation'),
        offsetX: getElement('#textureOffsetX'),
        offsetY: getElement('#textureOffsetY')
    };

    function updateTextureProperties() {
        if (!loadedTexture) return;

        // Update stored properties
        textureProperties.scale = parseFloat(textureControls.scale?.value || 1);
        textureProperties.rotation = parseFloat(textureControls.rotation?.value || 0);
        textureProperties.offsetX = parseFloat(textureControls.offsetX?.value || 0);
        textureProperties.offsetY = parseFloat(textureControls.offsetY?.value || 0);

        const textureObjects = findTextureObjects(scene);
        textureObjects.forEach(object => {
            if (object.material?.map) {
                object.material.map.repeat.set(textureProperties.scale, textureProperties.scale);
                object.material.map.rotation = THREE.MathUtils.degToRad(textureProperties.rotation);
                object.material.map.offset.set(textureProperties.offsetX, textureProperties.offsetY);
                object.material.map.needsUpdate = true;
            }
        });

        console.log('Updated texture properties:', textureProperties);
    }

    // Add texture control listeners
    Object.entries(textureControls).forEach(([key, control]) => {
        if (control) {
            control.addEventListener('input', updateTextureProperties);
        }
    });

    // Click handler
    function onClick(event) {
        if (event.target.closest('.sidebar') || event.target.closest('.controls')) {
            return;
        }

        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        mouse.x = (x / rect.width) * 2 - 1;
        mouse.y = -(y / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);

        const selectableIntersect = intersects.find(intersect => 
            isSelectableObject(intersect.object)
        );

        if (selectableIntersect) {
            const object = selectableIntersect.object;
            window.selectedModelPart = object;
            updateUIForSelection(object);
        }
    }

    // Handle sidebar toggle
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebarOpen = !sidebarOpen;
            sidebar.classList.toggle('open');
            updateCanvasPosition();
        });
    }

    // Event Listeners Setup
    window.removeEventListener('click', onClick);
    window.addEventListener('click', onClick);

    // Clear Selection with Escape
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            window.selectedModelPart = null;
            const modelNameDisplay = getElement('#modelNameDisplay');
            if (modelNameDisplay) {
                modelNameDisplay.innerText = "Selected Model: None";
            }
        }
    });

    // Color Picker
    const colorPicker = getElement('#colorPicker');
    if (colorPicker) {
        colorPicker.addEventListener('input', function(event) {
            if (window.selectedModelPart) {
                const newColor = event.target.value;
                window.selectedModelPart.material.color.setStyle(newColor);
                if (window.selectedModelPart.material.map) {
                    window.selectedModelPart.material.color.multiplyScalar(0.8);
                }
                window.selectedModelPart.material.needsUpdate = true;
            }
        });
    }

    // Model Selection
    const modelSelector = getElement('#modelSelector');
    if (modelSelector) {
        modelSelector.addEventListener('change', async (event) => {
            window.selectedModelPart = null;
            const modelNameDisplay = getElement('#modelNameDisplay');
            if (modelNameDisplay) {
                modelNameDisplay.innerText = "Selected Model: None";
            }
            
            const { mixers, actions } = await modelLoader.loadModels(
                pbrMaterial,
                simpleMaterial,
                event.target.value
            );

            // After loading new model, apply stored texture if it exists
            const textureObjects = findTextureObjects(scene);
            if (loadedTexture && textureObjects.length > 0) {
                applyStoredTextureToObjects(textureObjects);
            }

            currentMixers.forEach(mixer => {
                mixer.stopAllAction();
                mixer.uncacheRoot(mixer.getRoot());
            });
            currentActions.forEach(action => {
                if (action) action.stop();
            });

            currentMixers = mixers;
            currentActions = actions;

            camera.position.set(0, 15, 15);
            updateControlsTarget(scene, controls);
            controls.update();
        });
    }

    // Background Color Control
    const backgroundColorPicker = getElement('#backgroundColorPicker');
    if (backgroundColorPicker) {
        backgroundColorPicker.addEventListener('change', function(event) {
            const newColor = event.target.value;
            scene.background = new THREE.Color(newColor);
            const modelNameDisplay = getElement('#modelNameDisplay');
            if (modelNameDisplay) {
                modelNameDisplay.style.color = getLuminance(newColor) > 0.5 ? '#000000' : '#FFFFFF';
            }
        });
    }

    // Window resize handler
    window.addEventListener('resize', updateCanvasPosition);

    // Initial canvas position update
    updateCanvasPosition();

    return {
        getCurrentMixers: () => currentMixers,
        getCurrentActions: () => currentActions
    };
}