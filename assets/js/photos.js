/* WOLFPACK newsletter — photo intake.
 * Classic script: exposes window.WP.photos.
 * Resizes in a canvas (max 1600 px long edge, JPEG 0.82) so bundles stay small,
 * honouring EXIF orientation where the browser supports it.
 */
(function () {
  "use strict";
  const WP = (window.WP = window.WP || {});

  const MAX_EDGE = 1600;
  const QUALITY = 0.82;

  function loadBitmap(file) {
    if (window.createImageBitmap) {
      return createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => createImageBitmap(file));
    }
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read image")); };
      img.src = url;
    });
  }

  /** File -> data URL (JPEG), resized. */
  async function fromFile(file, opts) {
    opts = opts || {};
    if (!file || !/^image\//.test(file.type)) throw new Error("Please choose an image file (JPG, PNG, WEBP, HEIC is not supported).");
    const bmp = await loadBitmap(file);
    const w = bmp.width, h = bmp.height;
    const maxEdge = opts.maxEdge || MAX_EDGE;
    const k = Math.min(1, maxEdge / Math.max(w, h));
    const cw = Math.round(w * k), ch = Math.round(h * k);
    const canvas = document.createElement("canvas");
    canvas.width = cw; canvas.height = ch;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cw, ch);   // flatten PNG alpha
    ctx.drawImage(bmp, 0, 0, cw, ch);
    if (bmp.close) bmp.close();
    return canvas.toDataURL("image/jpeg", opts.quality || QUALITY);
  }

  /** Approximate bytes of a data URL. */
  function bytesOf(dataUrl) {
    const i = (dataUrl || "").indexOf(",");
    return i < 0 ? 0 : Math.floor((dataUrl.length - i - 1) * 3 / 4);
  }

  function human(bytes) {
    return bytes > 1048576 ? (bytes / 1048576).toFixed(1) + " MB" : Math.round(bytes / 1024) + " KB";
  }

  WP.photos = { fromFile, bytesOf, human, MAX_EDGE, QUALITY };
})();
