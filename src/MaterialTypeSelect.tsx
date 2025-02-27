import React from 'react';

export const NORMAL_MAP_PATHS = {
  PRINT: './Textures/Normals/print_normal.png',
  EMBROIDERY: './Textures/Normals/embroidery_normal.png',
  GENERIC: './Textures/Normals/generic_normal.png'
} as const;

export const materialTypes = {
  base: {
    name: "Base",
    properties: {
      roughness: 0.8,
      metalness: 0.1,
      normalScale: 0.5,
      clearcoat: 0,
      clearcoatRoughness: 0,
      useModelNormalMap: true
    }
  },
  print: {
    name: "Print",
    properties: {
      roughness: 0.05,
      metalness: 0,
      normalScale: 0.5,
      clearcoat: 0.5,
      clearcoatRoughness: 0.2,
      normalMap: NORMAL_MAP_PATHS.PRINT,
      defaultDetailScale: 1.0
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
      sheenRoughness: 0.8,
      normalMap: NORMAL_MAP_PATHS.EMBROIDERY,
      defaultDetailScale: 1.0
    }
  },
  generic: {
    name: "Generic",
    properties: {
      roughness: 0.7,
      metalness: 0,
      normalScale: 0.5,
      clearcoat: 0.2,
      normalMap: NORMAL_MAP_PATHS.GENERIC,
      defaultDetailScale: 1.0
    }
  }
} as const;

type MaterialTypeProps = {
  value: keyof typeof materialTypes;
  onChange: (value: string) => void;
  onDetailScaleChange?: (value: number) => void;
  detailScale?: number;
  className?: string;
  showDetailScaleOnly?: boolean;
};

export const MaterialTypeSelect: React.FC<MaterialTypeProps> = ({ 
  value, 
  onChange,
  onDetailScaleChange,
  detailScale = 1.0,
  className = "",
  showDetailScaleOnly = false
}) => {
  const showDetailScale = value !== 'base' && onDetailScaleChange;

  return (
    <div className="space-y-2">
      {!showDetailScaleOnly && (
        <div className="space-y-1">
          <label className="text-xs text-gray-400">Material Type</label>
          <select
            value={value || 'base'}
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
      )}

      {showDetailScale && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-400">
            <label>Detail Scale</label>
            <span>{detailScale?.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="2.0"
            step="0.1"
            value={detailScale}
            onChange={(e) => onDetailScaleChange(parseFloat(e.target.value))}
            className="w-full accent-blue-500"
          />
        </div>
      )}
    </div>
  );
};