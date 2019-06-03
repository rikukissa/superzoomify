import React, { useState, useEffect } from "react";
import { Layout, Icon, Input, Tooltip, Button, Form, Spin } from "antd";

import { IFocusPoint } from "./effects/superzoom";

import Title from "antd/lib/typography/Title";
import { getImageFallback, getImage } from "./util";
import { SharedView } from "./views/SharedView";
import { Canvas } from "./components/Canvas";

const { Content } = Layout;
const EXAMPLE_IMAGE = "https://i.imgur.com/lpNKAwP.jpg";

const App: React.FC = () => {
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [focusPoint, setFocusPoint] = useState<IFocusPoint>();
  const [previewImage, setPreviewImage] = useState<HTMLImageElement | null>(
    null
  );

  async function submitImage() {
    setLoading(true);
    try {
      const file = await getImage(imageUrl).catch(err =>
        getImageFallback(imageUrl)
      );
      setImage(file);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      console.log(error);

      setError(true);
    }
  }

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitImage();
  }

  function useExample() {
    setImageUrl(EXAMPLE_IMAGE);
    submitImage();
  }

  function updateImageUrl(url: string) {
    setError(false);
    setImageUrl(url);
  }

  function clearImage() {
    setImageUrl("");
    setImage(null);
  }

  useEffect(() => {
    async function loadPreviewImage() {
      setPreviewImage(await getImageFallback(EXAMPLE_IMAGE));
      window.setTimeout(() => setFocusPoint({ x: 0.4, y: 0.4 }), 1000);
    }
    loadPreviewImage();
  }, []);

  const isShared = document.location.pathname.indexOf("/i/") === 0;
  if (isShared) {
    return <SharedView />;
  }

  let inputSuffix: JSX.Element | null = null;

  if (error) {
    inputSuffix = (
      <Tooltip title="This image isn't loading 😞. Check the URL or try to upload it to some other service.">
        <Icon type="exclamation-circle" className="load-error" />
      </Tooltip>
    );
  }

  if (loading) {
    inputSuffix = <Spin size="small" />;
  }

  return (
    <div className="App">
      <Layout className="layout">
        {!image && (
          <Content className="content content--index">
            <div className="modal">
              <div className="modal-example">
                {previewImage && (
                  <Canvas
                    showInstruction={false}
                    showSharingControls={false}
                    image={previewImage}
                    focusPoint={focusPoint}
                  />
                )}
              </div>
              <Title className="title">DUN DUN DUN!</Title>
              <strong>Make it more dramatic!</strong>
              <Form className="file-form" layout="inline" onSubmit={submitForm}>
                <Form.Item
                  help={
                    <>
                      Or try out the{" "}
                      <button className="link" onClick={useExample}>
                        example
                      </button>
                      .
                    </>
                  }
                  className="form-item file-form__input-wrapper"
                >
                  <Input
                    className="input file-form__input"
                    value={imageUrl}
                    onChange={event => updateImageUrl(event.target.value)}
                    placeholder="Enter image URL"
                    suffix={inputSuffix}
                  />
                </Form.Item>
                <Form.Item>
                  <Button htmlType="submit" className="button" type="primary">
                    Submit
                  </Button>
                </Form.Item>
              </Form>
              <p>
                Enter an image url, click anywhere on the image once it's loaded
                and your image is now turned into a 'DUN DUN DUN' animation. For
                uploading an image from your file system, please first upload it
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
