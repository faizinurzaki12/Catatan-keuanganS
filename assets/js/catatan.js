/**
 * =========================================================
 * FILE: catatan.js
 * =========================================================
 */

const fmt = (n) => "Rp " + new Intl.NumberFormat("id-ID").format(n);

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function muatTabel() {
  const tableBody = document.getElementById("tableBody");
  if (!tableBody) return;

  // 1. Ambil user dari sesi Supabase yang sedang aktif
  const {
    data: { user },
    error: authError,
  } = await supabaseClient.auth.getUser();

  if (authError || !user) {
    window.location.href = "/";
    return;
  }

  // 2. Ambil semua data transaksi milik user tersebut
  const { data, error } = await supabaseClient
    .from("transaksi")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Gagal memuat data:", error.message);
    tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Gagal memuat data.</td></tr>`;
    return;
  }

  // 3. Filter agar hanya menampilkan transaksi bulan berjalan
  //    (otomatis reset tampilan setiap ganti bulan)
  const sekarang = new Date();
  const bulanIni = sekarang.getMonth();
  const tahunIni = sekarang.getFullYear();

  const dataBulanIni = data
    ? data.filter((item) => {
        const tglItem = new Date(item.created_at);
        return tglItem.getMonth() === bulanIni && tglItem.getFullYear() === tahunIni;
      })
    : [];

  // 4. Render hasil filter ke tabel
  if (dataBulanIni.length > 0) {
    let rows = "";
    dataBulanIni.forEach((item, index) => {
      const isMasuk = item.tipe === "pemasukan";
      const tanggal = new Date(item.created_at).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      rows += `
        <tr>
            <th scope="row">${index + 1}</th>
            <td>${tanggal}</td>
            <td class="text-success fw-bold">${isMasuk ? fmt(item.jumlah) : "-"}</td>
            <td class="text-danger fw-bold">${!isMasuk ? fmt(item.jumlah) : "-"}</td>
            <td>${escapeHtml(item.deskripsi)}</td>
        </tr>`;
    });
    tableBody.innerHTML = rows;
  } else {
    tableBody.innerHTML = `<tr><td colspan="5" class="text-center">Belum ada catatan transaksi di bulan ini.</td></tr>`;
  }
}

// 5. Inisialisasi — proteksi halaman sudah ditangani oleh guard.js,
//    di sini cukup langsung muat tabelnya.
document.addEventListener("DOMContentLoaded", () => {
  muatTabel();
});