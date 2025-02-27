// HDRIControls.jsx
import React, { useState } from 'react';
import { RotateCw, Sun, Eye, EyeOff } from 'lucide-react';
import { getTexturePath } from './paths.js';

export const HDRI_OPTIONS = {
    studio: {
        name: "Studio",
        path: './Textures/lebombo_2k.exr',
        defaultIntensity: 0.1,
        description: "Clean studio lighting setup"
    },
    warehouse: {
        name: "Warehouse",
        path: './Textures/warehouse_2k.exr',
        defaultIntensity: 0.15,
        description: "Industrial warehouse lighting"
    },
    office: {
        name: "Office",
        path: './Textures/office_2k.exr',
        defaultIntensity: 0.12,
        description: "Bright office environment"
    },
    outdoor: {
        name: "Outdoor",
        path: './Textures/outdoor_2k.exr',
        defaultIntensity: 0.2,
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
        onHDRIChange(HDRI_OPTIONS[hdriId].path, defaultIntensity); // Pass intensity along with path
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
        <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Sun className="w-4 h-4" /> 
                    Lighting Setup
                </div>
                <button
                    onClick={toggleBackground}
                    title={showAsBackground ? "Hide HDRI Background" : "Show HDRI Background"}
                    className={`p-2 rounded-lg transition-colors ${
                        showAsBackground ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
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
            <div className="space-y-1">
                <label className="text-sm text-gray-400">Environment</label>
                <select
                    value={selectedHDRI}
                    onChange={handleHDRIChange}
                    className="w-full px-3 py-1 bg-gray-700 rounded-lg border border-gray-600 
                            text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    {Object.entries(HDRI_OPTIONS).map(([id, hdri]) => (
                        <option key={id} value={id}>{hdri.name}</option>
                    ))}
                </select>
                <p className="text-xs text-gray-500">{HDRI_OPTIONS[selectedHDRI].description}</p>
            </div>

            {/* Rotation Control */}
            <div className="space-y-1">
                <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-400 flex items-center gap-1">
                        <RotateCw className="w-4 h-4" /> Rotation
                    </label>
                    <span className="text-xs text-gray-400">{rotation.toFixed(0)}°</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="360"
                    value={rotation}
                    onChange={handleRotationChange}
                    className="w-full accent-blue-500"
                />
            </div>

            {/* Intensity Control */}
            <div className="space-y-1">
                <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-400">Intensity</label>
                    <span className="text-xs text-gray-400">{intensity.toFixed(2)}</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="0.5"
                    step="0.01"
                    value={intensity}
                    onChange={handleIntensityChange}
                    className="w-full accent-blue-500"
                />
            </div>
        </div>
    );
};

export default HDRIControls;