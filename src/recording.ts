export type CanvasWithCaptureStream = HTMLCanvasElement & {
  captureStream: () => MediaStream;
};
export type AudioWithCaptureStream = HTMLAudioElement & {
  captureStream: () => MediaStream;
};

export function startRecording(
  canvas: CanvasWithCaptureStream,
  audio: AudioWithCaptureStream
) {
  const chunks: BlobPart[] = []; // here we will store our recorded media chunks (Blobs)
  const stream = canvas.captureStream(); // grab our canvas MediaStream

  audio
    .captureStream()
    .getAudioTracks()
    .forEach(track => {
      stream.addTrack(track);
    });
  const rec = new MediaRecorder(stream); // init the recorder
  audio.play();
  // every time the recorder has new data, we will store it in our array
  rec.ondataavailable = e => chunks.push(e.data);
  rec.start();

  return {
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
