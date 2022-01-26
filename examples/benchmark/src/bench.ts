// @webtoon/psd
// Copyright 2021-present NAVER WEBTOON
// MIT License

import * as AgPsd from "ag-psd";
import Psd from "../../../src";

// Use the require() function provided by the browser bundle of PSD.js
// Because TypeScript prevents us from calling `require()` inside an ESM module,
// we must call `globalThis.require()` instead
const PsdJs = globalThis.require("psd") as typeof import("./psd-js");

export interface BenchmarkResult {
  parseTime: number;
  imageRenderTime: number;
  layerRenderTime: number;
}

export function benchmarkPsdJs(arrayBuffer: ArrayBuffer): BenchmarkResult {
  const parseBegin = performance.now();
  const psd = new PsdJs(new Uint8Array(arrayBuffer));
  psd.parse();
  psd.tree().export(); // trigger all getters
  const parseEnd = performance.now();

  const imageRenderBegin = performance.now();
  psd.image.pixelData; // trigger getter
  const imageRenderEnd = performance.now();

  const layerRenderBegin = performance.now();
  // trigger getters
  psd
    .tree()
    .descendants()
    .forEach((node) => node.type === "layer" && node.layer.image.pixelData);
  const layerRenderEnd = performance.now();

  return {
    parseTime: parseEnd - parseBegin,
    imageRenderTime: imageRenderEnd - imageRenderBegin,
    layerRenderTime: layerRenderEnd - layerRenderBegin,
  };
}

export function benchmarkPsdTs(
  arrayBuffer: ArrayBuffer,
  options: {applyOpacity: boolean}
): BenchmarkResult {
  const parseBegin = performance.now();
  const psd = Psd.parse(arrayBuffer);
  const parseEnd = performance.now();

  const imageRenderBegin = performance.now();
  psd.composite(options.applyOpacity);
  const imageRenderEnd = performance.now();

  const layerRenderBegin = performance.now();
  psd.layers.forEach((layer) => layer.composite(options.applyOpacity));
  const layerRenderEnd = performance.now();

  return {
    parseTime: parseEnd - parseBegin,
    imageRenderTime: imageRenderEnd - imageRenderBegin,
    layerRenderTime: layerRenderEnd - layerRenderBegin,
  };
}

export function benchmarkAgPsd(arrayBuffer: ArrayBuffer): BenchmarkResult {
  const parseBegin = performance.now();
  AgPsd.readPsd(arrayBuffer, {
    skipCompositeImageData: true,
    skipLayerImageData: true,
    skipThumbnail: true,
    useImageData: true,
  });
  const parseEnd = performance.now();

  // ag-psd does not provide APIs for decoding the merged image separately.
  // Instead, we measure (parse time + merged image decoding time) and subtract
  // the parse time. This is probably inaccurate.
  const parseAndImageRenderBegin = performance.now();
  AgPsd.readPsd(arrayBuffer, {
    skipLayerImageData: true,
    skipThumbnail: true,
    useImageData: true,
  });
  const parseAndImageRenderEnd = performance.now();

  // ag-psd does not provide APIs for decoding each layer image separately.
  // Instead, we measure (parse time + all layer decoding time) and subtract
  // the parse time. This is probably inaccurate.
  const parseAndLayerRenderBegin = performance.now();
  AgPsd.readPsd(arrayBuffer, {
    skipCompositeImageData: true,
    skipThumbnail: true,
    useImageData: true,
  });
  const parseAndLayerRenderEnd = performance.now();

  const parseTime = parseEnd - parseBegin;

  return {
    parseTime,
    imageRenderTime:
      parseAndImageRenderEnd - parseAndImageRenderBegin - parseTime,
    layerRenderTime:
      parseAndLayerRenderEnd - parseAndLayerRenderBegin - parseTime,
  };
}
