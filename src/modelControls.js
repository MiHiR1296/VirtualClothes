import * as THREE from 'three';

export class ModelControls {
    constructor() {
        this.mixers = [];
        this.actions = [];
    }

    addMixer(mixer, action) {
        if (mixer && action) {
            console.log('Adding new mixer and action');
            this.mixers.push(mixer);
            this.actions.push(action);
        }
    }

    clearMixers() {
        console.log('Clearing mixers and actions');
        this.actions.forEach(action => {
            if (action) {
                action.stop();
            }
        });
        
        this.mixers.forEach(mixer => {
            if (mixer) {
                mixer.stopAllAction();
                mixer.uncacheRoot(mixer.getRoot());
            }
        });

        this.mixers = [];
        this.actions = [];
    }

    pauseAllAnimations() {
        console.log('Pausing all animations');
        this.actions.forEach(action => {
            if (action) {
                action.paused = true;
                action.setEffectiveTimeScale(0);
            }
        });
    }

    playAllAnimations() {
        console.log('Playing all animations, total actions:', this.actions.length);
        this.actions.forEach((action, index) => {
            if (action) {
                action.paused = false;
                action.reset();
                action.setEffectiveTimeScale(1);
                action.setEffectiveWeight(1);
                action.play();
                console.log('Started playing animation', index + 1);
            }
        });
    }

    getCurrentMixers() {
        return this.mixers;
    }

    getCurrentActions() {
        return this.actions;
    }
}