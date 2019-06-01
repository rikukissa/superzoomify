import anime from "animejs";
import { IDimensions, drawImage } from "../canvas";

export interface IFocusPoint {
  x: number;
  y: number;
}

export function superzoom(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  canvasDimensions: IDimensions
) {
  const animatedValues = {
    rotation: 0,
    scale: 1
  };

  const animation = anime({
    targets: animatedValues,
    keyframes: [
      { scale: 1.5, rotation: Math.PI / 6, delay: 100, duration: 400 },
      { scale: 2, rotation: -Math.PI / 6, duration: 400 },
      { scale: 3, rotation: Math.PI / 6, duration: 600 },
      { scale: 3, duration: 2000 }
    ],
    easing: "easeOutElastic(1, .8)",
    autoplay: false
  });

  function render(focusPoint: IFocusPoint) {
    ctx.save();

    ctx.translate(
      ctx.canvas.width * focusPoint.x,
      ctx.canvas.height * focusPoint.y
    );
    ctx.scale(animatedValues.scale, animatedValues.scale);
    ctx.rotate(animatedValues.rotation);
    ctx.translate(
      ctx.canvas.width * focusPoint.x * -1,
      ctx.canvas.height * focusPoint.y * -1
    );
    drawImage(ctx, image, canvasDimensions);
    ctx.restore();
  }

  const run = (focusPoint: IFocusPoint) => {
    return new Promise((resolve, reject) => {
      animation.update = () => render(focusPoint);
      animation.complete = resolve;
      animation.restart();
    });
  };

  const start = (focusPoint: IFocusPoint) => {
    return run(focusPoint);
  };

  const loop = async (focusPoint: IFocusPoint) => {
    await run(focusPoint);

    if (!animation.paused) {
      loop(focusPoint);
    }
  };

  return {
    start,
    loop,
    cancel: () => {
      animation.pause();
    }
  };
}
