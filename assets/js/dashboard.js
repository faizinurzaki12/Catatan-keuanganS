/**
 * =========================================================
 * FILE: dashboard.js
 * =========================================================
 */

/** Helper: format Rupiah tanpa desimal */
function fmt(angka) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(angka);
}

/** Helper: dapatkan rentang tanggal bulan berjalan (awal & akhir eksklusif) */
function getRentangBulanIni() {
  const sekarang = new Date();
  const awal = new Date(sekarang.getFullYear(), sekarang.getMonth(), 1);
  const akhir = new Date(sekarang.getFullYear(), sekarang.getMonth() + 1, 1);
  return { awal: awal.toISOString(), akhir: akhir.toISOString(), sekarang };
}

/**
 * ---------------------------------------------------------
 * FUNGSI TAMBAH DATA (INSERT)
 * user_id disisipkan otomatis dari sesi login yang aktif.
 * ---------------------------------------------------------
 */
async function tambahTransaksi(tipe, jumlah, deskripsi) {
  const {
    data: { user },
    error: authError,
  } = await supabaseClient.auth.getUser();

  if (authError || !user) {
    window.location.href = "/auth.html";
    return null;
  }

  const { data, error } = await supabaseClient.from("transaksi").insert([
    {
      user_id: user.id, // <-- WAJIB, ini yang membuat RLS bisa bekerja
      tipe, // "pemasukan" atau "pengeluaran"
      jumlah,
      deskripsi,
    },
  ]);

  if (error) {
    console.error("Gagal menambah transaksi:", error.message);
    alert("Gagal menyimpan transaksi: " + error.message);
    return null;
  }

  // Refresh dashboard setelah insert berhasil
  await hitungDataDashboard();
  return data;
}

async function tambahGoal(namaGoal, targetNominal) {
  const {
    data: { user },
    error: authError,
  } = await supabaseClient.auth.getUser();

  if (authError || !user) {
    window.location.href = "/auth.html";
    return null;
  }

  const { data, error } = await supabaseClient.from("goals").insert([
    {
      user_id: user.id,
      nama_goal: namaGoal,
      target_nominal: targetNominal,
    },
  ]);

  if (error) {
    console.error("Gagal menambah goal:", error.message);
    alert("Gagal menyimpan goal: " + error.message);
    return null;
  }

  await hitungDataDashboard();
  return data;
}

/**
 * ---------------------------------------------------------
 * FUNGSI AMBIL & HITUNG DATA DASHBOARD
 * - Difilter per user_id (RLS di server jadi lapisan kedua)
 * - Total pemasukan/pengeluaran BULAN INI difilter via query
 *   tanggal dinamis (server-side) -> otomatis reset tiap bulan baru.
 * - Saldo akhir dihitung dari SELURUH riwayat (all-time).
 * ---------------------------------------------------------
 */
async function hitungDataDashboard() {
  const userDisplay = document.getElementById("namaUserAktif");
  const containerGoals = document.getElementById("containerGoals");

  const {
    data: { user },
    error: authError,
  } = await supabaseClient.auth.getUser();

  if (authError || !user) {
    window.location.href = "/auth.html";
    return;
  }

  if (userDisplay) {
    userDisplay.innerText = user.email.split("@")[0];
  }

  const { awal, akhir, sekarang } = getRentangBulanIni();

  const { data: semuaTransaksi, error: errSemua } = await supabaseClient
    .from("transaksi")
    .select("tipe, jumlah")
    .eq("user_id", user.id);

  if (errSemua) console.error("Gagal ambil semua transaksi:", errSemua.message);

  const { data: transaksiBulanIni, error: errBulan } = await supabaseClient
    .from("transaksi")
    .select("*")
    .eq("user_id", user.id)
    .gte("created_at", awal)
    .lt("created_at", akhir)
    .order("created_at", { ascending: false });

  if (errBulan) console.error("Gagal ambil transaksi bulan ini:", errBulan.message);

  const { data: listGoals, error: errGoals } = await supabaseClient
    .from("goals")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(3);

  if (errGoals) console.error("Gagal ambil goals:", errGoals.message);

  let totalMasukSelamanya = 0;
  let totalKeluarSelamanya = 0;
  (semuaTransaksi || []).forEach((i) => {
    const jumlah = parseInt(i.jumlah) || 0;
    if (i.tipe === "pemasukan") totalMasukSelamanya += jumlah;
    else totalKeluarSelamanya += jumlah;
  });
  const totalSaldoBersih = Math.max(totalMasukSelamanya - totalKeluarSelamanya, 0);

  let bulanMasuk = 0;
  let bulanKeluar = 0;
  (transaksiBulanIni || []).forEach((i) => {
    const jumlah = parseInt(i.jumlah) || 0;
    if (i.tipe === "pemasukan") bulanMasuk += jumlah;
    else bulanKeluar += jumlah;
  });
  const bulanSaldo = Math.max(bulanMasuk - bulanKeluar, 0);

  setText("totalSaldo", fmt(totalSaldoBersih));
  setText("totalMasuk", fmt(bulanMasuk));
  setText("totalKeluar", fmt(bulanKeluar));

  setText("bulanMasuk", fmt(bulanMasuk));
  setText("bulanKeluar", fmt(bulanKeluar));
  setText("bulanSaldo", fmt(bulanSaldo));
  setText(
    "periodeBulanIni",
    sekarang.toLocaleDateString("id-ID", { month: "long", year: "numeric" })
  );

  let htmlT = "";
  if (transaksiBulanIni && transaksiBulanIni.length > 0) {
    transaksiBulanIni.slice(0, 5).forEach((i) => {
      const isMasuk = i.tipe === "pemasukan";
      const nominal = parseInt(i.jumlah) || 0;
      htmlT += `<div class="transaksi-item">
                  <span class="nama">${escapeHtml(i.deskripsi)}</span>
                  <span class="${isMasuk ? "nominal-masuk" : "nominal-keluar"}">
                    ${isMasuk ? "+" : "-"}${fmt(nominal)}
                  </span>
                </div>`;
    });
  } else {
    htmlT = `<div class="text-center nama py-3">Belum ada transaksi di bulan ini.</div>`;
  }
  const elTransaksi = document.getElementById("containerTransaksi");
  if (elTransaksi) elTransaksi.innerHTML = htmlT;

  if (containerGoals) {
    let htmlG = "<h3>Target goals</h3>";
    if (listGoals && listGoals.length > 0) {
      listGoals.forEach((g) => {
        htmlG += `<div class="goal-item">${escapeHtml(g.nama_goal)}</div>`;
      });
    } else {
      htmlG += `<div class="goal-item py-2">Belum ada target.</div>`;
    }
    containerGoals.innerHTML = htmlG;
  }
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.innerText = text;
}

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

document.addEventListener("DOMContentLoaded", () => {
  hitungDataDashboard();
});