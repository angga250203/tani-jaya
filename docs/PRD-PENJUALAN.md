# PRD — Modul Penjualan Tani Jaya

**Project:** Sistem Informasi Manajemen Tani Jaya  
**Modul:** Penjualan  
**Versi:** 1.1 — Final P0  
**Status:** Final untuk acuan implementasi

## 1. Tujuan

Modul Penjualan dipakai Admin Tani Jaya untuk menjual stok sayur yang sebelumnya dibeli dari petani. Sistem mencatat pemilihan stok, harga jual, potongan penjualan, pengiriman, pembayaran tunai, piutang, cicilan, serta nota digital dan cetak.

Alur utamanya:

```text
Pembelian dari petani → Stok per komoditas/grade → Penjualan → Pembayaran/piutang → Laporan
```

Modul ini merupakan bagian dari website Tani Jaya yang sama, bukan aplikasi terpisah.

## 2. Pengguna

Hanya ada satu pengguna: **Admin Tani Jaya**.

Admin dapat membuat, melihat, mencari, mengedit, membatalkan, dan menghapus transaksi sesuai aturan pada dokumen ini.

## 3. Ruang lingkup P0

- Melihat dan memilih stok hasil pembelian.
- Membuat transaksi/nota penjualan multi-komoditas.
- Menetapkan grade stok: SP, TG, dan BR.
- Mencatat potongan, harga jual per kg, dan nilai penjualan.
- Mencatat pembeli manual pada setiap transaksi.
- Mencatat pengambilan sendiri atau pengiriman ekspedisi.
- Mencatat pembayaran lunas, DP/titip, utang, cicilan, dan pelunasan.
- Menampilkan nota digital serta mencetak/mengunduhnya.
- Mencari riwayat transaksi.
- Menampilkan laporan penjualan per bulan.

## 4. Aturan stok

### 4.1 Sumber dan ketersediaan stok

- Stok penjualan hanya berasal dari transaksi pembelian petani yang sudah disimpan.
- Stok langsung tersedia untuk dijual setelah pembelian disimpan, meskipun transaksi pembelian tersebut belum dibayar kepada petani.
- Stok memakai **berat kotor/fisik sebelum potongan pembelian**.
- Potongan pembelian hanya memengaruhi nilai pembelian kepada petani, bukan jumlah stok fisik.
- Saat penjualan disimpan, stok berkurang berdasarkan berat kotor/fisik yang keluar.
- Potongan penjualan hanya memengaruhi nilai yang ditagihkan kepada pembeli, bukan pengurangan stok kedua kali.

Contoh:

```text
Pembelian: 100 kg timun, potongan beli 5 kg
→ Stok bertambah 100 kg

Penjualan: 100 kg timun, potongan jual 4 kg
→ Stok berkurang 100 kg
→ Nilai nota = 96 kg × harga jual/kg
```

### 4.2 Grade kualitas

Setiap baris komoditas pada pembelian memiliki satu grade:

| Kode | Nama |
|---|---|
| SP | Super |
| TG | Tanggung |
| BR | Barang jelek |

- Jika satu petani membawa komoditas dengan grade berbeda, Admin membuat beberapa baris komoditas dalam transaksi pembelian yang sama.
- Grade melekat pada stok yang masuk dan dipakai saat pemilihan stok untuk penjualan.
- Nama petani tetap tersimpan untuk penelusuran stok internal, tetapi **tidak ditampilkan pada nota pembeli**.

### 4.3 Cara memilih stok

**Barang per karung/peti**

- Stok tampil per komoditas, grade, petani asal, dan unit karung/peti.
- Admin mencentang setiap karung/peti yang ingin dijual.
- Tersedia aksi `Pilih semua stok petani` yang hanya memilih unit yang masih tersedia.
- Karung/peti adalah unit utuh dan tidak boleh dijual sebagian.

**Barang timbang total langsung**

- Stok tampil per komoditas, grade, dan petani asal dengan total kg yang masih tersedia.
- Admin dapat mengisi jumlah kg yang diambil dari masing-masing petani.
- Jumlah yang dijual tidak boleh melebihi stok tersedia dari petani tersebut.
- Satu penjualan dapat mengambil komoditas yang sama dari beberapa petani.

## 5. Proses transaksi penjualan

1. Admin membuka menu **Transaksi** dan memilih tab **Penjualan**.
2. Admin memilih `+ Penjualan Baru`.
3. Admin memilih stok yang akan dijual, per komoditas dan grade.
4. Sistem membentuk baris penjualan berdasarkan komoditas dan grade.
5. Admin mengisi nama pembeli, harga jual/kg, potongan jual, dan data pengiriman bila diperlukan.
6. Admin memilih status pembayaran dan mengisi nominal pembayaran awal bila ada.
7. Sistem menghitung total nota, uang diterima, serta sisa piutang.
8. Setelah disimpan, stok berkurang dan nota digital dibuat.

Satu nota dapat memiliki banyak komoditas. Komoditas yang sama tetapi gradenya berbeda harus tampil sebagai baris yang berbeda.

## 6. Data transaksi

### 6.1 Pembeli

- Nama pembeli diketik manual pada setiap transaksi.
- Tidak ada profil pembeli tetap pada P0.
- Jenis tujuan pembeli dapat dicatat pada transaksi: pembeli umum, penimbang/pengepul, atau pasar.

### 6.2 Detail barang

Setiap baris penjualan menyimpan minimal:

- komoditas;
- grade (SP/TG/BR);
- stok asal yang dipilih untuk keperluan internal;
- berat kotor;
- potongan penjualan dalam kg;
- berat bersih;
- harga jual per kg;
- subtotal.

Rumus:

```text
berat bersih = berat kotor − potongan jual
subtotal = berat bersih × harga jual per kg
```

Potongan tidak boleh lebih besar dari berat kotor.

### 6.3 Pengiriman

Pilihan pengiriman:

- **Diambil pembeli/pengepul:** pembeli atau pengepul mengambil barang di toko.
- **Ekspedisi:** barang dikirim ke pasar menggunakan truk/ekspedisi.

Jika memakai ekspedisi, Admin mencatat:

- nama ekspedisi/truk;
- tarif ekspedisi per kg.

Biaya ekspedisi merupakan **pengeluaran Tani Jaya**, tidak ditambahkan ke tagihan pembeli. Perhitungannya memakai berat kotor yang dikirim:

```text
biaya ekspedisi = berat kotor dikirim × tarif ekspedisi/kg
```

Biaya ekspedisi merupakan data operasional internal Tani Jaya. Tarif dan total biaya ekspedisi ditampilkan pada detail transaksi untuk Admin, tetapi tidak ditampilkan pada nota yang diberikan kepada pembeli.

### 6.4 Nomor nota penjualan

Setiap transaksi penjualan memiliki nomor nota unik yang dibuat otomatis oleh sistem.

Format:

```text
PJ-YYYYMMDD-NNNN
```

Contoh:

```text
PJ-20260921-0001
```

Keterangan:

- `PJ` = Penjualan;
- `YYYYMMDD` = tanggal transaksi;
- `NNNN` = nomor urut transaksi pada tanggal tersebut.

Nomor nota tidak diinput manual oleh Admin dan digunakan untuk pencarian transaksi, detail transaksi, nota digital/cetak, serta referensi pembayaran.

## 7. Pembayaran dan piutang

Semua pembayaran dicatat sebagai **tunai**.

| Pilihan saat membuat nota | Uang diterima awal | Status awal |
|---|---:|---|
| Lunas | Sama dengan total nota | Lunas |
| DP/Titip | Diisi Admin, lebih kecil dari total nota | Belum lunas |
| Utang | Rp0 | Belum lunas |

- Nota belum lunas dapat dibayar bertahap melalui aksi `Cicil` atau sekaligus melalui aksi `Lunas`.
- Setiap pembayaran menyimpan tanggal, nominal, dan sisa tagihan setelah pembayaran.
- Pembayaran selalu dihubungkan ke **satu nota** tertentu agar piutang tidak tercampur.
- Status berubah otomatis menjadi `Lunas` ketika sisa tagihan mencapai Rp0.

## 8. Nota penjualan

Sistem menyediakan nota digital yang dapat dibuka, dicetak, dan diunduh.

Nota untuk pembeli minimal berisi:

- identitas Tani Jaya;
- nomor nota dan tanggal;
- nama pembeli;
- daftar barang: komoditas, grade, berat kotor, potongan, berat bersih, harga/kg, dan subtotal;
- total nota;
- total pembayaran yang sudah diterima;
- sisa utang, jika ada;
- status pembayaran;
- metode pengiriman.

Jika metode pengiriman adalah ekspedisi, nota pembeli cukup menampilkan bahwa metode pengiriman adalah **Ekspedisi**. Tarif dan biaya ekspedisi tidak ditampilkan pada nota pembeli karena merupakan biaya operasional internal Tani Jaya.

Nama petani atau sumber stok tidak boleh ditampilkan di nota pembeli.

Pada halaman detail transaksi untuk Admin, sistem tetap menampilkan data pengiriman internal berupa nama ekspedisi/truk, tarif ekspedisi per kg, berat fisik yang dikirim, dan total biaya ekspedisi.

## 9. Riwayat, edit, hapus, dan pembatalan

Riwayat penjualan dapat dicari atau difilter berdasarkan:

- nama pembeli;
- tanggal;
- nomor nota;
- status pembayaran (lunas atau belum lunas);
- komoditas dan grade.

Transaksi yang belum memiliki pembayaran dapat diedit atau dihapus apabila terjadi kesalahan input.

### Penghapusan

- Penghapusan bersifat permanen dan memerlukan konfirmasi.
- Penghapusan hanya diperbolehkan jika transaksi belum memiliki riwayat pembayaran.
- Penghapusan harus mengembalikan stok yang sebelumnya keluar.

### Transaksi yang sudah memiliki pembayaran

Jika transaksi sudah memiliki minimal satu pembayaran:

- transaksi tidak boleh dihapus permanen;
- riwayat pembayaran tidak boleh dihapus;
- transaksi dapat dibatalkan atau dikoreksi;
- alasan pembatalan/koreksi harus disimpan;
- stok yang sudah keluar harus dihitung ulang/dikembalikan sesuai perubahan transaksi;
- transaksi dan riwayat pembayaran tetap dapat ditelusuri.

Penanganan pengembalian uang/refund kepada pembeli belum diotomatisasi pada P0.

Fitur retur barang belum termasuk P0.

## 10. Laporan penjualan bulanan

Laporan dipilih per bulan dan minimal menampilkan:

- jumlah nota penjualan;
- total berat fisik keluar;
- total berat bersih penjualan;
- total nilai penjualan;
- total uang yang sudah diterima;
- total piutang pembeli.

Definisi:

- **Berat fisik keluar** = berat kotor barang yang benar-benar keluar dari stok.
- **Berat bersih penjualan** = berat setelah potongan penjualan yang digunakan dalam perhitungan nilai nota.

Biaya ekspedisi tetap tersimpan pada transaksi sebagai data operasional internal, tetapi belum menjadi ringkasan wajib laporan P0.

Perhitungan keuntungan, margin, dan laba tidak termasuk P0.

## 11. Navigasi dan halaman

Navigasi bawah untuk penggunaan HP:

```text
Dashboard | Jadwal | Transaksi | Stok | Lainnya
```

Halaman **Transaksi** memiliki tab:

```text
[ Pembelian ] [ Penjualan ]
```

- Tab default adalah **Pembelian**.
- Tab Penjualan menampilkan riwayat penjualan dan filter `Semua`, `Belum Lunas`, `Lunas`.
- Tombol aksi berubah sesuai tab: `+ Pembelian Baru` atau `+ Penjualan Baru`.
- Halaman/detail lanjutan untuk transaksi baru, nota, dan pembayaran tidak menjadi menu navigasi utama.

Halaman utama yang diperlukan untuk penjualan:

1. Stok
2. Transaksi — tab Penjualan
3. Form Penjualan Baru
4. Detail Nota Penjualan
5. Form/riwayat pembayaran pada nota

Dashboard utama tetap merupakan ringkasan gabungan pembelian dan penjualan.

## 12. Validasi utama

- Hanya stok tersedia yang dapat dipilih.
- Karung/peti tidak dapat dijual sebagian.
- Jumlah kg timbang langsung tidak boleh melebihi stok petani asal.
- Berat dan potongan menggunakan kg bulat.
- Harga jual per kg wajib diisi.
- Potongan penjualan tidak boleh melebihi berat kotor.
- Pembayaran awal tidak boleh melebihi total nota.
- Cicilan tidak boleh melebihi sisa tagihan.
- Transaksi yang dihapus harus mengembalikan stok sesuai barang yang sebelumnya keluar.
- Transaksi yang sudah memiliki riwayat pembayaran tidak boleh dihapus permanen.

## 13. Di luar cakupan saat ini

- Profil pembeli tetap/CRM pembeli.
- Transfer bank atau e-wallet.
- Retur barang.
- Nomor resi atau integrasi ekspedisi.
- WhatsApp API.
- Perhitungan dan dashboard keuntungan.
- QR code atau pemindaian QR.
- Akun pembeli/petani dan pembayaran otomatis.
- Otomatisasi refund/pengembalian uang kepada pembeli.

## 14. Kriteria keberhasilan demo

1. Admin dapat melihat stok timun SP/TG/BR per petani dan per karung.
2. Admin dapat menjual beberapa karung dari petani berbeda dalam satu nota.
3. Nota menampilkan grade, harga yang berbeda bila perlu, dan tidak menampilkan nama petani.
4. Stok berkurang sesuai berat fisik yang keluar, tanpa terpotong dua kali.
5. Admin dapat membuat nota lunas, DP/titip, dan utang.
6. Admin dapat mencatat cicilan sampai nota menjadi lunas.
7. Admin dapat melihat serta mencari nota belum lunas.
8. Admin dapat mengedit atau menghapus transaksi yang belum memiliki pembayaran dan stok dihitung ulang.
9. Transaksi yang sudah memiliki pembayaran tidak dapat dihapus permanen dan tetap dapat ditelusuri melalui mekanisme pembatalan/koreksi.
10. Laporan bulanan menampilkan total berat fisik keluar dan total berat bersih penjualan secara terpisah.
