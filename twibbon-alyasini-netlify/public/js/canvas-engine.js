/**
 * Canvas Twibbon Engine
 * Supports drag & pan, pinch-to-zoom (touch gestures), mouse controls,
 * rotation, and high-resolution composite export.
 */
class TwibbonEngine {
  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.options = Object.assign({
      exportResolution: 1080,
      minScale: 0.2,
      maxScale: 5.0,
      onPhotoLoaded: null,
      onTransformChange: null
    }, options);

    this.frameImage = null;
    this.userImage = null;

    // Transformation states of user photo
    this.transform = {
      x: 0,
      y: 0,
      scale: 1,
      rotationDeg: 0,
      flipped: false
    };

    // Interaction states
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.initialTransform = null;
    this.activeTouches = new Map();
    this.initialPinchDistance = null;
    this.initialPinchScale = 1;

    this.setupCanvasDpi();
    this.initEventListeners();
  }

  setupCanvasDpi() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    const size = rect.width || 440;

    this.displayWidth = size;
    this.displayHeight = size;

    this.canvas.width = size * dpr;
    this.canvas.height = size * dpr;
    this.ctx.scale(dpr, dpr);
  }

  loadFrame(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.frameImage = img;
        this.options.exportResolution = Math.max(img.naturalWidth || 1080, 1080);
        this.render();
        resolve(img);
      };
      img.onerror = (err) => {
        console.error('Gagal memuat bingkai twibbon:', url, err);
        reject(err);
      };
      img.src = url;
    });
  }

  loadUserPhoto(fileOrUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      const handleLoaded = () => {
        this.userImage = img;
        this.resetTransform();
        this.render();
        if (this.options.onPhotoLoaded) {
          this.options.onPhotoLoaded(img);
        }
        resolve(img);
      };

      if (typeof fileOrUrl === 'string') {
        img.onload = handleLoaded;
        img.onerror = reject;
        img.src = fileOrUrl;
      } else if (fileOrUrl instanceof File || fileOrUrl instanceof Blob) {
        const reader = new FileReader();
        reader.onload = (e) => {
          img.onload = handleLoaded;
          img.onerror = reject;
          img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(fileOrUrl);
      }
    });
  }

  resetTransform() {
    if (!this.userImage) return;

    const w = this.displayWidth || 440;
    const h = this.displayHeight || 440;

    // Calculate initial scale to comfortably cover the central frame area
    const imgRatio = this.userImage.naturalWidth / this.userImage.naturalHeight;
    let initialScale = 1;

    if (imgRatio >= 1) {
      initialScale = h / this.userImage.naturalHeight;
    } else {
      initialScale = w / this.userImage.naturalWidth;
    }

    this.transform = {
      x: w / 2,
      y: h / 2,
      scale: initialScale * 0.9,
      rotationDeg: 0,
      flipped: false
    };

    if (this.options.onTransformChange) {
      this.options.onTransformChange(this.transform);
    }
    this.render();
  }

  setScale(newScale) {
    this.transform.scale = Math.min(Math.max(newScale, this.options.minScale), this.options.maxScale);
    if (this.options.onTransformChange) {
      this.options.onTransformChange(this.transform);
    }
    this.render();
  }

  zoomBy(deltaRatio) {
    this.setScale(this.transform.scale * deltaRatio);
  }

  rotateBy(degrees) {
    this.transform.rotationDeg = (this.transform.rotationDeg + degrees) % 360;
    if (this.options.onTransformChange) {
      this.options.onTransformChange(this.transform);
    }
    this.render();
  }

  flipHorizontal() {
    this.transform.flipped = !this.transform.flipped;
    if (this.options.onTransformChange) {
      this.options.onTransformChange(this.transform);
    }
    this.render();
  }

  initEventListeners() {
    window.addEventListener('resize', () => {
      this.setupCanvasDpi();
      this.render();
    });

    const el = this.canvas;

    // --- MOUSE EVENTS ---
    el.addEventListener('mousedown', (e) => {
      if (!this.userImage) return;
      this.isDragging = true;
      this.dragStart = { x: e.clientX, y: e.clientY };
      this.initialTransform = { ...this.transform };
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging || !this.userImage) return;
      const dx = e.clientX - this.dragStart.x;
      const dy = e.clientY - this.dragStart.y;
      this.transform.x = this.initialTransform.x + dx;
      this.transform.y = this.initialTransform.y + dy;
      this.render();
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    // Wheel zoom
    el.addEventListener('wheel', (e) => {
      if (!this.userImage) return;
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      this.zoomBy(zoomFactor);
    }, { passive: false });

    // --- TOUCH GESTURES (DRAG & PINCH-TO-ZOOM) ---
    el.addEventListener('touchstart', (e) => {
      if (!this.userImage) return;
      e.preventDefault();

      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        this.activeTouches.set(t.identifier, { x: t.clientX, y: t.clientY });
      }

      if (e.touches.length === 1) {
        // Single touch: pan / drag
        this.isDragging = true;
        this.dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        this.initialTransform = { ...this.transform };
      } else if (e.touches.length === 2) {
        // Two fingers: pinch zoom
        this.isDragging = false;
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        this.initialPinchDistance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        this.initialPinchScale = this.transform.scale;
      }
    }, { passive: false });

    el.addEventListener('touchmove', (e) => {
      if (!this.userImage) return;
      e.preventDefault();

      if (e.touches.length === 1 && this.isDragging) {
        // Drag
        const dx = e.touches[0].clientX - this.dragStart.x;
        const dy = e.touches[0].clientY - this.dragStart.y;
        this.transform.x = this.initialTransform.x + dx;
        this.transform.y = this.initialTransform.y + dy;
        this.render();
      } else if (e.touches.length === 2 && this.initialPinchDistance) {
        // Pinch
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const currentDistance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const ratio = currentDistance / this.initialPinchDistance;
        this.setScale(this.initialPinchScale * ratio);
      }
    }, { passive: false });

    const handleTouchEnd = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        this.activeTouches.delete(e.changedTouches[i].identifier);
      }
      if (e.touches.length === 0) {
        this.isDragging = false;
        this.initialPinchDistance = null;
      } else if (e.touches.length === 1) {
        // Switch back to single finger drag smoothly
        this.isDragging = true;
        this.dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        this.initialTransform = { ...this.transform };
        this.initialPinchDistance = null;
      }
    };

    el.addEventListener('touchend', handleTouchEnd);
    el.addEventListener('touchcancel', handleTouchEnd);
  }

  render() {
    const ctx = this.ctx;
    const w = this.displayWidth;
    const h = this.displayHeight;

    ctx.clearRect(0, 0, w, h);

    // 1. Draw subtle background behind user photo
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, 0, w, h);

    // 2. Draw user's photo with transform (Layer underneath)
    if (this.userImage) {
      ctx.save();
      ctx.translate(this.transform.x, this.transform.y);
      ctx.rotate((this.transform.rotationDeg * Math.PI) / 180);
      ctx.scale(
        this.transform.flipped ? -this.transform.scale : this.transform.scale,
        this.transform.scale
      );

      const imgW = this.userImage.naturalWidth;
      const imgH = this.userImage.naturalHeight;
      ctx.drawImage(this.userImage, -imgW / 2, -imgH / 2, imgW, imgH);
      ctx.restore();
    }

    // 3. Draw Twibbon Frame overlay (Layer on top!)
    if (this.frameImage) {
      ctx.drawImage(this.frameImage, 0, 0, w, h);
    }
  }

  /**
   * Generates high-resolution composite canvas (e.g. 1080x1080 or native frame size)
   */
  generateExportCanvas() {
    const exportSize = this.options.exportResolution || 1080;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = exportSize;
    exportCanvas.height = exportSize;
    const expCtx = exportCanvas.getContext('2d');

    // Fill white background for final image
    expCtx.fillStyle = '#ffffff';
    expCtx.fillRect(0, 0, exportSize, exportSize);

    const scaleFactor = exportSize / (this.displayWidth || 440);

    // 1. Draw user photo scaled to full resolution
    if (this.userImage) {
      expCtx.save();
      expCtx.translate(this.transform.x * scaleFactor, this.transform.y * scaleFactor);
      expCtx.rotate((this.transform.rotationDeg * Math.PI) / 180);
      expCtx.scale(
        this.transform.flipped ? -this.transform.scale * scaleFactor : this.transform.scale * scaleFactor,
        this.transform.scale * scaleFactor
      );

      const imgW = this.userImage.naturalWidth;
      const imgH = this.userImage.naturalHeight;
      expCtx.drawImage(this.userImage, -imgW / 2, -imgH / 2, imgW, imgH);
      expCtx.restore();
    }

    // 2. Draw Twibbon Frame overlay at full native resolution
    if (this.frameImage) {
      expCtx.drawImage(this.frameImage, 0, 0, exportSize, exportSize);
    }

    return exportCanvas;
  }

  /**
   * Export as Blob (PNG or JPEG)
   */
  exportBlob(type = 'image/png', quality = 0.95) {
    return new Promise((resolve) => {
      const exportCanvas = this.generateExportCanvas();
      exportCanvas.toBlob((blob) => {
        resolve(blob);
      }, type, quality);
    });
  }

  /**
   * Export as Data URL
   */
  exportDataUrl(type = 'image/png', quality = 0.95) {
    const exportCanvas = this.generateExportCanvas();
    return exportCanvas.toDataURL(type, quality);
  }
}

window.TwibbonEngine = TwibbonEngine;
