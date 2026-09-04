# 📦 Integrasi Fitur: Kalkulator Anggaran Gizi

## File yang Perlu Dimodifikasi

### 1. `style.css` — Tambah CSS baru
Paste seluruh isi `budget-gizi-addon.css` ke **bagian paling bawah** file `style.css`.

---

### 2. `script.js` — 3 tempat yang perlu diubah

#### A. Tambah menu ke `userNav` (sekitar baris 181)
```js
const userNav = [
  { id: 'katalog-gizi',   icon: 'fa-bowl-food',  label: 'Katalog Gizi' },
  { id: 'kalkulator',     icon: 'fa-calculator', label: 'Kalkulator' },
  { id: 'kalkulator-abdi',icon: 'fa-user-tie',   label: 'Kalkulator Abdi Negara' },
  { id: 'budget-gizi',    icon: 'fa-wallet',     label: 'Anggaran Gizi' },  // ← TAMBAH INI
  { id: 'request-user',   icon: 'fa-paper-plane',label: 'Request Makanan' },
];
```

#### B. Tambah judul ke `titles` di dalam fungsi `navigateTo()` (sekitar baris 237)
```js
const titles = {
  // ... yang sudah ada ...
  'budget-gizi': 'Kalkulator Anggaran Gizi',  // ← TAMBAH INI
};
```

#### C. Tambah renderer ke objek `pageRenderers`
Cari baris `'katalog-diet': async (el) => {` dan pastikan sebelum penutup `};` dari objek `pageRenderers`,
paste seluruh isi `budget-gizi-addon.js`.

---

## Cara Kerja Algoritma

### Greedy Nutrition Optimizer (3 Fase)

| Fase | Prioritas | Logika |
|------|-----------|--------|
| **1. Protein** | Protein/Harga tertinggi | Pilih bahan protein paling cost-efficient sampai target protein terpenuhi |
| **2. Karbohidrat** | Kalori/Harga tertinggi | Isi sisa budget dengan karbo untuk energi (nasi, oatmeal, ubi) |
| **3. Sayur & Buah** | FIFO | Tambahkan sayur dan buah dari sisa budget untuk nutrisi mikro |

### Database Bahan (17 item lokal)
- **Protein:** Telur, Tahu, Tempe, Dada Ayam Pasar, Ikan Kembung, Kacang Tanah, Tahu Goreng
- **Karbohidrat:** Nasi Putih, Nasi Merah, Roti Tawar, Ubi Jalar, Oatmeal
- **Buah:** Pisang, Pepaya
- **Sayur:** Bayam, Kangkung
- **Lainnya:** Susu Kotak UHT

### Preferensi Filter
- **Semua** → seluruh database
- **Ikan & Nabati** → exclude ayam/daging, include ikan
- **Vegetarian** → hanya telur, tahu, tempe, kacang

---

## Fitur Unggulan

- 🎯 **Real-time protein progress bar** dengan persentase pencapaian
- 📅 **Auto-generate jadwal makan** (sarapan/siang/malam/cemilan)
- 💡 **Tips hemat adaptif** berdasarkan hasil kalkulasi
- 💰 **Budget presets** (Rp 15rb - 75rb) + protein presets
- 📊 **Summary cards** (kalori, protein, biaya, sisa budget)
- 📱 **Responsive** — panel input sticky di desktop, stack di mobile
