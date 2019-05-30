import React, { useCallback, useState, useRef, useEffect } from "react";
import useDebounce from "react-use/lib/useDebounce";
import useLocalStorage from "react-use/lib/useLocalStorage";
import { Layout, Icon, Input, Tooltip } from "antd";

const { Content } = Layout;

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
interface IFocusPoint {
  x: number;
  y: number;
}
const timeSlice = (
  slice: number,
  currentFrame: number,
  animationLenght: number
) =>
  Math.min(
    1,
    Math.max(
      0,
      (currentFrame - (animationLenght / 3) * slice) / (animationLenght / 3)
    )
  );

function superzoom(
  ctx: CanvasRenderingContext2D,
  frame: number,
  focusPoint: IFocusPoint
) {
  const animationLenght = 150; // @todo frames, turn to seconds
  const currentFrame = frame % animationLenght;

  // https://cubic-bezier.com/
  const curve = [0, 1.06, 0.74, 1];

  const scale =
    1 +
    getBezierXY(
      timeSlice(0, currentFrame, animationLenght * 0.5),
      0,
      0,
      1,
      1,
      curve
    ).y +
    getBezierXY(
      timeSlice(1, currentFrame, animationLenght * 0.5),
      0,
      0,
      1,
      1,
      curve
    ).y +
    getBezierXY(
      timeSlice(2, currentFrame, animationLenght * 0.5),
      0,
      0,
      1,
      1,
      curve
    ).y;

  ctx.translate(focusPoint!.x, focusPoint!.y);
  ctx.scale(scale, scale);
  ctx.translate(-focusPoint!.x, -focusPoint!.y);
}

function getImage(base64: string) {
  const image = new Image();

  return new Promise<HTMLImageElement>((resolve, reject) => {
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = base64;
  });
}

function Canvas({ image }: { image: HTMLImageElement }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [focusPoint, setFocusPoint] = useState<null | IFocusPoint>(null);
  const [canvasDimensions, setCanvasDimensions] = useState<{
    width: number;
    height: number;
  }>({
    width: 0,
    height: 0
  });

  const setFocus = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    setFocusPoint({
      x: event.pageX - event.currentTarget.offsetLeft,
      y: event.pageY - event.currentTarget.offsetTop
    });
  }, []);

  useEffect(() => {
    const $canvas = canvas.current;
    if (!$canvas) {
      return;
    }

    let running = true;
    const ctx = $canvas.getContext("2d");

    function drawImage() {
      ctx!.drawImage(
        image,
        0,
        0,
        image.width,
        image.height,
        0,
        0,
        canvasDimensions.width,
        canvasDimensions.height
      );
    }

    function loop(frame: number = 0) {
      if (!ctx || !$canvas || !running) {
        return;
      }

      ctx.save();

      superzoom(ctx, frame, focusPoint!);

      drawImage();
      ctx.restore();
      window.requestAnimationFrame(() => loop(frame + 1));
    }

    if (focusPoint) {
      loop();
    } else {
      drawImage();
    }

    return () => {
      running = false;
    };
  }, [image, canvas, focusPoint, canvasDimensions]);

  useEffect(() => {
    if (!canvas.current) {
      return;
    }
    const aspectRatio = image.height / image.width;
    const canvasWidth = canvas.current.offsetWidth;
    const canvasHeight = canvasWidth * aspectRatio;
    setCanvasDimensions({ width: canvasWidth, height: canvasHeight });
    canvas.current.width = canvas.current.offsetWidth;
    canvas.current.height = canvasHeight;
  }, [image, canvas]);

  return (
    <div onClick={setFocus} className="preview-container">
      <canvas
        style={{
          height: canvasDimensions.height
        }}
        className="preview"
        ref={canvas}
      />
    </div>
  );
}

const App: React.FC = () => {
  const [imageUrl, setImageUrl] = useLocalStorage<string>("superzoomify");

  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useDebounce(
    () => {
      async function loadImage() {
        if (!imageUrl) {
          return;
        }
        const file = await getImage(imageUrl);
        setImage(file);
      }
      loadImage();
    },
    1000,
    [imageUrl]
  );

  return (
    <div className="App">
      <Layout className="layout">
        <Content style={{ padding: "0 1em" }} className="content">
          <div className="box">
            {image && <Canvas image={image} />}
            {!image && (
              <Input
                onChange={event => setImageUrl(event.target.value)}
                placeholder="Enter an image url"
                className="input"
                prefix={
                  <Icon type="user" style={{ color: "rgba(0,0,0,.25)" }} />
                }
                suffix={
                  <Tooltip title="Extra information">
                    <Icon
                      type="info-circle"
                      style={{ color: "rgba(0,0,0,.45)" }}
                    />
                  </Tooltip>
                }
              />
            )}
          </div>
        </Content>
      </Layout>
    </div>
  );
};

export default App;
