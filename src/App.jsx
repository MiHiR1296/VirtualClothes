import React, { useRef, useEffect, useState } from 'react';
import { Layers, Upload, Palette, Settings, Move, Menu } from 'lucide-react';
import { ThreeApplication } from './ThreeApplication';
import { TextureProvider } from './TextureContext';
import TextureLayerManager from './TextureLayerManager';
import UVEditorContainer from './UVEditorContainer';
import ControlsTooltip from './ControlsTooltip.jsx';

export default function App() {
  const canvasRef = useRef(null);
  const appRef = useRef(null);
  const [selectedModel, setSelectedModel] = useState('model1');
  const [selectedMaterial, setSelectedMaterial] = useState('cotton');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || appRef.current) return;

    const app = new ThreeApplication(canvasRef.current);
    appRef.current = app;

    app.initPromise.catch((error) => {
        console.error('Failed to initialize application:', error);
    });

    return () => {
        if (appRef.current) {
            appRef.current.dispose();
            appRef.current = null;
        }
    };
  }, []);

  const handleModelChange = async (e) => {
    if (!appRef.current) return;

    try {
        const modelId = e.target.value;
        setSelectedModel(modelId);
        await appRef.current.loadModel(modelId);
    } catch (error) {
        console.error('Error loading model:', error);
    }
  };

  return (
    <TextureProvider>
      <div className="relative min-h-screen bg-gray-900 text-white">
        {/* Top Navigation */}
        <nav className="fixed top-0 left-0 right-0 bg-gray-800 border-b border-gray-700 z-20">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <h1 className="text-xl font-bold">3D Model Viewer</h1>
            <div className="flex items-center gap-4">
              <select 
                className="bg-gray-700 rounded px-3 py-1 text-sm border border-gray-600"
                value={selectedModel}
                onChange={handleModelChange}
              >
                <option value="model1">Polo T-shirt</option>
                <option value="model2">CrewNeck HS</option>
                <option value="model3">V-Neck FS</option>
                <option value="model4">Hoodie</option>
                <option value="model5">Kids Tracksuite</option>
                <option value="model6">Kids Turtleneck</option>
              </select>
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </nav>

        {/* Main Content Area */}
        <div className="flex h-screen pt-14">
          {/* Canvas */}
          <div className="flex-1 relative">
            <canvas ref={canvasRef} className="w-full h-full" />
            <ControlsTooltip />
          </div>

          {/* Sidebar */}
          <div 
            className={`fixed right-0 top-14 bottom-0 w-80 bg-gray-800 border-l border-gray-700 
                       transform transition-transform duration-300 ease-in-out z-10
                       ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}
          >
            <div className="h-full overflow-y-auto p-6 space-y-6">
              {/* Material Selection */}
              <div>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Palette className="w-4 h-4" /> Materials
                </h2>
                <select 
                  id="materialSelect"
                  className="w-full bg-gray-700 rounded px-3 py-2 mb-3 border border-gray-600"
                  value={selectedMaterial}
                  onChange={(e) => {
                    setSelectedMaterial(e.target.value);
                    appRef.current?.updateMaterial?.(e.target.value);
                  }}
                >
                  <option value="cotton">Cotton</option>
                  <option value="nylon">Nylon</option>
                  <option value="leather">Leather</option>
                  <option value="metal">Metal</option>
                  <option value="plastic">Plastic</option>
                </select>
              </div>

              {/* Material Properties */}
              <div id="workspace-colors">
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Settings className="w-4 h-4" /> Properties
                </h2>
                <div className="space-y-4">
                  {/* Selected Model Display */}
                  <div id="modelNameDisplay" className="text-sm text-gray-400">
                    Selected: None
                  </div>
                  
                  <div>
                    <label className="block mb-2 text-sm">Color</label>
                    <input 
                      type="color" 
                      id="colorPicker"
                      className="w-full h-10 rounded bg-gray-700 border border-gray-600" 
                    />
                  </div>
                </div>
              </div>

              {/* Texture Layer Manager */}
              <div id="materialSelect-container"></div>
              <TextureLayerManager />
            </div>
          </div>
        </div>

        {/* UV Editor Container */}
        <UVEditorContainer />

      </div>
    </TextureProvider>
  );
}