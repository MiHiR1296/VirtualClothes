import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SAOPass } from 'three/examples/jsm/postprocessing/SAOPass.js';
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
        
        // Add SAO pass for ambient occlusion - parameters tuned to match SSAO look
        const saoPass = new SAOPass(this.scene, this.camera, false, true);
        saoPass.params.output = SAOPass.OUTPUT.Default;
        // Tuned SAO parameters to match the SSAO effect
        saoPass.params.saoBias = 0.4;
        saoPass.params.saoIntensity = 0.9;
        saoPass.params.saoScale = 1.0;
        saoPass.params.saoKernelRadius = 64;
        saoPass.params.saoMinResolution = 32;
        saoPass.params.saoBlur = true;
        saoPass.params.saoBlurRadius = 4;
        saoPass.params.saoBlurStdDev = 2;
        saoPass.params.saoBlurDepthCutoff = 0.01;
        this.composer.addPass(saoPass);
        
        // Very subtle bloom for highlights - using the nice values
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.011,     // Reduced bloom strength
            0.011,     // Reduced radius
            5.1    // Increased threshold to only catch the brightest spots
        );
        this.composer.addPass(bloomPass);
        
        // Extremely subtle depth of field - using the nice values
        const bokehPass = new BokehPass(this.scene, this.camera, {
            focus: 30.0,
            aperture: 2.2,
            maxblur: 0.001
        });
        this.composer.addPass(bokehPass);
        
        // Gamma correction for natural color appearance
        const gammaCorrectionPass = new ShaderPass(GammaCorrectionShader);
        this.composer.addPass(gammaCorrectionPass);
        
        // Very subtle brightness/contrast adjustment - using the nice values
        const brightnessContrastPass = new ShaderPass(BrightnessContrastShader);
        brightnessContrastPass.uniforms.brightness.value = -0.12;    // Reset to neutral
        brightnessContrastPass.uniforms.contrast.value = 0.02;     // Very subtle contrast
        this.composer.addPass(brightnessContrastPass);
        
        // Vignette effect - using the nice values
        const vignettePass = new ShaderPass(VignetteShader);
        vignettePass.uniforms.offset.value = 0.8; // Adjust for desired effect
        vignettePass.uniforms.darkness.value = 0.8; // Adjust for desired effect
        this.composer.addPass(vignettePass);
        
        // SMAA for smooth anti-aliasing
        const smaaPass = new SMAAPass(
            window.innerWidth * this.renderer.getPixelRatio(),
            window.innerHeight * this.renderer.getPixelRatio()
        );
        this.composer.addPass(smaaPass);
        
        // Store the SAO pass for later access
        this.saoPass = saoPass;
    }
    
    // Method to toggle SAO on/off
    toggleSAO(enabled) {
        if (this.saoPass) {
            this.saoPass.enabled = enabled;
        }
    }
    
    // Method to adjust SAO parameters
    updateSAOSettings(settings) {
        if (this.saoPass && this.saoPass.params) {
            if (settings.saoIntensity !== undefined) {
                this.saoPass.params.saoIntensity = settings.saoIntensity;
            }
            if (settings.saoScale !== undefined) {
                this.saoPass.params.saoScale = settings.saoScale;
            }
            if (settings.saoKernelRadius !== undefined) {
                this.saoPass.params.saoKernelRadius = settings.saoKernelRadius;
            }
            if (settings.saoBlurRadius !== undefined) {
                this.saoPass.params.saoBlurRadius = settings.saoBlurRadius;
            }
        }
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