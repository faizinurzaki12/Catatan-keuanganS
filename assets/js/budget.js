/**
 * =========================================================
 * FILE: budget.js
 * Fitur Budget Limit untuk dashboard USER.
 * Load di dashboard.html, setelah supabase-init.js & auth.js.
 *
 * Butuh elemen di HTML dashboard.html:
 *   #containerBudget, #budgetKosong, #budgetIsi,
 *   #progressBudget, #budgetTerpakai, #budgetTotal,
 *   #peringatanBudget, #modalBudget, #formBudget, #inputBudget
 * =========================================================
 */

function fmtRupiahBudget(angka) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(angka);
}

/** Ambil budget_limit user untuk bulan & tahun berjalan */
async function ambilBudgetBulanIni(userId) {
  const now = new Date();
  const bulan = now.getMonth() + 1;
  const tahun = now.getFullYear();

  const { data, error } = await supabaseClient
    .from("budgets")
    .select("budget_limit")
    .eq("user_id", userId)
    .eq("bulan", bulan)
    .eq("tahun", tahun)
    .maybeSingle(); // null kalau belum pernah diisi, gak error

  if (error) {
    console.error("[budget] Gagal ambil budget:", error.message);
    return null;
  }
  return data?.budget_limit ?? null;
}

/** SUM pengeluaran user pada bulan berjalan dari tabel transaksi */
async function hitungPengeluaranBulanIni(userId) {
  const now = new Date();
  const awalBulan = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const awalBulanDepan = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

  const { data, error } = await supabaseClient
    .from("transaksi")
    .select("jumlah")
    .eq("user_id", userId)
    .eq("tipe", "pengeluaran")
    .gte("created_at", awalBulan)
    .lt("created_at", awalBulanDepan);

  if (error) {
    console.error("[budget] Gagal ambil transaksi:", error.message);
    return 0;
  }

  return data.reduce((total, t) => total + (parseInt(t.jumlah) || 0), 0);
}

/** Ambil data terbaru & render ulang seluruh budget-box */
async function cekBudgetLimit() {
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();
  if (!user) return;

  const [budgetLimit, totalPengeluaran] = await Promise.all([
    ambilBudgetBulanIni(user.id),
    hitungPengeluaranBulanIni(user.id),
  ]);

  const boxKosong = document.getElementById("budgetKosong");
  const boxIsi = document.getElementById("budgetIsi");
  const inputBudget = document.getElementById("inputBudget");

  // Belum pernah atur budget bulan ini
  if (!budgetLimit || budgetLimit <= 0) {
    if (boxKosong) boxKosong.style.display = "block";
    if (boxIsi) boxIsi.style.display = "none";
    if (inputBudget) inputBudget.value = "";
    return;
  }

  if (boxKosong) boxKosong.style.display = "none";
  if (boxIsi) boxIsi.style.display = "block";
  if (inputBudget) inputBudget.value = budgetLimit;

  const persentase = Math.min((totalPengeluaran / budgetLimit) * 100, 100);

  // Update progress bar
  const bar = document.getElementById("progressBudget");
  if (bar) {
    bar.style.width = persentase + "%";
    bar.className = "progress-bar " + warnaProgressBar(persentase);
  }

  const elTerpakai = document.getElementById("budgetTerpakai");
  const elTotal = document.getElementById("budgetTotal");
  if (elTerpakai) elTerpakai.innerText = fmtRupiahBudget(totalPengeluaran);
  if (elTotal) elTotal.innerText = "dari " + fmtRupiahBudget(budgetLimit);

  tampilkanPeringatanBudget((totalPengeluaran / budgetLimit) * 100, totalPengeluaran, budgetLimit);
}

function warnaProgressBar(persentase) {
  if (persentase >= 100) return "bg-danger";
  if (persentase >= 80) return "bg-warning";
  return "bg-success";
}

/** Tampilkan alert merah/kuning kalau pemakaian >= 80% */
function tampilkanPeringatanBudget(persentaseAsli, totalPengeluaran, budgetLimit) {
  const box = document.getElementById("peringatanBudget");
  if (!box) return;

  if (persentaseAsli < 80) {
    box.style.display = "none";
    box.innerHTML = "";
    return;
  }

  const lewatBatas = persentaseAsli >= 100;

  box.style.display = "block";
  box.className = "alert " + (lewatBatas ? "alert-danger" : "alert-warning") + " py-2 mb-0";
  box.setAttribute("role", "alert");
  box.innerHTML = `
    <strong>${lewatBatas ? "⚠️ Budget bulan ini sudah terlampaui!" : "⚠️ Budget bulan ini hampir habis"}</strong>
    <div class="small">${persentaseAsli.toFixed(0)}% dari batas sudah terpakai</div>
  `;
}

/** Simpan / update budget bulan berjalan (upsert, aman dipanggil berkali-kali) */
async function simpanBudget(nominal) {
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();
  if (!user) return;

  if (!nominal || nominal <= 0) {
    alert("Masukkan nominal budget yang valid.");
    return;
  }

  const now = new Date();
  const bulan = now.getMonth() + 1;
  const tahun = now.getFullYear();

  const { error } = await supabaseClient.from("budgets").upsert(
    {
      user_id: user.id,
      bulan,
      tahun,
      budget_limit: nominal,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,bulan,tahun" }
  );

  if (error) {
    alert("Gagal menyimpan budget: " + error.message);
    return;
  }

  await cekBudgetLimit();
}

document.addEventListener("DOMContentLoaded", () => {
  cekBudgetLimit();

  const formBudget = document.getElementById("formBudget");
  if (formBudget) {
    formBudget.addEventListener("submit", async (e) => {
      e.preventDefault();
      const val = parseInt(document.getElementById("inputBudget").value) || 0;
      await simpanBudget(val);

      // Tutup modal setelah berhasil simpan
      const modalEl = document.getElementById("modalBudget");
      const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
      modal.hide();
    });
  }
});