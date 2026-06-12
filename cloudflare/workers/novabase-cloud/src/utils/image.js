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
  const srcRatio = srcW / srcH;
  const dstRatio = dstW / dstH;
  let resizeW, resizeH;
  if (srcRatio > dstRatio) {
    resizeW = Math.min(srcW, dstW);
    resizeH = Math.round(resizeW / srcRatio);
  } else {
    resizeH = Math.min(srcH, dstH);
    resizeW = Math.round(resizeH * srcRatio);
  }
  return { cropX: 0, cropY: 0, cropW: srcW, cropH: srcH, resizeW, resizeH };
}

function cropData(data, srcW, srcH, x) {
  if (x.cropX === 0 && x.cropY === 0 && x.cropW === srcW && x.cropH === srcH) return data;
  const out = new Uint8Array(x.cropW * x.cropH * 4);
  for (let y = 0; y < x.cropH; y++) {
    const srcRowStart = ((x.cropY + y) * srcW + x.cropX) * 4;
    const dstRowStart = y * x.cropW * 4;
    out.set(data.subarray(srcRowStart, srcRowStart + x.cropW * 4), dstRowStart);
  }
  return out;
}

function bilinearResize(data, srcW, srcH, dstW, dstH) {
  const dst = new Uint8Array(dstW * dstH * 4);
  const xRatio = (srcW - 1) / dstW;
  const yRatio = (srcH - 1) / dstH;
  
  for (let dy = 0; dy < dstH; dy++) {
    const sy = dy * yRatio;
    const iy = Math.floor(sy);
    const fy = sy - iy;
    const y1 = iy + 1;
    
    for (let dx = 0; dx < dstW; dx++) {
      const sx = dx * xRatio;
      const ix = Math.floor(sx);
      const fx = sx - ix;
      const x1 = ix + 1;

      const idx00 = (iy * srcW + ix) * 4;
      const idx10 = (iy * srcW + x1) * 4;
      const idx01 = (y1 * srcW + ix) * 4;
      const idx11 = (y1 * srcW + x1) * 4;
      const dstIdx = (dy * dstW + dx) * 4;

      for (let c = 0; c < 4; c++) {
        const p00 = data[idx00 + c];
        const p10 = data[idx10 + c];
        const p01 = data[idx01 + c];
        const p11 = data[idx11 + c];
        
        const top = p00 + (p10 - p00) * fx;
        const bot = p01 + (p11 - p01) * fx;
        dst[dstIdx + c] = (top + (bot - top) * fy) | 0;
      }
    }
  }
  return dst;
}

export async function processImage(inputBytes, options = {}) {
  // Protection against too large images in a worker environment
  if (inputBytes.byteLength > 20 * 1024 * 1024) {
    throw new Error("Source image too large (max 20MB)");
  }

  const width = Math.min(parseInt(options.width) || 128, 512);
  const height = Math.min(parseInt(options.height) || 128, 512);
  const quality = Math.min(Math.max(parseInt(options.quality) || 80, 10), 100);
  const fit = options.fit || "cover";
  
  const raw = new Uint8Array(inputBytes);
  const inputFmt = detectFormat(raw);
  if (inputFmt !== "jpeg") {
    // For now, if not JPEG, we just return the original if it's small, 
    // or throw if we strictly wanted a thumbnail.
    // In a real worker, we'd use a WASM-based resizer for PNG/WebP.
    throw new Error(`Input format "${inputFmt || "unknown"}" not supported for processing`);
  }

  let dec;
  try {
    dec = jpeg.decode(raw, { useTArray: true, formatAsRGBA: true });
  } catch (e) {
    throw new Error("Failed to decode JPEG: " + e.message);
  }

  const imgW = dec.width;
  const imgH = dec.height;
  
  // Prevent OOM for very high resolution images
  if (imgW * imgH > 4096 * 4096) {
    throw new Error("Resolution too high");
  }

  const xform = calculateTransform(imgW, imgH, width, height, fit);
  let working = dec.data;

  if (xform.cropW !== imgW || xform.cropH !== imgH) {
    working = cropData(working, imgW, imgH, xform);
  }

  if (xform.resizeW !== xform.cropW || xform.resizeH !== xform.cropH) {
    working = bilinearResize(working, xform.cropW, xform.cropH, xform.resizeW, xform.resizeH);
  }

  const buf = jpeg.encode({
    data: working,
    width: xform.resizeW,
    height: xform.resizeH
  }, quality);

  return { bytes: new Uint8Array(buf.data), contentType: "image/jpeg" };
}
