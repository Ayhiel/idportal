import {
  FilesetResolver,
  ImageSegmenter,
} from "@mediapipe/tasks-vision";

let segmenter = null;

export async function removeBackground(imageElement) {
  // Initialize once
  if (!segmenter) {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
    );

    segmenter = await ImageSegmenter.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite",
        delegate: "GPU",
      },
      outputCategoryMask: true,
    });
  }

  const result = await segmenter.segment(imageElement);
  const mask = result.categoryMask;
  const { width, height, data } = mask;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  const imageData = ctx.createImageData(width, height);

  for (let i = 0; i < data.length; i++) {
    imageData.data[i * 4 + 3] = data[i] > 0 ? 255 : 0;
  }
  ctx.putImageData(imageData, 0, 0);
  ctx.globalCompositeOperation = "source-in";
  ctx.drawImage(imageElement, 0, 0, width, height);

  return canvas.toDataURL("image/png");
}
