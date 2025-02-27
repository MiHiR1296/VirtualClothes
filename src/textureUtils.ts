import * as THREE from 'three';

// Define texture layer type
interface TextureLayer {
  transformations: {
    offset: { x: number; y: number };
    scale: number;
    rotation: number;
    repeat: boolean;
    flipX: number;
    flipY: number;
  };
}

export const applyTransformToContext = (
  ctx: CanvasRenderingContext2D, 
  image: HTMLImageElement, 
  transformations: TextureLayer['transformations'],
  width: number,
  height: number
) => {
  // Clear the context first
  ctx.clearRect(0, 0, width, height);
  
  // Save the current state
  ctx.save();
  
  // Move to center for transformations
  ctx.translate(width / 2, height / 2);
  
  // Apply offset
  const offsetX = transformations.offset.x * width;
  const offsetY = transformations.offset.y * height;
  ctx.translate(offsetX, offsetY);
  
  // Apply rotation
  ctx.rotate(transformations.rotation * Math.PI / 180);
  
  // Apply scale and flip
  ctx.scale(
    transformations.flipX * transformations.scale,
    transformations.flipY * transformations.scale
  );

  const imgWidth = width * 0.8;
  const imgHeight = height * 0.8;
  
  // Draw the image centered
  ctx.drawImage(
    image,
    -imgWidth / 2,
    -imgHeight / 2,
    imgWidth,
    imgHeight
  );
  
  // Restore the context state
  ctx.restore();

  return ctx;
};

// Normal map handling
const normalMapCache = new Map<string, THREE.Texture>();

export const loadNormalMap = async (normalMapPath: string): Promise<THREE.Texture> => {
  // Check cache first
  if (normalMapCache.has(normalMapPath)) {
    return normalMapCache.get(normalMapPath)!;
  }

  return new Promise((resolve, reject) => {
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      normalMapPath,
      (texture) => {
        texture.colorSpace = THREE.NoColorSpace;
        // Cache the loaded normal map
        normalMapCache.set(normalMapPath, texture);
        resolve(texture);
      },
      undefined,
      reject
    );
  });
};

export const createMaskedNormalMap = (
  baseNormalMap: THREE.Texture,
  alphaTexture: THREE.Texture,
  newNormalMap: THREE.Texture,
  transformations: TextureLayer['transformations']
): THREE.Texture => {
  const width = 1024;
  const height = 1024;

  // Create canvas for compositing
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Create temporary canvases
  const baseCanvas = document.createElement('canvas');
  baseCanvas.width = width;
  baseCanvas.height = height;
  const baseCtx = baseCanvas.getContext('2d');
  if (!baseCtx) throw new Error('Could not get base canvas context');

  const newCanvas = document.createElement('canvas');
  newCanvas.width = width;
  newCanvas.height = height;
  const newCtx = newCanvas.getContext('2d');
  if (!newCtx) throw new Error('Could not get new canvas context');

  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = width;
  maskCanvas.height = height;
  const maskCtx = maskCanvas.getContext('2d');
  if (!maskCtx) throw new Error('Could not get mask canvas context');

  // Draw base normal map
  baseCtx.drawImage(baseNormalMap.image, 0, 0, width, height);
  
  // Draw new normal map
  newCtx.drawImage(newNormalMap.image, 0, 0, width, height);

  // Draw alpha mask with transformations
  applyTransformToContext(
    maskCtx,
    alphaTexture.image,
    transformations,
    width,
    height
  );

  // Get image data
  const baseData = baseCtx.getImageData(0, 0, width, height);
  const newData = newCtx.getImageData(0, 0, width, height);
  const maskData = maskCtx.getImageData(0, 0, width, height);

  // Create output image data
  const outputData = ctx.createImageData(width, height);

  // Blend normal maps based on transformed alpha mask
  for (let i = 0; i < outputData.data.length; i += 4) {
    // Get alpha value from mask (use alpha channel or calculate luminance)
    const alpha = maskData.data[i + 3] / 255;

    // Blend RGB channels based on alpha
    for (let j = 0; j < 3; j++) {
      outputData.data[i + j] = 
        baseData.data[i + j] * (1 - alpha) + 
        newData.data[i + j] * alpha;
    }

    // Set alpha channel to fully opaque
    outputData.data[i + 3] = 255;
  }

  // Put composed image data back to main canvas
  ctx.putImageData(outputData, 0, 0);

  // Create new texture from canvas
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;

  return texture;
};