import React, { useState, useRef, useEffect } from 'react';

const TextureControls = () => {
  // Accumulated values (total transformations)
  const [totalOffset, setTotalOffset] = useState({ x: 0, y: 0 });
  const [totalScale, setTotalScale] = useState(1);
  const [totalRotation, setTotalRotation] = useState(0);
  
  // Current control values (temporary/spring values)
  const [currentOffset, setCurrentOffset] = useState({ x: 0, y: 0 });
  const [currentScale, setCurrentScale] = useState(0);
  const [currentRotation, setCurrentRotation] = useState(0);
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const rotationRef = useRef(null);
  const offsetPadRef = useRef(null);
  const springTimeoutRef = useRef(null);

  // Update texture when total values change
  useEffect(() => {
    updateTextureProperties();
  }, [totalOffset, totalScale, totalRotation]);

  // Spring-back effect for controls
  useEffect(() => {
    if (!isDragging) {
      springTimeoutRef.current = setTimeout(() => {
        setCurrentOffset({ x: 0, y: 0 });
        setCurrentScale(0);
        setCurrentRotation(0);
      }, 150); // Spring-back delay
    }
    return () => clearTimeout(springTimeoutRef.current);
  }, [isDragging]);

  const updateTextureProperties = () => {
    const textureObjects = window.findTextureObjects?.() || [];
    textureObjects.forEach(object => {
      if (object.material?.map) {
        object.material.map.center.set(0.5, 0.5);
        object.material.map.repeat.set(totalScale, totalScale);
        object.material.map.rotation = THREE.MathUtils.degToRad(totalRotation);
        object.material.map.offset.set(totalOffset.x, totalOffset.y);
        object.material.map.needsUpdate = true;
      }
    });
  };

  // Handle offset pad interactions
  const handleOffsetPadInteraction = (e) => {
    const rect = offsetPadRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Update current (visual) offset
    setCurrentOffset({ x: x * 0.5, y: y * 0.5 });
    
    // Accumulate the change into total offset
    setTotalOffset(prev => ({
      x: prev.x + x * 0.01, // Reduced multiplier for finer control
      y: prev.y + y * 0.01
    }));
  };

  // Handle rotation drag
  const handleRotationMouseDown = (e) => {
    setIsDragging(true);
    setDragStart(e.clientX);
    window.addEventListener('mousemove', handleRotationDrag);
    window.addEventListener('mouseup', handleRotationMouseUp);
  };

  const handleRotationDrag = (e) => {
    if (!isDragging) return;
    const diff = (e.clientX - dragStart) / 2;
    setCurrentRotation(diff);
    setTotalRotation(prev => {
      let newRotation = prev + diff * 0.1; // Reduced multiplier for finer control
      return ((newRotation + 180) % 360) - 180; // Normalize to -180 to 180
    });
    setDragStart(e.clientX);
  };

  const handleRotationMouseUp = () => {
    setIsDragging(false);
    window.removeEventListener('mousemove', handleRotationDrag);
    window.removeEventListener('mouseup', handleRotationMouseUp);
  };

  // Handle scale changes
  const handleScaleChange = (e) => {
    const newScale = parseFloat(e.target.value);
    setCurrentScale(newScale - 1); // Center around 0 for visual feedback
    setTotalScale(newScale);
  };

  // Reset all transformations
  const handleResetAll = () => {
    setTotalOffset({ x: 0, y: 0 });
    setTotalScale(1);
    setTotalRotation(0);
    setCurrentOffset({ x: 0, y: 0 });
    setCurrentScale(0);
    setCurrentRotation(0);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium">Scale</label>
          <button 
            onClick={handleResetAll}
            className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Reset All
          </button>
        </div>
        <input
          type="range"
          min="0.1"
          max="5"
          step="0.1"
          value={totalScale}
          onChange={handleScaleChange}
          className="w-full"
        />
        <span className="text-xs">{totalScale.toFixed(2)}x</span>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Rotation</label>
        <div 
          ref={rotationRef}
          className="h-8 bg-gray-700 rounded cursor-ew-resize flex items-center justify-center relative overflow-hidden"
          onMouseDown={handleRotationMouseDown}
        >
          <div 
            className="absolute inset-0 bg-gray-600 transition-transform duration-150"
            style={{
              transform: `translateX(${currentRotation}px)`,
            }}
          />
          <span className="relative text-white select-none">{totalRotation.toFixed(1)}°</span>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Offset</label>
        <div 
          ref={offsetPadRef}
          className="w-full h-32 bg-gray-700 rounded relative cursor-crosshair"
          onMouseDown={(e) => {
            setIsDragging(true);
            handleOffsetPadInteraction(e);
          }}
          onMouseMove={(e) => isDragging && handleOffsetPadInteraction(e)}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
        >
          {/* Control indicator */}
          <div 
            className="absolute w-2 h-2 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-all duration-150"
            style={{
              left: `${((currentOffset.x / 0.5) + 1) * 50}%`,
              top: `${((-currentOffset.y / 0.5) + 1) * 50}%`
            }}
          />
          {/* Reference grid */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute left-1/2 top-1/2 w-px h-full bg-gray-600 -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute left-1/2 top-1/2 w-full h-px bg-gray-600 -translate-x-1/2 -translate-y-1/2" />
          </div>
        </div>
        <div className="flex justify-between text-xs">
          <span>X: {totalOffset.x.toFixed(2)}</span>
          <span>Y: {totalOffset.y.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default TextureControls;
