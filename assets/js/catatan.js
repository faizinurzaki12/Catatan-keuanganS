// assets/js/catatan.js

const fmt = (n) => "Rp " + new Intl.NumberFormat("id-ID").format(n);

async function muatTabel() {
  const tableBody = document.getElementById("tableBody");
  if (!tableBody) return;

  // 1. Ambil user dari Supabase
  const {
    data: { user },
    error: authError,
  } = await supabaseClient.auth.getUser();

  if (authError || !user) {
    tableBody.innerHTML = `<tr><td colspan="5" class="text-center">Silakan login kembali.</td></tr>`;
    // Cadangan: Jika lewat pengecekan awal, tendang di sini juga
    window.location.href = "/";
    return;
  }

  // 2. Ambil data transaksi
  const { data, error } = await supabaseClient.from("transaksi").select("*").eq("user_id", user.id).order("created_at", { ascending: false });

  // 3. Render hasil
  if (error) {
    tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Gagal memuat data.</td></tr>`;
    return;
  }

  if (data && data.length > 0) {
    let rows = "";
    data.forEach((item, index) => {
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
            <td>${item.deskripsi}</td>
        </tr>`;
    });
    tableBody.innerHTML = rows;
  } else {
    tableBody.innerHTML = `<tr><td colspan="5" class="text-center">Belum ada catatan transaksi</td></tr>`;
  }
}

// 4. Inisialisasi dengan Penjaga Pintu
document.addEventListener("DOMContentLoaded", async () => {
  // Pengecekan sesi lokal (instan)
  const sessionRaw = localStorage.getItem("user_session");

  if (!sessionRaw) {
    // Tendang user jika tidak ada session
    window.location.href = "/";
  } else {
    // Jika ada session, jalankan fungsi pemuatan data
    await muatTabel();
  }
});
