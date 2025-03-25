import React, { useEffect, useRef, useCallback } from 'react';
import { Move, RotateCw, Maximize2, CornerUpLeft, FlipHorizontal, FlipVertical } from 'lucide-react';
import { TextureLoadingUtils } from './textureLoadingUtils';

const tools = {
  move: { icon: Move, cursor: 'move' },
  rotate: { icon: RotateCw, cursor: 'crosshair' },
  scale: { icon: Maximize2, cursor: 'nwse-resize' }
};

const DEFAULT_TRANSFORM = {
  x: 0,
  y: 0,
  scale: 1,
  rotation: 0,
  flipX: 1,
  flipY: 1,
  repeat: false
};

const getCanvasTransform = (activeLayer, canvas) => {
  if (!activeLayer?.transformations || !canvas) return DEFAULT_TRANSFORM;
  
  return {
    x: activeLayer.transformations.offset?.x * canvas.width || 0,
    y: activeLayer.transformations.offset?.y * canvas.height || 0,
    scale: activeLayer.transformations.scale || 1,
    rotation: activeLayer.transformations.rotation || 0,
    flipX: activeLayer.transformations.flipX || 1,
    flipY: activeLayer.transformations.flipY || 1,
    repeat: activeLayer.transformations.repeat || false
  };
};

const UVEditor = React.memo(({ activeLayer, onTransformChange }) => {
  const canvasRef = useRef(null);
  const bgImageRef = useRef(null);
  const renderRequestRef = useRef(null);
  const [tool, setTool] = React.useState('move');
  const [isDragging, setIsDragging] = React.useState(false);
  const [startPos, setStartPos] = React.useState({ x: 0, y: 0 });
  const localTransformRef = useRef(DEFAULT_TRANSFORM);
  const [repeatMode, setRepeatMode] = React.useState(false);
  
  // Initialize and update localTransform whenever activeLayer changes
  useEffect(() => {
    if (canvasRef.current && activeLayer?.transformations) {
      const transform = getCanvasTransform(activeLayer, canvasRef.current);
      localTransformRef.current = transform;
      // Set the repeat mode state based on the layer's transformations
      setRepeatMode(transform.repeat || false);
      requestAnimationFrame(() => drawCanvas());
    }
  }, [activeLayer?.id, activeLayer?.transformations]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
  
    // Ensure canvas size matches display size
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    
    const needsResize = canvas.width !== displayWidth || canvas.height !== displayHeight;
    if (needsResize) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
      localTransformRef.current = getCanvasTransform(activeLayer, canvas);
    }
  
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  
    // Draw UV map background
    if (bgImageRef.current) {
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.drawImage(bgImageRef.current, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
  
    if (!activeLayer?.texture?.image) return;
  
    // Get current transform from ref
    const transform = { ...localTransformRef.current };
    
    // IMPORTANT: Canvas coordinate system differs from Three.js
    // In Canvas, y increases downward; in Three.js, y increases upward
    
    // Render differently based on repeat mode
    if (transform.repeat) {
      // In repeat mode, we draw a grid of tiled images
      
      // Base size of a single tile at scale 1.0
      const baseSize = Math.min(1200, canvas.width / 1);
      
      // Calculate tile size and number of repetitions based on scale
      // For repeat mode, smaller scale = more repetitions (smaller tiles)
      const repeatFactor = 1.0 / Math.max(0.1, transform.scale);
      const tileSize = baseSize / repeatFactor;
      
      // Calculate how many tiles we need to cover the canvas
      const tilesNeeded = Math.ceil(Math.max(canvas.width, canvas.height) / tileSize) + 2;
      
      ctx.save();
      
      // Move to canvas center and apply offset
      ctx.translate(canvas.width / 2 + transform.x, canvas.height / 2 + transform.y);
      
      // Apply rotation
      ctx.rotate(transform.rotation * Math.PI / 180);
      
      // Draw grid of tiles
      for (let i = -tilesNeeded; i <= tilesNeeded; i++) {
        for (let j = -tilesNeeded; j <= tilesNeeded; j++) {
          // Position for this tile
          const posX = i * tileSize;
          const posY = j * tileSize;
          
          // Draw the tile with proper flipping
          ctx.save();
          ctx.translate(posX, posY);
          ctx.scale(transform.flipX, transform.flipY);
          
          ctx.drawImage(
            activeLayer.texture.image,
            -tileSize / 2,
            -tileSize / 2,
            tileSize,
            tileSize
          );
          
          ctx.restore();
        }
      }
      
      ctx.restore();
    } else {
      // Standard non-repeating rendering
      ctx.save();
      
      // Move to center and apply offset
      ctx.translate(canvas.width / 2 + transform.x, canvas.height / 2 + transform.y);
      
      // Apply rotation
      ctx.rotate(transform.rotation * Math.PI / 180);
      
      // Apply scale and flip
      const scaleX = transform.flipX * transform.scale;
      const scaleY = transform.flipY * transform.scale;
      ctx.scale(scaleX, scaleY);
      
      // Calculate image size relative to canvas
      const imgWidth = canvas.width * 0.8;
      const imgHeight = canvas.height * 0.8;
      
      // Draw the image centered
      ctx.drawImage(
        activeLayer.texture.image,
        -imgWidth / 2,
        -imgHeight / 2,
        imgWidth,
        imgHeight
      );
      
      ctx.restore();
    }
  }, [activeLayer?.texture?.image]);

  const handleTransform = useCallback((e) => {
    if (!isDragging || !activeLayer) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const deltaX = x - startPos.x;
    const deltaY = y - startPos.y;

    const transform = { ...localTransformRef.current };

    switch(tool) {
      case 'move': {
        // Apply movement directly (canvas coordinates)
        transform.x += deltaX;
        transform.y += deltaY;
        break;
      }
      case 'rotate': {
        const center = {
          x: rect.width / 2 + transform.x,
          y: rect.height / 2 + transform.y
        };
        
        const startAngle = Math.atan2(startPos.y - center.y, startPos.x - center.x);
        const currentAngle = Math.atan2(y - center.y, x - center.x);
        const deltaAngle = (currentAngle - startAngle) * (180 / Math.PI);
        transform.rotation = (transform.rotation + deltaAngle) % 360;
        break;
      }
      case 'scale': {
        const center = {
          x: rect.width / 2 + transform.x,
          y: rect.height / 2 + transform.y
        };
        
        const startDist = Math.hypot(startPos.x - center.x, startPos.y - center.y);
        const currentDist = Math.hypot(x - center.x, y - center.y);
        
        // Calculate raw scale factor from mouse movement
        const rawScaleFactor = currentDist / startDist;
        
        // Calculate a non-linear scale factor that better matches Three.js behavior
        // This uses a logarithmic approach for more gradual scaling
        const oldScale = transform.scale;
        const scaleDelta = Math.log(rawScaleFactor) * 0.42; // Adjust the multiplier (0.5) to control speed
        const newScale = oldScale * Math.exp(scaleDelta);
        
        // Apply clamped scale
        transform.scale = Math.max(0.1, Math.min(5, newScale));
        break;
      }
    }

    localTransformRef.current = transform;
    
    // Cancel previous render request to avoid stacking
    if (renderRequestRef.current) {
      cancelAnimationFrame(renderRequestRef.current);
    }
    
    // Schedule a new render
    renderRequestRef.current = requestAnimationFrame(() => drawCanvas());
    
    setStartPos({ x, y });

    // Update the layer transformations using normalized coordinates (0-1 range)
    onTransformChange(activeLayer.id, {
      transformations: {
        offset: { 
          x: transform.x / canvas.width,
          y: transform.y / canvas.height
        },
        scale: transform.scale,
        rotation: transform.rotation,
        repeat: transform.repeat,
        flipX: transform.flipX,
        flipY: transform.flipY
      }
    });
  }, [isDragging, activeLayer, startPos, tool, onTransformChange, drawCanvas]);

  const handleFlip = useCallback((axis) => {
    const transform = {
      ...localTransformRef.current,
      [axis === 'x' ? 'flipX' : 'flipY']: localTransformRef.current[axis === 'x' ? 'flipX' : 'flipY'] * -1
    };
    
    localTransformRef.current = transform;
    requestAnimationFrame(() => drawCanvas());

    // Use object-based update
    onTransformChange(activeLayer.id, {
      transformations: {
        offset: { 
          x: transform.x / canvasRef.current.width,
          y: transform.y / canvasRef.current.height
        },
        scale: transform.scale,
        rotation: transform.rotation,
        repeat: transform.repeat,
        flipX: transform.flipX,
        flipY: transform.flipY
      }
    });
  }, [activeLayer, onTransformChange, drawCanvas]);

  const handleReset = useCallback(() => {
    localTransformRef.current = DEFAULT_TRANSFORM;
    setRepeatMode(false);
    requestAnimationFrame(() => drawCanvas());
    
    // Use object-based update
    onTransformChange(activeLayer.id, {
      transformations: {
        offset: { x: 0, y: 0 },
        scale: 1,
        rotation: 0,
        repeat: false,
        flipX: 1,
        flipY: 1
      }
    });
  }, [activeLayer, onTransformChange, drawCanvas]);

  const handleRepeatChange = useCallback((e) => {
    const isRepeat = e.target.checked;
    setRepeatMode(isRepeat);
    
    const transform = {
      ...localTransformRef.current,
      repeat: isRepeat
    };
    
    localTransformRef.current = transform;
    requestAnimationFrame(() => drawCanvas());

    // Use object-based update
    onTransformChange(activeLayer.id, {
      transformations: {
        offset: { 
          x: transform.x / canvasRef.current.width,
          y: transform.y / canvasRef.current.height
        },
        scale: transform.scale,
        rotation: transform.rotation,
        repeat: isRepeat,
        flipX: transform.flipX,
        flipY: transform.flipY
      }
    });
  }, [activeLayer, onTransformChange, drawCanvas]);

  useEffect(() => {
    loadUVMap();
    return () => {
      if (renderRequestRef.current) {
        cancelAnimationFrame(renderRequestRef.current);
      }
    };
  }, []);

  const loadUVMap = useCallback(async () => {
    try {
        const loadedImg = await TextureLoadingUtils.loadUVMap(
            window.currentModelDirectory,
            (img) => {
                bgImageRef.current = img;
                requestAnimationFrame(() => drawCanvas());
            }
        );
        
        if (!loadedImg) {
            console.warn('No UV map loaded');
        }
    } catch (error) {
        console.error('Error loading UV map:', error);
    }
  }, [drawCanvas]);

  const toolButtons = React.useMemo(() => (
    Object.entries(tools).map(([toolName, toolConfig]) => {
      const IconComponent = toolConfig.icon;
      return (
        <button
          key={toolName}
          onClick={() => setTool(toolName)}
          className={`p-2 rounded ${
            tool === toolName ? 'bg-blue-500' : 'bg-gray-700'
          } hover:bg-opacity-80 transition-colors`}
          title={`${toolName.charAt(0).toUpperCase() + toolName.slice(1)} Tool`}
        >
          <IconComponent className="w-4 h-4" />
        </button>
      );
    })
  ), [tool]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center justify-between">
        <div className="flex gap-2">
          {toolButtons}
          <button
            onClick={() => handleFlip('x')}
            className="p-2 rounded bg-gray-700 hover:bg-opacity-80 transition-colors"
            title="Flip Horizontal"
          >
            <FlipHorizontal className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleFlip('y')}
            className="p-2 rounded bg-gray-700 hover:bg-opacity-80 transition-colors"
            title="Flip Vertical"
          >
            <FlipVertical className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            className="p-2 rounded bg-gray-700 hover:bg-opacity-80 transition-colors"
            title="Reset Transform"
          >
            <CornerUpLeft className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={repeatMode}
              onChange={handleRepeatChange}
              className="form-checkbox h-4 w-4 text-blue-500 rounded border-gray-600 bg-gray-700"
            />
            Repeat Texture
          </label>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        className="w-full aspect-square bg-gray-800 rounded-lg"
        style={{ cursor: tools[tool].cursor }}
        onMouseDown={(e) => {
          setIsDragging(true);
          const rect = e.target.getBoundingClientRect();
          setStartPos({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
          });
        }}
        onMouseMove={handleTransform}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
      />

      <div className="flex justify-between text-sm text-gray-400">
        <span>Position: {Math.round(localTransformRef.current.x)}, {Math.round(localTransformRef.current.y)}</span>
        <span>Scale: {localTransformRef.current.scale.toFixed(2)}x</span>
        <span>Rotation: {Math.round(localTransformRef.current.rotation)}°</span>
      </div>
    </div>
  );
});

UVEditor.displayName = 'UVEditor';
export default UVEditor;