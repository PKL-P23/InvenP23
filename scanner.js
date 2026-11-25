let decoderPromise;
function decoder() {
  if (window.jsQR) return Promise.resolve(window.jsQR);
  if (!decoderPromise)
    decoderPromise = new Promise((done, fail) => {
      const s = document.createElement('script');
      s.src = new URL('./jsQR.js', import.meta.url).href;
      s.onload = () => done(window.jsQR);
      s.onerror = () => {
        decoderPromise = null;
        fail(new Error('Pembaca QR belum termuat.'));
      };
      document.head.append(s);
    });
  return decoderPromise;
}
export function readUnit(input, base) {
  const raw = String(input).trim();
  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(raw) && raw.length <= 24) return raw.toUpperCase();
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('QR ini tidak memuat kode unit PinjamBalik.');
  }
  // Printed labels from either Pages address identify a unit; only the code is used.
  const pagesLabel = ['https://pkl-p23.github.io', 'https://gekson0101.github.io'].includes(url.origin);
  if (pagesLabel && url.pathname === '/InvenP23/' && !url.username && !url.password) {
    const unit = /^#\/aset\/([a-z0-9-]{1,24})$/i.exec(url.hash);
    if (unit) return unit[1].toUpperCase();
  }
  if (
    ![location.origin, base].includes(url.origin) ||
    url.username ||
    url.password ||
    !/^\/aset\/[a-z0-9-]{1,24}\/?$/i.test(url.pathname)
  ) {
    throw new Error('QR ini bukan label dari ruang kerja ini.');
  }
  return url.pathname.split('/')[2].toUpperCase();
}
async function within(task, ms, message) {
  let timer;
  try {
    return await Promise.race([task, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), ms); })]);
  } finally { clearTimeout(timer); }
}
let nativePromise;
function platformDecoder() {
  if (!nativePromise) nativePromise = (async () => {
    try {
      const Detector = window.BarcodeDetector;
      if (!Detector || (Detector.getSupportedFormats && !(await Detector.getSupportedFormats()).includes('qr_code'))) return null;
      return new Detector({ formats: ['qr_code'] });
    } catch { return null; }
  })();
  return nativePromise;
}

export function scanner(onValue, onMessage) {
  const video = document.getElementById('scan-video');
  const frame = video.closest('.scan-frame');
  const outline = frame.querySelector('.scan-outline'), still = frame.querySelector('.scan-still');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  let stream = null, timer = 0, generation = 0, closed = false, live = false, opening = false;
  let native = null, nativeFailed = false, lastSeen = 0, severalVisible = false;
  platformDecoder().then(detector => { native = detector; });
  const current = id => !closed && generation === id;
  const liveHint = 'Kamera aktif. QR terbaca di seluruh pratinjau.';

  function orientPreview() {
    if (video.videoWidth && video.videoHeight)
      frame.dataset.orientation = video.videoHeight > video.videoWidth ? 'portrait' : 'landscape';
  }
  video.addEventListener('resize', orientPreview);

  function mark(found, width, height) {
    if (!found?.corners?.length) {
      if (performance.now() - lastSeen > 420) outline.setAttribute('hidden', '');
      return;
    }
    outline.setAttribute('viewBox', [0, 0, width, height].join(' '));
    outline.querySelector('polygon').setAttribute('points', found.corners.map(p => p.x + ',' + p.y).join(' '));
    outline.removeAttribute('hidden');
    lastSeen = performance.now();
  }
  function pause(keepFrame = false) {
    generation++;
    clearTimeout(timer);
    still.hidden = true;
    if (keepFrame && video.readyState >= 2 && video.videoWidth) {
      const ratio = Math.min(1, 1200 / Math.max(video.videoWidth, video.videoHeight));
      still.width = Math.round(video.videoWidth * ratio);
      still.height = Math.round(video.videoHeight * ratio);
      try {
        still.getContext('2d').drawImage(video, 0, 0, still.width, still.height);
        still.hidden = false;
      } catch { /* Capturing a still is optional once the code has been read. */ }
    } else outline.setAttribute('hidden', '');
    stream?.getTracks().forEach(track => track.stop());
    if (stream && video.srcObject === stream) video.srcObject = null;
    stream = null;
    live = false;
    opening = false;
  }
  function stop() { closed = true; video.removeEventListener('resize', orientPreview); pause(); }

  async function softwareRead(source, width, height, maxSide, inverted) {
    const decode = await decoder();
    const scale = Math.min(1, maxSide / Math.max(width, height));
    const w = Math.max(1, Math.round(width * scale)), h = Math.max(1, Math.round(height * scale));
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    ctx.drawImage(source, 0, 0, w, h);
    const pixels = ctx.getImageData(0, 0, w, h);
    const qr = decode(pixels.data, w, h, { inversionAttempts: inverted ? 'attemptBoth' : 'dontInvert' });
    if (!qr?.data) return null;
    const loc = qr.location;
    const corners = [loc.topLeftCorner, loc.topRightCorner, loc.bottomRightCorner, loc.bottomLeftCorner]
      .map(p => ({ x: p.x * width / w, y: p.y * height / h }));
    return { raw: qr.data, corners };
  }
  async function readFrame(source, width, height, attempt, isPhoto = false) {
    if (!width || !height) return null;
    if (native && !nativeFailed) {
      try {
        const codes = (await within(native.detect(source), 320, 'Pembaca perangkat belum merespons.')).filter(hit => hit.rawValue);
        if (new Set(codes.map(hit => hit.rawValue)).size > 1) return { multiple: true };
        if (codes.length) return { raw: codes[0].rawValue, corners: codes[0].cornerPoints };
        if (!isPhoto && attempt !== 1 && attempt % 3 !== 0) return null;
      } catch { nativeFailed = true; }
    }
    // Inspect the whole frame on every pass, including its edges. Periodic larger
    // samples preserve small modules and inverted labels without slowing every frame.
    if (isPhoto) {
      return await softwareRead(source, width, height, 960, false)
        || await softwareRead(source, width, height, 2200, true);
    }
    const thorough = attempt % 3 === 0;
    return softwareRead(source, width, height, thorough ? 1600 : 900, thorough);
  }
  async function start() {
    if (closed || opening || live) return;
    const id = ++generation;
    opening = true;
    still.hidden = true;
    outline.setAttribute('hidden', '');
    severalVisible = false;
    onMessage('Menunggu izin kamera…', 'starting');
    decoder().catch(() => {});
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Kamera tidak tersedia. Gunakan foto QR atau kode unit.');
      const acquired = await navigator.mediaDevices.getUserMedia({
        audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, frameRate: { ideal: 24 } },
      });
      if (!current(id)) { acquired.getTracks().forEach(track => track.stop()); return; }
      stream = acquired;
      video.srcObject = stream;
      const track = stream.getVideoTracks()[0];
      try {
        if (track?.getCapabilities?.().focusMode?.includes('continuous'))
          track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {});
      } catch { /* Focus remains automatic on cameras without adjustable focus. */ }
      video.muted = true;
      await within(video.play(), 6500, 'Pratinjau kamera belum tersedia. Aktifkan kamera kembali atau pilih foto QR.');
      if (!current(id)) return;
      orientPreview();
      live = true;
      onMessage(liveHint, 'live');
      let attempt = 0, lastTime = -1, lastSample = -1000;
      async function nextFrame() {
        if (!current(id)) return;
        const started = performance.now();
        try {
          if (video.readyState >= 2 && video.videoWidth && (video.currentTime !== lastTime || started - lastSample >= 300)) {
            lastSample = started;
            lastTime = video.currentTime;
            const width = video.videoWidth, height = video.videoHeight;
            const found = await readFrame(video, width, height, ++attempt);
            if (!current(id)) return;
            mark(found, width, height);
            if (found?.multiple) {
              if (!severalVisible) onMessage('Beberapa QR terlihat. Arahkan kamera ke satu label barang.');
              severalVisible = true;
            } else {
              if (severalVisible) onMessage(liveHint, 'live');
              severalVisible = false;
              if (found?.raw && await onValue(found.raw) && current(id)) { pause(); return; }
            }
          }
        } catch (err) { if (current(id)) onMessage(err.message); }
        if (current(id)) timer = setTimeout(nextFrame, Math.max(24, 105 - (performance.now() - started)));
      }
      nextFrame();
    } catch (err) {
      if (!current(id)) return;
      pause();
      onMessage(err.name === 'NotAllowedError' ? 'Izinkan kamera di peramban, atau gunakan foto QR.'
        : err.name === 'NotFoundError' ? 'Kamera tidak ditemukan. Gunakan foto QR atau kode unit.' : err.message, 'retry');
    } finally {
      if (current(id)) opening = false;
    }
  }
  async function photo(file) {
    if (!file || closed) return;
    if (file.size > 16 * 1024 * 1024) { onMessage('Ukuran foto maksimal 16 MB.'); return; }
    pause();
    const id = generation, image = new Image(), address = URL.createObjectURL(file);
    onMessage('Membaca foto QR…', 'photo');
    try {
      await new Promise((ok, fail) => {
        image.onload = ok;
        image.onerror = () => fail(new Error('Foto tidak dapat dibaca.'));
        image.src = address;
      });
      if (!current(id)) return;
      const found = await readFrame(image, image.naturalWidth, image.naturalHeight, 1, true);
      if (!current(id)) return;
      if (found?.multiple) onMessage('Pilih foto yang hanya menampilkan satu label barang.', 'retry');
      else if (found?.raw) await onValue(found.raw);
      else onMessage('QR belum terbaca. Pilih foto yang lebih jelas.', 'retry');
    } catch (err) {
      if (current(id)) onMessage(err.message, 'retry');
    } finally { URL.revokeObjectURL(address); }
  }
  return { start, pause, stop, photo };
}
