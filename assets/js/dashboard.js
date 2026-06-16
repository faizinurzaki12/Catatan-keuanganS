// assets/js/dashboard.js

const fmt = (n) => "Rp " + new Intl.NumberFormat("id-ID").format(n);

async function hitungDataDashboard() {
  const userDisplay = document.getElementById("namaUserAktif");
  const containerGoals = document.getElementById("containerGoals");

  const {
    data: { user },
    error: authError,
  } = await supabaseClient.auth.getUser();

  if (authError || !user) {
    window.location.href = "/";
    return;
  }

  userDisplay.innerText = user.email.split("@")[0];

  // Ambil Transaksi & Goals
  const { data: listTransaksi } = await supabaseClient.from("transaksi").select("*").eq("user_id", user.id).order("created_at", { ascending: false });

  const { data: listGoals } = await supabaseClient.from("goals").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(3);

  // Perhitungan
  let totalMasuk = 0,
    totalKeluar = 0; // Total Keseluruhan
  let bulanMasuk = 0,
    bulanKeluar = 0; // Khusus Bulan Ini

  const sekarang = new Date();
  const bulanIni = sekarang.getMonth();
  const tahunIni = sekarang.getFullYear();

  if (listTransaksi) {
    listTransaksi.forEach((i) => {
      // PERBAIKAN: Jika i.jumlah tidak ada, anggap 0 untuk mencegah NaN
      const jumlah = parseInt(i.jumlah) || 0;
      const tgl = new Date(i.created_at);

      // 1. Hitung Total Keseluruhan
      if (i.tipe === "pemasukan") {
        totalMasuk += jumlah;
      } else {
        totalKeluar += jumlah;
      }

      // 2. Hitung Khusus Bulan Ini
      if (tgl.getMonth() === bulanIni && tgl.getFullYear() === tahunIni) {
        if (i.tipe === "pemasukan") bulanMasuk += jumlah;
        else bulanKeluar += jumlah;
      }
    });
  }

  // Update UI 3 Card Atas
  document.getElementById("totalSaldo").innerText = fmt(totalMasuk - totalKeluar);
  document.getElementById("totalMasuk").innerText = fmt(totalMasuk);
  document.getElementById("totalKeluar").innerText = fmt(totalKeluar);

  // Update UI Card "Bulan Ini"
  document.getElementById("bulanMasuk").innerText = fmt(bulanMasuk);
  document.getElementById("bulanKeluar").innerText = fmt(bulanKeluar);
  document.getElementById("bulanSaldo").innerText = fmt(bulanMasuk - bulanKeluar);
  document.getElementById("periodeBulanIni").innerText = sekarang.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  // Render Transaksi Terakhir
  let htmlT = "";
  if (listTransaksi && listTransaksi.length > 0) {
    listTransaksi.slice(0, 5).forEach((i) => {
      const isMasuk = i.tipe === "pemasukan";
      const nominal = parseInt(i.jumlah) || 0;
      htmlT += `<div class="transaksi-item">
                  <span class="nama">${i.deskripsi}</span>
                  <span class="${isMasuk ? "nominal-masuk" : "nominal-keluar"}">${isMasuk ? "+" : "-"}${fmt(nominal)}</span>
                </div>`;
    });
  } else {
    htmlT = `<div class="text-center nama py-3">Belum ada transaksi.</div>`;
  }
  document.getElementById("containerTransaksi").innerHTML = htmlT;

  // Render Goals
  let htmlG = "<h3>Target goals</h3>";
  if (listGoals && listGoals.length > 0) {
    listGoals.forEach((g) => {
      htmlG += `<div class="goal-item">${g.nama_goal}</div>`;
    });
  } else {
    htmlG += `<div class="goal-item py-2">Belum ada target.</div>`;
  }
  containerGoals.innerHTML = htmlG;
}

// Logout & Init
async function handleLogout() {
  await supabaseClient.auth.signOut();
  localStorage.removeItem("user_session");
  window.location.href = "/";
}

document.addEventListener("DOMContentLoaded", () => {
  const logoutD = document.getElementById("logoutD");
  const logoutM = document.getElementById("logoutM");
  if (logoutD) logoutD.addEventListener("click", handleLogout);
  if (logoutM) logoutM.addEventListener("click", handleLogout);

  hitungDataDashboard();
});
