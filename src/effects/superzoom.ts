import { IDimensions, drawImage } from "../canvas";

function timeSlice(
  slice: number,
  currentFrame: number,
  animationLenght: number
) {
  return Math.min(
    1,
    Math.max(
      0,
      (currentFrame - (animationLenght / 3) * slice) / (animationLenght / 3)
    )
  );
}

function getBezierXY(
  t: number,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  [cp1x, cp1y, cp2x, cp2y]: number[]
) {
  return {
    x:
      Math.pow(1 - t, 3) * sx +
      3 * t * Math.pow(1 - t, 2) * cp1x +
      3 * t * t * (1 - t) * cp2x +
      t * t * t * ex,
    y:
      Math.pow(1 - t, 3) * sy +
      3 * t * Math.pow(1 - t, 2) * cp1y +
      3 * t * t * (1 - t) * cp2y +
      t * t * t * ey
  };
}
export interface IFocusPoint {
  x: number;
  y: number;
}
export function superzoom(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  focusPoint: IFocusPoint,
  canvasDimensions: IDimensions
) {
  let cancelled = false;
  const animationLenght = 200; // @todo frames, turn to seconds
  const zoomStartFrame = 50;
  const zoomEndFrame = animationLenght / 2;

  function render(frame: number) {
    const currentFrame = frame % animationLenght;

    ctx.save();

    // https://cubic-bezier.com/
    const curve = [0, 1.06, 0.74, 1];

    const scale =
      1 +
      getBezierXY(
        timeSlice(0, Math.max(0, currentFrame - zoomStartFrame), zoomEndFrame),
        0,
        0,
        1,
        1,
        curve
      ).y +
      getBezierXY(
        timeSlice(1, Math.max(0, currentFrame - zoomStartFrame), zoomEndFrame),
        0,
        0,
        1,
        1,
        curve
      ).y +
      getBezierXY(
        timeSlice(2, Math.max(0, currentFrame - zoomStartFrame), zoomEndFrame),
        0,
        0,
        1,
        1,
        curve
      ).y;

    ctx.translate(focusPoint!.x, focusPoint!.y);
    ctx.scale(scale, scale);
    ctx.translate(-focusPoint!.x, -focusPoint!.y);

    drawImage(ctx, image, canvasDimensions);
    ctx.restore();
  }

  const run = () => {
    return new Promise((resolve, reject) => {
      const loop = (frame: number = 0) => {
        if (frame > animationLenght || cancelled) {
          return resolve();
        }
        render(frame);
        window.requestAnimationFrame(() => loop(frame + 1));
      };
      loop();
    });
  };

  const loop = async () => {
    await run();
    if (!cancelled) {
      loop();
    }
  };

  return {
    run,
    loop,
    cancel: () => {
      cancelled = true;
    }
  };
}
