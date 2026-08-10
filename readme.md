npm run assets:index

ubah ukuran
\src\entities\Goal.js :
//---------------------------------------------------------
// Use height as desired size, preserve aspect ratio
// const desiredHeight = Math.max(1, Math.round(height)); //originalnya! UBAH UKURAN TARGET BAWAH DISINI
const desiredHeight = 180;
//
// -------------------------------------------------------------
\src\entities\Goal.js :
this.operator = config.operator || '-'; merubah operasi game nya

Gacoan 100
kena target 7
operator -
hasil 93

Operasinya ditentukan oleh Goal.operator.

Di kode Goal.js yang Anda kirim ada:

this.operator = config.operator || '-';

dan:

spawn({ id, value, operator = '-', ... })

Jadi kalau mau semua target default menjadi penjumlahan, ubah '-' menjadi '+'.

Kalau mau beda-beda per target, ubah di config goals[], contoh:

{ id: 'goal-1', value: 7, operator: '+' }

Maka:

100 kena target 7 → 107

Jadi:

value = angka target/operand, misalnya 7
operator = operasi matematika, misalnya -, +, *, /

Yang Anda cari memang bagian goals[], bukan gates[].


src/config/levels/level1.js

startingValue → nilai awal gacoan
targetValue   → target utama
gates[]       → operasi matematika
goals[]       → target bawah
pegs[]        → lingkaran obstacle


Ubah di config level, bagian gates.

Cari file yang berisi:

gates: [

Lalu ubah bagian ini:

{
  id: 'gate-1',
  operator: '-',
  operand: 1,
  ...
}


File-nya:

src/config/visualAssets.js

Bagian yang menentukan background:

export const VISUAL_ASSETS = Object.freeze({
  background: '/assets/marbledrop/background/bg (2).jpg',
});

Kalau mau gan

1. Ukuran gacoan
File:

src/entities/Gacoan.js

Cari:

radiusPx = 58





besar kecilnya gif : \src\config\constants.js export const FEEDBACK_LOGICAL_SIZE = 500;