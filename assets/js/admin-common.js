/**
 * =========================================================
 * FILE: admin-common.js
 * FIXED VERSION - Tanpa kolom 'nama' & Otomatis Memicu Render
 * =========================================================
 */

window.AdminStore = {
  profiles: [],
  transaksi: [],
  myRole: null,
  myId: null,
};

/** Ambil profile admin yang login + semua profiles + transaksi (tanpa kolom nama) */
async function muatDataBersama() {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    window.AdminStore.myId = user.id;

    // Ambil profile diri sendiri (Tanpa kolom 'nama')
    const { data: myProfile } = await supabaseClient
      .from("profiles")
      .select("role,email")
      .eq("id", user.id)
      .single();

    window.AdminStore.myRole = myProfile?.role || null;

    const label = (myProfile?.email || user.email).split("@")[0] + " (" + window.AdminStore.myRole + ")";
    document.querySelectorAll("[data-admin-nama]").forEach((el) => (el.innerText = label));

    // Ambil semua profiles (Tanpa kolom 'nama')
    const { data: profiles, error: errP } = await supabaseClient
      .from("profiles")
      .select("id, email, role, created_at")
      .order("created_at", { ascending: false });

    // Ambil data transaksi secara ringkas
    const { data: transaksi, error: errT } = await supabaseClient
      .from("transaksi")
      .select("id, user_id, jumlah, tipe, created_at");

    if (errP) console.error("[admin-common] Gagal ambil profiles:", errP.message);
    if (errT) console.error("[admin-common] Gagal ambil transaksi:", errT.message);

    window.AdminStore.profiles = profiles || [];
    window.AdminStore.transaksi = transaksi || [];

  } catch (error) {
    console.error("[admin-common] Error fatal pada muatDataBersama:", error);
  }
}

/** Ambil budget_limit SEMUA user untuk bulan & tahun berjalan */
async function ambilBudgetSemuaUserBulanIni() {
  const now = new Date();
  const bulan = now.getMonth() + 1;
  const tahun = now.getFullYear();

  const { data, error } = await supabaseClient
    .from("budgets")
    .select("user_id, budget_limit")
    .eq("bulan", bulan)
    .eq("tahun", tahun);

  if (error) {
    console.error("[admin-common] Gagal ambil budgets:", error.message);
    return {};
  }

  const map = {};
  (data || []).forEach((b) => (map[b.user_id] = b.budget_limit));
  return map;
}

/** Kasih class "active" ke link sidebar/navbar */
function tandaiNavAktif() {
  const path = window.location.pathname.split("/").pop().replace(".html", "") || "dashboard";
  document.querySelectorAll("[data-nav]").forEach((a) => {
    a.classList.toggle("active", a.getAttribute("data-nav") === path);
  });
}

function fmtRupiah(angka) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(angka);
}

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Total pengeluaran 1 user PADA BULAN INI */
function hitungPengeluaranUserBulanIni(userId) {
  const now = new Date();
  const awalBulan = new Date(now.getFullYear(), now.getMonth(), 1);
  const awalBulanDepan = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  if (!window.AdminStore.transaksi) return 0;

  return window.AdminStore.transaksi
    .filter((t) => t.user_id === userId && t.tipe === "pengeluaran")
    .filter((t) => {
      const w = new Date(t.created_at);
      return w >= awalBulan && w < awalBulanDepan;
    })
    .reduce((total, t) => total + (parseInt(t.jumlah) || 0), 0);
}

document.addEventListener("DOMContentLoaded", () => {
  tandaiNavAktif();
  ["logoutM", "logoutD"].forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        logout();
      });
    }
  });
});