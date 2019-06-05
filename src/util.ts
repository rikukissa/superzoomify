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
  return `${location.protocol}//${location.host}/i/?f=${focusPoint.x}x${
    focusPoint.y
  }&u=${encodeURIToWorkwithPrerender(encodeURI(imageUrl))}`;
}

function encodeURIToWorkwithPrerender(uri: string) {
  return uri.replace(/\.(png|gif|jpg|jpeg|svg)/g, "!--!$1");
}

function decodePrerenderEnabledURI(uri: string) {
  return uri.replace(/!--!(png|gif|jpg|jpeg|svg)/g, ".$1");
}

function parseQuery(queryString: string) {
  const query: { [key: string]: string } = {};
  const pairs = (queryString[0] === "?"
    ? queryString.substr(1)
    : queryString
  ).split("&");
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i].split("=");
    query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || "");
  }
  return query;
}

export function parseShareLink(search: string) {
  const query = parseQuery(search);

  const defaultFocus = {
    x: 0.5,
    y: 0.5
  };

  let focusPoint = defaultFocus;

  if (query.f) {
    const [x, y] = query.f.split("x");
    focusPoint = {
      x: parseFloat(x),
      y: parseFloat(y)
    };
  }

  const imageUrl = query.u
    ? decodePrerenderEnabledURI(decodeURIComponent(query.u))
    : "";

  return { imageUrl, focusPoint };
}
