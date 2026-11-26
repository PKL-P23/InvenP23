import { icon } from './view.js';
import { readUnit, scanner } from './scanner.js';

export function transactionForm() {
  return `<div class="scan-task"><p class="scan-intro">Arahkan kamera ke label barang. Formulir terbuka otomatis saat QR terbaca.</p>
    <div class="scan-frame"><video id="scan-video" muted playsinline autoplay aria-label="Pratinjau kamera"></video><canvas class="scan-still" aria-hidden="true" hidden></canvas><span class="finder" aria-hidden="true"></span><svg class="scan-outline" aria-hidden="true" preserveAspectRatio="xMidYMid meet" hidden><polygon vector-effect="non-scaling-stroke"></polygon></svg></div>
    <p id="scan-status" class="status-msg" role="status" tabindex="-1">Menyiapkan kamera…</p>
    <div class="scan-controls"><button class="btn small" id="camera-retry" type="button" hidden>${icon('camera',17)}Aktifkan kamera</button><label class="btn small" role="button" tabindex="0" id="choose-photo">${icon('image',17)}Pilih foto QR<input id="scan-photo" type="file" accept="image/*" hidden></label></div>
<details class="manual-fallback"><summary>Masukkan kode unit</summary><form id="manual-scan" class="code-form"><label class="field" for="unit-code">Kode pada label</label><div><input id="unit-code" name="code" maxlength="24" autocapitalize="characters" autocomplete="off" placeholder="Contoh A001" required><button class="btn" type="submit">Buka aset</button></div></form></details></div>`;
}

export function transactionScanner({ state, openAsset }) {
  const root = document.querySelector('.scan-task');
  const status = root.querySelector('#scan-status'), retry = root.querySelector('#camera-retry');
  const fileInput = root.querySelector('#scan-photo');
  let closed = false, processing = false, choosingPhoto = false;
  let lastRead = '', lastReadAt = 0;
  const present = () => !closed && root.isConnected && !document.querySelector('dialog[open]');
  function note(message, phase) {
    if (!present()) return;
    if (phase) retry.hidden = phase !== 'retry' && phase !== 'photo';
    if (status.textContent !== message) status.textContent = message;
  }
  const device = scanner(raw => accept(raw, true), note);
  async function accept(raw, automatic = false) {
    if (!present() || document.hidden || processing) return false;
    if (automatic && raw === lastRead && Date.now() - lastReadAt < 1500) return false;
    lastRead = raw; lastReadAt = Date.now();
    processing = true;
    try {
      const code = readUnit(raw, state.session.baseUrl);
      openAsset(code);
      return true;
    } catch (err) {
      note(err.message);
      return false;
    } finally { processing = false; }
  }
  root.querySelector('#manual-scan').addEventListener('submit', event => {
    event.preventDefault();
    accept(root.querySelector('#unit-code').value);
  });
  retry.addEventListener('click', () => device.start());
  fileInput.addEventListener('click', () => { choosingPhoto = true; });
  fileInput.addEventListener('cancel', () => { choosingPhoto = false; resume(); });
  fileInput.addEventListener('change', () => {
    choosingPhoto = false;
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (file) device.photo(file);
  });
  function resume() { if (present() && !processing && !choosingPhoto && !document.hidden) device.start(); }
  return { start: resume, pause: () => device.pause(), stop() { closed = true; device.stop(); } };
}
