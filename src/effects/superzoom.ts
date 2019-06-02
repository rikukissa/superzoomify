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
  const fontBaseSize = canvasDimensions.width / 17;
  const animatedValues = {
    rotation: 0,
    scale: 1,
    textX: 0,
    textY: 0,
    textSize: fontBaseSize
  };

  const animation = anime({
    targets: animatedValues,
    keyframes: [
      {
        scale: 1.5,
        textX: 0,
        textY: 0.03,
        textSize: fontBaseSize * 1.2,
        rotation: Math.PI / 6,
        delay: 100,
        duration: 400
      },
      { textX: 1, textY: 0.03, textSize: 0, duration: 0 },
      {
        scale: 2,
        textX: 1,
        textY: 0.5,
        textSize: fontBaseSize * 1.4,
        rotation: -Math.PI / 6,
        duration: 400
      },
      { textX: 0, textY: 0.75, textSize: 0, duration: 0 },
      {
        scale: 3,
        textX: 0,
        textY: 1,
        textSize: fontBaseSize * 1.6,
        rotation: Math.PI / 6,
        duration: 600
      },
      {
        scale: 3,
        textX: 0,
        textY: 1,
        textSize: fontBaseSize * 1.6,
        duration: 2000
      }
    ],
    easing: "easeOutElastic(1, .8)",
    autoplay: false
  });

  function drawText(text: string, x: number, y: number) {
    ctx.font = `bold ${animatedValues.textSize}px Arial`;
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";

    ctx.fillText(text, x, y);
    ctx.lineWidth = 3;
    ctx.strokeText(text, x, y);
  }

  function render(focusPoint: IFocusPoint) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
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
    drawText(
      "DUN",
      ctx.canvas.width / 2 +
        (-1 + animatedValues.textX * 2) * (ctx.canvas.width / 5),
      ctx.canvas.height / 2 +
        (-1 + animatedValues.textY * 2) * (ctx.canvas.height / 3)
    );
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
