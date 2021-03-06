import React, { useState, useEffect } from "react";
import { Layout, Button, Spin, Alert } from "antd";
import { getImage, getImageFallback, parseShareLink } from "../util";
import { Canvas } from "../components/Canvas";
import { Helmet } from "react-helmet";

export function SharedView() {
  const [previewImage, setPreviewImage] = useState<HTMLImageElement | null>(
    null
  );
  const [failed, setFailed] = useState<boolean>(false);

  const { imageUrl, focusPoint } = parseShareLink(document.location.search);

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
  }, [imageUrl]);

  return (
    <div className="App">
      <Helmet>
        <meta property="og:image" content={imageUrl} />
        <meta property="twitter:image" content={imageUrl} />
      </Helmet>
      <Layout className="layout">
        {previewImage ? (
          <Canvas
            showInstruction={false}
            showSharingControls={true}
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
                    <p>
                      Sorry about this! The URL might be broken{" "}
                      <span role="img" aria-label="shrug">
                        🤷‍
                      </span>
                    </p>

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
      <div className="footer-link">
        <a href="https://dundundun.netlify.com">DUN DUN DUN</a>
      </div>
    </div>
  );
}
