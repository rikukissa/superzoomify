import React, { useCallback, useState, useRef, useEffect } from "react";
import useDebounce from "react-use/lib/useDebounce";
import useLocalStorage from "react-use/lib/useLocalStorage";
import { Layout, Icon, Input, Tooltip, Button } from "antd";
import ButtonGroup from "antd/lib/button/button-group";

import dunSound from "./assets/dun-dun-dun.mp3";
import Title from "antd/lib/typography/Title";
import { IFocusPoint, superzoom } from "./effects/superzoom";
import { IDimensions, drawImage } from "./canvas";
import {
  recordWebM,
  CanvasWithCaptureStream,
  AudioWithCaptureStream,
  recordGIF
} from "./recording";

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
  playing
}: {
  playing: boolean;
  image: HTMLImageElement;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const [focusPoint, setFocusPoint] = useState<null | IFocusPoint>(null);
  const [animation, setAnimation] = useState<null | ReturnType<
    typeof superzoom
  >>(null);
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
    await animation.start();
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
    await animation.start();
    const objectUrl = await recorder.stop();
    download(objectUrl);
  };

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

    if (animation && !playing) {
      animation.cancel();
      setAnimation(null);
      return;
    }

    if (!animation && playing && focusPoint) {
      const nextAnimation = superzoom(ctx, image, focusPoint, canvasDimensions);
      setAnimation(nextAnimation);
      nextAnimation.loop();
      return;
    }
    return () => {
      if (animation) {
        animation.cancel();
      }
    };
  }, [image, canvas, focusPoint, canvasDimensions, animation]);

  /*
   * Set canvas dimensions
   */
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
    <div>
      <div onClick={setFocus} className="preview-container">
        <canvas
          origin-clean="false"
          style={{
            height: canvasDimensions.height
          }}
          className="preview"
          ref={canvas}
        />
        <audio ref={audio}>
          <source src={dunSound} type="audio/mpeg" />
        </audio>
      </div>
      <div className="preview-actions">
        <ButtonGroup>
          {!playing && <Button disabled icon="caret-right" />}
          {playing && <Button icon="pause" />}
        </ButtonGroup>
        <ButtonGroup>
          <Button
            onClick={() => downloadAsWebM()}
            disabled={!focusPoint}
            type="primary"
            icon="download"
          >
            WebM
          </Button>
          <Button
            onClick={() => downloadAsGif()}
            disabled={!focusPoint}
            type="primary"
            icon="download"
          >
            Gif
          </Button>
        </ButtonGroup>
      </div>
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
        <Content style={{ padding: "0 1em" }} className="content">
          <div className="box">
            {image && <Canvas playing={true} image={image} />}

            {!image && (
              <div>
                <Title>Superzoomify</Title>
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
              </div>
            )}
          </div>
        </Content>
      </Layout>
    </div>
  );
};

export default App;
