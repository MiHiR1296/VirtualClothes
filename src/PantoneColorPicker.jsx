import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  const modalRef = useRef(null);
  const triggerRef = useRef(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close on Escape key and prevent body scroll
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleEscape);
      
      return () => {
        document.body.style.overflow = 'unset';
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen]);

  // Check if sidebar is open by looking for the sidebar element
  useEffect(() => {
    const checkSidebar = () => {
      const sidebar = document.querySelector('[class*="ResizableSidebar"]');
      if (sidebar) {
        const isVisible = !sidebar.classList.contains('translate-x-full');
        setSidebarOpen(isVisible);
      }
    };
    
    // Check initially
    checkSidebar();
    
    // Set up a mutation observer to watch for sidebar changes
    const observer = new MutationObserver(checkSidebar);
    observer.observe(document.body, { 
      childList: true, 
      subtree: true, 
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, []);

  // Prevent modal from moving by using a stable positioning strategy
  useEffect(() => {
    if (isOpen && modalRef.current) {
      // Calculate the correct position based on sidebar state
      const modal = modalRef.current;
      const navHeight = 80; // Navigation height
      
      const updateModalPosition = () => {
        modal.style.position = 'fixed';
        modal.style.top = `${navHeight + 40}px`; // Below navigation with margin
        
        // Position the modal to avoid overlapping with the sidebar
        if (sidebarOpen) {
          // When sidebar is open, position modal to the left of the sidebar
          const sidebarWidth = 320; // Approximate sidebar width when open
          const modalWidth = Math.min(600, window.innerWidth - sidebarWidth - 100); // Responsive width
          modal.style.width = `${modalWidth}px`;
          modal.style.left = `calc(50% - ${modalWidth / 2}px - ${sidebarWidth / 2}px)`;
          modal.style.maxWidth = `calc(100vw - ${sidebarWidth + 100}px)`;
        } else {
          // When sidebar is closed, center the modal
          const modalWidth = Math.min(700, window.innerWidth - 100);
          modal.style.width = `${modalWidth}px`;
          modal.style.left = '50%';
          modal.style.maxWidth = 'calc(100vw - 100px)';
        }
        modal.style.transform = 'translateX(-50%)';
        modal.style.zIndex = '99999'; // Much higher z-index to ensure it's above everything
      };
      
      // Initial positioning
      updateModalPosition();
      
      // Add window resize listener
      window.addEventListener('resize', updateModalPosition);
      
      // Prevent any scroll events from affecting the modal position
      const preventScroll = (e) => {
        e.preventDefault();
        e.stopPropagation();
      };
      
      modal.addEventListener('wheel', preventScroll, { passive: false });
      modal.addEventListener('touchmove', preventScroll, { passive: false });
      
      return () => {
        window.removeEventListener('resize', updateModalPosition);
        modal.removeEventListener('wheel', preventScroll);
        modal.removeEventListener('touchmove', preventScroll);
      };
    }
  }, [isOpen, sidebarOpen]);

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
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="professional-button flex items-center justify-between px-3 py-2 cursor-pointer w-full"
      >
        <span className="text-sm font-medium">Select Pantone Color</span>
        <ChevronDown className="w-4 h-4" />
      </div>

      {isOpen && createPortal(
        <div style={{ isolation: 'isolate', position: 'relative', zIndex: 99998 }}>
          {/* Backdrop - only over the 3D viewport area */}
          <div 
            className="fixed z-[99998] bg-black/80 backdrop-blur-md pantone-modal-backdrop"
            onClick={() => setIsOpen(false)}
            style={{ 
              position: 'fixed', 
              top: '80px', // Below the navigation
              left: '0', 
              right: '0', // Cover the entire viewport
              bottom: '0',
              zIndex: 99998
            }}
          />
          
          <div 
            ref={modalRef}
            className="modal-content"
            style={{ 
              maxHeight: '80vh',
              minHeight: '500px',
              position: 'fixed',
              top: '120px', // Below navigation with some margin
              transform: 'translateX(-50%)',
              zIndex: 99999,
              willChange: 'transform'
            }}
            // Prevent backdrop click from closing
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-muted hover:text-primary transition-colors z-20 professional-button p-1"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Top section with category and search */}
            <div className="panel-header">
              <div className="flex gap-3 mb-4">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="professional-input flex-1 focus-ring"
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
                    className="professional-input w-full pl-8 focus-ring"
                  />
                  {searchTerm ? (
                    <X 
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted cursor-pointer hover:text-primary transition-colors"
                      onClick={() => setSearchTerm('')}
                    />
                  ) : (
                    <Search 
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Color Grid */}
            <div 
              className="panel-content"
              style={{ 
                maxHeight: 'calc(80vh - 160px)',
                minHeight: '400px'
              }}
            >
              <div className="grid grid-cols-8 gap-2 overflow-y-auto">
                {filteredColors.map((color, index) => (
                  <div 
                    key={`${color.hex}-${index}`}
                    className="relative group cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleColorSelect(color.hex, color.name);
                    }}
                  >
                    <div 
                      className="w-full aspect-square rounded border border-light hover:border-accent transition-all duration-200 shadow-light"
                      style={{ backgroundColor: color.hex }}
                    />
                    <div 
                      className="absolute bottom-0 left-0 right-0 bg-panel text-primary text-xs 
                                 text-center opacity-0 group-hover:opacity-100 transition-all duration-200 
                                 truncate px-1 py-1 rounded-b"
                    >
                      {color.name}
                    </div>
                  </div>
                ))}
                
                {filteredColors.length === 0 && (
                  <div className="col-span-8 text-center text-muted py-8">
                    No colors found
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default PantoneColorPicker;