
import * as THREE from 'three';
import { updateLightHelpers } from './lighting.js';



export function animate(renderer, scene, camera, controls, modelControls) {
    const clock = new THREE.Clock();
    let lastTime = 0;
    const moveSpeed = 0.5;

    function animationLoop() {
        requestAnimationFrame(animationLoop);
        const delta = clock.getDelta();
        const elapsed = clock.getElapsedTime();

        // Log animation updates every second (to avoid console spam)
        if (Math.floor(elapsed) > lastTime) {
            // console.log(`Animation frame at ${elapsed.toFixed(2)}s, delta: ${delta.toFixed(3)}s`);
            lastTime = Math.floor(elapsed);
        }

        controls.update();
        
        // Update all active mixers
        const mixers = modelControls.getCurrentMixers();
        mixers.forEach((mixer, index) => {
            if (mixer) {
                mixer.update(delta);
                if (Math.floor(elapsed) > lastTime) {
                    console.log(`Updated mixer ${index + 1}`);
                }
            }
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

        // Update light helpers if they exist
        if (scene.userData.lightHelpers) {
            updateLightHelpers(scene.userData.lightHelpers);
        }
     
        renderer.render(scene, camera);
    }

    animationLoop();
}