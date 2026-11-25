const paths = {
  dashboard:
    '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  box: '<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 5v9l9 5 9-5V8M12 13v9M7.5 5.5l9 5"/>',
  history: '<path d="M3 11a9 9 0 1 1 2.6 7M3 5v6h6M12 7v5l3.5 2"/>',
  qr: '<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><path d="M14 14h3v3h4v4h-3m-4-3v3m7-9v2"/>',
  scan: '<path d="M3 9V5a2 2 0 0 1 2-2h4m6 0h4a2 2 0 0 1 2 2v4m0 6v4a2 2 0 0 1-2 2h-4m-6 0H5a2 2 0 0 1-2-2v-4M5 12h14"/>',
  return: '<path d="m8 4-5 5 5 5M3 9h11a6 6 0 0 1 0 12h-3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  available: '<circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/>',
  borrowed:
    '<path d="M3 20h4l3 1h4l7-5a1.6 1.6 0 0 0-2-2.4L15 16h-4m-7 1 3-4h5l3 1a1.1 1.1 0 0 1 0 2M3 15v5M9 4l5-2 5 2v5l-5 2-5-2V4Zm0 0 5 2 5-2m-5 2v5"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  filter:
    '<path d="M3 6h18M6 12h12m-9 6h6"/><circle cx="8" cy="6" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/>',
  shield:
    '<path d="m12 2 8 3v6c0 5-3.5 8.4-8 11-4.5-2.6-8-6-8-11V5l8-3Z"/><path d="m9 12 2 2 4-5"/>',
  user: '<circle cx="12" cy="8" r="3.4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  close: '<path d="m6 6 12 12m0-12L6 18"/>',
  location:
    '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  printer: '<path d="M6 8V3h12v5M6 17H3v-7h18v7h-3"/><path d="M7 14h10v7H7zM17 11h1"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4"/>',
  image:
    '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1.4"/><path d="m3 17 5-5 4 4 3-3 6 6"/>',
  camera:
    '<path d="M4 6h4l2-3h4l2 3h4a1 1 0 0 1 1 1v13H3V7a1 1 0 0 1 1-1Z"/><circle cx="12" cy="12.5" r="4"/>',
  plus: '<path d="M12 4v16M4 12h16"/>',
  list: '<path d="M9 6h12M9 12h12M9 18h12M3 6h1m-1 6h1m-1 6h1"/>',
  activity: '<path d="M2 12h4l3-7 5 14 3-7h5"/>',
  flag: '<path d="M5 21V4m0 1c5-4 9 4 15 0v9c-6 4-10-4-15 0"/>',
  screwdriver:
    '<path d="m3 20 2 1 9-9-2-2-9 10ZM12 8l2-2 1 .5 4-4 2 2-4 4 .5 1-2 2-3.5-3.5Z"/><path d="m5 18 1 1"/>',
  hammer: '<path d="m3 19 8-9 3 3-8 9-3-3Zm6-12 3-4 4 1 5 5-3 3-3-3-2 2-4-4Z"/>',
  ruler:
    '<path d="m2 16 14-14 6 6L8 22l-6-6Z"/><path d="m14 5 2 2m-5 1 1.5 1.5M8 11l2 2m-5 1 1.5 1.5"/>',
  pliers:
    '<path d="m9 11-6 9m11-9 7 9m-9-8L7 7l1-5 3 4 2 1 2-1 2-4 1 5-5 5"/><circle cx="12" cy="11" r="1.7"/>',
  scissors:
    '<circle cx="5.5" cy="6" r="3"/><circle cx="5.5" cy="18" r="3"/><path d="m8 8 12 12M8 16 20 4"/>',
  stapler: '<path d="m3 10 14-5 3 3-13 6-4-4Zm1 3 2 5h15v2H4l-1-6"/>',
  wrench: '<path d="M14 4a5 5 0 0 0-6 6l-6 7a2.8 2.8 0 0 0 4 4l7-7a5 5 0 0 0 6-6l-3 3-3-3 3-4Z"/>',
  zap: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 5h8v4H8z"/><circle cx="12" cy="15" r="2.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.2"/>',
  tag: '<path d="M3 3h8l10 10-8 8L3 11V3Z"/><circle cx="7.5" cy="7.5" r="1"/>',
  archive: '<path d="M4 9h16v12H4zM2 4h20v5H2zM9 13h6"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/>',
  ledger: '<path d="M6 3h13v18H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm0 14h13M8 7h7m-7 4h5"/>',
};
export const icon = (key, size = 20) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[key] || paths.box}</svg>`;
export const esc = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (s) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[s],
  );
export const dt = (iso, options) =>
  iso
    ? new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', ...options }).format(
        new Date(iso),
      )
    : '—';
export const dayKey = (iso) => new Date(Date.parse(iso) + 7 * 3600000).toISOString().slice(0, 10);
export const shortDate = (iso) => dt(iso, { day: '2-digit', month: 'short', year: 'numeric' });
export const time = (iso) => dt(iso, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
export const stamp = (iso) => (iso ? shortDate(iso) + ' · ' + time(iso) + ' WIB' : '—');
export const assetPath = (code) => '/aset/' + encodeURIComponent(code);
export const badge = (status) =>
  `<span class="badge ${{ Tersedia: 'green', Dipinjam: 'amber', Dikembalikan: 'blue', Diarsipkan: 'gray', 'Peminjaman diajukan': 'pending', 'Pengajuan pengembalian': 'pending-return' }[status]}"><i></i>${esc(status)}</span>`;
export const tile = (a) =>
  `<span class="asset-icon tone-${{ Perkakas: 'blue', 'Alat ukur': 'purple', ATK: 'rose', Elektronik: 'teal', 'AUDIO VIDEO': 'purple', JARINGAN: 'teal', 'LAIN LAIN': 'blue' }[a.category] || 'blue'}">${icon(a.icon, 22)}</span>`;
export const empty = (title, detail = '') =>
  `<div class="empty">${icon('box', 25)}<strong>${esc(title)}</strong>${detail ? '<span>' + esc(detail) + '</span>' : ''}</div>`;
export const statuses = (filter, values) =>
  values
    .map(
      (x) =>
        `<option value="${esc(x[0])}"${filter === x[0] ? ' selected' : ''}>${esc(x[1])}</option>`,
    )
    .join('');
export const searchBox = (section, value, placeholder = 'Cari aset atau peminjam…') =>
  `<label class="searchbox">${icon('search', 18)}<input id="search-${section}" type="search" data-search="${section}" value="${esc(value)}" aria-label="Pencarian" placeholder="${esc(placeholder)}"></label>`;
export const selectBox = (s, value, opts) =>
  `<label class="filterbox">${icon('filter', 15)}<select data-filter="${s}" aria-label="Filter status">${statuses(value, opts)}</select></label>`;
export function dutyCodeField(prefix) {
  return `<label class="field" for="${prefix}-officer">Kode akses petugas piket<input id="${prefix}-officer" name="accessCode" type="password" autocomplete="off" autocapitalize="characters" spellcheck="false" enterkeyhint="done" placeholder="Masukkan kode piket Anda" maxlength="64" required></label>`;
}
export function borrowerFields(prefix, returning = false) {
  const label = returning ? 'Nama pengembali' : 'Nama peminjam';
  return `<div class="borrower-fields"><label class="field" for="${prefix}-borrower">${label}<input id="${prefix}-borrower" name="${returning ? 'returner' : 'borrower'}" type="text" autocomplete="name" enterkeyhint="next" placeholder="Masukkan ${label.toLowerCase()}" maxlength="80" required></label>
    <label class="field" for="${prefix}-work-unit">Unit kerja<input id="${prefix}-work-unit" name="${returning ? 'returnWorkUnit' : 'workUnit'}" type="text" autocomplete="organization" enterkeyhint="next" placeholder="Contoh P23" maxlength="80" required></label>
    ${dutyCodeField(prefix)}</div>`;
}
export function pager(total, active, size, section) {
  const pages = Math.max(1, Math.ceil(total / size));
  if (pages === 1) return '';
  return `<div class="pager"><span>Halaman ${active} dari ${pages}</span><div><button class="btn small" data-page="${section}" data-num="${active - 1}" ${active === 1 ? 'disabled' : ''}>Sebelumnya</button><button class="btn small" data-page="${section}" data-num="${active + 1}" ${active === pages ? 'disabled' : ''}>Berikutnya</button></div></div>`;
}
