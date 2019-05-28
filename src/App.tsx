import React, { useCallback, useState, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";

import * as gifshot from "gifshot";

import { Layout, Menu, Breadcrumb, Button, Icon } from "antd";

const { Header, Content, Footer } = Layout;

function getBase64(file: File) {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  return new Promise<string | null>((resolve, reject) => {
    reader.onload = function() {
      resolve(reader.result ? reader.result.toString() : null);
    };
    reader.onerror = reject;
  });
}

function getImage(base64: string) {
  const image = new Image();
  console.log(base64);

  return new Promise<HTMLImageElement>((resolve, reject) => {
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = base64;
  });
}

function Canvas({ file }: { file: string }) {
  const $canvas = useRef<HTMLCanvasElement>(null);
  const [focusPoint, setFocusPoint] = useState({ x: 0.5, y: 0.5 });

  useEffect(() => {
    let shouldLoop = true;
    let frame = 0;
    const canvas = $canvas.current!;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d")!;
    if (!ctx) {
      return;
    }

    function loop(
      image: HTMLImageElement,
      imageWidth: number,
      imageHeight: number
    ) {
      if (!shouldLoop) {
        return;
      }

      const aspect = imageHeight / imageWidth;
      // drawImage(
      //   image: CanvasImageSource,
      //   sx: number,
      //   sy: number,
      //   sw: number,
      //   sh: number,
      //   dx: number,
      //   dy: number,
      //   dw: number,
      //   dh: number): void;
      ctx.drawImage(
        image,
        0,
        0,
        imageWidth,
        imageHeight,
        0,
        0,
        800 + frame,
        800 * aspect + frame * aspect
      );
      frame++;
      window.requestAnimationFrame(() => loop(image, imageWidth, imageHeight));
    }

    async function initializeLoop() {
      const image = await getImage(file);
      const aspect = image.height / image.width;

      canvas.width = 800;
      canvas.height = 800 * aspect;

      loop(image, image.height, image.width);
    }

    initializeLoop();

    return () => {
      shouldLoop = false;
    };
  }, [$canvas]);

  return <canvas ref={$canvas} />;
}

const App: React.FC = () => {
  const [uploadedFile, setUploadedFile] = useState<string>();

  const onDrop = useCallback(async ([file]: File[]) => {
    const base64 = await getBase64(file);
    if (!base64) {
      return;
    }
    setUploadedFile(base64);
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    multiple: false,
    accept: "image/*"
  });

  return (
    <div className="App">
      <Layout className="layout">
        <Header>
          <div className="logo" />
          <Menu
            theme="dark"
            mode="horizontal"
            defaultSelectedKeys={["2"]}
            style={{ lineHeight: "64px" }}
          >
            <Menu.Item key="1">nav 1</Menu.Item>
            <Menu.Item key="2">nav 2</Menu.Item>
            <Menu.Item key="3">nav 3</Menu.Item>
          </Menu>
        </Header>
        <Content style={{ padding: "0 50px" }}>
          <Breadcrumb style={{ margin: "16px 0" }}>
            <Breadcrumb.Item>Home</Breadcrumb.Item>
            <Breadcrumb.Item>List</Breadcrumb.Item>
            <Breadcrumb.Item>App</Breadcrumb.Item>
          </Breadcrumb>
          <div style={{ background: "#fff", padding: 24, minHeight: 280 }}>
            {uploadedFile && <Canvas file={uploadedFile} />}
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              <Button>
                <Icon type="upload" /> Click to Upload
              </Button>
            </div>
          </div>
        </Content>
        <Footer style={{ textAlign: "center" }}>
          Ant Design ©2018 Created by Ant UED
        </Footer>
      </Layout>
    </div>
  );
};

export default App;
