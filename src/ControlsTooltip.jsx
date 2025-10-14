import React, { useState, useEffect } from 'react';
import { HelpCircle, Move } from 'lucide-react';

const ControlsTooltip = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [activeKeys, setActiveKeys] = useState({});

  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      setActiveKeys(prev => ({ ...prev, [key]: true }));
    };

    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();
      setActiveKeys(prev => ({ ...prev, [key]: false }));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const getKeyStyle = (key) => {
    return {
      backgroundColor: activeKeys[key] ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(255, 255, 255, 0.1)',
      color: activeKeys[key] ? 'white' : 'rgba(255, 255, 255, 0.8)',
      padding: '4px 8px',
      borderRadius: '8px',
      border: activeKeys[key] ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid rgba(255, 255, 255, 0.2)',
      display: 'inline-block',
      minWidth: '28px',
      textAlign: 'center',
      marginRight: '8px',
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '12px',
      fontWeight: '500',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      transition: 'all 0.3s ease'
    };
  };

  return (
    <div className="absolute left-6 top-6 z-20">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="glass-button p-3 hover:scale-105 transition-all duration-300"
        title={isVisible ? "Hide Controls" : "Show Controls"}
      >
        <HelpCircle className="w-5 h-5" />
      </button>

      {isVisible && (
        <div className="absolute left-0 top-14 glass-card p-6 text-sm min-w-[280px]">
          <h3 className="font-semibold mb-4 flex items-center gap-2 text-gradient">
            <Move className="w-5 h-5" /> Camera Controls
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-white/80">Move Forward</span>
              <div>
                <span style={getKeyStyle('w')}>W</span>
                <span style={getKeyStyle('arrowup')}>↑</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/80">Move Backward</span>
              <div>
                <span style={getKeyStyle('s')}>S</span>
                <span style={getKeyStyle('arrowdown')}>↓</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/80">Rotate Left</span>
              <div>
                <span style={getKeyStyle('a')}>A</span>
                <span style={getKeyStyle('arrowleft')}>←</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/80">Rotate Right</span>
              <div>
                <span style={getKeyStyle('d')}>D</span>
                <span style={getKeyStyle('arrowright')}>→</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/80">Move Up</span>
              <span style={getKeyStyle('q')}>Q</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/80">Move Down</span>
              <span style={getKeyStyle('e')}>E</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/80">Reset Camera</span>
              <span style={getKeyStyle('f')}>F</span>
            </div>
          </div>
          <div className="mt-4 text-xs text-white/60 border-t border-white/20 pt-3">
            You can also use the mouse to orbit, zoom, and pan
          </div>
        </div>
      )}
    </div>
  );
};

export default ControlsTooltip;