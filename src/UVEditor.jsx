import React, { useEffect, useRef, useState } from 'react';
import { Move, RotateCw, Maximize2, CornerUpLeft, FlipHorizontal, FlipVertical } from 'lucide-react';

const tools = {
  move: {
    icon: Move,
    cursor: 'move'
  },
  rotate: {
    icon: RotateCw,
    cursor: 'crosshair'
  },
  scale: {
    icon: Maximize2,
    cursor: 'nwse-resize'
  }
};

const UVEditor = ({ activeLayer, onTransformChange }) => {
  const canvasRef = useRef(null);
  const bgImageRef = useRef(null);
  const [tool, setTool] = useState('move');
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [isRepeating, setIsRepeating] = useState(false);
  const [transform, setTransform] = useState({
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
    flipX: 1,
    flipY: 1
  });

  useEffect(() => {
    loadUVMap();
  }, []);

  useEffect(() => {
    if (canvasRef.current) {
      drawCanvas();
    }
  }, [tool, transform, activeLayer, isRepeating]);

  const loadUVMap = async () => {
    try {
      const modelDir = window.currentModelDirectory;
      if (!modelDir) return;

      const uvMapPath = `${modelDir}/UVmap.png`;
      const img = new Image();
      img.src = uvMapPath;
      
      img.onload = () => {
        bgImageRef.current = img;
        drawCanvas();
      };
    } catch (error) {
      console.error('Error loading UV map:', error);
    }
  };

  const drawCanvas = () => {
    if (!canvasRef.current || !activeLayer?.texture?.image) return;

    const ctx = canvasRef.current.getContext('2d');
    const canvas = canvasRef.current;
    const img = activeLayer.texture.image;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw UV map background
    if (bgImageRef.current) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.drawImage(bgImageRef.current, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    ctx.save();
    
    if (isRepeating) {
      // Calculate base tile size (quarter of the canvas)
      const baseTileSize = Math.min(canvas.width, canvas.height) / 2;
      const scaledTileSize = baseTileSize * transform.scale;

      // Create pattern from the image
      const patternCanvas = document.createElement('canvas');
      const patternCtx = patternCanvas.getContext('2d');
      patternCanvas.width = scaledTileSize;
      patternCanvas.height = scaledTileSize;

      // Draw the image into the pattern canvas
      patternCtx.drawImage(img, 0, 0, scaledTileSize, scaledTileSize);

      // Create and transform the pattern
      const pattern = ctx.createPattern(patternCanvas, 'repeat');
      if (pattern) {
        // Apply transformations to pattern
        const matrix = new DOMMatrix()
          .translateSelf(transform.x % scaledTileSize, transform.y % scaledTileSize)
          .rotateSelf(transform.rotation)
          .scaleSelf(transform.flipX, transform.flipY);
        
        pattern.setTransform(matrix);
        
        // Fill the entire canvas with the pattern
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    } else {
      // Center transform
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(transform.rotation * Math.PI / 180);
      ctx.scale(transform.flipX * transform.scale, transform.flipY * transform.scale);
      
      // Draw single image
      const imgWidth = canvas.width * 0.8;
      const imgHeight = canvas.height * 0.8;
      ctx.drawImage(
        img,
        -imgWidth / 2 + transform.x,
        -imgHeight / 2 + transform.y,
        imgWidth,
        imgHeight
      );
    }

    ctx.restore();
  };

  const handleTransform = (e) => {
    if (!isDragging || !activeLayer) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left);
    const y = (e.clientY - rect.top);
    
    const deltaX = x - startPos.x;
    const deltaY = y - startPos.y;

    const newTransform = { ...transform };

    switch(tool) {
      case 'move':
        newTransform.x += deltaX;
        newTransform.y += deltaY;
        break;
      case 'rotate':
        const center = {
          x: rect.width / 2,
          y: rect.height / 2
        };
        const startAngle = Math.atan2(startPos.y - center.y, startPos.x - center.x);
        const currentAngle = Math.atan2(y - center.y, x - center.x);
        const deltaAngle = (currentAngle - startAngle) * (180 / Math.PI);
        newTransform.rotation = (newTransform.rotation + deltaAngle) % 360;
        break;
      case 'scale':
        const startDist = Math.hypot(startPos.x - rect.width/2, startPos.y - rect.height/2);
        const currentDist = Math.hypot(x - rect.width/2, y - rect.height/2);
        const scaleFactor = currentDist / startDist;
        newTransform.scale = Math.max(0.1, Math.min(5, newTransform.scale * scaleFactor));
        break;
    }

    setTransform(newTransform);
    setStartPos({ x, y });

    // Update transformations in parent
    const normalizedTransform = {
      offset: { 
        x: newTransform.x / rect.width, 
        y: newTransform.y / rect.height 
      },
      scale: newTransform.scale,
      rotation: newTransform.rotation,
      repeat: isRepeating,
      flipX: newTransform.flipX,
      flipY: newTransform.flipY
    };

    onTransformChange(activeLayer.id, 'transformations', normalizedTransform);
  };

  const handleFlip = (axis) => {
    const newTransform = {
      ...transform,
      [axis === 'x' ? 'flipX' : 'flipY']: transform[axis === 'x' ? 'flipX' : 'flipY'] * -1
    };
    setTransform(newTransform);
    
    const rect = canvasRef.current.getBoundingClientRect();
    onTransformChange(activeLayer.id, 'transformations', {
      offset: { x: newTransform.x / rect.width, y: newTransform.y / rect.height },
      scale: newTransform.scale,
      rotation: newTransform.rotation,
      repeat: isRepeating,
      flipX: newTransform.flipX,
      flipY: newTransform.flipY
    });
  };

  const handleReset = () => {
    const newTransform = {
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      flipX: 1,
      flipY: 1
    };
    setTransform(newTransform);
    setIsRepeating(false);

    onTransformChange(activeLayer.id, 'transformations', {
      offset: { x: 0, y: 0 },
      scale: 1,
      rotation: 0,
      repeat: false,
      flipX: 1,
      flipY: 1
    });
  };

  const handleRepeatChange = (e) => {
    const repeat = e.target.checked;
    setIsRepeating(repeat);
    
    const rect = canvasRef.current.getBoundingClientRect();
    onTransformChange(activeLayer.id, 'transformations', {
      offset: { x: transform.x / rect.width, y: transform.y / rect.height },
      scale: transform.scale,
      rotation: transform.rotation,
      repeat,
      flipX: transform.flipX,
      flipY: transform.flipY
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center justify-between">
        <div className="flex gap-2">
          {Object.entries(tools).map(([toolName, toolConfig]) => {
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
          })}

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
              checked={isRepeating}
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
        onMouseUp={() => {
          setIsDragging(false);
        }}
        onMouseLeave={() => setIsDragging(false)}
      />

      <div className="flex justify-between text-sm text-gray-400">
        <span>Position: {Math.round(transform.x)}, {Math.round(transform.y)}</span>
        <span>Scale: {transform.scale.toFixed(2)}x</span>
        <span>Rotation: {Math.round(transform.rotation)}°</span>
      </div>
    </div>
  );
};

export default UVEditor;