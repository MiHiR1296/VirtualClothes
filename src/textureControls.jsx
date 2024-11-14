import React, { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';

const styles = {
  container: {
    padding: '15px',
    color: 'white',
  },
  section: {
    marginBottom: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  label: {
    color: '#ccc',
    fontSize: '14px',
    display: 'block',
    marginBottom: '5px',
  },
  resetButton: {
    padding: '5px 10px',
    fontSize: '12px',
    backgroundColor: '#4a4a4a',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: '#666',
    }
  },
  slider: {
    width: '100%',
    backgroundColor: '#4a4a4a',
    height: '6px',
    borderRadius: '3px',
    appearance: 'none',
    outline: 'none',
    marginBottom: '5px',
  },
  valueDisplay: {
    color: '#ccc',
    fontSize: '12px',
  },
  rotationInput: {
    width: '100%',
    backgroundColor: '#4a4a4a',
    border: 'none',
    color: 'white',
    padding: '8px',
    borderRadius: '4px',
    fontSize: '14px',
    outline: 'none',
  },
  offsetPad: {
    width: '100%',
    height: '128px',
    backgroundColor: '#4a4a4a',
    borderRadius: '4px',
    position: 'relative',
    cursor: 'crosshair',
    marginBottom: '8px',
  },
  offsetIndicator: {
    position: 'absolute',
    width: '8px',
    height: '8px',
    backgroundColor: 'white',
    borderRadius: '50%',
    transform: 'translate(-50%, -50%)',
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: '#666',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
  },
  offsetValues: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#ccc',
  }
};

const TextureControls = () => {
  // Accumulated values (total transformations)
  const [totalOffset, setTotalOffset] = useState({ x: 0, y: 0 });
  const [totalScale, setTotalScale] = useState(1);
  const [totalRotation, setTotalRotation] = useState(0);
  
  // Current control values (temporary/spring values)
  const [currentOffset, setCurrentOffset] = useState({ x: 0, y: 0 });
  const [currentScale, setCurrentScale] = useState(0);
  
  const [isDragging, setIsDragging] = useState(false);
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
      }, 150);
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

  const handleOffsetPadInteraction = (e) => {
    const rect = offsetPadRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    
    setCurrentOffset({ x: x * 0.5, y: y * 0.5 });
    
    setTotalOffset(prev => ({
      x: prev.x + x * 0.01,
      y: prev.y + y * 0.01
    }));
  };

  const handleRotationChange = (e) => {
    const value = parseFloat(e.target.value) || 0;
    setTotalRotation(value);
  };

  const handleScaleChange = (e) => {
    const newScale = parseFloat(e.target.value);
    setCurrentScale(newScale - 1);
    setTotalScale(newScale);
  };

  const handleResetAll = () => {
    setTotalOffset({ x: 0, y: 0 });
    setTotalScale(1);
    setTotalRotation(0);
    setCurrentOffset({ x: 0, y: 0 });
    setCurrentScale(0);
  };

  return (
    <div style={styles.container}>
      {/* Scale Control */}
      <div style={styles.section}>
        <div style={styles.header}>
          <label style={styles.label}>Scale</label>
          <button onClick={handleResetAll} style={styles.resetButton}>
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
          style={styles.slider}
        />
        <span style={styles.valueDisplay}>{totalScale.toFixed(2)}x</span>
      </div>

      {/* Rotation Control */}
      <div style={styles.section}>
        <label style={styles.label}>Rotation</label>
        <input
          type="number"
          value={totalRotation}
          onChange={handleRotationChange}
          style={styles.rotationInput}
          step="0.1"
        />
      </div>

      {/* Offset Control */}
      <div style={styles.section}>
        <label style={styles.label}>Offset</label>
        <div 
          ref={offsetPadRef}
          style={styles.offsetPad}
          onMouseDown={(e) => {
            setIsDragging(true);
            handleOffsetPadInteraction(e);
          }}
          onMouseMove={(e) => isDragging && handleOffsetPadInteraction(e)}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
        >
          {/* Indicator dot */}
          <div 
            style={{
              ...styles.offsetIndicator,
              left: `${((currentOffset.x / 0.5) + 1) * 50}%`,
              top: `${((-currentOffset.y / 0.5) + 1) * 50}%`,
              transition: isDragging ? 'none' : 'all 0.15s'
            }}
          />
          {/* Grid lines */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <div style={{ ...styles.gridLine, width: '1px', height: '100%' }} />
            <div style={{ ...styles.gridLine, width: '100%', height: '1px' }} />
          </div>
        </div>
        <div style={styles.offsetValues}>
          <span>X: {totalOffset.x.toFixed(2)}</span>
          <span>Y: {totalOffset.y.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default TextureControls;