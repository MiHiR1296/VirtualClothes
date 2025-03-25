import React, { useState, useMemo } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { 
  colorCategories, 
  categorizedColors, 
  getAllColors 
} from './pantoneColors';

const PantoneColorPicker = ({ onColorSelect, currentColor = "#ffffff" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Close on Escape key
  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen && currentColor) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, currentColor]);

  // Memoized filtered colors
  const filteredColors = useMemo(() => {
    let colors = selectedCategory === 'All' 
      ? getAllColors() 
      : categorizedColors[selectedCategory] || [];

    // Apply search filter
    if (searchTerm) {
      const lowercaseTerm = searchTerm.toLowerCase();
      colors = colors.filter(color => 
        color.name.toLowerCase().includes(lowercaseTerm) ||
        color.hex.toLowerCase().includes(lowercaseTerm)
      );
    }

    return colors;
  }, [selectedCategory, searchTerm]);

  // Handle color selection
  const handleColorSelect = (hex, name) => {
    onColorSelect(hex);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-3 py-2 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors"
      >
        <span className="text-sm text-gray-300">Select Pantone Color</span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </div>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-[99] bg-black/40 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          
          <div 
            className="fixed z-[100] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] bg-gray-800 rounded-lg shadow-2xl border border-gray-700 overflow-hidden"
            style={{ 
              maxHeight: '500px', 
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
            // Prevent backdrop click from closing
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors z-10"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Top section with category and search */}
            <div className="p-3 bg-gray-750 border-b border-gray-700">
              <div className="flex mb-2">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-1/2 mr-2 px-2 py-1 bg-gray-700 text-gray-200 rounded-lg text-sm"
                >
                  {Object.entries(colorCategories).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
                
                <div className="relative flex-1">
                  <input 
                    type="text"
                    placeholder="Search colors..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-2 py-1 pl-8 bg-gray-700 text-gray-200 rounded-lg text-sm"
                  />
                  {searchTerm ? (
                    <X 
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 cursor-pointer"
                      onClick={() => setSearchTerm('')}
                    />
                  ) : (
                    <Search 
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Color Grid */}
            <div 
              className="grid grid-cols-5 gap-2 p-3 overflow-y-auto"
              style={{ maxHeight: '400px' }}
            >
              {filteredColors.map((color, index) => (
                <div 
                  key={`${color.hex}-${index}`}
                  className="relative group cursor-pointer"
                  onClick={() => handleColorSelect(color.hex, color.name)}
                >
                  <div 
                    className="w-full aspect-square rounded-lg border border-gray-700 hover:scale-105 transition-transform"
                    style={{ backgroundColor: color.hex }}
                  />
                  <div 
                    className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] 
                               text-center opacity-0 group-hover:opacity-100 transition-opacity 
                               truncate px-1"
                  >
                    {color.name}
                  </div>
                </div>
              ))}
              
              {filteredColors.length === 0 && (
                <div className="col-span-5 text-center text-gray-400 py-4">
                  No colors found
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PantoneColorPicker;