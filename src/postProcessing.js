import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader.js';
import { BrightnessContrastShader } from 'three/examples/jsm/shaders/BrightnessContrastShader.js';
import { VignetteShader } from 'three/examples/jsm/shaders/VignetteShader.js';


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
        // Basic render pass
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);
        
        // Very subtle bloom for highlights
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.051,     // Reduced bloom strength
            0.051,     // Reduced radius
            0.85    // Increased threshold to only catch the brightest spots
        );
        this.composer.addPass(bloomPass);
        
        // Extremely subtle depth of field
        const bokehPass = new BokehPass(this.scene, this.camera, {
            focus: 30.0,
            aperture: 0.00001,
            maxblur: 0.001
        });
        this.composer.addPass(bokehPass);
        
        // Gamma correction for natural color appearance
        const gammaCorrectionPass = new ShaderPass(GammaCorrectionShader);
        this.composer.addPass(gammaCorrectionPass);
        
        // Very subtle brightness/contrast adjustment
        const brightnessContrastPass = new ShaderPass(BrightnessContrastShader);
        brightnessContrastPass.uniforms.brightness.value = -0.12;    // Reset to neutral
        brightnessContrastPass.uniforms.contrast.value = 0.05;     // Very subtle contrast
        this.composer.addPass(brightnessContrastPass);
        
        // Vignette effect
        const vignettePass = new ShaderPass(VignetteShader);
        vignettePass.uniforms.offset.value = 1.0; // Adjust for desired effect
        vignettePass.uniforms.darkness.value = 1.5; // Adjust for desired effect
        this.composer.addPass(vignettePass);
        
        
        
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