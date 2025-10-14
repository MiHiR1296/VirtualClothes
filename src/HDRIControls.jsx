import { logDebug, logInfo, logWarn, logError } from "./logger.js";
// HDRIControls.jsx
import React, { useState } from 'react';
import { RotateCw, Sun, Eye, EyeOff } from 'lucide-react';
import { getTexturePath } from './paths.js';

export const HDRI_OPTIONS = {
    studio: {
        name: "Studio",
        path: './Textures/lebombo_2k.exr',
        defaultIntensity: 0.3,
        defaultRotation: 45,
        description: "Clean studio lighting setup"
    },
    warehouse: {
        name: "Warehouse",
        path: './Textures/warehouse_2k.exr',
        defaultIntensity: 0.3,
        description: "Industrial warehouse lighting"
    },
    office: {
        name: "Office",
        path: './Textures/office_2k.exr',
        defaultIntensity: 0.3,
        description: "Bright office environment"
    },
    outdoor: {
        name: "Outdoor",
        path: './Textures/outdoor_2k.exr',
        defaultIntensity: 0.3,
        description: "Natural outdoor lighting"
    }
};

const HDRIControls = ({ 
    onHDRIChange, 
    onRotationChange, 
    onIntensityChange,
    onBackgroundToggle 
}) => {
    const [rotation, setRotation] = useState(0);
    const [selectedHDRI, setSelectedHDRI] = useState('studio');
    const [intensity, setIntensity] = useState(HDRI_OPTIONS.studio.defaultIntensity);
    const [showAsBackground, setShowAsBackground] = useState(false);

    const handleHDRIChange = (e) => {
        const hdriId = e.target.value;
        const defaultIntensity = HDRI_OPTIONS[hdriId].defaultIntensity;
        setSelectedHDRI(hdriId);
        setIntensity(defaultIntensity);
        
        // Explicitly pass the default intensity for this HDRI, not just the path
        logDebug(`Loading HDRI: ${hdriId} with intensity: ${defaultIntensity}`);
        onHDRIChange(HDRI_OPTIONS[hdriId].path, defaultIntensity);
    };

    const handleRotationChange = (e) => {
        const newRotation = parseFloat(e.target.value);
        setRotation(newRotation);
        onRotationChange(newRotation);
    };

    const handleIntensityChange = (e) => {
        const newIntensity = parseFloat(e.target.value);
        setIntensity(newIntensity);
        onIntensityChange(newIntensity);
    };

    const toggleBackground = () => {
        const newValue = !showAsBackground;
        setShowAsBackground(newValue);
        onBackgroundToggle(newValue);
    };

    return (
        <div className="glass-card-enhanced p-6">
            <h3 className="text-lg font-semibold flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-gradient text-high-contrast">
                    <Sun className="w-5 h-5" /> 
                    Lighting Setup
                </div>
                <button
                    onClick={toggleBackground}
                    title={showAsBackground ? "Hide HDRI Background" : "Show HDRI Background"}
                    className={`glass-button p-3 transition-all duration-300 ${
                        showAsBackground ? 'glass-glow' : ''
                    }`}
                >
                    {showAsBackground ? (
                        <Eye className="w-4 h-4" />
                    ) : (
                        <EyeOff className="w-4 h-4" />
                    )}
                </button>
            </h3>
            
            {/* HDRI Selection */}
            <div className="space-y-3 mb-6">
                <label className="text-sm font-medium text-medium-contrast">Environment</label>
                <select
                    value={selectedHDRI}
                    onChange={handleHDRIChange}
                    className="glass-input-enhanced w-full px-4 py-3 text-sm focus-ring text-high-contrast"
                >
                    {Object.entries(HDRI_OPTIONS).map(([id, hdri]) => (
                        <option key={id} value={id}>{hdri.name}</option>
                    ))}
                </select>
                <p className="text-xs text-low-contrast">{HDRI_OPTIONS[selectedHDRI].description}</p>
            </div>

            {/* Rotation Control */}
            <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-medium-contrast flex items-center gap-2">
                        <RotateCw className="w-4 h-4" /> Rotation
                    </label>
                    <span className="text-xs text-low-contrast font-mono">{rotation.toFixed(0)}°</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="360"
                    value={rotation}
                    onChange={handleRotationChange}
                    className="w-full"
                />
            </div>

            {/* Intensity Control */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-medium-contrast">Intensity</label>
                    <span className="text-xs text-low-contrast font-mono">{intensity.toFixed(2)}</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="0.5"
                    step="0.01"
                    value={intensity}
                    onChange={handleIntensityChange}
                    className="w-full"
                />
            </div>
        </div>
    );
};

export default HDRIControls;