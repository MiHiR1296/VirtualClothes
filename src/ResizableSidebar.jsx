import React, { useState, useRef, useEffect, useCallback } from 'react';

const ResizableSidebar = ({ children, isOpen }) => {
  const [width, setWidth] = useState(320); // Default width
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef(null);
  const resizerRef = useRef(null);

  // Persist width in localStorage
  useEffect(() => {
    const savedWidth = localStorage.getItem('sidebarWidth');
    if (savedWidth) {
      setWidth(parseInt(savedWidth, 10));
    }
  }, []);

  // Save width to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('sidebarWidth', width.toString());
  }, [width]);

  // Handle mouse move during resize
  const handleMouseMove = useCallback((e) => {
    if (!isResizing) return;
    
    // Prevent text selection during resize
    e.preventDefault();
    
    // Calculate new width, constrain between min and max
    const newWidth = Math.max(
      300,  // Minimum width
      Math.min(
        window.innerWidth * 0.7,  // Maximum width (70% of window)
        window.innerWidth - e.clientX
      )
    );
    
    setWidth(newWidth);
  }, [isResizing]);

  // Handle mouse up to stop resizing
  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Add and remove event listeners
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div 
      ref={sidebarRef}
      className={`fixed right-0 top-14 bottom-0 glass backdrop-blur-md border-l border-white/20
                  transform transition-transform duration-300 ease-in-out z-10
                  ${isOpen ? 'translate-x-0' : 'translate-x-full'}
                  overflow-y-auto overflow-x-hidden`}
      style={{ 
        width: isOpen ? Math.max(width, 300) : 0,
        maxWidth: '70%',
        minWidth: '300px'
      }}
    >
      {/* Resizer */}
      <div 
        ref={resizerRef}
        onMouseDown={(e) => {
          e.preventDefault();
          setIsResizing(true);
        }}
        className="absolute left-0 top-0 bottom-0 cursor-col-resize 
                   hover:bg-blue-500/30 transition-colors z-50"
        style={{ 
          left: '-8px',  // Extend slightly outside for easier grabbing
          width: '16px'  // Wider hit area
        }}
      />
      
      {/* Sidebar Content */}
      <div className="h-full overflow-y-auto p-6 space-y-6">
        {children}
      </div>
    </div>
  );
};

export default ResizableSidebar;