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
  const animationFrameRef = useRef(null);
  const [tool, setTool] = React.useState('move');
  const [isDragging, setIsDragging] = React.useState(false);
  const [startPos, setStartPos] = React.useState({ x: 0, y: 0 });
  const localTransformRef = useRef(DEFAULT_TRANSFORM);
  
  // Initialize and update localTransform whenever activeLayer changes
  useEffect(() => {
    if (canvasRef.current && activeLayer?.transformations) {
      localTransformRef.current = getCanvasTransform(activeLayer, canvasRef.current);
      drawCanvas();
    }
  }, [activeLayer?.id, activeLayer?.transformations]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Ensure canvas size matches display size
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        localTransformRef.current = getCanvasTransform(activeLayer, canvas);
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw UV map background with increased opacity
    if (bgImageRef.current) {
        ctx.save();
        ctx.globalAlpha = 0.3; // Increased from 0.5 for better visibility
        ctx.drawImage(bgImageRef.current, 0, 0, canvas.width, canvas.height);
        ctx.restore();
    }

    if (!activeLayer?.texture?.image) return;

    const transform = localTransformRef.current;
    ctx.save();

    const imgWidth = canvas.width * 0.8;
    const imgHeight = canvas.height * 0.8;

    if (transform.repeat) {
      // Handle repeating pattern
      const tileSize = Math.min(canvas.width, canvas.height) / 2 * transform.scale;
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      tempCanvas.width = tileSize;
      tempCanvas.height = tileSize;

      tempCtx.save();
      tempCtx.scale(transform.flipX, transform.flipY);
      tempCtx.drawImage(
        activeLayer.texture.image,
        0, 0,
        tileSize * Math.abs(transform.flipX),
        tileSize * Math.abs(transform.flipY)
      );
      tempCtx.restore();

      const pattern = ctx.createPattern(tempCanvas, 'repeat');
      if (pattern) {
        const matrix = new DOMMatrix()
          .translateSelf(transform.x, transform.y)
          .rotateSelf(transform.rotation);
        
        pattern.setTransform(matrix);
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    } else {
      // Draw single image with transformations
      ctx.translate(
        canvas.width / 2 + transform.x,
        canvas.height / 2 + transform.y
      );
      
      ctx.rotate(transform.rotation * Math.PI / 180);
      
      ctx.scale(
        transform.flipX * transform.scale,
        transform.flipY * transform.scale
      );
      
      ctx.drawImage(
        activeLayer.texture.image,
        -imgWidth / 2,
        -imgHeight / 2,
        imgWidth,
        imgHeight
      );
    }

    ctx.restore();
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
        const scaleFactor = currentDist / startDist;
        transform.scale = Math.max(0.1, Math.min(5, transform.scale * scaleFactor));
        break;
      }
    }

    localTransformRef.current = transform;
    drawCanvas();
    setStartPos({ x, y });

    // Use object-based update to preserve material properties
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
    drawCanvas();

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
    drawCanvas();
    
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
    const transform = {
      ...localTransformRef.current,
      repeat: e.target.checked
    };
    
    localTransformRef.current = transform;
    drawCanvas();

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

  useEffect(() => {
    loadUVMap();
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const loadUVMap = useCallback(async () => {
    try {
        console.log('Current model directory:', window.currentModelDirectory);
        const loadedImg = await TextureLoadingUtils.loadUVMap(
            window.currentModelDirectory,
            (img) => {
                console.log('UV map loaded in callback, dimensions:', img.width, 'x', img.height);
                bgImageRef.current = img;
                drawCanvas();
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
              checked={localTransformRef.current.repeat}
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