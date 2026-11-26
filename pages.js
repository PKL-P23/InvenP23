import { pageHref, serviceOrigin } from './hosting.js';
import { historyOverview } from './dashboard.js';
import { loanStage, stageLabels, latestEvent } from './workflow.js';
import {
  icon,
  esc,
  dt,
  dayKey,
  stamp,
  shortDate,
  time,
  assetPath,
  badge,
  tile,
  empty,
  statuses,
  searchBox,
  selectBox,
  pager,
  borrowerFields,
  dutyCodeField,
} from './view.js';

export const sections = [
  ['/', 'Riwayat', 'history'],
  ['/peminjaman', 'Peminjaman', 'borrowed'],
  ['/inventaris', 'Daftar aset', 'box'],
  ['/label', 'Label QR', 'qr'],
];
const historyStates = [
  ['all', 'Semua status'],
  ...['requested', 'borrowed', 'return_requested', 'returned'].map(stage => [stage, stageLabels[stage]]),
];
const total = (n) => new Intl.NumberFormat('id-ID').format(n);
const countText = (n, s) => total(n) + ' ' + s;
const link = (url, label, cls = 'text-link') =>
  `<a data-nav class="${cls}" href="${pageHref(url)}">${label}</a>`;
const button = (act, label, glyph, cls = 'btn') =>
  `<button type="button" class="${cls}" data-action="${act}">${icon(glyph, 17)}<span>${label}</span></button>`;
const pageTitle = (name, sub, actions = '') =>
  `<header class="page-title"><div><h1>${name}</h1>${sub ? '<p>' + sub + '</p>' : ''}</div>${actions}</header>`;
const assetLink = (a) =>
  `<a data-nav class="asset-link" href="${pageHref(assetPath(a.code))}">${tile(a)}<span><strong>${esc(a.name)}</strong><small>${esc(a.code)}</small></span></a>`;
const statusOf = (c, a) =>
  a.archived ? 'Diarsipkan' : stageLabels[loanStage(c.active.get(a.code))];
function currentBorrower(loan) {
  if (!loan) return '<span class="muted">—</span>';
  const at = latestEvent(loan);
  const sameDay = dayKey(at) === dayKey(new Date().toISOString());
  const since =
    (sameDay ? '' : dt(at, { day: 'numeric', month: 'short' }) + ' · ') +
    time(at) +
    ' WIB';
  const parts = loan.borrower.trim().split(/\s+/u);
  const initials = [parts[0], ...(parts.length > 1 ? [parts.at(-1)] : [])]
    .map(part => Array.from(part)[0]).join('').toLocaleUpperCase('id');
  return `<div class="borrower-cell"><span class="initials" aria-hidden="true">${esc(initials)}</span><span><strong class="person">${esc(loan.borrower)}</strong><time class="borrow-time" datetime="${esc(at)}" title="${stamp(at)}">${esc(since)}</time></span></div>`;
}
const isMatch = (query, fields) =>
  !query.trim() ||
  fields
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('id')
    .includes(query.trim().toLocaleLowerCase('id'));
const singleLabel = (code) =>
  `<button type="button" class="icon-btn" data-show-qr="${esc(code)}" aria-label="Label QR ${esc(code)}" title="Lihat label QR">${icon('qr', 18)}</button>`;

export function shell() {
  return `<div class="layout"><button tabindex="-1" id="scrim" aria-label="Tutup menu" type="button" data-action="menu"></button>
    <aside class="sidebar" id="sidebar"><a href="${pageHref('/')}" data-nav class="brand"><img src="./pinjambalik.svg?v=clay-1" width="40" height="40" alt=""><span>PinjamBalik<small>Inventaris ruang kerja</small></span></a>
      <button class="icon-btn drawer-close" type="button" data-action="menu" aria-label="Tutup menu">${icon('close')}</button>
      <nav aria-label="Navigasi utama">${sections.map(([url, n, i]) => `<a data-nav href="${pageHref(url)}" class="nav-item">${icon(i, 20)}${n}</a>`).join('')}<a class="nav-item nav-admin" data-nav href="${pageHref('/pengelola')}">${icon('shield', 20)}Pengelola</a></nav>
      <div class="side-bottom"><div class="profile"><span class="profile-icon">${icon('user', 18)}</span><span id="profile-name">Pengunjung<small>Akses melalui tautan</small></span></div></div>
    </aside>
    <div class="workspace"><header class="topbar"><div class="crumb"><button type="button" class="icon-btn mobile-menu" id="menu-toggle" data-action="menu" aria-label="Buka menu" aria-expanded="false" aria-controls="sidebar">${icon('menu')}</button><a data-nav href="${pageHref('/')}" class="mobile-brand"><img src="./pinjambalik.svg?v=clay-1" width="32" height="32" alt="">PinjamBalik</a><span class="crumb-root">${icon('ledger',16)} Ruang kerja</span><span class="crumb-sep">/</span><strong id="crumb-title">Dashboard</strong></div><div class="bar-meta"><span id="demo-tag"></span><span class="date-top">${icon('calendar', 16)}<span id="top-date"></span></span></div></header>
    <main id="page" tabindex="-1" aria-busy="true"><div class="initial" role="status">Memuat inventaris…</div></main></div></div>`;
}

const inventoryCategories = [
  ['all', 'Semua kelompok'], ['audio', 'Perangkat audio/video'], ['network', 'Jaringan'],
  ['office', 'ATK'], ['other', 'Lainnya'],
];

function inventoryCategory(asset) {
  switch (asset.category?.trim().toUpperCase()) {
    case 'AUDIO VIDEO': return 'audio';
    case 'JARINGAN': return 'network';
    case 'ATK': return 'office';
    // These imported types are label tape, cutter refills, and a label printer.
    case 'LAIN LAIN': return asset.short_code?.startsWith('T') || /^PB-(050|051|094)-\d{3}$/.test(asset.originalCode || asset.code) ? 'office' : 'other';
    default: return 'other';
  }
}

function categoryButtons(section, selected) {
  const buttons = inventoryCategories.map(([value, name]) => {
    const active = value === selected;
    return `<button type="button" class="btn${active ? ' primary' : ''}" data-category="${value}" data-section="${section}" aria-pressed="${active}">${name}</button>`;
  });
  return `<div class="tools-row" role="group" aria-label="Kelompok aset">${buttons.join('')}</div>`;
}

function inventoryStatusTabs(grouped, c, f) {
  const counts = { available: 0, borrowed: 0 };
  for (const a of grouped) {
    const stage = loanStage(c.active.get(a.code));
    if (Object.hasOwn(counts, stage)) counts[stage]++;
  }
  const options = [['all', 'Semua', grouped.length], ['available', 'Tersedia', counts.available], ['borrowed', 'Dipinjam', counts.borrowed]];
  return `<div class="status-tabs" role="group" aria-label="Filter status aset">${options.map(([value, label, count]) => `<button type="button" data-unit-status="${value}" data-section="adminCatalog" aria-pressed="${f.status === value}">${label}<span>${total(count)}</span></button>`).join('')}</div>`;
}

function catalogRow(c, asset, key) {
  const loan = c.active.get(asset.code);
  const status = `<td class="unit-status">${badge(statusOf(c, asset))}</td>`;
  const name = `<td class="unit-name">${assetLink(asset)}</td>`;
  if (key === 'lending') {
    const returning = ['borrowed', 'return_requested'].includes(loanStage(loan));
    const action = link(assetPath(asset.code), returning ? 'Kembalikan' : 'Pinjam', returning ? 'btn' : 'btn primary');
    return `<tr>${name}${status}<td class="unit-action">${action}</td></tr>`;
  }
  const person = key === 'adminCatalog' ? `<td class="unit-person ${loan ? 'has-loan' : ''}">${currentBorrower(loan)}</td>` : '';
  return `<tr>${name}${person}<td class="unit-location">${esc(asset.location)}</td>${status}<td class="qr-col">${singleLabel(asset.code)}</td></tr>`;
}

function inventoryPanel(c, key) {
  const f = c.filters[key], lending = key === 'lending', admin = key === 'adminCatalog';
  const grouped = c.data.assets.filter(a => !a.archived &&
    (key !== 'inventory' || !c.active.has(a.code)) &&
    (f.category === 'all' || inventoryCategory(a) === f.category));
  const rows = grouped.filter(a => {
    const loan = c.active.get(a.code);
    const fields = [a.name, a.code, a.originalCode];
    if (!lending) fields.push(a.location, a.category);
    if (admin) fields.push(loan?.original_borrower, loan?.borrower);
    return isMatch(f.q, fields) && (!admin || f.status === 'all' || f.status === loanStage(loan));
  });
  const limit = f.pageSize === 'all' ? Math.max(1, rows.length) : Number(f.pageSize);
  f.page = Math.min(f.page, Math.max(1, Math.ceil(rows.length / limit)));
  const items = rows.slice((f.page - 1) * limit, f.page * limit);
  const columns = lending ? '<th>Status</th><th>Tindakan</th>' : `${admin ? '<th>Peminjam</th>' : ''}<th>Lokasi simpan</th><th>Status</th><th class="qr-col">Label</th>`;
  const sizeOptions = [['50','50 aset per halaman'], ['100','100 aset per halaman'], ['all','Semua aset']];
  return `<section class="panel inventory"><div class="panel-head"><h2>${key === 'inventory' ? 'Aset tersedia' : 'Unit terdaftar'}</h2><small data-result-count="${key}">${countText(rows.length, 'unit')}</small></div>
    <div class="inventory-controls">${searchBox(key, f.q, admin ? 'Cari aset atau peminjam' : 'Cari kode atau nama barang')}
      <label class="filterbox">${icon('box', 15)}<select id="${key}-size" data-page-size="${key}" aria-label="Jumlah aset per halaman">${statuses(f.pageSize, sizeOptions)}</select></label></div>
    ${categoryButtons(key, f.category)}
    ${admin ? `<div class="inventory-controls">${inventoryStatusTabs(grouped, c, f)}</div>` : ''}
    <div data-filter-results="${key}">${items.length
      ? `<div class="table-wrap"><table class="asset-table${lending ? ' lending-table' : ''}"><thead><tr><th>Nama dan kode barang</th>${columns}</tr></thead><tbody>${items.map(a => catalogRow(c, a, key)).join('')}</tbody></table></div>`
      : empty(key === 'inventory' ? 'Tidak ada aset tersedia' : 'Aset tidak ditemukan', 'Coba kode, nama barang, atau kelompok lain.')}
    ${rows.length > limit ? pager(rows.length, f.page, limit, key) : ''}</div></section>`;
}
export function inventory(c) {
  return pageTitle('Daftar aset', 'Lihat barang yang tersedia dan lokasi simpannya.',
    link('/pindai', icon('scan', 18) + 'Pindai QR', 'btn primary')) + inventoryPanel(c, 'inventory');
}
export function lending(c) {
  return pageTitle('Peminjaman', 'Cari barang, lalu pilih Pinjam atau Kembalikan.') + inventoryPanel(c, 'lending');
}
function borrowerAtCheckout(loan, showOfficer = false) {
  const original = loan.original_borrower ?? loan.borrower;
  const correction = loan.borrower !== original ? `<small class="name-correction">Nama terkoreksi: ${esc(loan.borrower)}</small>` : '';
  const unit = loan.work_unit ? `Unit kerja · ${esc(loan.work_unit)}` : 'Unit kerja belum tercatat';
  const duty = showOfficer && loan.requested_officer ? `<small class="loan-work-unit">Petugas piket peminjaman · ${esc(loan.requested_officer)}</small>` : '';
  return `<small class="loan-work-unit">Peminjam · <strong class="borrower-name">${esc(original)}</strong></small>${correction}<small class="loan-work-unit">${unit}</small>${duty}`;
}
function milestone(label, date, officer) {
  return `<div class="milestone"><span>${label}</span><time datetime="${esc(date)}"><span>${esc(shortDate(date))}</span> <span>${esc(time(date))} WIB</span></time>${officer ? `<small>Persetujuan · <strong>${esc(officer)}</strong></small>` : ''}</div>`;
}
function officerLine(value, phase) {
  return '<small class="loan-work-unit stage-officer">Petugas piket ' + phase + ' · <strong>' + esc(value || 'Belum tercatat') + '</strong></small>';
}
function returnIdentity(l) {
  return l.return_name ? '<small class="loan-work-unit">Pengembali · <strong>' + esc(l.return_name) + '</strong></small><small class="loan-work-unit">Unit kerja · ' + esc(l.return_work_unit) + '</small>' : '';
}
function historyTable(c, rows, admin = false, detailed = false) {
  if (!rows.length) return empty('Belum ada peminjaman', 'Riwayat muncul setelah petugas piket mencatat peminjaman melalui tab Peminjaman atau QR barang.');
  const body = rows.map(l => {
    const stage = loanStage(l);
    const borrowOfficer = l.requested_officer || (l.borrow_approved_by !== 'admin' && l.borrow_approved_by);
    const legacyReturn = l.return_approved_by || l.verified_by;
    const returnOfficer = l.return_officer || (legacyReturn !== 'admin' && legacyReturn);
    let borrow = l.requested_at ? milestone('Diajukan', l.requested_at) : '';
    if (stage !== 'requested') borrow += milestone(l.requested_at && l.borrow_approved_by ? 'Disetujui' : 'Dipinjam', l.borrowed_at, detailed && l.requested_at && l.borrow_approved_by);
    else borrow += '<small class="waiting-note">Menunggu konfirmasi petugas</small>';
    borrow += borrowerAtCheckout(l) + officerLine(borrowOfficer, 'peminjaman');
    let back = l.return_requested_at ? milestone('Diajukan', l.return_requested_at) : '';
    if (l.returned_at) back += milestone(l.return_requested_at && l.return_approved_by ? 'Disetujui' : 'Dikembalikan', l.returned_at, detailed && l.return_requested_at && (l.return_approved_by || l.verified_by));
    else if (stage === 'return_requested') back += '<small class="waiting-note">Menunggu konfirmasi petugas</small>';
    if (l.return_requested_at || l.returned_at) back += returnIdentity(l) + officerLine(returnOfficer, 'pengembalian');
    return `<tr><td class="log-unit">${assetLink(c.byCode.get(l.asset_code))}</td>
      <td class="log-start" data-label="Peminjaman">${borrow}</td><td class="log-end" data-label="Pengembalian">${back || '<span class="muted">—</span>'}</td>
      <td class="log-status">${badge(stageLabels[stage])}</td>${admin ? `<td class="log-correct"><div class="log-actions"><button type="button" class="text-link" data-correct="${esc(l.id)}">Koreksi</button><button type="button" class="text-link remove-link" data-delete="${esc(l.id)}">Hapus</button></div></td>` : ''}</tr>`;
  }).join('');
  return `<div class="table-wrap"><table class="history-table"><thead><tr><th>Aset</th><th>Peminjaman</th><th>Pengembalian</th><th>Status</th>${admin ? '<th>Tindakan</th>' : ''}</tr></thead><tbody>${body}</tbody></table></div>`;
}
export function historyPage(c) {
  const f = c.filters.history,
    size = 15;
  const dated = (iso) =>
    iso && (!f.from || dayKey(iso) >= f.from) && (!f.to || dayKey(iso) <= f.to);
  const rows = c.data.loans.filter(
    (l) =>
      isMatch(f.q, [l.asset_code, c.byCode.get(l.asset_code)?.originalCode, c.byCode.get(l.asset_code)?.name, l.borrower, l.original_borrower, l.work_unit, l.return_name, l.return_work_unit, l.return_officer, l.requested_officer, l.borrow_approved_by, l.return_approved_by, l.verified_by]) &&
      (f.status === 'all' || f.status === loanStage(l)) &&
      [l.requested_at, l.borrowed_at, l.return_requested_at, l.returned_at].some(dated),
  ).sort((a, b) => latestEvent(b).localeCompare(latestEvent(a)));
  f.page = Math.min(f.page, Math.max(1, Math.ceil(rows.length / size)));
  const overview = historyOverview(c.data.loans);
  const date = dt(new Date().toISOString(), {weekday:'long', day:'numeric', month:'long', year:'numeric'});
  return (
    `<div class="history-board"><header class="board-heading"><h1>Riwayat peminjaman</h1><span>${icon('calendar', 16)}${date}</span></header>
    ${overview.lead}${overview.activity}${overview.status}
    <section class="panel history-feed"><div class="panel-head"><div class="head-pair"><span class="title-icon">${icon('ledger', 18)}</span><h2>Peminjaman</h2></div><small data-result-count="history">${countText(rows.length, 'peminjaman')}</small></div>
    <div class="tools-row history-tools ${f.expanded ? 'expanded' : ''}">${searchBox('history', f.q, 'Cari peminjaman')}<button class="btn filter-toggle" type="button" data-action="history-filters" aria-controls="history-filter-fields" aria-expanded="${Boolean(f.expanded)}">${icon('filter', 16)}Filter${f.from || f.to || f.status !== 'all' ? ' aktif' : ''}</button><div class="history-filter-fields" id="history-filter-fields">${selectBox('history', f.status, historyStates)}<label>Dari <input type="date" data-date="from" value="${esc(f.from)}" max="${esc(f.to || '9999-12-31')}"></label><label>Sampai <input type="date" data-date="to" value="${esc(f.to)}" min="${esc(f.from)}"></label>${f.from || f.to || f.status !== 'all' ? '<button class="text-link" type="button" data-action="clear-history">Hapus filter</button>' : ''}</div></div>
    <div data-filter-results="history">${!rows.length && (f.q || f.status !== 'all' || f.from || f.to) ? empty('Peminjaman tidak ditemukan', 'Coba kata kunci atau filter lain.') : historyTable(c, rows.slice((f.page - 1) * size, f.page * size), Boolean(c.session.admin))}${pager(rows.length, f.page, size, 'history')}</div></section></div>`
  );
}
const qrCache = new Map();
export function assetUrl(c, code) {
  return new URL(pageHref(assetPath(code)), new URL('./', location.href)).href;
}
export function qrImage(c, code) {
  const address = assetUrl(c, code);
  if (!qrCache.has(address)) {
    const qr = window.qrcode(0, 'M');
    qr.addData(address);
    qr.make();
    qrCache.set(address, qr.createSvgTag({ cellSize: 4, margin: 16, scalable: true }));
  }
  return qrCache.get(address);
}
export function paperLabel(c, a) {
  return `<article class="paper-label"><div class="qr-stack"><div class="qrcode" role="img" aria-label="Kode QR ${esc(a.code)}">${qrImage(c, a.code)}</div><strong class="print-code">${esc(a.code)}</strong></div><div><div class="print-brand">PinjamBalik</div><strong>${esc(a.name)}</strong><small>${esc(a.location)}</small></div></article>`;
}
export function matchingLabelAssets(c) {
  const { category, q } = c.filters.labels;
  return c.data.assets.filter(a => !a.archived &&
    (!category || category === 'all' || inventoryCategory(a) === category) &&
    isMatch(q, [a.name, a.code, a.originalCode, a.location]));
}

export function labels(c) {
  const f = c.filters.labels;
  const units = matchingLabelAssets(c);
  const size = 12;
  f.page = Math.min(f.page, Math.max(1, Math.ceil(units.length / size)));
  const visible = units.slice((f.page - 1) * size, f.page * size);
  const unfiltered = (!f.category || f.category === 'all') && !f.q.trim();
  const pack = unfiltered && new URL(c.session.baseUrl || location.origin).origin === serviceOrigin
    ? '<a class="btn" href="https://rakruang-qr.geksonsimanjuntak00.chatgpt.site/label-inventaris.pdf?v=short-1" download>Unduh 695 label awal (PDF)</a>' : '';
  return pageTitle('Label QR', 'Tempel satu label pada tiap unit. Kamera ponsel akan membuka halaman barang tersebut.',
    `<div class="admin-page-actions" data-label-actions="labels">${pack}
      ${units.length > size ? button('print-page', 'Cetak halaman ini', 'printer') : ''}
      <button type="button" class="btn primary" data-action="print-all"${units.length ? '' : ' disabled'}>${icon('printer',17)}Cetak ${countText(units.length, 'label')}</button></div>`) +
    `<section class="panel"><div class="panel-head"><div class="head-pair"><span class="title-icon">${icon('qr', 19)}</span><h2>Label per unit</h2></div><small data-result-count="labels">${countText(units.length, 'label')}</small></div>
    ${categoryButtons('labels', f.category || 'all')}
    <div class="tools-row">${searchBox('labels', f.q, 'Cari kode atau nama aset…')}</div><div data-filter-results="labels"><div class="labels-grid">
      ${visible.length ? visible.map(a => `<div class="label-card">${paperLabel(c, a)}<div>${link(assetPath(a.code), 'Buka aset')}<button class="text-link" data-save-qr="${esc(a.code)}">${icon('download', 15)}Simpan</button><button class="text-link" data-print="${esc(a.code)}">${icon('printer', 15)}Cetak</button></div></div>`).join('') : empty('Label tidak ditemukan')}
    </div>${pager(units.length, f.page, size, 'labels')}</div></section>`;
}

export function assetDetail(c, code) {
  const a = c.byCode.get(code);
  if (!a)
    return (
      empty('Kode unit tidak ditemukan', 'Periksa kode pada label atau hubungi pengelola.') +
      link('/inventaris', 'Buka daftar aset', 'btn')
    );
  code = a.code;
  const active = c.active.get(code), stage = loanStage(active);
  const logs = c.data.loans.filter(l => l.asset_code === code).sort((x, y) => latestEvent(y).localeCompare(latestEvent(x)));
  let title, form;
  if (a.archived) {
    title = 'Unit diarsipkan';
    form = '<p class="help">Riwayat unit tersedia di bawah.</p>';
  } else if (stage === 'available' || stage === 'requested') {
    title = 'Catat peminjaman';
    const existing = stage === 'requested';
    const fields = existing ? borrowerAtCheckout(active) + dutyCodeField('aset') : borrowerFields('aset');
    form = `<form data-form="borrow" data-key="${esc(code)}-${a.revision}" data-code="${esc(code)}" data-rev="${a.revision}"${existing ? ' data-loan="' + esc(active.id) + '"' : ''}>${fields}
      <button type="submit" class="btn primary">${icon('borrowed', 18)}Lanjutkan</button><p class="form-note">Catat saat barang diserahkan kepada peminjam. Nama petugas diambil dari kode akses.</p></form>`;
  } else {
    title = 'Catat pengembalian';
    const owner = esc(active.original_borrower ?? active.borrower);
    const unit = active.work_unit ? ' dari unit kerja ' + esc(active.work_unit) : '';
    form = `<form data-form="return" data-key="return-${esc(active.id)}-${a.revision}" data-code="${esc(code)}" data-loan="${esc(active.id)}" data-rev="${a.revision}">
      <p class="return-prompt"><strong>${esc(a.name)}</strong> dipinjam oleh <strong>${owner}</strong>${unit}.</p>${borrowerFields('kembali', true)}
      <button class="btn primary" type="submit">${icon('return', 18)}Lanjutkan</button>
      <p class="form-note">Catat saat barang diterima kembali. Unit langsung berstatus Tersedia.</p></form>`;
  }
  const group = inventoryCategories.find(([id]) => id === inventoryCategory(a));
  return pageTitle(esc(a.name), esc(code) + ' · ' + esc(group[1]), link('/peminjaman', 'Daftar peminjaman', 'btn')) +
    `<div class="details-grid"><section class="panel padded loan-panel"><div class="asset-heading">${tile(a)}<div><span class="field-caption">Status unit</span>${badge(statusOf(c, a))}</div></div>
      <h2>${title}</h2>${form}<div class="location">${icon('location', 18)}<span>Lokasi simpan<strong>${esc(a.location)}</strong></span></div></section>
      <section class="panel padded"><h2>Label unit</h2>${paperLabel(c, a)}<div class="row-actions"><button class="btn" data-save-qr="${esc(code)}">${icon('download', 17)}Simpan QR</button><button class="btn" data-print="${esc(code)}">${icon('printer', 17)}Cetak label</button></div></section></div>
      ${c.session.admin && !a.archived && !active ? `<section class="admin-strip"><span>${icon('shield',17)}Tindakan pengelola</span><button class="btn small" data-archive="${esc(code)}">Arsipkan unit</button></section>` : ''}
      <section class="panel"><div class="panel-head"><h2>Riwayat unit</h2><small>${countText(logs.length, 'peminjaman')}</small></div>${historyTable(c, logs, Boolean(c.session.admin), true)}</section>`;
}
function approvalButton(l) {
  const borrow = loanStage(l) === 'requested';
  return `<button type="button" class="btn primary small" data-approve-${borrow ? 'borrow' : 'return'}="${esc(l.id)}">${icon('check', 16)}Setujui ${borrow ? 'peminjaman' : 'pengembalian'}</button>`;
}
function approvalQueue(c) {
  const waiting = c.data.loans.filter(l => ['requested','return_requested'].includes(loanStage(l)))
    .sort((x,y) => latestEvent(x).localeCompare(latestEvent(y)));
  if (!waiting.length) return '';
  const size = 8, f = c.filters.approvals;
  f.page = Math.min(f.page, Math.max(1, Math.ceil(waiting.length / size)));
  const items = waiting.slice((f.page - 1) * size, f.page * size).map(l => {
    const a = c.byCode.get(l.asset_code);
    return `<li class="approval-row"><div class="approval-info">${assetLink(a)}<div class="approval-person">${borrowerAtCheckout(l, true)}${l.return_requested_at ? returnIdentity(l) + officerLine(l.return_officer, 'pengembalian') : ''}</div></div>
      <div class="approval-state">${badge(stageLabels[loanStage(l)])}<time datetime="${esc(latestEvent(l))}">${esc(stamp(latestEvent(l)))}</time></div>${approvalButton(l)}</li>`;
  }).join('');
  return `<section class="panel approvals"><div class="panel-head"><div class="head-pair"><span class="title-icon">${icon('history',19)}</span><h2>Pengajuan lama</h2></div><small>${countText(waiting.length, 'pengajuan')}</small></div>
    ${items ? `<ul class="approval-list">${items}</ul>${pager(waiting.length, f.page, size, 'approvals')}` : empty('Semua pengajuan sudah ditangani', 'Pengajuan baru dari peminjam akan tampil di sini.')}
    </section>`;
}
export function adminPage(c) {
  if (!c.session.admin) return pageTitle('Pengelola inventaris', 'Masuk untuk mengelola inventaris dan riwayat peminjaman.') +
    `<section class="panel login-card padded"><span class="stat-icon blue">${icon('lock',24)}</span><h2>Akses pengelola</h2><form data-form="login" data-key="admin-login">
      <label class="field" for="admin-username">Nama pengguna<input id="admin-username" name="username" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" required maxlength="80"></label>
      <label class="field" for="pengelola-password">Sandi pengelola<input id="pengelola-password" name="password" type="password" autocomplete="current-password" required maxlength="256"></label>
      <p class="feedback" role="alert"></p><button class="btn primary" type="submit">Masuk</button></form></section>`;
  return (
    pageTitle('Dashboard pengelola', 'Akun · ' + esc(c.session.admin),
      `<div class="admin-page-actions">${button('add', 'Tambah aset', 'plus', 'btn small')}${link('/riwayat', 'Kelola riwayat', 'btn')}${button('logout', 'Keluar', 'lock')}</div>`) +
    approvalQueue(c) + inventoryPanel(c, 'adminCatalog') + `
    <section class="panel spaced"><div class="panel-head"><h2>Jejak koreksi nama</h2></div>${c.audit?.length ? `<div class="table-wrap"><table><thead><tr><th>Unit</th><th>Nama awal</th><th>Nama baru</th><th>Alasan</th><th>Pengelola dan waktu</th></tr></thead><tbody>${c.audit.map((x) => `<tr><td>${esc(c.byCode.get(x.asset_code)?.code || x.asset_code)}</td><td>${esc(x.previous)}</td><td>${esc(x.replacement)}</td><td>${esc(x.reason)}</td><td>${esc(x.actor)}<small class="block">${stamp(x.corrected_at)}</small></td></tr>`).join('')}</tbody></table></div>` : empty('Belum ada koreksi nama', 'Untuk membetulkan nama, buka peminjaman pada halaman riwayat.')}</section>`
  );
}
