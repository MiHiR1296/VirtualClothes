import * as THREE from 'three';

export class ModelControls {
    constructor() {
        this.mixers = new Set();
        this.actions = new Set();
        this.isPlaying = false;
    }

    addMixer(mixer, action) {
        if (mixer && action) {
            this.mixers.add(mixer);
            this.actions.add(action);
            console.debug(`Added mixer and action. Total mixers: ${this.mixers.size}`);
        }
    }

    // New method to add just an action
    addAction(mixer, action) {
        if (mixer && action) {
            this.mixers.add(mixer);
            this.actions.add(action);
        }
    }

    playAllAnimations() {
        if (this.isPlaying) {
            console.debug('Animations already playing, skipping...');
            return;
        }

        const uniqueActions = Array.from(this.actions);
        console.debug(`Starting animations, total actions: ${uniqueActions.length}`);
        
        uniqueActions.forEach(action => {
            if (action) {
                action.paused = false;
                action.reset();
                action.setEffectiveTimeScale(1);
                action.setEffectiveWeight(1);
                action.play();
            }
        });

        this.isPlaying = true;
    }

    clearMixers() {
        console.debug('Clearing mixers and actions');
        this.isPlaying = false;
        
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

        this.mixers.clear();
        this.actions.clear();
    }

    getCurrentMixers() {
        return Array.from(this.mixers);
    }

    getCurrentActions() {
        return Array.from(this.actions);
    }
}