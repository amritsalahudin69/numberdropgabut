# Panduan Kustomisasi Game MarbleDrop

Dokumen ini adalah panduan praktis untuk mengubah isi permainan MarbleDrop tanpa membongkar core gameplay yang sudah stabil.

> **Prinsip utama:** untuk kustom level, sebisa mungkin ubah **config/presentation** saja. Jangan mengubah `CollisionResolver`, `CalculationService`, `MarbleDropSession`, physics collider, atau lifecycle kalau tidak benar-benar diperlukan.

---

## 1. Peta Cepat: Mau Ubah Apa, Buka File Mana?

| Yang ingin diubah | File | Bagian yang diubah |
|---|---|---|
| Nilai awal gacoan | `src/config/levels/level1.js` | `startingValue` |
| Maksimum operasi | `src/config/levels/level1.js` | `maxOps` |
| Batas nilai hasil operasi | `src/config/levels/level1.js` | `valueDomain.min / max` |
| Posisi area drop | `src/config/levels/level1.js` | `dropZone` |
| Tambah/kurangi peg/lingkaran | `src/config/levels/level1.js` | `pegs[]` |
| Posisi peg | `src/config/levels/level1.js` | `pegs[].x / y` |
| Besar collider peg | `src/config/levels/level1.js` | `pegs[].radius` |
| Tambah/kurangi gate bergerak | `src/config/levels/level1.js` | `gates[]` |
| Operasi gate | `src/config/levels/level1.js` | `gates[].operator` |
| Angka gate | `src/config/levels/level1.js` | `gates[].operand` |
| Kecepatan gate | `src/config/levels/level1.js` | `gates[].speed` |
| Jarak gerak gate | `src/config/levels/level1.js` | `gates[].range` |
| Tambah/kurangi target bawah | `src/config/levels/level1.js` | `goals[]` |
| Angka karakter target bawah | `src/config/levels/level1.js` | `goals[].value` |
| Operasi ketika gacoan menabrak target | `src/config/levels/level1.js` | `goals[].operator` |
| Posisi target bawah | `src/config/levels/level1.js` | `goals[].x / y` |
| Besar karakter target bawah | `src/entities/Goal.js` | `desiredHeight` |
| Besar visual gacoan | `src/entities/Gacoan.js` | `GACOAN_VISUAL_SIZE` |
| Besar collider gacoan | `src/entities/Gacoan.js` | `GACOAN_COLLIDER_RADIUS` — **jangan ubah untuk sekadar visual** |
| Besar PNG angka pada gate | `src/entities/Gate.js` | `charSize` / faktor `0.6` |
| Besar GIF/PNG collision feedback | `src/config/constants.js` | `FEEDBACK_LOGICAL_SIZE` |
| Lama HOLD/feedback | `src/config/constants.js` | `COLLISION_FEEDBACK_MS` |
| Ganti background | `src/config/visualAssets.js` | `VISUAL_ASSETS.background` |
| Besar kartu TARGET bagian atas | `src/ui/TargetStrip.js` | `sprite.width / sprite.height` |
| Jarak antar TARGET bagian atas | `src/ui/TargetStrip.js` | `spacing` |
| Posisi TARGET strip | `src/ui/TargetStrip.js` | `y` |
| Besar karakter pada Operation Card | `src/ui/OperationCard.js` | `<img ... height: 60px>` |
| Lama Operation Card muncul | `src/ui/OperationCard.js` | `setTimeout(..., 1500)` |
| Posisi Operation Card | `src/ui/OperationCard.js` | CSS `top / left / transform` |
| Besar karakter Start/Target/Final di Result | `src/ui/ResultOverlay.js` | `<img ... height: 80px>` |
| Tampilan Finish Card | `src/ui/ResultOverlay.js` | CSS card |
| File PNG angka | `public/assets/numbers/` | `<value>.png` |
| File GIF angka | `public/assets/gif/` | `<value>.gif` |

---

# 2. File Utama Kustomisasi Level

File yang paling sering Anda ubah:

```text
src/config/levels/level1.js
```

Struktur utamanya:

```js
export const LEVEL_1 = Object.freeze({
  id: 'level-1',

  world: {
    width: 1920,
    height: 1080,
  },

  startingValue: 70,
  maxOps: 6,

  valueDomain: {
    min: 0,
    max: 100,
  },

  dropZone: {
    minX: 58,
    maxX: 1862,
    y: 80,
  },

  pegs: [
    // ...
  ],

  gates: [
    // ...
  ],

  goals: [
    // ...
  ],
});
```

> Setelah Runtime Correction 2, area drop yang benar adalah sekitar `58 .. 1862`. Jika source lama Anda masih berisi `360 .. 1560`, itu adalah konfigurasi sebelum perbaikan posisi kursor.

---

# 3. Mengubah Karakter Awal Gacoan

File:

```text
src/config/levels/level1.js
```

Cari:

```js
startingValue: 70,
```

Contoh ingin mulai dari karakter `75`:

```js
startingValue: 75,
```

Game akan menggunakan:

```text
public/assets/numbers/75.png
```

dan bila GIF tersedia, sistem feedback/UI dapat menggunakan:

```text
public/assets/gif/75.gif
```

## Penting

Kalau Anda mengubah:

```js
startingValue: 101
```

tetapi tidak punya:

```text
public/assets/numbers/101.png
```

boot/asset validation dapat gagal.

---

# 4. Mengubah Besar Visual Gacoan

File:

```text
src/entities/Gacoan.js
```

Cari:

```js
const GACOAN_VISUAL_SIZE = 58;
```

Nilai `58` adalah radius visual.

Ukuran sprite akhirnya:

```js
sprite.width = radiusPx * 2;
sprite.height = radiusPx * 2;
```

Jadi:

```text
58 → visual 116 × 116
70 → visual 140 × 140
80 → visual 160 × 160
```

Contoh:

```js
const GACOAN_VISUAL_SIZE = 70;
```

## Jangan salah ubah collider

Di file yang sama ada:

```js
const GACOAN_COLLIDER_RADIUS = 40;
```

Ini adalah **physics collider**, bukan ukuran karakter.

Kalau hanya ingin karakter terlihat lebih besar/kecil:

```text
UBAH: GACOAN_VISUAL_SIZE
JANGAN UBAH: GACOAN_COLLIDER_RADIUS
```

Mengubah collider dapat mengubah cara gacoan memantul, menyentuh peg, gate, dan target.

---

# 5. Mengubah Maximum Operation

File:

```text
src/config/levels/level1.js
```

Cari:

```js
maxOps: 6,
```

Contoh:

```js
maxOps: 10,
```

Artinya game memberi budget operasi lebih banyak.

## Efek domino penting

Semakin besar `maxOps`, semakin banyak kemungkinan nilai yang bisa tercipta.

Akibatnya, asset PNG yang diperlukan juga bisa bertambah.

---

# 6. `valueDomain`: Batas Nilai yang Boleh Terjadi

File:

```text
src/config/levels/level1.js
```

Contoh:

```js
valueDomain: {
  min: 0,
  max: 100,
},
```

Artinya hasil operasi yang valid hanya `0` sampai `100`.

Ini sangat penting untuk asset.

Misalnya:

```text
startingValue = 70
maxOps = 6
```

dan ada target/gate `+5`, `+6`, `+7`.

Tanpa batas `100`, kombinasi operasi bisa mencapai:

```text
101
102
103
...
```

Sistem kemudian meminta PNG untuk nilai tersebut.

Kalau koleksi karakter Anda hanya `0..100`, gunakan:

```js
valueDomain: {
  min: 0,
  max: 100,
},
```

Jangan pakai:

```js
max: 2000
```

kalau Anda memang tidak memiliki asset nilai sampai 2000.

---

# 7. Operasi Matematika yang Didukung

Core operasi ada di:

```text
src/systems/CalculationService.js
```

Operator yang sudah didukung:

| Operator | Arti |
|---|---|
| `+` | Penjumlahan |
| `-` | Pengurangan |
| `*` | Perkalian |
| `/` | Pembagian |
| `x` / `X` | Dinormalisasi menjadi `*` |
| `:` | Dinormalisasi menjadi `/` |

Contoh:

```text
70 + 5 = 75
70 - 5 = 65
70 * 2 = 140
70 / 2 = 35
```

## Aturan pembagian

Pembagian:

```js
operator: '/',
```

hanya valid jika:

1. pembagi bukan `0`;
2. hasilnya bilangan bulat;
3. hasil masih berada dalam `valueDomain`.

Contoh valid:

```text
70 / 2 = 35
```

Contoh ditolak:

```text
70 / 3 = 23.333...
```

karena sistem hanya menerima hasil integer.

---

# 8. Perbedaan `Gate` dan `Goal`

Ini penting karena sebelumnya sempat membingungkan.

## Gate

`gates[]` adalah objek operasi yang bergerak kiri-kanan.

Contoh:

```js
{
  id: 'gate-1',
  x: 600,
  y: 320,
  operator: '-',
  operand: 1,
  speed: 2,
  range: 300,
  width: 140,
  height: 50
}
```

Artinya:

```text
gacoan 70
kena gate -1
hasil 69
```

## Goal

`goals[]` adalah karakter target fisik di bagian bawah.

Contoh:

```js
{
  id: 'goal-4',
  x: 960,
  y: 960,
  value: 7,
  operator: '+',
  width: 160,
  height: 80
}
```

Artinya:

```text
gacoan 70
kena target karakter 7
operator +
hasil 77
```

Jadi:

```text
Gate:
operator + operand

Goal:
operator + value
```

---

# 9. Mengubah Operasi Ketika Menabrak Target Bawah

File:

```text
src/config/levels/level1.js
```

Bagian:

```js
goals: [
```

Contoh pengurangan:

```js
{
  id: 'goal-1',
  value: 25,
  operator: '-',
}
```

Jika gacoan `70`:

```text
70 - 25 = 45
```

Contoh penambahan:

```js
{
  id: 'goal-2',
  value: 5,
  operator: '+',
}
```

Hasil:

```text
70 + 5 = 75
```

Contoh perkalian:

```js
{
  id: 'goal-3',
  value: 2,
  operator: '*',
}
```

Hasil:

```text
70 × 2 = 140
```

Contoh pembagian:

```js
{
  id: 'goal-4',
  value: 2,
  operator: '/',
}
```

Hasil:

```text
70 ÷ 2 = 35
```

---

# 10. Mengganti Karakter Target Bawah

File:

```text
src/config/levels/level1.js
```

Cari:

```js
goals: [
```

Contoh:

```js
{ id: 'goal-1', x: 120, y: 960, value: 25, operator: '-' }
```

Yang menentukan karakter adalah:

```js
value: 25
```

Kalau ingin karakter `56`:

```js
value: 56
```

Kalau ingin `80`:

```js
value: 80
```

File PNG harus tersedia:

```text
public/assets/numbers/56.png
public/assets/numbers/80.png
```

---

# 11. Menambah atau Mengurangi Target Bawah

Masih di:

```text
src/config/levels/level1.js
```

## Menambah

Tambahkan object baru ke `goals[]`:

```js
{
  id: 'goal-8',
  x: 1850,
  y: 960,
  value: 30,
  operator: '-',
  width: 160,
  height: 80
}
```

## Mengurangi

Hapus satu object dari `goals[]`.

Pastikan setiap:

```js
id
```

unik.

Jangan punya dua target dengan ID sama.

---

# 12. Mengubah Posisi Target Bawah

Dalam `goals[]`:

```js
x: 960,
y: 960,
```

- `x` = posisi horizontal
- `y` = posisi vertikal

World game:

```text
width  = 1920
height = 1080
```

Contoh:

```js
x: 120
```

berarti dekat kiri.

```js
x: 1760
```

berarti dekat kanan.

---

# 13. Mengubah Besar Karakter Target Bawah

File:

```text
src/entities/Goal.js
```

Cari:

```js
const desiredHeight = 180;
```

Inilah ukuran visual karakter target.

Contoh lebih kecil:

```js
const desiredHeight = 140;
```

Contoh lebih besar:

```js
const desiredHeight = 220;
```

## Jangan mengubah `width / height` Goal hanya untuk memperbesar karakter

Di config level:

```js
width: 160,
height: 80,
```

dipakai untuk collider sensor:

```js
ColliderDesc.cuboid(width / 2, height / 2)
```

Jadi untuk visual saja:

```text
UBAH: Goal.js → desiredHeight
JANGAN UBAH: goals[].width / height
```

kecuali memang ingin mengubah area collision target.

---

# 14. Menambah/Mengurangi Gate Bergerak

File:

```text
src/config/levels/level1.js
```

Bagian:

```js
gates: [
```

Contoh:

```js
{
  id: 'gate-1',
  x: 600,
  y: 320,
  operator: '-',
  operand: 1,
  speed: 2,
  range: 300,
  width: 140,
  height: 50
}
```

## Menambah

Tambahkan object baru dengan `id` unik.

## Mengurangi

Hapus object gate yang tidak dibutuhkan.

---

# 15. Mengubah Operasi Gate

Bagian:

```js
operator: '-',
operand: 1,
```

Contoh menjadi penambahan 5:

```js
operator: '+',
operand: 5,
```

Contoh perkalian 2:

```js
operator: '*',
operand: 2,
```

Contoh pembagian 2:

```js
operator: '/',
operand: 2,
```

---

# 16. Mengubah Gerakan Gate

Dalam config gate:

```js
speed: 2,
range: 300,
```

## `speed`

Mengatur kecepatan osilasi kiri-kanan.

Lebih besar:

```text
gerak lebih cepat
```

Lebih kecil:

```text
gerak lebih lambat
```

## `range`

Mengatur seberapa jauh gate bergerak dari titik `x` awal.

Contoh:

```js
x: 600,
range: 300,
```

gate akan bergerak sekitar titik awal `600` dengan amplitudo `300`.

---

# 17. Mengubah PNG Karakter pada Gate

Gate sekarang menggunakan PNG berdasarkan:

```js
operand
```

Contoh:

```js
operator: '-',
operand: 7,
```

visual gate menggunakan karakter:

```text
public/assets/numbers/7.png
```

File rendering:

```text
src/entities/Gate.js
```

Bagian ukuran visual PNG:

```js
const charSize = Math.min(width, height) * 0.6;
```

Kalau ingin PNG operand pada gate lebih besar, ubah faktor:

```js
0.6
```

misalnya:

```js
const charSize = Math.min(width, height) * 0.8;
```

## Jangan ubah `width / height` hanya untuk memperbesar PNG

Karena:

```js
width / height
```

juga menentukan collider gate.

Untuk memperbesar PNG saja, ubah faktor `0.6`.

---

# 18. Peg / Lingkaran Obstacle

File:

```text
src/config/levels/level1.js
```

Bagian:

```js
pegs: [
```

Contoh:

```js
{
  id: 'peg-1',
  x: 960,
  y: 250,
  radius: 15
}
```

## Tambah peg

Tambahkan object baru:

```js
{ id: 'peg-21', x: 1000, y: 700, radius: 15 }
```

## Kurangi peg

Hapus object dari `pegs[]`.

## Ubah posisi

Ubah:

```js
x
y
```

## Ubah besar lingkaran

Ubah:

```js
radius
```

Tetapi hati-hati:

```text
radius peg = visual radius + physics collider radius
```

Jadi mengubah `radius` **mengubah physics**, bukan hanya visual.

Setelah mengubah radius/layout peg, test gacoan agar tidak mudah nyangkut.

---

# 19. Anti-Stall Gacoan pada Peg

Setelah Runtime Correction, game mempunyai:

```text
src/systems/GacoanStallGuard.js
```

Fungsinya mencegah gacoan menetap/nyangkut di atas peg.

Kontrak terakhir:

```text
stall interval ≈ 700 ms
minimum horizontal escape ≈ 0.4 m/s
deteksi peg-aware
aktif hanya saat FALLING
```

Untuk kustom level normal:

```text
JANGAN ubah StallGuard
```

Kalau Anda mengubah besar peg/radius secara ekstrem, baru lakukan runtime test ulang.

---

# 20. Area Drop / Posisi Jatuh Sesuai Kursor

File:

```text
src/config/levels/level1.js
```

Setelah perbaikan:

```js
dropZone: {
  minX: 58,
  maxX: 1862,
  y: 80,
},
```

`y` adalah tinggi spawn gacoan.

Jangan mempersempit lagi menjadi:

```js
360 .. 1560
```

kalau ingin posisi jatuh tetap mengikuti kursor hampir di seluruh layar.

---

# 21. TARGET Strip Bagian Atas

File:

```text
src/ui/TargetStrip.js
```

TargetStrip mengambil data langsung dari:

```js
level.goals
```

Jadi bila Anda menambah/mengurangi `goals[]`, daftar TARGET atas ikut berubah.

## Besar karakter

Cari:

```js
sprite.width = 48;
sprite.height = 48;
```

Contoh lebih besar:

```js
sprite.width = 64;
sprite.height = 64;
```

## Jarak antar target

Cari:

```js
const spacing = 160;
```

## Posisi vertikal

Cari:

```js
const y = 60;
```

---

# 22. Target Utama / Kondisi Success

Current gameplay memakai:

```text
level.targetValue
```

jika tersedia.

Pada beberapa versi current config, `targetValue` belum ditulis eksplisit dan Result/Completion dapat fallback ke:

```text
goals[0].value
```

Artinya goal pertama dapat menjadi target utama.

Untuk menghindari kebingungan ketika membuat level baru, periksa apakah `LEVEL_1` Anda sudah punya:

```js
targetValue: 25,
```

Jika Anda menambahkan/mengubah `targetValue`, pastikan PNG untuk nilai tersebut tersedia dan jalankan validation.

> Jangan menganggap semua UI mempunyai fallback yang sama. Karena itu `targetValue` eksplisit lebih mudah dipahami saat kustom level.

---

# 23. Besar Efek GIF Setelah Collision

File:

```text
src/config/constants.js
```

Cari:

```js
export const FEEDBACK_LOGICAL_SIZE = 500;
```

Inilah ukuran logical GIF/PNG feedback.

Contoh lebih kecil:

```js
export const FEEDBACK_LOGICAL_SIZE = 300;
```

Contoh lebih besar:

```js
export const FEEDBACK_LOGICAL_SIZE = 600;
```

Jangan ubah:

```js
DESIGN_WIDTH
DESIGN_HEIGHT
```

untuk mengubah besar GIF.

---

# 24. Lama Efek / HOLD

Masih di:

```text
src/config/constants.js
```

Cari:

```js
export const COLLISION_FEEDBACK_MS = 5000;
```

`5000` = 5 detik.

**Peringatan:** ini bukan sekadar durasi visual. Nilai tersebut juga terhubung ke lifecycle HOLD collision.

Kalau Anda cuma ingin GIF lebih besar/kecil:

```text
UBAH FEEDBACK_LOGICAL_SIZE
```

Jangan ubah `COLLISION_FEEDBACK_MS`.

---

# 25. Operation Card Setelah Menabrak Target

File:

```text
src/ui/OperationCard.js
```

Card menampilkan:

```text
previousValue operator operand = nextValue
```

Contoh:

```text
70 + 7 = 77
```

dengan karakter PNG/GIF.

## Besar karakter

Cari HTML:

```html
height: 60px;
```

Ada pada image:

- previousValue
- operand
- nextValue

Ubah semua secara konsisten.

Contoh:

```text
60px → 90px
```

## Posisi card

Cari CSS:

```css
top: 50%;
left: 50%;
transform: translate(-50%, -50%);
```

## Lama tampil

Cari:

```js
}, 1500);
```

`1500` = 1.5 detik.

Contoh 2 detik:

```js
}, 2000);
```

---

# 26. Finish / Result Card

File:

```text
src/ui/ResultOverlay.js
```

Result card menampilkan:

```text
SUCCESS / FAILED
START
TARGET
FINAL
OPS
COMPLETION REASON
OPERATION RECAP
Restart
Export JSON
```

## Besar karakter START / TARGET / FINAL

Cari:

```html
height: 80px;
```

di `_renderCharacterCard()`.

Contoh:

```text
80px → 120px
```

## Ukuran keseluruhan card

Cari:

```css
padding: 32px;
max-width: 700px;
max-height: 85vh;
```

## Ukuran status SUCCESS/FAILED

Cari:

```css
font-size: 32px;
```

## Restart dan Export JSON

Logic callback jangan diubah bila hanya ingin styling.

---

# 27. Mengganti Background

File:

```text
src/config/visualAssets.js
```

Contoh current:

```js
export const VISUAL_ASSETS = Object.freeze({
  background: '/assets/marbledrop/background/Artboard 15.png',
  peg: null,
  gate: null,
  goal: null,
  effects: null,
});
```

Untuk ganti background:

```js
background: '/assets/marbledrop/background/bgbaru.png',
```

Lalu taruh file di:

```text
public/assets/marbledrop/background/bgbaru.png
```

Jangan mengubah `BackgroundLayer.js` hanya untuk mengganti gambar.

---

# 28. Folder Asset Angka

PNG canonical:

```text
public/assets/numbers/<value>.png
```

Contoh:

```text
public/assets/numbers/5.png
public/assets/numbers/70.png
public/assets/numbers/100.png
```

GIF optional:

```text
public/assets/gif/<value>.gif
```

Contoh:

```text
public/assets/gif/70.gif
```

Kontrak:

```text
PNG = wajib
GIF = optional
```

Jika GIF tidak tersedia, sistem dapat fallback ke PNG untuk presentation yang mendukung fallback.

---

# 29. Kenapa Boot Bisa Meminta PNG yang Tidak Anda Tulis Langsung?

Game menghitung **reachable values**.

Sumbernya:

```text
src/game/MarbleDropRules.js
```

Required number assets terdiri dari:

```text
startingValue
+ semua goals[].value
+ semua gates[].operand
+ semua hasil operasi yang mungkin tercapai sampai maxOps
+ targetValue jika ada
```

Contoh:

```text
startingValue = 70
maxOps = 6
```

Jika ada operasi berulang:

```text
+5
+7
```

maka nilai yang tidak terlihat langsung di config tetap bisa terbentuk.

Contoh:

```text
70 + 5 + 5 + 7 + 7 + 7 = 101
```

Maka jika domain mengizinkan `101`, game meminta:

```text
public/assets/numbers/101.png
```

---

# 30. Solusi `Boot Failure: PNG asset missing for value ...`

Contoh:

```text
PNG asset missing for value: 101
```

Ada dua solusi benar.

## Solusi A — Anda memang ingin nilai 101 bisa terjadi

Tambahkan:

```text
public/assets/numbers/101.png
```

Lalu rebuild index.

## Solusi B — Game Anda hanya memakai karakter 0..100

Batasi:

```js
valueDomain: {
  min: 0,
  max: 100,
},
```

Jangan mematikan validator.

Jangan membuat fake placeholder tanpa alasan.

---

# 31. Setelah Menambah PNG/GIF Manual

Setelah menaruh file baru, jalankan:

```powershell
npm run assets:index
npm run assets:validate
npm run assets:level
npm run assets:visual
npm run test:parity
```

Paling aman setelah kustom level:

```powershell
npm run check
```

Index ini:

```text
public/assets/generated/asset-index.json
```

harus dibangun ulang dari file fisik.

Jangan edit `asset-index.json` manual.

---

# 32. Contoh Kustom Level

Contoh:

```js
startingValue: 70,
maxOps: 6,

valueDomain: {
  min: 0,
  max: 100,
},

dropZone: {
  minX: 58,
  maxX: 1862,
  y: 80,
},

gates: [
  {
    id: 'gate-1',
    x: 600,
    y: 320,
    operator: '+',
    operand: 5,
    speed: 1.5,
    range: 250,
    width: 140,
    height: 50
  },

  {
    id: 'gate-2',
    x: 1320,
    y: 320,
    operator: '-',
    operand: 2,
    speed: 1.1,
    range: 100,
    width: 140,
    height: 50
  },
],

goals: [
  {
    id: 'goal-1',
    x: 120,
    y: 960,
    value: 25,
    operator: '-',
    width: 160,
    height: 80
  },

  {
    id: 'goal-2',
    x: 440,
    y: 960,
    value: 5,
    operator: '+',
    width: 160,
    height: 80
  },

  {
    id: 'goal-3',
    x: 700,
    y: 960,
    value: 2,
    operator: '/',
    width: 160,
    height: 80
  },
],
```

Sebelum memakai config ini, cek bahwa semua hasil yang mungkin terjadi masih berada dalam domain dan semua PNG yang dibutuhkan tersedia.

---

# 33. Bagian yang Relatif Aman Dikustom

Relatif aman:

```text
startingValue
maxOps
valueDomain
goals[].value
goals[].operator
goals[].x/y
gates[].operator
gates[].operand
gates[].x/y
gates[].speed
gates[].range
pegs[].x/y
background
visual character sizes
feedback visual size
OperationCard CSS
ResultOverlay CSS
TargetStrip size/spacing
```

Tetap jalankan test setelah perubahan.

---

# 34. Bagian yang Berisiko Mengubah Gameplay

Lebih berisiko:

```text
GACOAN_COLLIDER_RADIUS
Peg.radius
Goal width/height
Gate width/height
gravity
friction
restitution
CCD
drop coordinate conversion
StallGuard threshold/escape
COLLISION_FEEDBACK_MS
```

Karena parameter tersebut berkaitan dengan physics/lifecycle.

---

# 35. Bagian yang Sebaiknya Tidak Disentuh untuk Kustom Level

Jangan ubah hanya untuk membuat level baru:

```text
src/systems/CalculationService.js
src/systems/CollisionResolver.js
src/game/MarbleDropSession.js
src/systems/RunRecorder.js
src/systems/ResultService.js
src/systems/JsonExporter.js
src/systems/GacoanStallGuard.js
```

File-file itu adalah core contract.

---

# 36. Checklist Setelah Mengubah Level

Setelah kustomisasi:

```text
[ ] startingValue punya PNG
[ ] semua goal value punya PNG
[ ] semua gate operand punya PNG
[ ] semua reachable result punya PNG
[ ] valueDomain sesuai koleksi asset
[ ] operator valid (+ - * /)
[ ] pembagian menghasilkan integer
[ ] semua id peg/gate/goal unik
[ ] target tidak saling tumpang tindih
[ ] gate tidak keluar world secara ekstrem
[ ] dropZone tetap masuk area layar
[ ] PNG gacoan terbaca
[ ] PNG target terbaca
[ ] gate PNG terbaca
[ ] Operation Card benar
[ ] Finish Card benar
[ ] Restart bekerja
[ ] Export JSON bekerja
[ ] gacoan tidak nyangkut di peg
[ ] posisi drop mengikuti kursor
```

Lalu:

```powershell
npm run check
```

dan browser test:

```powershell
npm run dev
```

---

# 37. Ringkasan Paling Penting

Kalau hanya ingin membuat variasi permainan, fokus utama Anda cukup:

```text
src/config/levels/level1.js
```

Untuk:

```text
gacoan awal    → startingValue
batas nilai    → valueDomain
jumlah operasi → maxOps
peg            → pegs[]
gate           → gates[]
target bawah   → goals[]
```

Untuk visual:

```text
Gacoan       → src/entities/Gacoan.js
Target bawah → src/entities/Goal.js
Gate PNG     → src/entities/Gate.js
GIF feedback → src/config/constants.js
Background   → src/config/visualAssets.js
Target atas  → src/ui/TargetStrip.js
Operation UI → src/ui/OperationCard.js
Finish UI    → src/ui/ResultOverlay.js
```

Untuk operasi target bawah, yang paling penting:

```js
goals[].value
goals[].operator
```

Contoh:

```js
value: 7,
operator: '+'
```

berarti:

```text
70 kena karakter 7 → 77
```

Sedangkan:

```js
value: 7,
operator: '-'
```

berarti:

```text
70 kena karakter 7 → 63
```

---

## Catatan Akhir

Untuk kustomisasi normal, **config dan visual presentation adalah area utama yang boleh diubah**. Jangan membuat perubahan physics/core hanya karena ingin mengganti karakter, angka, operasi, posisi, atau tampilan.

Setelah setiap perubahan besar pada operasi atau nilai level:

```powershell
npm run assets:index
npm run assets:validate
npm run assets:level
npm run test:parity
npm run check
```

Ini mencegah kasus game baru gagal boot karena ada hasil matematika yang tidak memiliki PNG.
