import * as THREE from 'three';
import { ModelLoader } from '/modelLoader.js';



export function setupEventListeners(scene, pbrMaterial, simpleMaterial, camera, renderer, controls, modelLoader) {
    let currentMixers = [];
    let currentActions = [];
    let loadedTexture;


    // initialized to null at the start of your script to avoid errors when no object is selected.
    window.selectedModelPart = null;
    let lastSelectedPart = null;




    //Hover selection 

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const hoverDiv = document.getElementById('hoverDiv');

    function onClick(event) {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);
    
        if (intersects.length > 0) {
            for (let i = 0; i < intersects.length; i++) {
                let object = intersects[i].object;
                
                if (!object.name.includes("Fronttex") && !object.name.includes("Backtex")) {
                    console.log("Selected object:", object);
                    
                    // Update selection
                    window.selectedModelPart = object;
                    lastSelectedPart = object;
                    
                    // Update UI
                    document.getElementById('modelNameDisplay').innerText = "Selected Model: " + object.name;
                    
                    // Update color picker and sliders with current material values
                    if (object.material) {
                        const currentColor = "#" + object.material.color.getHexString();
                        document.getElementById('colorPicker').value = currentColor;
                        
                        if ('roughness' in object.material) {
                            document.getElementById('roughness').value = object.material.roughness;
                        }
                        if ('metalness' in object.material) {
                            document.getElementById('metalness').value = object.material.metalness;
                        }
                    }
                    
                    break;
                }
            }
        } else {
            // Only clear selection if clicking empty space AND not dragging sliders
            const isAdjustingControls = document.activeElement && 
                (document.activeElement.type === 'range' || 
                 document.activeElement.type === 'color');
                 
            if (!isAdjustingControls) {
                window.selectedModelPart = null;
                lastSelectedPart = null;
                document.getElementById('modelNameDisplay').innerText = "Selected Model: None";
            }
        }
    }
    
    // Color Picker event listener
    document.getElementById('colorPicker').addEventListener('input', function(event) {
        const newColor = event.target.value;
        const targetObject = lastSelectedPart || window.selectedModelPart;
        
        if (targetObject && targetObject.material) {
            targetObject.material.color.setStyle(newColor);
            targetObject.material.needsUpdate = true;
            console.log(`Applied color ${newColor} to ${targetObject.name}`);
        } else if (!lastSelectedPart) {
            // Only update pbrMaterial if no mesh is selected
            pbrMaterial.color.setStyle(newColor);
            pbrMaterial.needsUpdate = true;
            console.log('Applied color to pbrMaterial');
        }
    });
    
    // These lines should be outside and after the onClick function
    window.removeEventListener('click', onClick, false); // Remove this if you no longer need the hover effect
    window.addEventListener('click', onClick, false);
    
    // Assuming you've created an instance of ModelLoader somewhere
    //const modelLoader = new ModelLoader(scene, someManager); // You need to define `someManager`

    // Model Selection Handler
    const modelSelector = document.getElementById('modelSelector');
    modelSelector.addEventListener('change', async (event) => {

        const { mixers, actions } = await modelLoader.loadModels(
            pbrMaterial,
            simpleMaterial,
            event.target.value
        );

        // Stop and clear current animations
        currentMixers.forEach(mixer => {
            mixer.stopAllAction();
            mixer.uncacheRoot(mixer.getRoot());
        });
        currentActions.forEach(action => {
            if (action) action.stop();
        });


        

        // // Load new models
        // const { mixers, actions } = await loadModels(
        // //const { mixers, actions } = await modelLoader.loadModels(
        //     scene, 
        //     pbrMaterial, 
        //     simpleMaterial, 
        //     event.target.value
        // );

        // Update current mixers and actions
        currentMixers = mixers;
        currentActions = actions;

        // Reset camera position and update controls
        camera.position.set(0, 200, 120);
        controls.target.set(0, 0, 0);
        controls.update();
    });

    // Texture Upload Handler
    document.getElementById('logoUpload').addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (!file.type.match('image.*')) {
            console.error('File is not an image.');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            new THREE.TextureLoader().load(e.target.result, function(tex) {
                tex.encoding = THREE.sRGBEncoding;
                tex.flipY = false;
                
                simpleMaterial.map = tex;
                simpleMaterial.needsUpdate = true;
                
                loadedTexture = tex;
                
                updateTextureProperties();
            });
        };
        reader.readAsDataURL(file);
    });

    // Texture Controls
    const textureScaleControl = document.getElementById('textureScale');
    const textureRotationControl = document.getElementById('textureRotation');
    const textureOffsetXControl = document.getElementById('textureOffsetX');
    const textureOffsetYControl = document.getElementById('textureOffsetY');

    function updateTextureProperties() {
        if (loadedTexture) {
            const scale = parseFloat(textureScaleControl.value);
            loadedTexture.repeat.set(scale, scale);
            
            const rotationDegrees = parseFloat(textureRotationControl.value);
            loadedTexture.rotation = THREE.MathUtils.degToRad(rotationDegrees);
            
            const offsetX = parseFloat(textureOffsetXControl.value);
            const offsetY = parseFloat(textureOffsetYControl.value);
            loadedTexture.offset.set(offsetX, offsetY);
            
            loadedTexture.needsUpdate = true;
        }
    }

    // Texture Control Event Listeners
    textureScaleControl.addEventListener('input', updateTextureProperties);
    textureRotationControl.addEventListener('input', updateTextureProperties);
    textureOffsetXControl.addEventListener('input', updateTextureProperties);
    textureOffsetYControl.addEventListener('input', updateTextureProperties);


    // Roughness slider
document.getElementById('roughness').addEventListener('input', function(event) {
    const value = event.target.valueAsNumber;
    const targetObject = lastSelectedPart || window.selectedModelPart;
    
    if (targetObject && targetObject.material) {
        targetObject.material.roughness = value;
        targetObject.material.needsUpdate = true;
        console.log(`Applied roughness ${value} to ${targetObject.name}`);
    } else if (!lastSelectedPart) {
        pbrMaterial.roughness = value;
        pbrMaterial.needsUpdate = true;
    }
});

// Metalness slider
document.getElementById('metalness').addEventListener('input', function(event) {
    const value = event.target.valueAsNumber;
    const targetObject = lastSelectedPart || window.selectedModelPart;
    
    if (targetObject && targetObject.material) {
        targetObject.material.metalness = value;
        targetObject.material.needsUpdate = true;
        console.log(`Applied metalness ${value} to ${targetObject.name}`);
    } else if (!lastSelectedPart) {
        pbrMaterial.metalness = value;
        pbrMaterial.needsUpdate = true;
    }
});

// Add these event listeners to maintain selection while adjusting controls
document.getElementById('colorPicker').addEventListener('mousedown', function(e) {
    if (window.selectedModelPart) lastSelectedPart = window.selectedModelPart;
});

['roughness', 'metalness'].forEach(id => {
    document.getElementById(id).addEventListener('mousedown', function(e) {
        if (window.selectedModelPart) lastSelectedPart = window.selectedModelPart;
    });
});
    
    

    // Function to calculate luminance
    function getLuminance(hex) {
        const rgb = hex.startsWith('#') ? hex.substring(1) : hex;
        const r = parseInt(rgb.substring(0, 2), 16) / 255;
        const g = parseInt(rgb.substring(2, 4), 16) / 255;
        const b = parseInt(rgb.substring(4, 6), 16) / 255;
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
    
    // Function to get contrasting text color
    function getContrastingTextColor(hexColor) {
        return getLuminance(hexColor) > 0.5 ? '#000000' : '#FFFFFF';
    }
    
    // Background Color Handler
    document.getElementById('backgroundColorPicker').addEventListener('change', function(event) {
        const newColor = event.target.value;
        scene.background = new THREE.Color(newColor);
    
        // Dynamically set the text color based on the background color
        const modelNameDisplay = document.getElementById('modelNameDisplay');
        modelNameDisplay.style.color = getContrastingTextColor(newColor);
    });

    // Add this function to prevent click events from bubbling up to the canvas
    function stopEventPropagation(event) {
        event.stopPropagation();
    }
    

    
    
    



    // Window Resize Handler
    window.addEventListener('resize', () => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    });

    // Return the current mixers and actions for use in the animation loop
    return {
        getCurrentMixers: () => currentMixers,
        getCurrentActions: () => currentActions
    };
}
