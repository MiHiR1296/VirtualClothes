import React from 'react';

const PantoneColorPicker = ({ onColorSelect }) => {
  // Pantone color map
  const pantoneColors = {
    '#ffffff': 'Pantone 11-0601 TCX (Bright White)', 
    '#000000': 'Pantone 19-4005 TCX (Black)', 
    '#ff0000': 'Pantone 18-1664 TCX (True Red)', 
    '#0000ff': 'Pantone 19-3952 TCX (Spectrum Blue)', 
    '#ffff00': 'Pantone 13-0759 TCX (Lemon Chrome)', 
    '#00ff00': 'Pantone 15-6437 TCX (Kelly Green)', 
    '#888888': 'Pantone 17-1501 TCX (Frost Gray)', 
    '#d3d3d3': 'Pantone 13-4104 TCX (Silver Gray)', 
    '#f2f2f2': 'Pantone 11-0601 TCX (Bright White)', 
    '#808080': 'Pantone 17-1501 TCX (Cool Gray)', 
    '#4682B4': 'Pantone 18-4032 TCX (Steel Blue)'
  };

  return (
    <div className="mb-3">
      <label className="block mb-2 text-sm">Quick Colors</label>
      <div className="flex flex-wrap gap-1">
        {Object.entries(pantoneColors).map(([hex, name]) => (
          <div 
            key={hex} 
            className="w-6 h-6 rounded-full border border-gray-600 cursor-pointer hover:scale-110 transition-transform"
            style={{ backgroundColor: hex }}
            onClick={() => onColorSelect(hex)}
            title={name}
          />
        ))}
      </div>
    </div>
  );
};

export default PantoneColorPicker;