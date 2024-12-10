import * as THREE from 'three';

// Set up key state tracking
window.keys = {};

// Add keyboard event listeners
document.addEventListener('keydown', (event) => {
    window.keys[event.key.toLowerCase()] = true;
});

document.addEventListener('keyup', (event) => {
    window.keys[event.key.toLowerCase()] = false;
});

export function animate(renderer, scene, camera, controls, modelControls) {
    const clock = new THREE.Clock();
    const moveSpeed = 0.5;
    const rotateSpeed = 0.02;
    let animationsPlaying = true;

    // Create and setup the toggle button
    const toggleAnimationButton = document.createElement('button');
    toggleAnimationButton.textContent = 'Pause Animations';
    toggleAnimationButton.className = 'animation-toggle-button'; // Added class instead of inline styles
    document.body.appendChild(toggleAnimationButton);

    toggleAnimationButton.addEventListener('click', () => {
        animationsPlaying = !animationsPlaying;
        toggleAnimationButton.textContent = animationsPlaying ? 'Pause Animations' : 'Play Animations';
    });

    // Default relative camera position for reset
    let defaultCameraPosition = new THREE.Vector3(-30, 30, 35);
    let lastKnownTarget = new THREE.Vector3();

    // Function to calculate bounding box of the model
    function getModelBoundingBox() {
        const boundingBox = new THREE.Box3();
        
        scene.traverse((object) => {
            if (object.isMesh && object.userData.isImported) {
                boundingBox.expandByObject(object);
            }
        });
        
        return boundingBox;
    }

    function calculateModelCenter() {
        const boundingBox = getModelBoundingBox();
        const center = new THREE.Vector3();
        boundingBox.getCenter(center);
        return center;
    }

    // Function to reset and frame camera
    function resetCamera() {
        // Get model bounds
        const boundingBox = getModelBoundingBox();
        const center = new THREE.Vector3();
        boundingBox.getCenter(center);
        
        // Calculate model size
        const size = new THREE.Vector3();
        boundingBox.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        
        // Calculate ideal camera distance to frame the model
        const aspectRatio = renderer.domElement.width / renderer.domElement.height;
        const fov = camera.fov * (Math.PI / 180);
        const distance = Math.abs(maxDim / Math.sin(fov / 2) * 1.5); // 1.5 for some padding
        
        // Update target to model center
        controls.target.copy(center);
        lastKnownTarget.copy(center);
        
        // Calculate new camera position
        const direction = defaultCameraPosition.clone().normalize();
        const newPosition = center.clone().add(direction.multiplyScalar(distance));
        
        // Set camera position and orientation
        camera.position.copy(newPosition);
        camera.lookAt(center);
        
        // Update controls
        controls.update();
    }

    function animationLoop() {
        requestAnimationFrame(animationLoop);
        const delta = clock.getDelta();
    
        controls.update();
        
        // Update mixers only if animations are playing
        if (animationsPlaying) {
            const mixers = modelControls.getCurrentMixers();
            mixers.forEach(mixer => {
                if (mixer) mixer.update(delta);
            });
        }
        
        // Camera movement
        if (window.keys) {
            const modelCenter = calculateModelCenter();
            controls.target.copy(modelCenter); // Always update target to model center

            // Get the direction to the target (model center)
            const direction = new THREE.Vector3();
            direction.subVectors(controls.target, camera.position).normalize();

            // Get the right vector (perpendicular to direction in the horizontal plane)
            const right = new THREE.Vector3();
            right.crossVectors(camera.up, direction).normalize();

            if (window.keys['w'] || window.keys['arrowup']) {
                // Move towards the model while maintaining orbit
                const moveVector = direction.clone().multiplyScalar(moveSpeed);
                camera.position.add(moveVector);
            }
            if (window.keys['s'] || window.keys['arrowdown']) {
                // Move away from the model while maintaining orbit
                const moveVector = direction.clone().multiplyScalar(-moveSpeed);
                camera.position.add(moveVector);
            }
            if (window.keys['d'] || window.keys['arrowright']) {
                // Rotate clockwise around the model
                const angle = rotateSpeed;
                const currentPosition = camera.position.clone().sub(modelCenter);
                currentPosition.applyAxisAngle(new THREE.Vector3(0, 5, 0), angle);
                camera.position.copy(currentPosition.add(modelCenter));
            }
            if (window.keys['a'] || window.keys['arrowleft']) {
                // Rotate counter-clockwise around the model
                const angle = -rotateSpeed;
                const currentPosition = camera.position.clone().sub(modelCenter);
                currentPosition.applyAxisAngle(new THREE.Vector3(0, 5, 0), angle);
                camera.position.copy(currentPosition.add(modelCenter));
            }
            if (window.keys['q']) {
                // Move up while maintaining distance to center
                const upVector = new THREE.Vector3(0, moveSpeed, 0);
                controls.target.add(upVector);
            }
            if (window.keys['e']) {
                // Move down while maintaining distance to center
                const downVector = new THREE.Vector3(0, -moveSpeed, 0);
                controls.target.add(downVector);
            }
            if (window.keys['f']) {
                // Reset camera position and frame model
                resetCamera();
            }

            // Keep the camera looking at the target
            camera.lookAt(controls.target);
        }

        // Update helpers if they exist
        scene.traverse((object) => {
            if (object.isHelper) {
                object.update();
            }
        });

        // Use composer instead of renderer if it exists
        if (renderer.composer) {
            renderer.composer.render();
        } else {
            renderer.render(scene, camera);
        }
    }

    // Store initial target position
    lastKnownTarget.copy(controls.target);

    animationLoop();
}
