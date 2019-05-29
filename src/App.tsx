import React, { useCallback, useState } from "react";
import useDebounce from "react-use/lib/useDebounce";
import useLocalStorage from "react-use/lib/useLocalStorage";
import { Layout, Icon, Input, Tooltip } from "antd";

const { Content } = Layout;

function getImage(base64: string) {
  const image = new Image();

  return new Promise<HTMLImageElement>((resolve, reject) => {
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = base64;
  });
}
function Canvas({ image }: { image: HTMLImageElement }) {
  const [focusPoint, setFocusPoint] = useState<null | { x: number; y: number }>(
    null
  );

  const setFocus = useCallback((event: React.MouseEvent<HTMLImageElement>) => {
    console.log({
      x: event.pageX - event.currentTarget.offsetLeft,
      y: event.pageY - event.currentTarget.offsetTop
    });

    setFocusPoint({
      x: event.pageX - event.currentTarget.offsetLeft,
      y: event.pageY - event.currentTarget.offsetTop
    });
  }, []);

  const aspectRatio = image.height / image.width;
  return (
    <div className="preview-container" onClick={setFocus}>
      {focusPoint && (
        <div
          className="focus"
          style={{
            left: focusPoint.x,
            top: focusPoint.y
          }}
        />
      )}
      <div
        className="preview"
        style={{
          paddingTop: `${aspectRatio * 100}%`,
          backgroundImage: `url(${image.src})`,
          animationPlayState: !focusPoint ? "paused" : "running",
          ...(focusPoint
            ? {
                transformOrigin: `${focusPoint.x}px ${focusPoint.y}px`
              }
            : {})
        }}
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
