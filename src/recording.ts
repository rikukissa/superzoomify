import GIF from "gif.js";

export type CanvasWithCaptureStream = HTMLCanvasElement & {
  captureStream: () => MediaStream;
};
export type AudioWithCaptureStream = HTMLAudioElement & {
  captureStream: () => MediaStream;
};

export interface Recorder {
  stop: () => Promise<string>;
  start: () => void;
}

export function recordWebM(
  canvas: CanvasWithCaptureStream,
  audio: AudioWithCaptureStream
): Recorder {
  const chunks: BlobPart[] = []; // here we will store our recorded media chunks (Blobs)
  const stream = canvas.captureStream(); // grab our canvas MediaStream

  /*
   * Audio stream with controlled volume
   */
  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(audio.captureStream());
  const dest = ctx.createMediaStreamDestination();
  const gainNode = ctx.createGain();

  source.connect(gainNode);
  gainNode.connect(dest);
  gainNode.gain.value = 0.3;

  dest.stream.getAudioTracks().forEach(track => {
    stream.addTrack(track);
  });

  const rec = new MediaRecorder(stream); // init the recorder

  // every time the recorder has new data, we will store it in our array
  rec.ondataavailable = e => chunks.push(e.data);

  return {
    start: () => {
      audio.currentTime = 0;
      audio.play();
      rec.start();
    },
    stop: () => {
      return new Promise<string>((resolve, reject) => {
        rec.onerror = reject;
        rec.onstop = () => {
          resolve(
            URL.createObjectURL(new Blob(chunks, { type: "video/webm" }))
          );
        };
        rec.stop();
      });
    }
  };
}

export function recordGIF(canvas: CanvasWithCaptureStream): Recorder {
  const aspectRatio = canvas.height / canvas.width;
  const offscreenCanvasWidth = Math.min(300, canvas.width);
  const offscreenCanvasHeight = Math.min(300 * aspectRatio, canvas.height);
  const offscreenCanvas = window.document.createElement("canvas");
  offscreenCanvas.width = offscreenCanvasWidth;
  offscreenCanvas.height = offscreenCanvasHeight;

  const offscreenCtx = offscreenCanvas.getContext("2d")!;

  const gif = new GIF({
    workers: 2,
    quality: 8,
    workerScript: "/gif.worker.js",
    width: offscreenCanvasWidth,
    height: offscreenCanvasHeight
  });

  let interval: number;
  return {
    start: () => {
      interval = window.setInterval(() => {
        offscreenCtx.drawImage(
          canvas,
          0,
          0,
          offscreenCanvasWidth,
          offscreenCanvasHeight
        );
        gif.addFrame(offscreenCtx, { copy: true, delay: 1000 / 20 });
      }, 1000 / 20);
    },
    stop: () => {
      window.clearInterval(interval);
      return new Promise((resolve, reject) => {
        gif.on("finished", function(blob: Blob) {
          resolve(URL.createObjectURL(blob));
        });

        gif.render();
      });
    }
  };
}
