import React, { useState, useEffect } from "react";
import useDebounce from "react-use/lib/useDebounce";
import { Layout, Icon, Input, Tooltip, Button, Form } from "antd";

import { IFocusPoint } from "./effects/superzoom";

import Title from "antd/lib/typography/Title";
import { getImageFallback, getImage } from "./util";
import { SharedView } from "./views/SharedView";
import { Canvas } from "./components/Canvas";

const { Content } = Layout;
const EXAMPLE_IMAGE =
  "https://i.kym-cdn.com/photos/images/original/000/000/130/disaster-girl.jpg";

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
      setPreviewImage(await getImageFallback(EXAMPLE_IMAGE));
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
              <Form className="file-form" layout="inline">
                <Form.Item
                  help={
                    <>
                      Or try out the{" "}
                      <button
                        className="link"
                        onClick={() => setImageUrl(EXAMPLE_IMAGE)}
                      >
                        example
                      </button>
                      .
                    </>
                  }
                  className="form-item file-form__input-wrapper"
                >
                  <Input
                    className="input file-form__input"
                    onChange={event => setImageUrl(event.target.value)}
                    placeholder="Enter image URL"
                    suffix={
                      <Tooltip title="Extra information">
                        <Icon
                          type="info-circle"
                          style={{ color: "rgba(0,0,0,.45)" }}
                        />
                      </Tooltip>
                    }
                  />
                </Form.Item>
                <Form.Item>
                  <Button className="button" type="primary">
                    Submit
                  </Button>
                </Form.Item>
              </Form>
              <p>
                Enter an image url, click anywhere on the image once it's loaded
                and your image is now turned into a 'dun dun dun' animation. For
                uploading an image from your file system, please first upload if
                to <a href="https://imgur.com/">Imgur</a> or some other image
                hosting service.
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
