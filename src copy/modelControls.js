import * as THREE from 'three';

export class ModelControls {
    constructor() {
        this.mixers = [];
        this.actions = [];
        console.log('ModelControls initialized');
    }

    addMixer(mixer, action) {
        if (mixer) {
            console.log('Adding new mixer and action');
            this.mixers.push(mixer);
            if (action) {
                action.setLoop(THREE.LoopRepeat);
                action.clampWhenFinished = false;
                this.actions.push(action);
                console.log('Animation action added');
            }
        }
    }

    clearMixers() {
        console.log('Clearing all mixers and actions');
        this.mixers.forEach(mixer => mixer.stopAllAction());
        this.mixers = [];
        this.actions = [];
    }

    pauseAllAnimations() {
        this.actions.forEach((action) => {
            action.paused = true; // Mark as paused (custom property for tracking)
            action.setEffectiveTimeScale(0);
        });
    }

    getCurrentMixers() {
        return this.mixers;
    }

    playAllAnimations() {
        console.log(`Playing all animations. Total actions: ${this.actions.length}`);
        this.actions.forEach((action, index) => {
            if (action) {
                action.paused = false;
                action.reset();
                action.setEffectiveTimeScale(1);
                action.setEffectiveWeight(1);
                action.play();
                console.log(`Started playing animation ${index + 1}`);
            }
        });
    }
}
