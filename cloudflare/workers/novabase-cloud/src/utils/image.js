import jpeg from "jpeg-js";

export function detectFormat(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) return "webp";
  return null;
}

function calculateTransform(srcW, srcH, dstW, dstH, fit) {
  if (fit === "cover") {
    const srcRatio = srcW / srcH;
    const dstRatio = dstW / dstH;
    let cropW, cropH;
    if (srcRatio > dstRatio) {
      cropH = srcH;
      cropW = Math.round(srcH * dstRatio);
    } else {
      cropW = srcW;
      cropH = Math.round(srcW / dstRatio);
    }
    const offsetX = Math.round((srcW - cropW) / 2);
    const offsetY = Math.round((srcH - cropH) / 2);
    return { cropX: offsetX, cropY: offsetY, cropW, cropH, resizeW: dstW, resizeH: dstH };
  }
  if (fit === "scale-down" && srcW <= dstW && srcH <= dstH) {
    return { cropX: 0, cropY: 0, cropW: srcW, cropH: srcH, resizeW: srcW, resizeH: srcH };
  }
  const srcRatio = srcW / srcH;
  const dstRatio = dstW / dstH;
  let resizeW, resizeH;
  if (srcRatio > dstRatio) {
    resizeW = dstW;
    resizeH = Math.round(dstW / srcRatio);
  } else {
    resizeH = dstH;
    resizeW = Math.round(dstH * srcRatio);
  }
  return { cropX: 0, cropY: 0, cropW: srcW, cropH: srcH, resizeW, resizeH };
}

function cropData(data, srcW, srcH, x) {
  if (x.cropX === 0 && x.cropY === 0 && x.cropW === srcW && x.cropH === srcH) return data;
  const out = new Uint8Array(x.cropW * x.cropH * 4);
  for (let y = 0; y < x.cropH; y++) {
    for (let px = 0; px < x.cropW; px++) {
      const si = ((x.cropY + y) * srcW + (x.cropX + px)) * 4;
      const di = (y * x.cropW + px) * 4;
      out[di] = data[si];
      out[di + 1] = data[si + 1];
      out[di + 2] = data[si + 2];
      out[di + 3] = data[si + 3];
    }
  }
  return out;
}

function bilinearResize(data, srcW, srcH, dstW, dstH) {
  const src = new Uint8Array(data);
  const dst = new Uint8Array(dstW * dstH * 4);
  const xRatio = srcW / dstW;
  const yRatio = srcH / dstH;
  for (let dy = 0; dy < dstH; dy++) {
    for (let dx = 0; dx < dstW; dx++) {
      const sx = dx * xRatio;
      const sy = dy * yRatio;
      const ix = Math.floor(sx);
      const iy = Math.floor(sy);
      const fx = sx - ix;
      const fy = sy - iy;
      const x1 = Math.min(ix + 1, srcW - 1);
      const y1 = Math.min(iy + 1, srcH - 1);
      for (let c = 0; c < 4; c++) {
        const p00 = src[(iy * srcW + ix) * 4 + c];
        const p10 = src[(iy * srcW + x1) * 4 + c];
        const p01 = src[(y1 * srcW + ix) * 4 + c];
        const p11 = src[(y1 * srcW + x1) * 4 + c];
        const top = p00 + (p10 - p00) * fx;
        const bot = p01 + (p11 - p01) * fx;
        dst[(dy * dstW + dx) * 4 + c] = Math.round(top + (bot - top) * fy);
      }
    }
  }
  return dst;
}

function chooseOutputFormat(inputFmt, requested) {
  if (requested === "jpeg" || requested === "jpg") return "jpeg";
  if (requested === "png") return "png";
  return "jpeg";
}

export async function processImage(inputBytes, options = {}) {
  const width = parseInt(options.width) || 128;
  const height = parseInt(options.height) || 128;
  const quality = parseInt(options.quality) || 80;
  const format = options.format || "jpeg";
  const fit = options.fit || "cover";
  const raw = new Uint8Array(inputBytes);
  const inputFmt = detectFormat(raw);
  if (!inputFmt) throw new Error("Unsupported image format");

  let imgData, imgW, imgH;
  if (inputFmt === "jpeg") {
    const dec = jpeg.decode(raw, { useTArray: true });
    imgW = dec.width;
    imgH = dec.height;
    imgData = new Uint8Array(dec.data);
  } else {
    throw new Error(`Input format "${inputFmt}" not supported`);
  }

  const xform = calculateTransform(imgW, imgH, width, height, fit);
  let working = imgData;
  if (xform.cropW !== imgW || xform.cropH !== imgH) {
    working = cropData(imgData, imgW, imgH, xform);
  }
  if (xform.resizeW !== xform.cropW || xform.resizeH !== xform.cropH) {
    working = bilinearResize(working, xform.cropW, xform.cropH, xform.resizeW, xform.resizeH);
  }

  const resizedW = xform.resizeW;
  const resizedH = xform.resizeH;
  const outputFmt = chooseOutputFormat(inputFmt, format);
  let outputBytes, contentType;

  if (outputFmt === "jpeg") {
    const buf = jpeg.encode({ data: working, width: resizedW, height: resizedH }, quality);
    outputBytes = new Uint8Array(buf.data);
    contentType = "image/jpeg";
  } else {
    throw new Error(`Output format "${outputFmt}" not supported`);
  }

  return { bytes: outputBytes, contentType };
}
