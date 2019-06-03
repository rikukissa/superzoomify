import { IFocusPoint } from "./effects/superzoom";

export function download(uri: string) {
  const link = document.createElement("a");
  link.download = "superzoom";
  link.href = uri;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function getImage(imageUrl: string) {
  const image = new Image();
  image.crossOrigin = "anonymous";
  return new Promise<HTMLImageElement>((resolve, reject) => {
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = imageUrl;
  });
}

export function getImageFallback(imageUrl: string) {
  return getImage(`https://cors-anywhere.herokuapp.com/${imageUrl}`);
}

export function copyToClipboard(str: string) {
  const el = document.createElement("textarea");
  el.value = str;
  document.body.appendChild(el);
  el.select();
  document.execCommand("copy");
  document.body.removeChild(el);
}

export function canCaptureStream($canvas: HTMLCanvasElement) {
  return Boolean(($canvas as any).captureStream);
}

export function getShareLink(imageUrl: string, focusPoint: IFocusPoint) {
  const { location } = window.document;
  return `${location.protocol}//${location.host}/i/${focusPoint.x}x${
    focusPoint.y
  }/${encodeURI(imageUrl)}`;
}
