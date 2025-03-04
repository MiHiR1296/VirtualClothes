import React, { useEffect, useState, useRef } from 'react';

const CustomCursor = () => {
  const cursorRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [objectName, setObjectName] = useState('');

  useEffect(() => {
    const handleMouseMove = (e) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseEnter = () => {
      setVisible(true);
    };

    const handleMouseLeave = () => {
      setVisible(false);
    };

    // Handle cursor visibility
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('mouseleave', handleMouseLeave);

    // Handle object interactions
    const updateInteraction = () => {
      // This is a placeholder where we'll listen to Three.js raycasting events
      if (window.hoveredModelPart) {
        setIsHovering(true);
        setObjectName(window.hoveredModelPart.name || 'Object');
      } else {
        setIsHovering(false);
        setObjectName('');
      }
    };

    // Add listener for model interaction if available
    window.addEventListener('model-hover', updateInteraction);
    
    const intervalId = setInterval(updateInteraction, 100);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('model-hover', updateInteraction);
      clearInterval(intervalId);
    };
  }, []);

  return (
    <div
      ref={cursorRef}
      className={`custom-cursor ${isHovering ? 'hovering' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        opacity: visible ? 1 : 0
      }}
    >
      {isHovering && (
        <div className="custom-cursor-label">
          {objectName.replace('Fronttex', '').replace('Backtex', '')}
        </div>
      )}
    </div>
  );
};

export default CustomCursor;