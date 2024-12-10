import React, { useState } from 'react';
import { Maximize2, Minimize2, X } from 'lucide-react';
import UVEditor from './UVEditor';
import { useTextureContext } from './TextureContext';

const UVEditorContainer = () => {
  const [mode, setMode] = useState('hidden');
  const { activeLayer, updateTransformation } = useTextureContext();

  if (!activeLayer) return null;

  const handleTransformChange = (layerId, type, value) => {
    updateTransformation(layerId, type, value);
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setMode(mode === 'hidden' ? 'floating' : 'hidden')}
        className="fixed right-6 bottom-6 p-3 bg-gray-900 hover:bg-gray-800 
                 rounded-lg shadow-xl z-50 transition-colors"
        title={mode === 'hidden' ? "Open UV Editor" : "Close UV Editor"}
      >
        {mode === 'hidden' ? (
          <Maximize2 className="w-5 h-5 text-gray-200" />
        ) : (
          <Minimize2 className="w-5 h-5 text-gray-200" />
        )}
      </button>

      {/* Editor Window */}
      {mode !== 'hidden' && (
        <div
          className={`fixed right-6 bottom-20 w-[600px] bg-gray-900 rounded-lg shadow-xl 
                    transform transition-transform duration-300 ease-in-out z-40
                    ${mode === 'floating' ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
        >
          <div className="flex items-center justify-between p-4 bg-gray-800 rounded-t-lg">
            <h3 className="text-lg font-semibold text-white">UV Editor</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setMode('hidden')}
                className="p-2 hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>
          <div className="p-6">
            <UVEditor
              activeLayer={activeLayer}
              onTransformChange={handleTransformChange}
              className="w-full"
            />
          </div>
        </div>
      )}
    </>
  );
};

export default UVEditorContainer;