import React, { useCallback, useState, useRef, useEffect } from "react";

import useLocalStorage from "react-use/lib/useLocalStorage";
import { Icon, Input, Button, Dropdown, Menu, Spin, message } from "antd";

import dunSound from "../assets/dun-dun-dun.mp3";

import { IFocusPoint, superzoom } from "../effects/superzoom";
import { drawImage } from "../canvas";
import {
  recordWebM,
  CanvasWithCaptureStream,
  AudioWithCaptureStream,
  recordGIF
} from "../recording";
import { download, copyToClipboard, getShareLink } from "../util";

function canCaptureStream($canvas: HTMLCanvasElement) {
  return Boolean(($canvas as any).captureStream);
}

const round2 = (num: number) => Math.round(num * 100) / 100;

export function Canvas({
  image,
  showSharingControls = true,
  canReFocus = true,
  showInstruction = true,
  focusPoint: userDefinedFocusPoint
}: {
  image: HTMLImageElement;
  canReFocus?: boolean;
  showInstruction?: boolean;
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

  const [generatingVideo, setGeneratingVideo] = useState<boolean>(false);

  const setFocus = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!canReFocus && focusPoint) {
        // Only restart animation
        setFocusPoint({ ...focusPoint });
        return;
      }

      const { top, left } = event.currentTarget.getBoundingClientRect();

      setFocusPoint({
        x: round2(
          (event.pageX - left - window.scrollX) /
            event.currentTarget.offsetWidth
        ),
        y: round2(
          (event.pageY - top - window.scrollY) /
            event.currentTarget.offsetHeight
        )
      });
    },
    [canReFocus, focusPoint]
  );

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

    const ctx = canvas.current.getContext("2d")!;
    setAnimation(superzoom(ctx, image));
  }, [animation, canvas, image]);

  /*
   * Set canvas dimensions
   */
  useEffect(() => {
    if (!canvas.current) {
      return;
    }
    canvas.current.width = image.width;
    canvas.current.height = image.height;
  }, [canvas, image]);

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
      drawImage(ctx, image);
      $audio.pause();
    }
    play();
    return () => {
      if (animation) {
        animation.cancel();
      }
    };
  }, [focusPoint, animation, image, audio]);

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

    drawImage(ctx, image);
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
        {showInstruction && (
          <span className="instruction">
            Click anywhere on the image to set the focus point 👆
          </span>
        )}
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
  );
}
