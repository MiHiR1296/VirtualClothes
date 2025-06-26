import React from 'react';
import { Palette, Package } from 'lucide-react';
import { useTextureContext } from './TextureContext';

// Format part name for display - moved outside the component to resolve hoisting issue
const formatPartName = (name) => {
  // Remove any numbers or special characters
  let formatted = name.replace(/[0-9_]/g, ' ');
  
  // Split by capital letters and join with spaces
  formatted = formatted.replace(/([A-Z])/g, ' $1');
  
  // Clean up extra spaces
  formatted = formatted.replace(/\s+/g, ' ').trim();
  
  // Capitalize first letter of each word
  return formatted.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Extract color data from the scene
const extractColorData = (scene) => {
  if (!scene) return [];
  
  const colorData = [];
  const processedColors = new Set();
  
  // Traverse the scene to find all meshes with materials
  scene.traverse(object => {
    if (object.isMesh && object.material && !object.name.includes('tex') && object.userData.isImported) {
      if (object.material.color) {
        const hex = '#' + object.material.color.getHexString();
        
        // Skip duplicate colors
        if (!processedColors.has(hex)) {
          processedColors.add(hex);
          
          colorData.push({
            name: formatPartName(object.name),
            hex: hex,
            rgb: {
              r: Math.round(object.material.color.r * 255),
              g: Math.round(object.material.color.g * 255),
              b: Math.round(object.material.color.b * 255)
            }
          });
        }
      }
    }
  });
  
  return colorData;
};

const MaterialSpecs = ({ scene, selectedMaterial }) => {
  const { layers } = useTextureContext();
  const colorSpecs = extractColorData(scene);
  
  const getMaterialProperties = () => {
    // Material properties based on selected material
    switch (selectedMaterial) {
      case 'cotton':
        return {
          composition: '100% Cotton',
          weight: '180 GSM',
          care: 'Machine wash cold, tumble dry low',
          shrinkage: '3-5%'
        };
      case 'nylon':
        return {
          composition: '100% Nylon',
          weight: '120 GSM',
          care: 'Machine wash cold, hang dry',
          shrinkage: '1-2%'
        };
      case 'leather':
        return {
          composition: 'Genuine Leather',
          weight: '1.2mm thickness',
          care: 'Wipe clean with damp cloth',
          shrinkage: 'None'
        };
      case 'default':
        return {
          composition: '100% Cotton',
          weight: '180 g/m²',
          care: 'Machine wash cold, tumble dry low',
          shrinkage: '3-5%'
        };
      case 'cotton_100':
        return {
          composition: '100% Cotton',
          weight: '180 g/m²',
          care: 'Machine wash cold, tumble dry low',
          shrinkage: '3-5%'
        };
      case 'cotton_95_lycra5':
        return {
          composition: '95% Cotton, 5% Lycra',
          weight: '290 g/m²',
          care: 'Machine wash cold, tumble dry low',
          shrinkage: '3-5%'
        };
      case 'cotton_60_poly40':
        return {
          composition: '60% Cotton, 40% Polyester',
          weight: '175 g/m²',
          care: 'Machine wash cold, tumble dry low',
          shrinkage: '3-5%'
        };
      case 'cotton_57_modal38_spandex5':
        return {
          composition: '57% Cotton, 38% Modal, 5% Spandex',
          weight: '275 g/m²',
          care: 'Machine wash cold, tumble dry low',
          shrinkage: '3-5%'
        };
      case 'metal':
        return {
          composition: 'Zinc Alloy',
          weight: 'Medium',
          care: 'Wipe clean',
          shrinkage: 'None'
        };
      case 'plastic':
        return {
          composition: 'Polycarbonate',
          weight: 'Light',
          care: 'Wipe clean',
          shrinkage: 'None'
        };
      default:
        return {
          composition: 'Mixed',
          weight: 'Variable',
          care: 'Refer to specific material guidelines',
          shrinkage: 'Variable'
        };
    }
  };
  
  const materialProps = getMaterialProperties();
  
  return (
    <div className="mt-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Palette className="w-4 h-4" /> Color Specifications
        </h3>
        
        {colorSpecs.length > 0 ? (
          <div className="grid grid-cols-1 gap-2">
            {colorSpecs.map((color, index) => (
              <div key={index} className="flex items-center p-2 bg-gray-800 rounded-lg">
                <div 
                  className="w-8 h-8 mr-3 rounded"
                  style={{ backgroundColor: color.hex }}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">{color.name}</p>
                  <p className="text-xs text-gray-400">
                    HEX: {color.hex} | RGB: {color.rgb.r}, {color.rgb.g}, {color.rgb.b}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No color specifications available</p>
        )}
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Package className="w-4 h-4" /> Base Material Specifications
        </h3>
        
        <div className="bg-gray-800 rounded-lg p-4">
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="py-1 font-medium">Material:</td>
                <td className="py-1">{selectedMaterial.charAt(0).toUpperCase() + selectedMaterial.slice(1)}</td>
              </tr>
              <tr>
                <td className="py-1 font-medium">Composition:</td>
                <td className="py-1">{materialProps.composition}</td>
              </tr>
              <tr>
                <td className="py-1 font-medium">Weight/Thickness:</td>
                <td className="py-1">{materialProps.weight}</td>
              </tr>
              <tr>
                <td className="py-1 font-medium">Care Instructions:</td>
                <td className="py-1">{materialProps.care}</td>
              </tr>
              <tr>
                <td className="py-1 font-medium">Shrinkage:</td>
                <td className="py-1">{materialProps.shrinkage}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      {layers.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Applied Textures</h3>
          
          <div className="space-y-2">
            {layers.filter(l => l.visible).map((layer, index) => (
              <div key={index} className="bg-gray-800 rounded-lg p-3">
                <p className="text-sm font-medium">{layer.name || `Layer ${index + 1}`}</p>
                <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-gray-400">
                  <div>Type: {layer.materialType || 'Standard'}</div>
                  <div>Opacity: {(layer.opacity * 100).toFixed(0)}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialSpecs;