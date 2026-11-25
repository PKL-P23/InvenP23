import { icon, dt, dayKey } from './view.js';
import { loanStage } from './workflow.js';

const states = [
  ['requested', 'Diajukan'], ['borrowed', 'Dipinjam'],
  ['return_requested', 'Pengajuan kembali'], ['returned', 'Dikembalikan'],
];
const number = new Intl.NumberFormat('id-ID');

export function historyOverview(loans, today = new Date()) {
  const end = dayKey(today.toISOString());
  const days = new Map();
  for (let offset = 6; offset >= 0; offset--) {
    const day = new Date(Date.parse(end + 'T00:00:00Z') - offset * 86400000);
    days.set(day.toISOString().slice(0, 10), 0);
  }
  const counts = { requested:0, borrowed:0, return_requested:0, returned:0 };
  for (const loan of loans) {
    counts[loanStage(loan)]++;
    const day = dayKey(loan.requested_at || loan.borrowed_at);
    if (days.has(day)) days.set(day, days.get(day) + 1);
  }

  const total = number.format(loans.length);
  const tags = `<div class="asset-tickets" aria-hidden="true"><i class="ticket-back"></i><i class="ticket-mid">${icon('qr',24)}</i><i class="ticket-front"><b>${icon('box',25)}</b><em></em><em></em></i></div>`;
  const lead = `<section class="insight-total" aria-labelledby="total-heading"><h2 id="total-heading">${icon('ledger',18)}Total peminjaman</h2>${tags}<div class="insight-value">${total}</div><small>Seluruh periode</small></section>`;

  const max = Math.max(1, ...days.values());
  const bars = Array.from(days, ([date, n]) => {
    const label = dt(date, { weekday:'short' }), full = dt(date, { weekday:'long', day:'numeric', month:'long' });
    const height = Math.max(2, Math.round(56 * n / max));
    return `<li class="${date === end ? 'chart-today' : ''}" aria-label="${full}, ${n} peminjaman" title="${full} · ${n} peminjaman">
      <span class="bar-value" aria-hidden="true">${number.format(n)}</span><svg viewBox="0 0 24 60" aria-hidden="true" preserveAspectRatio="none"><rect x="5" y="${60-height}" width="14" height="${height}" rx="4" class="${n ? 'bar-filled' : 'bar-empty'}"/></svg><span aria-hidden="true">${label}</span></li>`;
  }).join('');
  const start = days.keys().next().value;
  const interval = dt(start,{day:'numeric',month:'short'}) + ' – ' + dt(end,{day:'numeric',month:'short'});
  const activity = `<section class="insight-activity insight-panel"><h2>Aktivitas peminjaman</h2><p>${interval} · WIB</p><ol class="week-bars" aria-label="Jumlah peminjaman per hari dalam tujuh hari terakhir">${bars}</ol></section>`;
  let used = 0;
  const segments = states.map(([key]) => {
    if (!counts[key]) return '';
    const span = counts[key] * 100 / loans.length;
    const arc = `<circle cx="50" cy="50" r="40" pathLength="100" class="arc-${key}" stroke-dasharray="${span} ${100-span}" stroke-dashoffset="${-used}"/>`;
    used += span;
    return arc;
  }).join('');
  const percent = loans.length ? number.format(Math.round(100 * counts.returned / loans.length)) + '%' : '—';
  const legend = states.map(([key,label]) => `<li><i class="key-${key}" aria-hidden="true"></i><span>${label}</span><b>${number.format(counts[key])}</b></li>`).join('');
  const status = `<section class="insight-status insight-panel"><h2>Status peminjaman</h2><div class="status-layout"><div class="status-ring"><svg viewBox="0 0 100 100" aria-hidden="true"><g transform="rotate(-90 50 50)"><circle cx="50" cy="50" r="40" class="arc-base"/>${segments}</g></svg>
    <div><strong>${percent}</strong><small>kembali</small></div></div><ul class="status-legend">${legend}</ul></div></section>`;
  return { lead, activity, status };
}
