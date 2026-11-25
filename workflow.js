export const stageLabels = {
  available:'Tersedia', requested:'Peminjaman diajukan', borrowed:'Dipinjam',
  return_requested:'Pengajuan pengembalian', returned:'Dikembalikan',
};

export function loanStage(loan) {
  if (!loan) return 'available';
  if (loan.returned_at) return 'returned';
  if (loan.return_requested_at) return 'return_requested';
  if (loan.requested_at && !loan.borrow_approved_by) return 'requested';
  return 'borrowed';
}
export function latestEvent(loan) {
  return loan.returned_at || loan.return_requested_at || loan.borrowed_at || loan.requested_at;
}
