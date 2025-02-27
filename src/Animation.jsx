import * as THREE from 'three';

// Set up key state tracking
const keys = {};

// Add keyboard event listeners
document.addEventListener('keydown', (event) => {
    keys[event.key.toLowerCase()] = true;
});

document.addEventListener('keyup', (event) => {
    keys[event.key.toLowerCase()] = false;
});

export function animate(renderer, scene, camera, controls, modelControls) {
    const clock = new THREE.Clock();
    const moveSpeed = 0.5;
    const rotateSpeed = 0.02;
    let animationsPlaying = true;

    function resetCamera() {
        if (scene.userData.sceneManager) {
            // Get current model and update camera
            const loadedModel = scene.children.find(child => child.userData?.isLoadedModel);
            if (loadedModel) {
                scene.userData.sceneManager.updateCameraForModel(loadedModel);
            }
        }
    }

    function animationLoop() {
        requestAnimationFrame(animationLoop);
        const delta = clock.getDelta();

        // Update mixers only if animations are playing
        if (animationsPlaying && modelControls) {
            const mixers = modelControls.getCurrentMixers();
            mixers.forEach(mixer => {
                if (mixer) mixer.update(delta);
            });
        }

        // Camera movement
        if (keys) {
            const modelCenter = scene.userData.sceneManager ? 
                              scene.userData.sceneManager.calculateSceneCenter() : 
                              new THREE.Vector3();

            // Get the direction to the target (model center)
            const direction = new THREE.Vector3();
            direction.subVectors(controls.target, camera.position).normalize();

            // Get the right vector (perpendicular to direction)
            const right = new THREE.Vector3();
            right.crossVectors(camera.up, direction).normalize();

            // Forward/Backward movement (W/S or Arrow Up/Down)
            if (keys['w'] || keys['arrowup']) {
                const moveVector = direction.clone().multiplyScalar(moveSpeed);
                camera.position.add(moveVector);
            }
            if (keys['s'] || keys['arrowdown']) {
                const moveVector = direction.clone().multiplyScalar(-moveSpeed);
                camera.position.add(moveVector);
            }

            // Rotation (A/D or Arrow Left/Right)
            if (keys['d'] || keys['arrowright']) {
                const angle = rotateSpeed;
                const currentPosition = camera.position.clone().sub(modelCenter);
                currentPosition.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
                camera.position.copy(currentPosition.add(modelCenter));
            }
            if (keys['a'] || keys['arrowleft']) {
                const angle = -rotateSpeed;
                const currentPosition = camera.position.clone().sub(modelCenter);
                currentPosition.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
                camera.position.copy(currentPosition.add(modelCenter));
            }

            // Up/Down movement (Q/E)
            if (keys['q']) {
                camera.position.y += moveSpeed;
                controls.target.y += moveSpeed;
            }
            if (keys['e']) {
                camera.position.y -= moveSpeed;
                controls.target.y -= moveSpeed;
            }

            // Reset camera (F)
            if (keys['f']) {
                resetCamera();
                // Clear the key state to prevent continuous resets
                keys['f'] = false;
            }

            // Keep the camera looking at the target
            camera.lookAt(controls.target);
        }

        // Update controls
        controls.update();

        // Update helpers if they exist
        scene.traverse((object) => {
            if (object.isHelper) {
                object.update();
            }
        });

        // Render the scene
        if (renderer.composer) {
            renderer.composer.render();
        } else {
            renderer.render(scene, camera);
        }
    }

    // Start the animation loop
    animationLoop();
}