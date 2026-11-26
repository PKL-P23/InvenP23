import { pageHref, serviceOrigin, routePath } from './hosting.js';
import { loanStage, stageLabels, latestEvent } from './workflow.js';
import { icon, esc, dt, assetPath, stamp, empty, statuses, dutyCodeField } from './view.js';
import {
  shell,
  sections,
  inventory,
  lending,
  historyPage,
  labels,
  matchingLabelAssets,
  assetDetail,
  adminPage,
  paperLabel,
  assetUrl,
} from './pages.js?v=short-2';
import { transactionForm, transactionScanner } from './transaction.js?v=short-1';

const $ = (s) => document.querySelector(s),
  modal = $('#modal');
const filter = () => ({ q: '', status: 'all', page: 1, from: '', to: '' });
const catalogFilter = () => ({ ...filter(), category: 'all', pageSize: '50' });
const c = {
  data: null,
  etag: null,
  session: { admin: null, baseUrl: serviceOrigin },
  filters: { approvals: { page: 1 }, inventory: catalogFilter(), lending: catalogFilter(), adminCatalog: catalogFilter(), history: filter(), labels: { ...filter(), category: 'all' } },
  byCode: new Map(),
  active: new Map(),
  audit: [],
  offline: false,
};
const pendingKey = 'InvenP23.pending.v1';
const readPending = () => {
  try {
    return JSON.parse(sessionStorage.getItem(pendingKey)) || null;
  } catch {
    return null;
  }
};
let pending = readPending(),
  busy = false,
  camera = null,
  toastTimer = 0,
  latestFetch = 0,
  polling = false,
  shownDay = '';
$('#shell').innerHTML = shell();
const page = $('#page'), bottomNav = $('.mobile-nav'), navHome = bottomNav.parentElement;
// Some phone browsers resize only the visual viewport when the keyboard opens.
function fitNavigationToViewport() {
  const viewport = window.visualViewport;
  if (!viewport) return;
  const covered = Math.abs(viewport.scale - 1) < 0.01 ? Math.max(0, innerHeight - viewport.height) : 0;
  const top = Math.min(covered, Math.max(0, viewport.offsetTop));
  document.documentElement.style.setProperty('--visible-top', Math.round(top) + 'px');
  document.documentElement.style.setProperty('--covered-bottom', Math.round(covered - top) + 'px');
}
window.visualViewport?.addEventListener('resize', fitNavigationToViewport);
window.visualViewport?.addEventListener('scroll', fitNavigationToViewport);
window.addEventListener('resize', fitNavigationToViewport);
fitNavigationToViewport();

function keepPending(p) {
  pending = p;
  try {
    if (p) sessionStorage.setItem(pendingKey, JSON.stringify(p));
    else sessionStorage.removeItem(pendingKey);
  } catch {
    /* in-memory recovery remains available */
  }
}
function toast(message) {
  const el = $('#notice');
  el.textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.textContent = ''), 4300);
}
function route() {
  return routePath(location.hash);
}
function navigate(path) {
  if (path === '/pengelola') { location.assign(pageHref(path)); return; }
  if (route() !== path) history.pushState(null, '', pageHref(path));
  closeDialog();
  hideMenu();
  render(false);
  window.scrollTo(0, 0);
  page.focus({ preventScroll: true });
  if (path.startsWith('/aset/')) void refresh(true);
  if (route() === '/pengelola' && c.session.admin) fetchAudit();
}
function hideMenu() {
  document.body.classList.remove('menu-open');
  $('#menu-toggle').setAttribute('aria-expanded', 'false');
  $('.workspace').inert = false;
}
function menu() {
  if (document.body.classList.contains('menu-open')) {
    hideMenu();
    $('#menu-toggle').focus();
    return;
  }
  document.body.classList.add('menu-open');
  $('#menu-toggle').setAttribute('aria-expanded', 'true');
  $('.workspace').inert = true;
  $('#sidebar .drawer-close').focus();
}
async function api(url, options = {}) {
  const res = await fetch(new URL(url, serviceOrigin), { credentials: 'omit', cache: 'no-store', ...options });
  const value = await res.json();
  if (!res.ok) {
    const err = new Error(value.error || 'Permintaan gagal.');
    err.status = res.status;
    throw err;
  }
  return value;
}
async function post(url, data) {
  return api(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Rak-Form': 'v1' },
    body: JSON.stringify(data),
  });
}
async function refresh(force = false) {
  const order = ++latestFetch, controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6500);
  try {
    const res = await fetch(serviceOrigin + '/api/state', {
      credentials: 'omit',
      signal: controller.signal,
      cache: 'no-store',
      headers: !force && c.etag ? { 'If-None-Match': c.etag } : {},
    });
    if (order < latestFetch) return;
    const wasOffline = c.offline;
    if (res.status === 304) {
      c.offline = false;
      if (wasOffline || shownDay !== dt(new Date().toISOString(), { day: 'numeric' })) render();
      return;
    }
    if (!res.ok) throw new Error();
    const data = await res.json();
    if (order < latestFetch || (c.data && data.version < c.data.version)) return;
    c.offline = false;
    c.data = data;
    c.etag = res.headers.get('ETag');
    c.byCode = new Map();
    for (const asset of data.assets) {
      asset.originalCode = asset.code;
      asset.code = asset.short_code || asset.code;
      c.byCode.set(asset.originalCode, asset);
      c.byCode.set(asset.code, asset);
    }
    const orderByGroup = 'ANTL';
    data.assets.sort((a, b) => orderByGroup.indexOf(a.code[0]) - orderByGroup.indexOf(b.code[0]) ||
      Number(a.code.slice(1)) - Number(b.code.slice(1)));
    for (const loan of data.loans) loan.asset_code = c.byCode.get(loan.asset_code)?.code || loan.asset_code;
    c.active = new Map(data.loans.filter((l) => !l.returned_at).map((l) => [l.asset_code, l]));
    render();
  } catch {
    if (order !== latestFetch) return;
    const previously = c.offline;
    c.offline = true;
    if (!previously || !c.data) render();
  } finally { clearTimeout(timeout); }
}
async function fetchAudit() {
  try {
    c.audit = await api('/api/admin/audit');
    if (route() === '/pengelola') render();
  } catch (err) {
    if (err.status === 403) {
      c.session.admin = null;
      render();
    }
  }
}
const routeName = (p) =>
  p.startsWith('/aset/')
    ? 'Detail aset'
    : p === '/pengelola'
      ? 'Pengelola'
      : p === '/pindai' ? 'Pindai QR' : sections.find((s) => s[0] === (p === '/riwayat' ? '/' : p))?.[1] || 'Dashboard';
function capture() {
  const el = document.activeElement;
  const form = page.querySelector('form[data-key]');
  return {
    focus: page.contains(el)
      ? {
          id: el.id,
          name: el.name,
          action: el.getAttribute('data-filter'),
          start: el.selectionStart ?? null,
          end: el.selectionEnd ?? null,
        }
      : null,
    key: form && (form.dataset.key || form.dataset.form),
    values: form ? Object.fromEntries(new FormData(form)) : {},
  };
}
function restore(s) {
  if (!s) return;
  const form = page.querySelector('form[data-key]');
  if (form && s.key === (form.dataset.key || form.dataset.form))
    for (const [k, v] of Object.entries(s.values)) {
      if (form.elements[k]) form.elements[k].value = v;
    }
  if (!s.focus) return;
  const f = s.focus,
    el = f.id
      ? document.getElementById(f.id)
      : f.name
        ? form?.elements[f.name]
        : f.action
          ? page.querySelector('[data-filter="' + f.action + '"]')
          : null;
  if (el) {
    el.focus({ preventScroll: true });
    if (f.start !== null && el.setSelectionRange)
      try {
        el.setSelectionRange(f.start, f.end);
      } catch {}
  }
}
function render(preserve = true) {
  if (route() === '/pengelola') { location.replace(pageHref('/pengelola')); return; }
  const memory = preserve ? capture() : null,
    p = route(),
    name = routeName(p);
  shownDay = dt(new Date().toISOString(), { day: 'numeric' });
  $('#crumb-title').textContent = name;
  $('#top-date').textContent = dt(new Date().toISOString(), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  $('#demo-tag').innerHTML = c.data?.demo ? '<span class="demo-tag"><i></i>Data contoh</span>' : '';
  $('#profile-name').innerHTML = c.session.admin
    ? esc(c.session.admin) + '<small>Akun pengelola</small>'
    : 'Pengunjung<small>Akses melalui tautan</small>';
  document.querySelectorAll('.nav-item').forEach((el) => {
    const path = el.origin === location.origin ? routePath(el.hash) : null;
    const active = path === p || (p === '/riwayat' && path === '/') || (p.startsWith('/aset/') && path === '/peminjaman') || (p === '/pindai' && path === '/inventaris');
    if (active) el.setAttribute('aria-current', 'page');
    else el.removeAttribute('aria-current');
  });
  document.body.classList.toggle('home-screen', p === '/' || p === '/riwayat');
  document.title = name + ' · PinjamBalik';
  const pendingAlert = pending
    ? `<div class="alert" role="status">${icon('info', 17)}Status kiriman belum terkonfirmasi.<button class="text-link" data-action="recover">Periksa kiriman</button></div>`
    : '';
  const connection = c.offline
    ? `<div class="alert" role="status">${icon('info', 17)}Koneksi terputus. ${c.data ? 'Data terakhir masih ditampilkan.' : ''}<button class="text-link" data-action="reload">Coba lagi</button></div>`
    : '';
  if (p === '/pindai') {
    if (!page.querySelector('[data-scan-page]') || (!camera && !modal.open)) {
      page.innerHTML = '<div id="scan-notices"></div><header class="page-title"><h1>Pindai QR</h1></header><section class="panel padded scan-page" data-scan-page>' + transactionForm() + '</section>';
    }
    $('#scan-notices').innerHTML = pendingAlert + connection;
    page.setAttribute('aria-busy', 'false');
    if (!camera && !modal.open) {
      camera = transactionScanner({ state:c, openAsset:code => navigate(assetPath(code)) });
      camera.start();
    }
    return;
  }
  let content;
  if (!c.data)
    content = c.offline
      ? empty(
          'Inventaris belum tersambung',
          'Hubungkan kembali perangkat untuk mengambil data server.',
        )
      : '<div class="initial">Memuat inventaris…</div>';
  else if (p === '/' || p === '/riwayat') content = historyPage(c);
  else if (p === '/peminjaman') content = lending(c);
  else if (p === '/inventaris') content = inventory(c);
  else if (p === '/label') content = labels(c);
  else if (p === '/pengelola') content = adminPage(c);
  else if (p.startsWith('/aset/')) content = assetDetail(c, p.slice('/aset/'.length).toUpperCase());
  else content = empty('Halaman tidak ditemukan');
  page.setAttribute('aria-busy', String(!c.data && !c.offline));
  page.innerHTML = pendingAlert + connection + content;
  restore(memory);
}
function stopCamera() {
  camera?.stop();
  camera = null;
}
function closeDialog() {
  stopCamera();
  if (modal.open) modal.close();
  if (bottomNav.parentElement !== navHome) navHome.append(bottomNav);
}
function dialog(title, body) {
  hideMenu();
  stopCamera();
  $('#dialog-content').innerHTML =
    `<div class="modal-top"><h2 id="dialog-title">${esc(title)}</h2><button class="icon-btn" type="button" data-action="close" aria-label="Tutup dialog">${icon('close', 21)}</button></div><div class="modal-body">${body}<p id="dialog-error" class="feedback" role="alert"></p></div>`;
  if (!modal.open) {
    modal.append(bottomNav);
    modal.showModal();
  }
  $('#dialog-content').scrollTop = 0;
}
modal.addEventListener('close', () => {
  if (!modal.open) {
    if (bottomNav.parentElement !== navHome) navHome.append(bottomNav);
    if (route() === '/pindai') render(false);
  }
});
modal.addEventListener('click', (e) => {
  if (e.target === modal) closeDialog();
});
function feedback(message) {
  const target = modal.open ? $('#dialog-error') : page.querySelector('form .feedback');
  if (target) target.textContent = message;
  else toast(message);
}
function requestId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 15) | 64;
  b[8] = (b[8] & 63) | 128;
  const h = Array.from(b, (v) => v.toString(16).padStart(2, '0')).join('');
  return [h.slice(0, 8), h.slice(8, 12), h.slice(12, 16), h.slice(16, 20), h.slice(20)].join('-');
}
function receipt(r) {
  r = { ...r, code: c.byCode.get(r.code)?.code || r.code };
  if (r.kind === 'borrow' || r.kind === 'return') {
    c.filters.history = filter();
    navigate('/');
    const label = r.stage ? stageLabels[r.stage] : (r.kind === 'borrow' ? 'Dipinjam' : 'Dikembalikan');
    const person = r.kind === 'return' ? (r.returner || r.borrower) : r.borrower;
    closeDialog();
    const officer = r.kind === 'return' ? r.returnOfficer : r.requestedOfficer;
    toast(label + ' · ' + r.name + ' · ' + person + (officer ? ' · Piket ' + officer : '') + ' · ' + stamp(r.time));
    return;
  }
  if (r.kind === 'approve-borrow' || r.kind === 'approve-return' || r.kind === 'verify') {
    closeDialog();
    toast(r.name + ' · ' + stageLabels[r.stage || 'returned'] + ' · ' + (r.officer || c.session.admin) + ' · ' + stamp(r.time));
    return;
  }
  const titles = {
    verify: 'Pengembalian terverifikasi',
    create: 'Aset ditambahkan',
    archive: 'Aset diarsipkan',
    correct: 'Nama dikoreksi',
    delete: 'Riwayat berhasil dihapus',
  };
  const unit = c.byCode.get(r.code);
  dialog(
    titles[r.kind] || 'Tersimpan',
    `<div class="receipt-mark">${icon('check', 24)}</div><h3 class="receipt-title">${esc(r.name || unit?.name || r.code)}</h3><dl><div><dt>Kode unit</dt><dd>${esc(r.code)}</dd></div>${r.borrower ? `<div><dt>Nama peminjam</dt><dd>${esc(r.borrower)}</dd></div>` : ''}<div><dt>${r.kind === 'borrow' ? 'Waktu pinjam' : ['return', 'verify'].includes(r.kind) ? 'Waktu kembali' : 'Waktu perubahan'}</dt><dd>${esc(stamp(r.time))}</dd></div></dl><div class="row-actions"><button class="btn primary" data-action="close">Selesai</button><a class="btn" data-nav href="${pageHref(assetPath(r.code))}">Buka aset</a></div>`,
  );
}
async function submitOperation(op, accessCode) {
  if (busy) return false;
  busy = true;
  keepPending(op);
  const formButton = op.kind === 'delete' ? modal.querySelector('[data-form="delete"] button[type="submit"]') : document.activeElement?.closest('button');
  if (formButton) formButton.disabled = true;
  try {
    const body = accessCode === undefined ? op.payload : { ...op.payload, accessCode };
    const r = await post('/api/actions/' + op.kind, body);
    keepPending(null);
    await refresh(true);
    receipt(r);
    if (c.session.admin && route() === '/pengelola') fetchAudit();
    return true;
  } catch (err) {
    if (err.status && err.status < 500) {
      keepPending(null);
      await refresh(true);
      if (op.kind === 'delete' && err.status === 403) {
        c.session.admin = null;
        c.audit = [];
        navigate('/pengelola');
        feedback('Sesi pengelola berakhir. Masuk kembali untuk menghapus riwayat.');
      } else if (op.kind === 'delete' && [404,409,410].includes(err.status)) {
        closeDialog();
        toast(err.message);
      } else {
        feedback(err.message);

      }
    } else {
      render();
      dialog(
        'Status belum terkonfirmasi',
        '<p>Koneksi terputus saat menyimpan. Periksa hasil kiriman di server sebelum mengirim lagi.</p><div class="row-actions"><button class="btn primary" data-action="recover">Periksa kiriman</button></div>',
      );
    }
    return false;
  } finally {
    busy = false;
    if (formButton?.isConnected) formButton.disabled = false;
  }
}
function mutate(kind, fields, accessCode) {
  if (pending) {
    recover();
    return;
  }
  return submitOperation({ kind, payload: { ...fields, requestId: requestId() } }, accessCode);
}
async function recover() {
  if (!pending || busy) return;
  const op = pending;
  try {
    const r = await api('/api/operations/' + encodeURIComponent(op.payload.requestId));
    keepPending(null);
    await refresh(true);
    receipt(r);
  } catch (err) {
    if (err.status === 410) {
      keepPending(null);
      closeDialog();
      await refresh(true);
      toast(err.message);
      return;
    }
    const absent = err.status === 404;
    if (absent && ['borrow','return'].includes(op.kind)) {
      dialog('Kirim ulang pencatatan', `<form data-form="duty-retry"><p>Kiriman belum ditemukan. Masukkan kembali kode petugas untuk melanjutkan.</p>${dutyCodeField('retry')}<div class="row-actions"><button class="btn" type="button" data-action="close">Tutup</button><button class="btn primary" type="submit">Kirim ulang</button></div></form>`);
      return;
    }
    if (absent && op.kind === 'delete') {
      try {
        c.session = await api('/api/session');
        if (!c.session.admin) {
          navigate('/pengelola');
          feedback('Masuk kembali untuk memeriksa penghapusan.');
          return;
        }
        await refresh(true);
        if (c.offline) throw new Error();
        const l = c.data.loans.find(row => row.id === op.payload.loanId);
        keepPending(null);
        if (l) {
          const same = l.borrower === op.payload.previous && l.returned_at === op.payload.returnedAt && loanStage(l) === op.payload.stage;
          deleteDialog(l, same ? op.payload.requestId : requestId());
        } else {
          closeDialog();
          toast('Riwayat ini sudah tidak tercantum.');
        }
      } catch {
        dialog('Status penghapusan', '<p>Status belum dapat diperiksa. Hubungkan kembali perangkat.</p><button class="btn" data-action="recover">Periksa lagi</button>');
      }
      return;
    }
    dialog(
      'Status kiriman',
      `<p>${absent ? 'Server belum menemukan kiriman ini. Gunakan nomor kiriman yang sama untuk mencoba lagi.' : 'Server belum dapat dihubungi. Periksa kembali setelah koneksi pulih.'}</p><div class="row-actions">${absent ? '<button class="btn primary" data-action="retry">Kirim ulang</button>' : '<button class="btn primary" data-action="recover">Periksa lagi</button>'}<button class="btn" data-action="close">Tutup</button></div>`,
    );
  }
}
function labelDialog(code) {
  const a = c.byCode.get(code);
  if (!a) return;
  dialog(
    'Label QR unit',
    paperLabel(c, a) +
      `<p class="help">${esc(assetUrl(c, code))}</p><div class="row-actions"><button class="btn primary" data-save-qr="${esc(code)}">${icon('download', 17)}Simpan QR</button><button class="btn" data-print="${esc(code)}">${icon('printer', 17)}Cetak label</button><a class="btn" data-nav href="${pageHref(assetPath(code))}">Buka aset</a></div>`,
  );
}
function printLabels(codes) {
  const units = codes.map((x) => c.byCode.get(x)).filter(Boolean);
  if (!units.length) {
    toast('Tidak ada label untuk dicetak.');
    return;
  }
  $('#printSheet').innerHTML = units.map((a) => paperLabel(c, a)).join('');
  window.print();
}
window.addEventListener('afterprint', () => $('#printSheet').replaceChildren());
async function saveQr(code) {
  const a = c.byCode.get(code);
  if (!a) return;
  const qr = window.qrcode(0, 'M');
  qr.addData(assetUrl(c, code));
  qr.make();
  const count = qr.getModuleCount(), cell = 12, margin = 4 * cell;
  const canvas = document.createElement('canvas');
  canvas.width = (count + 8) * cell;
  canvas.height = canvas.width + 120;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#111';
  for (let row = 0; row < count; row++)
    for (let col = 0; col < count; col++)
      if (qr.isDark(row, col)) ctx.fillRect(margin + col * cell, margin + row * cell, cell, cell);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#142639';
  ctx.font = 'bold 30px "DM Sans", sans-serif';
  ctx.fillText(a.name, canvas.width/2, canvas.width + 25, canvas.width - 40);
  ctx.font = '24px monospace';
  ctx.fillText(a.code, canvas.width/2, canvas.width + 67, canvas.width - 40);
  ctx.font = '17px "DM Sans", sans-serif';
  ctx.fillText('PinjamBalik', canvas.width / 2, canvas.width + 99);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Label belum dapat disimpan. Gunakan Cetak label.');
  const address = URL.createObjectURL(blob), save = document.createElement('a');
  save.href = address;
  save.download = 'PinjamBalik-' + a.code + '.png';
  document.body.append(save);
  save.click();
  save.remove();
  setTimeout(() => URL.revokeObjectURL(address), 60000);
}
function deleteDialog(loan, operationId) {
  const asset = c.byCode.get(loan.asset_code);
  const original = loan.original_borrower ?? loan.borrower;
  const effect = loan.returned_at ? 'Catatan peminjaman ini akan dihapus dari riwayat semua pengguna.'
    : 'Peminjaman ini masih terbuka. Setelah dihapus, barang akan berstatus Tersedia. Pastikan kondisi fisik barang sesuai.';
  dialog('Hapus riwayat peminjaman?',
    `<dl class="delete-review"><div><dt>Barang</dt><dd>${esc(asset.name)} · ${esc(asset.code)}</dd></div>
      <div><dt>Peminjam</dt><dd>${esc(original)}${loan.borrower !== original ? `<small class="block">Nama terkoreksi · ${esc(loan.borrower)}</small>` : ''}</dd></div>
      <div><dt>Unit kerja</dt><dd>${esc(loan.work_unit || 'Belum tercatat')}</dd></div><div><dt>Pembaruan terakhir</dt><dd>${esc(stamp(latestEvent(loan)))}</dd></div>
      <div><dt>Status peminjaman</dt><dd>${esc(stageLabels[loanStage(loan)])}</dd></div></dl>
      <p class="delete-effect${loan.returned_at ? '' : ' active'}">${effect}</p>
      <form data-form="delete" data-code="${esc(asset.code)}" data-loan="${esc(loan.id)}" data-previous="${esc(loan.borrower)}"
        data-stage="${loanStage(loan)}" data-returned="${esc(loan.returned_at || '')}" data-request="${esc(operationId)}">

        <div class="row-actions delete-actions"><button class="btn" type="button" data-action="close">Batal</button><button class="btn delete-submit" type="submit">Hapus riwayat</button></div></form>`);
}
function adminDialog(kind, key) {
  if (!c.session.admin) return;
  if (kind === 'delete') {
    if (pending) { recover(); return; }
    const loan = c.data.loans.find(row => row.id === key);
    if (loan) deleteDialog(loan, requestId());
    return;
  }
  if (kind === 'approve-borrow' || kind === 'approve-return') {
    const l = c.data.loans.find(row => row.id === key);
    const borrow = kind === 'approve-borrow';
    if (!l || loanStage(l) !== (borrow ? 'requested' : 'return_requested')) {
      toast('Pengajuan sudah diproses. Periksa riwayat terbaru.');
      return;
    }
    const a = c.byCode.get(l.asset_code);
    const prompt = borrow ? 'Setujui peminjaman' : 'Setujui pengembalian';
    dialog(prompt, `<p class="approval-explanation">${borrow ? 'Konfirmasikan penyerahan barang kepada peminjam.' : 'Pastikan barang sudah diterima. Setelah disetujui, unit akan berstatus Tersedia.'}</p>
      <dl><div><dt>Barang</dt><dd>${esc(a.name)} · ${esc(a.code)}</dd></div><div><dt>Peminjam</dt><dd>${esc(l.original_borrower ?? l.borrower)}</dd></div>
      <div><dt>Unit kerja</dt><dd>${esc(l.work_unit || 'Belum tercatat')}</dd></div>
      ${l.requested_officer ? `<div><dt>Petugas piket peminjaman</dt><dd>${esc(l.requested_officer)}</dd></div>` : ''}${!borrow && l.return_name ? `<div><dt>Nama pengembali</dt><dd>${esc(l.return_name)}</dd></div><div><dt>Unit kerja pengembali</dt><dd>${esc(l.return_work_unit)}</dd></div><div><dt>Petugas piket pengembalian</dt><dd>${esc(l.return_officer)}</dd></div>` : ''}<div><dt>Akun yang menyetujui</dt><dd>${esc(c.session.admin)}</dd></div></dl>
      <form data-form="${kind}" data-code="${esc(a.code)}" data-loan="${esc(l.id)}" data-rev="${a.revision}"><div class="row-actions"><button class="btn" type="button" data-action="close">Batal</button><button class="btn primary" type="submit">Setujui</button></div></form>`);
    return;
  }
  if (kind === 'add') {
    dialog(
      'Tambah aset',
      `<form data-form="create"><p class="help">Kode barang dibuat otomatis sesuai kategori.</p><label class="field">Nama barang<input name="name" required maxlength="160"></label><label class="field">Kategori<select name="category">${statuses(
        '',
        c.data.categories.map((x) => [x, x]),
      )}</select></label><label class="field">Lokasi simpan<input name="location" required maxlength="80" placeholder="Lemari A · Rak 1"></label><button class="btn primary" type="submit">Simpan aset</button></form>`,
    );
    return;
  }
  if (kind === 'correct') {
    const l = c.data.loans.find((row) => row.id === key);
    if (!l) return;
    dialog(
      'Koreksi nama peminjam',
      `<p>${esc(c.byCode.get(l.asset_code)?.name)} · ${esc(l.asset_code)}</p><form data-form="correct" data-code="${esc(l.asset_code)}" data-loan="${esc(key)}" data-previous="${esc(l.borrower)}"><label class="field">Nama peminjam<input name="borrower" required maxlength="80" value="${esc(l.borrower)}"></label><label class="field">Alasan koreksi<input name="reason" required maxlength="240"></label><button class="btn primary" type="submit">Simpan koreksi</button></form>`,
    );
    return;
  }
  const a = c.byCode.get(key),
    l = c.active.get(key);
  if (!a) return;
  const verify = kind === 'verify';
  if (verify && loanStage(l) !== 'return_requested') return;
  dialog(
    verify ? 'Verifikasi barang di rak' : 'Arsipkan unit',
    `<p>${esc(a.name)} · ${esc(a.code)}</p><p>${verify ? 'Pastikan unit fisik ada di lokasi simpan. Pengembalian akan dicatat dengan nama peminjam awal dan waktu pemeriksaan ini.' : 'Unit akan keluar dari daftar peminjaman. Label dan riwayatnya tetap dapat dibaca.'}</p><form data-form="${kind}" data-code="${esc(key)}" data-rev="${a.revision}" data-loan="${esc(l?.id || '')}"><button class="btn primary" type="submit">${verify ? 'Catat verifikasi' : 'Arsipkan unit'}</button></form>`,
  );
}

document.addEventListener('click', async (e) => {
  const nav = e.target.closest('a[data-nav]');
  if (e.target.closest('[data-skip]')) { e.preventDefault(); page.focus(); return; }
  if (nav && nav.origin === location.origin && nav.hash.startsWith('#/') && e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
    e.preventDefault();
    navigate(routePath(nav.hash));
    return;
  }
  const el = e.target.closest('button,[data-action]');
  if (!el) return;
  const d = el.dataset;
  if (d.saveQr) {
    try { await saveQr(d.saveQr); } catch (err) { toast(err.message); }
    return;
  }
  if (d.category || d.unitStatus) {
    const f = c.filters[d.section];
    if (d.category) f.category = d.category;
    else f.status = d.unitStatus;
    f.page = 1;
    render(false);
    const selector = d.category ? '[data-category="' + d.category + '"]' : '[data-unit-status="' + d.unitStatus + '"]';
    page.querySelector(selector)?.focus({ preventScroll: true });
    return;
  }
  if (d.page) {
    c.filters[d.page].page = Number(d.num);
    render(false);
    return;
  }
  if (d.showQr) {
    labelDialog(d.showQr);
    return;
  }
  if (d.print) {
    printLabels([d.print]);
    return;
  }
  if (d.approveBorrow || d.approveReturn) {
    adminDialog(d.approveBorrow ? 'approve-borrow' : 'approve-return', d.approveBorrow || d.approveReturn);
    return;
  }
  for (const key of ['correct', 'delete', 'verify', 'archive'])
    if (d[key]) {
      adminDialog(key, d[key]);
      return;
    }
  switch (d.action) {
    case 'history-filters':
      c.filters.history.expanded = !c.filters.history.expanded;
      render(false);
      page.querySelector('.filter-toggle')?.focus({ preventScroll: true });
      break;
    case 'clear-history':
      c.filters.history = { ...filter(), q: c.filters.history.q, expanded: true };
      render(false);
      page.querySelector('.filter-toggle')?.focus({ preventScroll: true });
      break;
    case 'logout':
      try {
        await post('/api/admin/logout', {});
        c.session.admin = null;
        c.audit = [];
        render(false);
      } catch (err) { feedback(err.message); }
      break;
    case 'menu':
      menu();
      break;
    case 'close':
      closeDialog();
      break;
    case 'reload':
      await refresh(true);
      break;
    case 'recover':
      await recover();
      break;
    case 'retry':
      if (pending?.kind === 'delete') await recover();
      else if (pending) await submitOperation(pending);
      break;
    case 'add':
      adminDialog('add');
      break;
    case 'print-all':
      printLabels(matchingLabelAssets(c).map(a => a.code));
      break;
    case 'print-page': {
      printLabels(Array.from(page.querySelectorAll('.label-card [data-print]'), el => el.dataset.print));
      break;
    }
  }
});
document.addEventListener('input', (e) => {
  const k = e.target.dataset.search;
  if (k) {
    c.filters[k].q = e.target.value;
    c.filters[k].page = 1;
    // Keep the active input mounted while filtering so the mobile keyboard stays open.
    const views = { inventory, lending, adminCatalog: adminPage, history: historyPage, labels };
    const draft = document.createElement('template');
    draft.innerHTML = views[k](c);
    for (const marker of ['data-filter-results', 'data-result-count', 'data-label-actions']) {
      const selector = '[' + marker + '="' + k + '"]';
      const next = draft.content.querySelector(selector), live = page.querySelector(selector);
      if (next && live) live.replaceChildren(...next.childNodes);
    }
  }
});
document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.dataset.pageSize) {
    const f = c.filters[el.dataset.pageSize];
    f.pageSize = el.value;
    f.page = 1;
    render();
    return;
  }
  if (el.dataset.filter) {
    const f = c.filters[el.dataset.filter];
    f.status = el.value;
    f.page = 1;
    render();
    return;
  }
  if (el.dataset.date) {
    const f = c.filters.history;
    f[el.dataset.date] = el.value;
    f.page = 1;
    render(false);
  }
});
document.addEventListener('submit', async (e) => {
  const form = e.target;
  if (!form.dataset.form) return;
  e.preventDefault();
  const type = form.dataset.form,
    data = Object.fromEntries(new FormData(form)),
    code = form.dataset.code,
    revision = Number(form.dataset.rev);
  try {
    if (type === 'login') {
      const button = form.querySelector('button[type=submit]');
      button.disabled = true;
      try {
        const result = await post('/api/admin/login', { username: data.username, password: data.password });
        form.reset();
        c.session.admin = result.admin;
        await fetchAudit();
        render(false);
        if (pending?.kind === 'delete') await recover();
      } finally { if (button.isConnected) button.disabled = false; }
      return;
    }
    if (type === 'delete') {
      if (busy) return;
      const payload = { code, loanId: form.dataset.loan, previous: form.dataset.previous,
        returnedAt: form.dataset.returned || null, stage: form.dataset.stage, requestId: form.dataset.request };
      await submitOperation({ kind:'delete', payload });
      return;
    }
    if (type === 'duty-retry' && pending && ['borrow','return'].includes(pending.kind)) {
      await submitOperation(pending, data.accessCode);
      return;
    }
    if (type === 'borrow' || type === 'return') {
      const loanId = form.dataset.loan;
      const fields = { code, revision };
      if (loanId) fields.loanId = loanId;
      if (type === 'return') Object.assign(fields, { returner:data.returner, returnWorkUnit:data.returnWorkUnit });
      else if (!loanId) Object.assign(fields, { borrower:data.borrower, workUnit:data.workUnit });
      if (!data.accessCode.trim()) { form.elements.accessCode.focus(); throw new Error('Masukkan kode akses petugas piket.'); }
      form.elements.accessCode.value = '';
      await mutate(type, fields, data.accessCode);
      return;
    }
    if (['approve-borrow', 'approve-return'].includes(type)) {
      await mutate(type, { code, revision, loanId: form.dataset.loan });
      return;
    }
    if (type === 'archive') {
      await mutate(type, { code, revision });
      return;
    }
    if (type === 'correct') {
      await mutate(type, {
        code,
        loanId: form.dataset.loan,
        previous: form.dataset.previous,
        ...data,
      });
      return;
    }
    if (type === 'create') {
      const map = { Perkakas: 'wrench', 'Alat ukur': 'ruler', ATK: 'stapler', Elektronik: 'zap' };
      await mutate(type, { ...data, icon: map[data.category] || 'box' });
    }
  } catch (err) {
    feedback(err.message);
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.body.classList.contains('menu-open')) menu();
  if (e.target.id === 'choose-photo' && ['Enter', ' '].includes(e.key)) {
    e.preventDefault();
    $('#scan-photo').click();
  }
});
window.addEventListener('hashchange', () => {
  closeDialog();
  hideMenu();
  render(false);
  if (route() === '/pengelola' && c.session.admin) fetchAudit();
});
window.addEventListener('pagehide', () => camera?.pause());
window.addEventListener('pageshow', () => camera?.start());
window.matchMedia('(max-width: 900px)').addEventListener('change', event => {
  if (!event.matches) hideMenu();
});
window.addEventListener('online', () => refresh(true));
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) { refresh(true); camera?.start(); }
  else camera?.pause();
});
async function initialize() {
  render(false);
  await refresh(true);
  if (c.session.admin && route() === '/pengelola') fetchAudit();
  setInterval(async () => {
    if (document.hidden || polling) return;
    polling = true;
    try {
      await refresh();
    } finally {
      polling = false;
    }
  }, 2200);
}
initialize();
