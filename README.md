# PinjamBalik · InvenP23

[Buka dashboard peminjaman](https://gekson0101.github.io/InvenP23/).

InvenP23 menyajikan dashboard, inventaris, label QR, dan formulir peminjaman serta pengembalian. Siapa saja yang membuka dashboard dapat melihat riwayat. Petugas piket memindai label aset, mengisi formulir, lalu memasukkan kode akses pribadi untuk mencatat peminjaman atau pengembalian.

## Hosting dan data

GitHub Pages menerbitkan berkas statis dari direktori utama cabang `main`. Aplikasi mengambil data terbaru melalui HTTPS dari layanan PinjamBalik di ChatGPT Sites. Layanan tersebut memverifikasi kode petugas, menyimpan riwayat di basis data bersama, dan menyediakan halaman masuk pengelola. Label yang sudah dicetak tetap menggunakan basis data yang sama.

Setiap unit memiliki tautan langsung berbentuk `#/aset/KODE-UNIT`. Tautan ini dapat dibuka langsung atau dimuat ulang dari peramban ponsel.
