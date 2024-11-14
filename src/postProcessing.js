import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { ColorCorrectionShader } from 'three/examples/jsm/shaders/ColorCorrectionShader.js';
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader.js';
import { BrightnessContrastShader } from 'three/examples/jsm/shaders/BrightnessContrastShader.js';

export class PostProcessing {
    constructor(scene, camera, renderer) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        
        // Initialize effect composer with proper render target
        this.composer = new EffectComposer(renderer);
        
        this.setupPasses();
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    setupPasses() {
        // Basic render pass - always needed
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);
        
        // Very subtle bloom for highlights
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.1,     // Reduced bloom strength (was 0.15)
            0.3,     // Reduced radius (was 0.5)
            1.5     // Higher threshold to only catch the brightest spots (was 0.85)
        );
        this.composer.addPass(bloomPass);
        
        // Extremely subtle depth of field
        const bokehPass = new BokehPass(this.scene, this.camera, {
            focus: 30.0,
            aperture: 0.00001,  // Extremely small aperture for very subtle effect
            maxblur: 0.001      // Minimal blur
        });
        this.composer.addPass(bokehPass);
        
        // // Gentle color correction for a natural look
        // const colorCorrectionPass = new ShaderPass(ColorCorrectionShader);
        // colorCorrectionPass.uniforms.powRGB.value = new THREE.Vector3(1.1, 1.1, 1.1);  // Slight power adjustment
        // colorCorrectionPass.uniforms.mulRGB.value = new THREE.Vector3(1.05, 1.05, 1.05);  // Very subtle brightness boost
        // this.composer.addPass(colorCorrectionPass);
        
        // Gamma correction for natural color appearance
        const gammaCorrectionPass = new ShaderPass(GammaCorrectionShader);
        this.composer.addPass(gammaCorrectionPass);
        
        // Subtle brightness/contrast adjustment
        const brightnessContrastPass = new ShaderPass(BrightnessContrastShader);
        brightnessContrastPass.uniforms.brightness.value = -0.12;  // Tiny brightness boost
        brightnessContrastPass.uniforms.contrast.value = 0.12;    // Very subtle contrast enhancement
        this.composer.addPass(brightnessContrastPass);
        
        // SMAA for smooth anti-aliasing
        const smaaPass = new SMAAPass(
            window.innerWidth * this.renderer.getPixelRatio(),
            window.innerHeight * this.renderer.getPixelRatio()
        );
        this.composer.addPass(smaaPass);
    }
    
    onWindowResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
        this.composer.setSize(width, height);
    }
    
    update() {
        this.composer.render();
    }
}