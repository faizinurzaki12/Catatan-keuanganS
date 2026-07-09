/**
 * =========================================================
 * FILE: admin-transaksi-user.js
 * VERSI GABUNGAN PENUH - Dengan Loading Status & Bebas Bug Nama
 * =========================================================
 */

async function initTransaksiUser() {
  // 1. Ambil wadah tabel dan tampilkan status loading terlebih dahulu
  const tbody = document.getElementById("tabelRingkasanBody");
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-3 text-muted">🔄 Mengambil data dari database...</td></tr>`;
  }

  // 2. TUNGGU sampai proses penarikan data di admin-common.js benar-benar selesai
  await muatDataBersama();
  
  // 3. Setelah data siap di AdminStore, baru render ke komponen tabel
  await renderRingkasanTransaksi();
}

async function renderRingkasanTransaksi() {
  // Ambil data limit budget bulan berjalan
  const budgetMap = await ambilBudgetSemuaUserBulanIni();

  let totalSemuaUser = 0;
  const pengeluaranPerUser = {};

  // Hitung total pengeluaran bulanan per individu user dari store
  window.AdminStore.profiles.forEach((p) => {
    const jumlah = hitungPengeluaranUserBulanIni(p.id);
    pengeluaranPerUser[p.id] = jumlah;
    totalSemuaUser += jumlah;
  });

  // Perbarui card total pengeluaran agregat semua user di atas tabel
  const elTotal = document.getElementById("totalPengeluaranSemuaUser");
  if (elTotal) elTotal.innerText = fmtRupiah(totalSemuaUser);

  const tbody = document.getElementById("tabelRingkasanBody");
  if (!tbody) return;

  // Proteksi jika data profiles di AdminStore gagal dimuat atau masih kosong
  if (!window.AdminStore.profiles || window.AdminStore.profiles.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-3 text-danger">⚠️ Belum ada data user (Pastikan file admin-common.js sudah diperbaiki & disimpan).</td></tr>`;
    return;
  }

  // Petakan data ke baris-baris tabel HTML
  tbody.innerHTML = window.AdminStore.profiles
    .map((p) => {
      const budgetLimit = budgetMap[p.id] ?? null;
      const pengeluaran = pengeluaranPerUser[p.id] || 0;
      
      // FIX: Karena kolom p.nama tidak ada di database, kita potong emailnya sebelum '@' sebagai nama tampilan
      const namaTampil = p.email ? escapeHtml(p.email.split('@')[0]) : "User-" + p.id.substring(0, 5);

      // Logika penentuan badge status anggaran
      let status;
      if (budgetLimit == null || budgetLimit <= 0) {
        status = `<span class="badge bg-secondary">Belum atur budget</span>`;
      } else if (pengeluaran >= budgetLimit) {
        status = `<span class="badge bg-danger">Over Budget</span>`;
      } else {
        status = `<span class="badge bg-success">Aman</span>`;
      }

      return `
      <tr>
        <td data-label="Nama User" class="fw-bold text-dark">${namaTampil}</td>
        <td data-label="Budget Limit">${budgetLimit != null ? fmtRupiah(budgetLimit) : "-"}</td>
        <td data-label="Pengeluaran Bulan Ini" class="text-danger fw-bold">${fmtRupiah(pengeluaran)}</td>
        <td data-label="Status">${status}</td>
      </tr>`;
    })
    .join("");
}

// Jalankan otomatis saat dokumen HTML selesai dibaca browser
document.addEventListener("DOMContentLoaded", initTransaksiUser);