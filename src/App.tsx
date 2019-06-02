import React, { useCallback, useState, useRef, useEffect } from "react";
import useDebounce from "react-use/lib/useDebounce";
import useLocalStorage from "react-use/lib/useLocalStorage";
import {
  Layout,
  Icon,
  Input,
  Tooltip,
  Button,
  Dropdown,
  Menu,
  Spin,
  message,
  Alert
} from "antd";

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

function getImageFallback(imageUrl: string) {
  return getImage(`https://cors-anywhere.herokuapp.com/${imageUrl}`);
}

function copyToClipboard(str: string) {
  const el = document.createElement("textarea");
  el.value = str;
  document.body.appendChild(el);
  el.select();
  document.execCommand("copy");
  document.body.removeChild(el);
}

function canCaptureStream($canvas: HTMLCanvasElement) {
  return Boolean(($canvas as any).captureStream);
}

function getShareLink(imageUrl: string, focusPoint: IFocusPoint) {
  const { location } = window.document;
  return `${location.protocol}//${location.host}/i/${focusPoint.x}x${
    focusPoint.y
  }/${encodeURI(imageUrl)}`;
}

function Canvas({
  image,
  showSharingControls = true,
  canReFocus = true,
  focusPoint: userDefinedFocusPoint
}: {
  image: HTMLImageElement;
  canReFocus?: boolean;
  showSharingControls?: boolean;
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
  const [generatingVideo, setGeneratingVideo] = useState<boolean>(false);

  const setFocus = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canReFocus && focusPoint) {
      // Only restart animation
      setFocusPoint({ ...focusPoint });
      return;
    }

    const { top, left } = event.currentTarget.getBoundingClientRect();

    setFocusPoint({
      x:
        (event.pageX - left - window.scrollX) / event.currentTarget.offsetWidth,
      y: (event.pageY - top - window.scrollY) / event.currentTarget.offsetHeight
    });
  }, []);

  const downloadAsWebM = async () => {
    if (!animation) {
      return;
    }
    setGeneratingVideo(true);
    animation.cancel();
    const recorder = recordWebM(
      canvas.current as CanvasWithCaptureStream,
      audio.current as AudioWithCaptureStream
    );
    recorder.start();
    await animation.start(focusPoint!);
    const objectUrl = await recorder.stop();
    download(objectUrl);
    setGeneratingVideo(false);
  };

  const downloadAsGif = async () => {
    if (!animation) {
      return;
    }
    setGeneratingVideo(true);

    animation.cancel();
    const recorder = recordGIF(canvas.current as CanvasWithCaptureStream);
    recorder.start();
    await animation.start(focusPoint!);
    const objectUrl = await recorder.stop();
    download(objectUrl);
    setGeneratingVideo(false);
  };

  /*
   * Create animation
   */

  useEffect(() => {
    if (animation || !canvas.current) {
      return;
    }

    if (canvasDimensions.width === 0 && canvasDimensions.height === 0) {
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
      if (!muted) {
        $audio.currentTime = 0;
        await $audio.play();
      }

      try {
        await animation!.start(focusPoint!);
      } catch (error) {
        console.error(error);
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

    const { offsetWidth, offsetHeight } = canvas.current.parentElement!;
    if (image.height > image.width) {
      let canvasHeight = offsetHeight;
      let canvasWidth = canvasHeight / aspectRatio;
      if (canvasWidth > offsetWidth) {
        canvasWidth = offsetWidth;
        canvasHeight = canvasWidth * aspectRatio;
      }
      setCanvasDimensions({ width: canvasWidth, height: canvasHeight });
    } else {
      let canvasWidth = offsetWidth;

      let canvasHeight = canvasWidth * aspectRatio;
      if (canvasHeight > offsetHeight) {
        canvasHeight = offsetHeight;
        canvasWidth = canvasHeight / aspectRatio;
      }
      setCanvasDimensions({ width: canvasWidth, height: canvasHeight });
    }
  }, [image, canvas]);

  return (
    <div className="canvas">
      <div className="preview-container">
        <div
          className="canvas-container"
          style={{
            paddingTop: `${(image.height / image.width) * 100}%`
          }}
        >
          <canvas
            onClick={setFocus}
            origin-clean="false"
            className="preview"
            ref={canvas}
          />
        </div>
        <audio muted={muted} ref={audio}>
          <source src={dunSound} type="audio/mpeg" />
        </audio>
        <div className="preview-actions">
          <Button className="editor-action" onClick={() => setMuted(!muted)}>
            <Icon type="sound" theme={muted ? "outlined" : "filled"} />
          </Button>

          {showSharingControls && (
            <div className="share">
              {focusPoint && (
                <>
                  Share:
                  <Input
                    onClick={() => {
                      copyToClipboard(getShareLink(image.src, focusPoint));
                      message.info("Copied to clipboard");
                    }}
                    className="input"
                    value={getShareLink(image.src, focusPoint)}
                  />
                </>
              )}
              <Dropdown
                disabled={!focusPoint || generatingVideo}
                overlay={
                  <Menu className="menu">
                    <Menu.Item
                      className="menu-item"
                      key="2"
                      onClick={() => downloadAsGif()}
                    >
                      GIF
                    </Menu.Item>
                    <Menu.Item
                      className="menu-item"
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
                  {generatingVideo ? (
                    <Spin className="spinner" />
                  ) : (
                    <Icon type="download" />
                  )}
                </Button>
              </Dropdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SharedView() {
  const [focusSpot] = document.location.pathname.split("/").slice(2);
  const [previewImage, setPreviewImage] = useState<HTMLImageElement | null>(
    null
  );
  const [failed, setFailed] = useState<boolean>(false);

  const imageUrl = document.location.pathname
    .split("/")
    .slice(3)
    .join("/");

  const focusPoint = {
    x: parseFloat(focusSpot.split("x")[0]),
    y: parseFloat(focusSpot.split("x")[1])
  };

  useEffect(() => {
    async function loadPreviewImage() {
      try {
        const image = await getImage(imageUrl).catch(err =>
          getImageFallback(imageUrl)
        );
        setPreviewImage(image);
      } catch (error) {
        setFailed(true);
      }
    }
    loadPreviewImage();
  }, []);

  return (
    <div className="App">
      <Layout className="layout">
        {previewImage ? (
          <Canvas
            showSharingControls={false}
            canReFocus={false}
            focusPoint={focusPoint}
            image={previewImage}
          />
        ) : (
          <div className="shared-state-container">
            {failed ? (
              <Alert
                className="alert"
                message="Failed to load the image 😞"
                description={
                  <>
                    <p>Sorry about this! The URL might be broken 🤷‍</p>

                    <Button
                      className="button"
                      onClick={() => {
                        document.location.href = "/";
                      }}
                    >
                      Back to start
                    </Button>
                  </>
                }
                type="error"
              />
            ) : (
              <Spin />
            )}
          </div>
        )}
      </Layout>
    </div>
  );
}

const App: React.FC = () => {
  const [imageUrl, setImageUrl] = useState<string>();
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [focusPoint, setFocusPoint] = useState<IFocusPoint>();
  const [previewImage, setPreviewImage] = useState<HTMLImageElement | null>(
    null
  );

  function clearImage() {
    setImageUrl(undefined);
    setImage(null);
  }

  useEffect(() => {
    async function loadPreviewImage() {
      setPreviewImage(
        await getImageFallback(
          "https://i.kym-cdn.com/photos/images/original/000/000/130/disaster-girl.jpg"
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
          getImageFallback(imageUrl)
        );
        setImage(file);
      }
      loadImage();
    },
    1000,
    [imageUrl]
  );

  const isShared = document.location.pathname.indexOf("/i/") === 0;
  if (isShared) {
    return <SharedView />;
  }

  return (
    <div className="App">
      <Title className="title">dun dun dun</Title>
      <Layout className="layout">
        {!image && (
          <Content className="content content--index">
            <div className="modal">
              <div className="modal-example">
                {previewImage && (
                  <Canvas
                    showSharingControls={false}
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
