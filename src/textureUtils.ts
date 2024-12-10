export const applyTransformToContext = (
    ctx: CanvasRenderingContext2D, 
    image: HTMLImageElement, 
    transformations: TextureLayer['transformations']
  ) => {
    const { width, height } = ctx.canvas;
    
    // Clear the context first
    ctx.clearRect(0, 0, width, height);
    
    // Save the current state
    ctx.save();
    
    // Move to center for transformations
    ctx.translate(width / 2, height / 2);
    
    // Apply rotation
    ctx.rotate(transformations.rotation * Math.PI / 180);
    
    // Apply scale
    ctx.scale(transformations.scale, transformations.scale);
    
    // Apply offset
    ctx.translate(
      transformations.offset.x * width,
      transformations.offset.y * height
    );
    
    // Draw the image
    ctx.drawImage(
      image,
      -width / 2,  // Center the image
      -height / 2,
      width,
      height
    );
    
    // Restore the context state
    ctx.restore();
  };