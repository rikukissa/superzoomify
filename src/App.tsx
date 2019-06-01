import React, { useCallback, useState, useRef, useEffect } from "react";
import useDebounce from "react-use/lib/useDebounce";
import useLocalStorage from "react-use/lib/useLocalStorage";
import { Layout, Icon, Input, Tooltip, Button, Dropdown, Menu } from "antd";

import dunSound from "./assets/dun-dun-dun.mp3";

import { IFocusPoint, superzoom } from "./effects/superzoom";
import { IDimensions, drawImage } from "./canvas";
import {
  recordWebM,
  CanvasWithCaptureStream,
  AudioWithCaptureStream,
  recordGIF
} from "./recording";
import Title from "antd/lib/typography/Title";

const { Content } = Layout;

function download(uri: string) {
  const link = document.createElement("a");
  link.download = "superzoom";
  link.href = uri;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function getImage(imageUrl: string) {
  const image = new Image();
  image.crossOrigin = "anonymous";
  return new Promise<HTMLImageElement>((resolve, reject) => {
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = imageUrl;
  });
}

function canCaptureStream($canvas: HTMLCanvasElement) {
  return Boolean(($canvas as any).captureStream);
}

function Canvas({
  image,
  example,
  focusPoint: userDefinedFocusPoint
}: {
  image: HTMLImageElement;
  example?: boolean;
  focusPoint?: IFocusPoint;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const [focusPoint = userDefinedFocusPoint, setFocusPoint] = useState<
    IFocusPoint | undefined
  >(userDefinedFocusPoint);

  const [muted, setMuted] = useLocalStorage<boolean>("muted", true);
  const [animation, setAnimation] = useState<null | ReturnType<
    typeof superzoom
  >>(null);
  const [canvasDimensions, setCanvasDimensions] = useState<IDimensions>({
    width: 0,
    height: 0
  });

  const setFocus = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const { top, left } = event.currentTarget.getBoundingClientRect();

    setFocusPoint({
      x: (event.pageX - left) / event.currentTarget.offsetWidth,
      y: (event.pageY - top) / event.currentTarget.offsetHeight
    });
  }, []);

  const downloadAsWebM = async () => {
    if (!animation) {
      return;
    }
    animation.cancel();
    const recorder = recordWebM(
      canvas.current as CanvasWithCaptureStream,
      audio.current as AudioWithCaptureStream
    );
    recorder.start();
    await animation.start(focusPoint!);
    const objectUrl = await recorder.stop();
    download(objectUrl);
  };

  const downloadAsGif = async () => {
    if (!animation) {
      return;
    }
    animation.cancel();
    const recorder = recordGIF(canvas.current as CanvasWithCaptureStream);
    recorder.start();
    await animation.start(focusPoint!);
    const objectUrl = await recorder.stop();
    download(objectUrl);
  };

  /*
   * Create animation
   */

  useEffect(() => {
    if (animation || !canvas.current) {
      return;
    }
    const ctx = canvas.current.getContext("2d")!;

    setAnimation(superzoom(ctx, image, canvasDimensions));
  }, [animation, canvas, image, canvasDimensions]);

  /*
   * Play animation
   */

  useEffect(() => {
    if (!focusPoint || !audio.current || !canvas.current || !animation) {
      return;
    }
    const ctx = canvas.current.getContext("2d")!;

    async function play() {
      const $audio = audio.current!;
      try {
        $audio.currentTime = 0;
        await $audio.play();
      } catch (error) {
        console.log(error);
      }
      try {
        await animation!.start(focusPoint!);
      } catch (error) {
        console.log(error);
      }
      drawImage(ctx, image, canvasDimensions);
      $audio.pause();
    }
    play();
    return () => {
      if (animation) {
        animation.cancel();
      }
    };
  }, [focusPoint, animation, canvasDimensions, image, audio]);

  /*
   * Draw initial image
   */
  useEffect(() => {
    const $canvas = canvas.current;
    if (!$canvas) {
      return;
    }

    const ctx = $canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    drawImage(ctx, image, canvasDimensions);
  }, [image, canvas, canvasDimensions]);

  /*
   * Set canvas dimensions
   */
  useEffect(() => {
    if (!canvas.current) {
      return;
    }
    canvas.current.width = image.width;
    canvas.current.height = image.height;

    const aspectRatio = image.height / image.width;
    if (image.height > image.width) {
      const canvasHeight = canvas.current.parentElement!.offsetHeight;
      const canvasWidth = canvasHeight / aspectRatio;
      setCanvasDimensions({ width: canvasWidth, height: canvasHeight });
    } else {
      const canvasWidth = canvas.current.parentElement!.offsetWidth;
      const canvasHeight = canvasWidth * aspectRatio;
      setCanvasDimensions({ width: canvasWidth, height: canvasHeight });
    }
  }, [image, canvas]);

  return (
    <div className="canvas">
      <div className="preview-container">
        <canvas
          onClick={setFocus}
          origin-clean="false"
          style={{
            width: canvasDimensions.width,
            height: canvasDimensions.height
          }}
          className="preview"
          ref={canvas}
        />
        <audio muted={muted} ref={audio}>
          <source src={dunSound} type="audio/mpeg" />
        </audio>
        <div className="preview-actions">
          <Button className="editor-action" onClick={() => setMuted(!muted)}>
            <Icon type="sound" theme={muted ? "outlined" : "filled"} />
          </Button>

          {!example && (
            <Dropdown
              overlay={
                <Menu>
                  <Menu.Item key="2" onClick={() => downloadAsGif()}>
                    GIF
                  </Menu.Item>
                  <Menu.Item
                    key="1"
                    onClick={() => downloadAsWebM()}
                    disabled={
                      !canvas.current || !canCaptureStream(canvas.current)
                    }
                  >
                    WebM
                  </Menu.Item>
                </Menu>
              }
            >
              <Button className="editor-action" disabled={!focusPoint}>
                <Icon type="download" />
              </Button>
            </Dropdown>
          )}
        </div>
      </div>
    </div>
  );
}

const App: React.FC = () => {
  const [imageUrl, setImageUrl] = useLocalStorage<string | null>(
    "superzoomify",
    null
  );
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [focusPoint, setFocusPoint] = useState<IFocusPoint>();
  const [previewImage, setPreviewImage] = useState<HTMLImageElement | null>(
    null
  );

  function clearImage() {
    setImageUrl(null);
    setImage(null);
  }

  useEffect(() => {
    async function loadPreviewImage() {
      setPreviewImage(
        await getImage(
          "https://cors-anywhere.herokuapp.com/https://i.kym-cdn.com/photos/images/original/000/000/130/disaster-girl.jpg"
        )
      );
      window.setTimeout(() => setFocusPoint({ x: 0.4, y: 0.4 }), 2000);
    }
    loadPreviewImage();
  }, []);

  useDebounce(
    () => {
      async function loadImage() {
        if (!imageUrl) {
          return;
        }
        const file = await getImage(imageUrl).catch(err =>
          getImage(`https://cors-anywhere.herokuapp.com/${imageUrl}`)
        );
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
        {!image && (
          <Content className="content content--index">
            <div className="modal">
              <Title className="title">dun dun dun</Title>
              <div className="modal-example">
                {previewImage && (
                  <Canvas
                    example={true}
                    image={previewImage}
                    focusPoint={focusPoint}
                  />
                )}
              </div>
              <Input
                onChange={event => setImageUrl(event.target.value)}
                placeholder="Enter image URL"
                className="input"
                suffix={
                  <Tooltip title="Extra information">
                    <Icon
                      type="info-circle"
                      style={{ color: "rgba(0,0,0,.45)" }}
                    />
                  </Tooltip>
                }
              />
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                Pellentesque non elit et felis imperdiet ultricies nec quis
                felis. Cras id purus quis leo rhoncus blandit. Morbi feugiat
                justo ac placerat suscipit.
              </p>
            </div>
          </Content>
        )}

        {image && (
          <Content className="content">
            <Canvas image={image} />
            <div className="box">
              <Button className="button" icon="arrow-left" onClick={clearImage}>
                Use another image
              </Button>
            </div>
          </Content>
        )}
      </Layout>
    </div>
  );
};

export default App;
