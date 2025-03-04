import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

const CollapsibleCard = ({ title, icon, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="glass-card mb-4 overflow-hidden">
      <div 
        className="glass-card-header flex items-center justify-between p-3 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          {icon && React.cloneElement(icon, { 
            className: "w-5 h-5 text-blue-400" 
          })}
          <h3 className="font-medium text-white">{title}</h3>
        </div>
        {isOpen ? (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-400" />
        )}
      </div>
      
      <div 
        className="transition-all duration-300 ease-in-out overflow-hidden"
        style={{ 
          maxHeight: isOpen ? '1000px' : '0',
          opacity: isOpen ? 1 : 0
        }}
      >
        <div className="p-3 border-t border-gray-800">
          {children}
        </div>
      </div>
    </div>
  );
};

export default CollapsibleCard;