export interface IDimensions {
  width: number;
  height: number;
}

export function drawImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement
) {
  ctx.drawImage(
    image,
    0,
    0,
    image.width,
    image.height,
    0,
    0,
    image.width,
    image.height
  );
}
