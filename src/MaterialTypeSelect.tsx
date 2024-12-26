import React from 'react';

const materialTypes = {
  print: {
    name: "Print",
    properties: {
      roughness: 0.05,
      metalness: 1,
      normalScale: 0.5,
      clearcoat: 0.5,
      clearcoatRoughness: 0.2
    }
  },
  embroidery: {
    name: "Embroidery",
    properties: {
      roughness: 1,
      metalness: 0,
      normalScale: 1.0,
      clearcoat: 0,
      sheen: 0.3,
      sheenRoughness: 0.8
    }
  },
  color: {
    name: "Color",
    properties: {
      roughness: 0.8,
      metalness: 0,
      normalScale: 0.3,
      clearcoat: 0.3,
      clearcoatRoughness: 0.3
    }
  }
};

export const MaterialTypeSelect = ({ value, onChange, className = "" }) => {
  return (
    <div className="space-y-1">
      <label className="text-xs text-gray-400">Material Type</label>
      <select
        value={value || 'print'}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-2 py-1 bg-gray-700 text-gray-200 rounded-lg 
                   border border-gray-600 text-sm focus:outline-none 
                   focus:ring-2 focus:ring-blue-500 ${className}`}
      >
        {Object.entries(materialTypes).map(([key, { name }]) => (
          <option key={key} value={key}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
};

export { materialTypes };
