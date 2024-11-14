import * as THREE from 'three';

export function animate(renderer, scene, camera, controls, modelControls) {
    const clock = new THREE.Clock();
    const moveSpeed = 0.5;

    function animationLoop() {
        requestAnimationFrame(animationLoop);
        const delta = clock.getDelta();
    
        controls.update();
        
        // Update mixers
        const mixers = modelControls.getCurrentMixers();
        mixers.forEach(mixer => {
            if (mixer) mixer.update(delta);
        });
        
        // Camera movement
        if (window.keys) {
            if (window.keys['w'] || window.keys['ArrowUp']) camera.position.z -= moveSpeed;
            if (window.keys['s'] || window.keys['ArrowDown']) camera.position.z += moveSpeed;
            if (window.keys['a'] || window.keys['ArrowLeft']) camera.position.x -= moveSpeed;
            if (window.keys['d'] || window.keys['ArrowRight']) camera.position.x += moveSpeed;
            if (window.keys['q']) camera.position.y += moveSpeed;
            if (window.keys['e']) camera.position.y -= moveSpeed;
        }

        // Update helpers if they exist
        scene.traverse((object) => {
            if (object.isHelper) {
                object.update();
            }
        });
        // Use composer instead of renderer
        if (renderer.composer) {
            renderer.composer.render();
        } else {
            renderer.render(scene, camera);
        }
    }

    animationLoop();
}