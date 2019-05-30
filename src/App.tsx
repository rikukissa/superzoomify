import React, { useCallback, useState, useRef, useEffect } from "react";
import useDebounce from "react-use/lib/useDebounce";
import useLocalStorage from "react-use/lib/useLocalStorage";
import { Layout, Icon, Input, Tooltip, Button } from "antd";
import ButtonGroup from "antd/lib/button/button-group";
import {
  startRecording,
  CanvasWithCaptureStream,
  AudioWithCaptureStream
} from "./recording";
import dunSound from "./assets/dun-dun-dun.mp3";

const { Content } = Layout;

function download(uri: string) {
  const link = document.createElement("a");
  link.download = "superzoom";
  link.href = uri;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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
interface IFocusPoint {
  x: number;
  y: number;
}
interface IDimensions {
  width: number;
  height: number;
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

function drawImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  canvasDimensions: IDimensions
) {
  ctx.drawImage(
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

function superzoom(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  focusPoint: IFocusPoint,
  canvasDimensions: IDimensions
) {
  let cancelled = false;
  const animationLenght = 150; // @todo frames, turn to seconds

  function render(frame: number) {
    const currentFrame = frame % animationLenght;

    ctx.save();

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

function getImage(base64: string) {
  const image = new Image();
  image.crossOrigin = "anonymous";
  return new Promise<HTMLImageElement>((resolve, reject) => {
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = base64;
  });
}

function canCaptureStream($canvas: HTMLCanvasElement) {
  return Boolean(($canvas as any).captureStream);
}

function Canvas({
  image,
  onPlay,
  onVideoAvailable
}: {
  image: HTMLImageElement;
  onPlay: () => void;
  onVideoAvailable: (url: string) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const [focusPoint, setFocusPoint] = useState<null | IFocusPoint>(null);
  const [canvasDimensions, setCanvasDimensions] = useState<IDimensions>({
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

    const ctx = $canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    drawImage(ctx!, image, canvasDimensions);

    if (!focusPoint) {
      return;
    }

    let recorder: ReturnType<typeof startRecording> | undefined;
    onPlay();
    if (canCaptureStream($canvas) && audio.current) {
      recorder = startRecording(
        $canvas as CanvasWithCaptureStream,
        audio.current as AudioWithCaptureStream
      );
    }
    const animation = superzoom(ctx, image, focusPoint, canvasDimensions);

    async function animate() {
      await animation.run();
      if (recorder) {
        const videoObjectUrl = await recorder.stop();
        onVideoAvailable(videoObjectUrl);
      }
      animation.loop();
    }

    animate();

    return () => {
      animation.cancel();
    };
    // eslint-disable-next-line
  }, [image, canvas, focusPoint, canvasDimensions, audio]);

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
        origin-clean="false"
        style={{
          height: canvasDimensions.height
        }}
        className="preview"
        ref={canvas}
      />
      <audio muted ref={audio}>
        <source src={dunSound} type="audio/mpeg" />
      </audio>
    </div>
  );
}

const App: React.FC = () => {
  const [imageUrl, setImageUrl] = useLocalStorage<string>("superzoomify");

  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [video, setVideo] = useState<string | null>(null);
  const [playing, setPlaying] = useState<boolean>(false);

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
            {image && (
              <Canvas
                onVideoAvailable={setVideo}
                onPlay={() => setPlaying(true)}
                image={image}
              />
            )}
            {image && (
              <div className="preview-actions">
                <ButtonGroup>
                  {!playing && <Button disabled icon="caret-right" />}
                  {playing && <Button icon="pause" />}
                </ButtonGroup>
                <ButtonGroup>
                  <Button
                    onClick={() => video && download(video)}
                    disabled={!video}
                    type="primary"
                    icon="download"
                  />
                </ButtonGroup>
              </div>
            )}

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
