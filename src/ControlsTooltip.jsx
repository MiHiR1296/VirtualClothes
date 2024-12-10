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
      backgroundColor: activeKeys[key] ? 'rgb(59 130 246)' : 'transparent',
      color: activeKeys[key] ? 'white' : 'rgb(209 213 219)',
      padding: '2px 6px',
      borderRadius: '4px',
      border: '1px solid rgb(75 85 99)',
      display: 'inline-block',
      minWidth: '24px',
      textAlign: 'center',
      marginRight: '8px',
      fontFamily: 'monospace'
    };
  };

  return (
    <div className="absolute left-4 top-4 z-20">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-gray-800/90 p-2 rounded-lg hover:bg-gray-700/90 transition-colors"
        title={isVisible ? "Hide Controls" : "Show Controls"}
      >
        <HelpCircle className="w-5 h-5" />
      </button>

      {isVisible && (
        <div className="absolute left-0 top-12 bg-gray-800/90 rounded-lg p-4 text-sm 
                      shadow-lg border border-gray-700/50 min-w-[250px]">
          <h3 className="font-semibold mb-3 flex items-center gap-2 text-gray-200">
            <Move className="w-4 h-4" /> Camera Controls
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>Move Forward</span>
              <div>
                <span style={getKeyStyle('w')}>W</span>
                <span style={getKeyStyle('arrowup')}>↑</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span>Move Backward</span>
              <div>
                <span style={getKeyStyle('s')}>S</span>
                <span style={getKeyStyle('arrowdown')}>↓</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span>Rotate Left</span>
              <div>
                <span style={getKeyStyle('a')}>A</span>
                <span style={getKeyStyle('arrowleft')}>←</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span>Rotate Right</span>
              <div>
                <span style={getKeyStyle('d')}>D</span>
                <span style={getKeyStyle('arrowright')}>→</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span>Move Up</span>
              <span style={getKeyStyle('q')}>Q</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Move Down</span>
              <span style={getKeyStyle('e')}>E</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Reset Camera</span>
              <span style={getKeyStyle('f')}>F</span>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-400">
            You can also use the mouse to orbit, zoom, and pan
          </div>
        </div>
      )}
    </div>
  );
};

export default ControlsTooltip;