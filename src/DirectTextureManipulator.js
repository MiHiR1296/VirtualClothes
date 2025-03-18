// DirectTextureManipulator.js
// Handles direct texture manipulation on 3D models in the scene

import * as THREE from 'three';

export class DirectTextureManipulator {
    constructor(scene, camera, renderer, textureContext) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.textureContext = textureContext;
        
        // Try to get the controls from the scene or window
        this.controls = window.controls || scene.userData.controls;
        this.originalControlsEnabled = this.controls ? this.controls.enabled : true;
        
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        this.isDragging = false;
        this.isScaling = false;
        this.isRotating = false;
        this.selectedTextureMesh = null;
        this.activeLayerId = null;
        this.isMouseOverTexture = false;
        
        this.startPosition = { x: 0, y: 0 };
        this.startUV = null;
        this.startTransform = null;
        this.startDistance = 0;
        this.startAngle = 0;
        
        this.activeTool = 'move'; // 'move', 'scale', 'rotate'
        this.enabled = false;

        // Create visible indicators for the selected texture
        this.createHelpers();
        
        // Bind methods to ensure proper 'this' context
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
        this.preventContextMenu = this.preventContextMenu.bind(this);
    }

    createHelpers() {
        // Create a helper to visualize the selected texture area
        const geometry = new THREE.PlaneGeometry(1, 1);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.2,
            side: THREE.DoubleSide,
            depthTest: false,
            visible: false
        });
        
        this.selectionHelper = new THREE.Mesh(geometry, material);
        this.selectionHelper.renderOrder = 999;
        this.scene.add(this.selectionHelper);
        
        // Create rotation and scale handles - make them larger and more visible
        const handleGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        const handleMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff5500,  // Changed to orange for better visibility
            transparent: true,
            opacity: 0.8,     // Increased opacity
            depthTest: false,
            visible: false
        });
        
        const rotateHandleMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00aaff,  // Blue for rotate
            transparent: true,
            opacity: 0.8,
            depthTest: false,
            visible: false
        });
        
        this.scaleHandle = new THREE.Mesh(handleGeometry, handleMaterial);
        this.rotateHandle = new THREE.Mesh(handleGeometry, rotateHandleMaterial);
        
        this.scaleHandle.renderOrder = 1000;
        this.rotateHandle.renderOrder = 1000;
        
        // Add text labels to identify handles
        const addLabel = (position, text, color) => {
            const canvas = document.createElement('canvas');
            canvas.width = 128;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = color;
            ctx.font = 'bold 48px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, 64, 32);
            
            const texture = new THREE.CanvasTexture(canvas);
            const labelMaterial = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                depthTest: false
            });
            
            const sprite = new THREE.Sprite(labelMaterial);
            sprite.position.copy(position);
            sprite.position.y += 0.3; // Position above the handle
            sprite.scale.set(0.5, 0.25, 1);
            
            return sprite;
        };
        
        this.scaleLabel = addLabel(this.scaleHandle.position, 'Scale', '#ff5500');
        this.rotateLabel = addLabel(this.rotateHandle.position, 'Rotate', '#00aaff');
        
        this.scene.add(this.scaleHandle);
        this.scene.add(this.rotateHandle);
        this.scene.add(this.scaleLabel);
        this.scene.add(this.rotateLabel);
    }

    enable() {
        if (this.enabled) return;
        
        this.enabled = true;
        this.renderer.domElement.addEventListener('mousedown', this.onMouseDown);
        this.renderer.domElement.addEventListener('mousemove', this.onMouseMove);
        this.renderer.domElement.addEventListener('mouseup', this.onMouseUp);
        window.addEventListener('keydown', this.onKeyDown);
        
        // Store original controls enabled state
        if (this.controls) {
            this.originalControlsEnabled = this.controls.enabled;
        }
        
        // Add visual indicator for enabled state
        const canvas = this.renderer.domElement;
        canvas.classList.add('texture-edit-mode');
        
        // Dispatch event for EventHandler to detect texture edit mode
        window.dispatchEvent(new CustomEvent('texture-edit-mode-change', {
            detail: { active: true }
        }));
        
        // Add context menu prevention
        this.renderer.domElement.addEventListener('contextmenu', this.preventContextMenu);
        
        console.log('Direct texture manipulation enabled');
    }

    disable() {
        if (!this.enabled) return;
        
        this.enabled = false;
        this.renderer.domElement.removeEventListener('mousedown', this.onMouseDown);
        this.renderer.domElement.removeEventListener('mousemove', this.onMouseMove);
        this.renderer.domElement.removeEventListener('mouseup', this.onMouseUp);
        window.removeEventListener('keydown', this.onKeyDown);
        
        // Hide helpers
        this.hideHelpers();
        
        // Remove visual indicator
        const canvas = this.renderer.domElement;
        canvas.classList.remove('texture-edit-mode');
        
        // Restore camera controls to original state
        if (this.controls && this.originalControlsEnabled !== undefined) {
            this.controls.enabled = this.originalControlsEnabled;
        }
        
        // Dispatch event for EventHandler to detect texture edit mode
        window.dispatchEvent(new CustomEvent('texture-edit-mode-change', {
            detail: { active: false }
        }));
        
        // Remove context menu prevention
        this.renderer.domElement.removeEventListener('contextmenu', this.preventContextMenu);
        
        console.log('Direct texture manipulation disabled');
    }
    
    preventContextMenu(e) {
        e.preventDefault();
    }

    setTool(toolName) {
        this.activeTool = toolName;
        
        // Update cursor based on the selected tool
        if (this.renderer && this.renderer.domElement) {
            const canvas = this.renderer.domElement;
            
            switch(toolName) {
                case 'move':
                    canvas.style.cursor = 'move';
                    break;
                case 'scale':
                    canvas.style.cursor = 'nwse-resize';
                    break;
                case 'rotate':
                    canvas.style.cursor = 'crosshair';
                    break;
                default:
                    canvas.style.cursor = 'auto';
            }
        }
    }

    toggle() {
        if (this.enabled) {
            this.disable();
        } else {
            this.enable();
        }
        return this.enabled;
    }

    updateHelpers() {
        if (!this.selectedTextureMesh || !this.activeLayerId) {
            this.hideHelpers();
            return;
        }
        
        // Find active layer
        const activeLayer = this.textureContext.layers.find(l => l.id === this.activeLayerId);
        if (!activeLayer) {
            this.hideHelpers();
            return;
        }
        
        // Calculate the mesh's dimensions
        const meshSize = new THREE.Vector3();
        const meshBox = new THREE.Box3().setFromObject(this.selectedTextureMesh);
        meshBox.getSize(meshSize);
        
        // Position selection helper
        this.selectionHelper.position.copy(this.selectedTextureMesh.position);
        this.selectionHelper.quaternion.copy(this.selectedTextureMesh.quaternion);
        this.selectionHelper.scale.copy(this.selectedTextureMesh.scale);
        
        // Make the helper visible but transparent
        this.selectionHelper.material.visible = true;
        
        // Position rotation and scale handles at fixed distances relative to mesh size
        const handleDistance = Math.max(meshSize.x, meshSize.y, meshSize.z) * 0.7;
        
        // Calculate a good position for the handles based on camera view
        const cameraDirection = new THREE.Vector3();
        this.camera.getWorldDirection(cameraDirection);
        
        // Create a plane perpendicular to camera direction passing through mesh center
        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
            cameraDirection, 
            this.selectedTextureMesh.position
        );
        
        // Calculate handle positions in a circle around the mesh
        // Scale handle at 3 o'clock position
        const scaleHandlePosition = this.selectedTextureMesh.position.clone();
        scaleHandlePosition.x += handleDistance;
        this.scaleHandle.position.copy(scaleHandlePosition);
        
        // Rotate handle at 12 o'clock position
        const rotateHandlePosition = this.selectedTextureMesh.position.clone();
        rotateHandlePosition.y += handleDistance;
        this.rotateHandle.position.copy(rotateHandlePosition);
        
        // Update label positions
        this.scaleLabel.position.copy(this.scaleHandle.position);
        this.rotateLabel.position.copy(this.rotateHandle.position);
        
        // Make handles visible
        this.scaleHandle.material.visible = true;
        this.rotateHandle.material.visible = true;
        this.scaleLabel.visible = true;
        this.rotateLabel.visible = true;
        
        // Use billboard matrix to make handles always face the camera
        const billboardMatrix = new THREE.Matrix4();
        const cameraPosition = this.camera.position.clone();
        
        billboardMatrix.lookAt(
            cameraPosition,
            this.selectedTextureMesh.position,
            this.camera.up
        );
        
        // Apply the billboard matrix to handles
        this.scaleHandle.quaternion.setFromRotationMatrix(billboardMatrix);
        this.rotateHandle.quaternion.setFromRotationMatrix(billboardMatrix);
    }

    hideHelpers() {
        if (this.selectionHelper) {
            this.selectionHelper.material.visible = false;
        }
        
        if (this.scaleHandle) {
            this.scaleHandle.material.visible = false;
        }
        
        if (this.rotateHandle) {
            this.rotateHandle.material.visible = false;
        }
        
        if (this.scaleLabel) {
            this.scaleLabel.visible = false;
        }
        
        if (this.rotateLabel) {
            this.rotateLabel.visible = false;
        }
    }

    onMouseDown(event) {
        if (!this.enabled || !this.textureContext.activeLayer) return;
        
        // Reset states
        this.isDragging = false;
        this.isScaling = false;
        this.isRotating = false;
        
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.startPosition = { x: event.clientX, y: event.clientY };
        
        // Check if we're interacting with a handle first
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // First check if we're clicking on the handles
        if (this.selectionHelper.material.visible) {
            // Add both handle objects and their labels to the check
            const handleObjects = [
                this.scaleHandle, this.rotateHandle
            ];
            
            const handleIntersections = this.raycaster.intersectObjects(handleObjects);
            
            if (handleIntersections.length > 0) {
                const handle = handleIntersections[0].object;
                
                if (handle === this.scaleHandle) {
                    console.log("Scale handle clicked");
                    this.isScaling = true;
                    this.activeTool = 'scale'; // Set active tool to scale
                } else if (handle === this.rotateHandle) {
                    console.log("Rotate handle clicked");
                    this.isRotating = true;
                    this.activeTool = 'rotate'; // Set active tool to rotate
                }
                
                // Get center of the texture mesh for rotation/scaling reference
                const center = this.selectedTextureMesh.position.clone();
                const screenCenter = this.toScreenPosition(center);
                
                // Calculate initial distance and angle for scaling/rotation
                this.startDistance = Math.hypot(
                    event.clientX - screenCenter.x,
                    event.clientY - screenCenter.y
                );
                
                this.startAngle = Math.atan2(
                    event.clientY - screenCenter.y,
                    event.clientX - screenCenter.x
                );
                
                // Store active layer id and ensure we get a full copy of the transform
                this.activeLayerId = this.textureContext.activeLayer.id;
                
                // Get a complete copy of transformations to preserve all properties
                const activeLayer = this.textureContext.layers.find(l => l.id === this.activeLayerId);
                if (activeLayer && activeLayer.transformations) {
                    this.startTransform = { ...activeLayer.transformations };
                } else {
                    this.startTransform = {
                        offset: { x: 0, y: 0 },
                        scale: 1,
                        rotation: 0,
                        flipX: 1,
                        flipY: 1,
                        repeat: false,
                        detailScale: 1.0
                    };
                }
                
                // Disable controls
                if (this.controls) {
                    this.controls.enabled = false;
                }
                
                return;
            }
        }
        
        // If no handle interaction, check for texture mesh interaction
        const textureMeshes = this.getTextureMeshes();
        const intersects = this.raycaster.intersectObjects(textureMeshes, true);
        
        if (intersects.length > 0) {
            const intersection = intersects[0];
            this.selectedTextureMesh = intersection.object;
            
            // Store UV coordinates if available
            if (intersection.uv) {
                this.startUV = intersection.uv.clone();
            }
            
            // Store active layer ID
            this.activeLayerId = this.textureContext.activeLayer.id;
            
            // Get a complete copy of transformations to preserve all properties
            const activeLayer = this.textureContext.layers.find(l => l.id === this.activeLayerId);
            if (activeLayer && activeLayer.transformations) {
                this.startTransform = { ...activeLayer.transformations };
            } else {
                this.startTransform = {
                    offset: { x: 0, y: 0 },
                    scale: 1,
                    rotation: 0,
                    flipX: 1,
                    flipY: 1,
                    repeat: false,
                    detailScale: 1.0
                };
            }
            
            // Use the current selected tool - defaults to move
            if (this.activeTool === 'scale') {
                this.isScaling = true;
                
                // Also need to set up scaling parameters
                const center = this.selectedTextureMesh.position.clone();
                const screenCenter = this.toScreenPosition(center);
                this.startDistance = Math.hypot(
                    event.clientX - screenCenter.x,
                    event.clientY - screenCenter.y
                );
            } else if (this.activeTool === 'rotate') {
                this.isRotating = true;
                
                // Also need to set up rotation parameters
                const center = this.selectedTextureMesh.position.clone();
                const screenCenter = this.toScreenPosition(center);
                this.startAngle = Math.atan2(
                    event.clientY - screenCenter.y,
                    event.clientX - screenCenter.x
                );
            } else {
                // Default to dragging (move)
                this.isDragging = true;
            }
            
            // Enable dragging and update visuals
            this.updateHelpers();
            
            // Disable controls
            if (this.controls) {
                this.controls.enabled = false;
            }
            
            console.log(`Texture mesh clicked. Active tool: ${this.activeTool}`);
        } else {
            // Clicked elsewhere, deselect
            this.selectedTextureMesh = null;
            this.hideHelpers();
        }
    }

    onMouseMove(event) {
        if (!this.enabled) return;
        
        // Update mouse position for raycasting
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Update cursor based on what's under the mouse
        this.updateCursor(event);
        
        // Handle active manipulations - note the ordering of checks
        if (this.isScaling && this.selectedTextureMesh && this.activeLayerId) {
            this.handleScale(event);
        } else if (this.isRotating && this.selectedTextureMesh && this.activeLayerId) {
            this.handleRotate(event);
        } else if (this.isDragging && this.selectedTextureMesh && this.activeLayerId) {
            this.handleMove(event);
        }
    }
    
    updateCursor(event) {
        // Only change cursor if not actively manipulating
        if (this.isDragging || this.isScaling || this.isRotating) return;
        
        // Check what's under the cursor
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Check for handle interaction first
        let cursorChanged = false;
        
        if (this.selectionHelper.material.visible) {
            const handleObjects = [this.scaleHandle, this.rotateHandle];
            const handleIntersects = this.raycaster.intersectObjects(handleObjects);
            
            if (handleIntersects.length > 0) {
                const handle = handleIntersects[0].object;
                
                if (handle === this.scaleHandle) {
                    this.renderer.domElement.style.cursor = 'nwse-resize';
                    cursorChanged = true;
                } else if (handle === this.rotateHandle) {
                    this.renderer.domElement.style.cursor = 'crosshair';
                    cursorChanged = true;
                }
            }
        }
        
        // If not over handles, check for texture objects
        if (!cursorChanged) {
            const textureMeshes = this.getTextureMeshes();
            const meshIntersects = this.raycaster.intersectObjects(textureMeshes);
            
            if (meshIntersects.length > 0) {
                // Use cursor based on active tool
                switch (this.activeTool) {
                    case 'move':
                        this.renderer.domElement.style.cursor = 'move';
                        break;
                    case 'scale':
                        this.renderer.domElement.style.cursor = 'nwse-resize';
                        break;
                    case 'rotate':
                        this.renderer.domElement.style.cursor = 'crosshair';
                        break;
                    default:
                        this.renderer.domElement.style.cursor = 'pointer';
                }
                
                // Disable controls when over a texture
                if (this.controls) {
                    this.controls.enabled = false;
                }
            } else {
                // Reset cursor and controls when not over anything interactive
                this.renderer.domElement.style.cursor = 'auto';
                
                // Re-enable controls when not over a texture
                if (this.controls) {
                    this.controls.enabled = true;
                }
            }
        }
    }

    handleMove(event) {
        // Get the current transformation from start
        if (!this.startTransform || !this.activeLayerId) {
            console.error("Missing start transform or layer ID for move operation");
            return;
        }
        
        // Calculate movement in screen coordinates
        const dx = (event.clientX - this.startPosition.x);
        const dy = (event.clientY - this.startPosition.y);
        
        // Skip tiny movements to prevent vibration
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
            return;
        }
        
        // Calculate movement factor based on camera distance to object
        const cameraDistance = this.camera.position.distanceTo(this.selectedTextureMesh.position);
        const movementFactor = 0.001 * cameraDistance;
        
        // Calculate offset in normalized coordinates
        const normalizedDx = dx * movementFactor;
        const normalizedDy = dy * movementFactor;
        
        // Get current offset (defaulting to 0,0 if not present)
        const currentOffset = {
            x: this.startTransform.offset?.x || 0,
            y: this.startTransform.offset?.y || 0
        };
        
        // Calculate new offset values - adjust directions for intuitive movement
        const newOffset = {
            x: currentOffset.x - normalizedDx, // Invert x-direction for expected movement
            y: currentOffset.y + normalizedDy  // y-direction is already as expected
        };
        
        // Log for debugging
        // console.log(`Move: dx=${dx}, dy=${dy}, factor=${movementFactor}, newOffset=`, newOffset);
        
        // Apply the transformation, preserving all other properties
        this.textureContext.updateTransformation(this.activeLayerId, {
            transformations: {
                ...this.startTransform,
                offset: newOffset
            }
        });
        
        // Update the start position for continuous movement
        this.startPosition = { x: event.clientX, y: event.clientY };
        
        // Also update start transform to prevent drift during long moves
        this.startTransform = {
            ...this.startTransform,
            offset: newOffset
        };
    }

    handleScale(event) {
        // Debug log
        console.log("Handling scale operation");
        
        if (!this.selectedTextureMesh || !this.startTransform || !this.activeLayerId) {
            console.error("Missing required data for scale operation");
            return;
        }
        
        // Get center of the texture mesh for reference
        const center = this.selectedTextureMesh.position.clone();
        const screenCenter = this.toScreenPosition(center);
        
        // Calculate current distance to center
        const currentDistance = Math.hypot(
            event.clientX - screenCenter.x,
            event.clientY - screenCenter.y
        );
        
        // Skip if no valid starting distance
        if (!this.startDistance || this.startDistance === 0) {
            console.error("Invalid starting distance for scaling");
            this.startDistance = currentDistance;
            return;
        }
        
        // Calculate scale factor with dampening for better control
        const rawScaleFactor = currentDistance / this.startDistance;
        
        // Apply a dampening factor to make scaling less sensitive
        const dampingFactor = 0.5;
        const dampedScaleFactor = 1.0 + ((rawScaleFactor - 1.0) * dampingFactor);
        
        // Get starting scale from the transform (defaulting to 1 if not present)
        const startScale = this.startTransform.scale !== undefined ? this.startTransform.scale : 1;
        
        // Calculate new scale - multiply by start scale to maintain continuity
        const newScale = startScale * dampedScaleFactor;
        
        // Limit to reasonable range
        const limitedScale = Math.max(0.1, Math.min(5, newScale));
        
        // Debug log
        console.log(`Scale operation: startDist=${this.startDistance.toFixed(2)}, currentDist=${currentDistance.toFixed(2)}, factor=${dampedScaleFactor.toFixed(2)}, newScale=${limitedScale.toFixed(2)}`);
        
        // Update transformation with scaled value, preserving other properties
        this.textureContext.updateTransformation(this.activeLayerId, {
            transformations: {
                ...this.startTransform,
                scale: limitedScale
            }
        });
    }

    handleRotate(event) {
        // Debug log 
        console.log("Handling rotate operation");
        
        if (!this.selectedTextureMesh || !this.startTransform || !this.activeLayerId) {
            console.error("Missing required data for rotation operation");
            return;
        }
        
        // Get center of the texture mesh for rotation reference
        const center = this.selectedTextureMesh.position.clone();
        const screenCenter = this.toScreenPosition(center);
        
        // Calculate current angle in radians
        const currentAngleRad = Math.atan2(
            event.clientY - screenCenter.y,
            event.clientX - screenCenter.x
        );
        
        // Ensure we have a valid starting angle
        if (this.startAngle === undefined) {
            console.error("No valid starting angle for rotation");
            this.startAngle = currentAngleRad;
            return;
        }
        
        // Calculate angle difference in degrees
        const angleDiffRad = currentAngleRad - this.startAngle;
        const angleDiffDeg = angleDiffRad * (180 / Math.PI);
        
        // Apply dampening for smoother control
        const dampingFactor = 0.5;
        const dampedAngleDiff = angleDiffDeg * dampingFactor;
        
        // Get the starting rotation (defaulting to 0 if not present)
        const startRotation = this.startTransform.rotation !== undefined ? this.startTransform.rotation : 0;
        
        // Calculate new rotation - add to start rotation for continuity
        // Use modulo to keep within 0-360 range
        let newRotation = (startRotation + dampedAngleDiff) % 360;
        
        // Ensure positive rotation value
        if (newRotation < 0) newRotation += 360;
        
        // Debug log
        console.log(`Rotation operation: startAngle=${(this.startAngle * 180/Math.PI).toFixed(2)}°, currentAngle=${(currentAngleRad * 180/Math.PI).toFixed(2)}°, diff=${dampedAngleDiff.toFixed(2)}°, newRotation=${newRotation.toFixed(2)}°`);
        
        // Update transformation with rotated value, preserving other properties
        this.textureContext.updateTransformation(this.activeLayerId, {
            transformations: {
                ...this.startTransform,
                rotation: newRotation
            }
        });
    }

    onMouseUp(event) {
        if (!this.enabled) return;
        
        // End all active manipulations
        this.isDragging = false;
        this.isScaling = false;
        this.isRotating = false;
        this.startUV = null;
        this.startTransform = null;
        
        // Check if we should restore camera controls
        // Only restore controls if mouse is no longer over a texture
        if (this.controls) {
            // Update mouse position for accurate check
            const rect = this.renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            
            // Check what's under the cursor
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const textureMeshes = this.getTextureMeshes();
            const intersects = this.raycaster.intersectObjects(textureMeshes);
            
            // Only re-enable controls if not over a texture or handle
            if (intersects.length === 0) {
                this.controls.enabled = true;
            }
        }
    }

    onKeyDown(event) {
        // Handle keyboard shortcuts
        if (!this.enabled) return;
        
        switch(event.key) {
            case 'm':
                this.setTool('move');
                break;
            case 's':
                this.setTool('scale');
                break;
            case 'r':
                this.setTool('rotate');
                break;
            case 'Escape':
                this.selectedTextureMesh = null;
                this.hideHelpers();
                
                // Re-enable controls when canceling selection
                if (this.controls) {
                    this.controls.enabled = true;
                }
                break;
        }
    }

    getTextureMeshes() {
        const textureMeshes = [];
        this.scene.traverse((object) => {
            if (object.isMesh && 
                (object.name.includes("Fronttex") || object.name.includes("Backtex"))) {
                textureMeshes.push(object);
            }
        });
        return textureMeshes;
    }

    toScreenPosition(position) {
        const vector = position.clone();
        const canvas = this.renderer.domElement;
        
        vector.project(this.camera);
        
        vector.x = (vector.x + 1) / 2 * canvas.clientWidth;
        vector.y = -(vector.y - 1) / 2 * canvas.clientHeight;
        
        return { x: vector.x, y: vector.y };
    }

    dispose() {
        this.disable();
        
        // Clean up helpers
        if (this.selectionHelper) {
            this.scene.remove(this.selectionHelper);
            this.selectionHelper.material.dispose();
            this.selectionHelper.geometry.dispose();
            this.selectionHelper = null;
        }
        
        if (this.scaleHandle) {
            this.scene.remove(this.scaleHandle);
            this.scaleHandle.material.dispose();
            this.scaleHandle.geometry.dispose();
            this.scaleHandle = null;
        }
        
        if (this.rotateHandle) {
            this.scene.remove(this.rotateHandle);
            this.rotateHandle.material.dispose();
            this.rotateHandle.geometry.dispose();
            this.rotateHandle = null;
        }
        
        // Clean up labels
        if (this.scaleLabel) {
            this.scene.remove(this.scaleLabel);
            if (this.scaleLabel.material) {
                this.scaleLabel.material.map?.dispose();
                this.scaleLabel.material.dispose();
            }
            this.scaleLabel = null;
        }
        
        if (this.rotateLabel) {
            this.scene.remove(this.rotateLabel);
            if (this.rotateLabel.material) {
                this.rotateLabel.material.map?.dispose();
                this.rotateLabel.material.dispose();
            }
            this.rotateLabel = null;
        }
        
        console.log('DirectTextureManipulator disposed');
    }
}
