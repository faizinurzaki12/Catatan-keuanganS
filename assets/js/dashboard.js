/**
 * =========================================================
 * FILE: dashboard.js (Gabungan Utuh)
 * =========================================================
 */

// ==========================================
// 1. HELPER FUNCTIONS (Dideklarasikan Sekali)
// ==========================================
const fmt = (angka) => {
  return "Rp " + new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(angka);
};

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getRentangBulanIni() {
  const sekarang = new Date();
  const awal = new Date(sekarang.getFullYear(), sekarang.getMonth(), 1);
  const akhir = new Date(sekarang.getFullYear(), sekarang.getMonth() + 1, 1);
  return { awal: awal.toISOString(), akhir: akhir.toISOString(), sekarang };
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.innerText = text;
}


// ==========================================
// 2. FUNGSI AMBIL & HITUNG DATA DASHBOARD
// ==========================================
async function hitungDataDashboard() {
  const userDisplay = document.getElementById("namaUserAktif");
  const containerGoals = document.getElementById("containerGoals");
  const elTransaksi = document.getElementById("containerTransaksi");

  if (typeof supabaseClient === "undefined") {
    console.error("Supabase client belum siap.");
    return;
  }

  try {
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      window.location.href = "/";
      return;
    }

    if (userDisplay && user.email) {
      userDisplay.innerText = user.email.split("@")[0];
    }

    const { awal, akhir, sekarang } = getRentangBulanIni();

    // Ambil Semua Transaksi (All-time untuk Saldo Utama)
    const { data: semuaTransaksi, error: errSemua } = await supabaseClient
      .from("transaksi")
      .select("tipe, jumlah, deskripsi")
      .eq("user_id", user.id);

    if (errSemua) console.error("Gagal ambil semua transaksi:", errSemua.message);

    // Ambil Transaksi Bulan Ini
    const { data: transaksiBulanIni, error: errBulan } = await supabaseClient
      .from("transaksi")
      .select("*")
      .eq("user_id", user.id)
      .gte("created_at", awal)
      .lt("created_at", akhir)
      .order("created_at", { ascending: false });

    if (errBulan) console.error("Gagal ambil transaksi bulan ini:", errBulan.message);

    // Ambil Goals Singkat (Maksimal 3 untuk Widget Beranda)
    const { data: listGoals, error: errGoals } = await supabaseClient
      .from("goals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3);

    if (errGoals) console.error("Gagal ambil goals:", errGoals.message);

    // --- LOGIKA SALDO UTAMA (ALL-TIME) ---
    let totalMasukSelamanya = 0;
    let totalKeluarSelamanya = 0;
    
    (semuaTransaksi || []).forEach((i) => {
      const jumlah = parseInt(i.jumlah) || 0;
      if (i.tipe === "pemasukan") totalMasukSelamanya += jumlah;
      else totalKeluarSelamanya += jumlah;
    });
    const totalSaldoBersih = Math.max(totalMasukSelamanya - totalKeluarSelamanya, 0);

    // --- LOGIKA ARUS KAS RIIL BULAN INI (DENGAN FILTER INTERNAL GOALS) ---
    let bulanMasuk = 0;
    let bulanKeluar = 0;
    let htmlT = "";
    let jumlahTransaksiTampil = 0;

    if (transaksiBulanIni && transaksiBulanIni.length > 0) {
      transaksiBulanIni.forEach((i) => {
        const jumlah = parseInt(i.jumlah) || 0;
        const deskripsiUlc = (i.deskripsi || "").toLowerCase();
        
        // Cek apakah deskripsi mengandung unsur pemindahan dana goals
        const isTransaksiGoals = deskripsiUlc.includes("goals") || 
                                 deskripsiUlc.includes("tabungan") || 
                                 deskripsiUlc.includes("tarik dana");

        if (!isTransaksiGoals) {
          if (i.tipe === "pemasukan") {
            bulanMasuk += jumlah;
          } else {
            bulanKeluar += jumlah;
          }

          // Batasi hanya menampilkan maksimal 5 transaksi riil terbaru
          if (jumlahTransaksiTampil < 5) {
            const isMasuk = i.tipe === "pemasukan";
            htmlT += `<div class="transaksi-item">
                        <span class="nama">${escapeHtml(i.deskripsi)}</span>
                        <span class="${isMasuk ? "nominal-masuk" : "nominal-keluar"}">
                          ${isMasuk ? "+" : "-"}${fmt(jumlah)}
                        </span>
                      </div>`;
            jumlahTransaksiTampil++;
          }
        }
      });
    }

    if (jumlahTransaksiTampil === 0) {
      htmlT = `<div class="text-center nama py-3">Belum ada transaksi di bulan ini.</div>`;
    }
    
    const bulanSaldo = Math.max(bulanMasuk - bulanKeluar, 0);

    // --- RENDER DATA DASHBOARD ---
    setText("totalSaldo", fmt(totalSaldoBersih));
    setText("totalMasuk", fmt(bulanMasuk));
    setText("totalKeluar", fmt(bulanKeluar));
    setText("bulanMasuk", fmt(bulanMasuk));
    setText("bulanKeluar", fmt(bulanKeluar));
    setText("bulanSaldo", fmt(bulanSaldo));
    setText("periodeBulanIni", sekarang.toLocaleDateString("id-ID", { month: "long", year: "numeric" }));

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

  } catch (err) {
    console.error("Gagal memuat dashboard:", err);
  }
}


// ==========================================
// 3. FUNGSI ACTION (TAMBAH TRANSAKSI RIIL)
// ==========================================
async function tambahTransaksi(tipe, jumlah, deskripsi) {
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

  if (authError || !user) {
    window.location.href = "/auth.html";
    return null;
  }

  const { data, error } = await supabaseClient.from("transaksi").insert([
    { user_id: user.id, tipe, jumlah, deskripsi },
  ]);

  if (error) {
    console.error("Gagal menambah transaksi:", error.message);
    alert("Gagal menyimpan transaksi: " + error.message);
    return null;
  }

  await hitungDataDashboard();
  return data;
}


// ==========================================
// 4. MANAGEMENT TARGET GOALS ( HALAMAN GOALS )
// ==========================================
async function muatGoals() {
  const listContainer = document.getElementById("listGoals");
  if (!listContainer) return;

  const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
  if (authError || !user) {
    window.location.href = "/";
    return;
  }

  const { data, error } = await supabaseClient
    .from("goals")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    listContainer.innerHTML = `<p class="text-danger">Gagal memuat data: ${error.message}</p>`;
    return;
  }

  if (data && data.length > 0) {
    let html = "";
    data.forEach((g) => {
      const terkumpulClean = Math.max(g.terkumpul || 0, 0);
      const targetJumlah = g.target_jumlah || g.target_nominal || 1;
      const persen = Math.min(Math.round((terkumpulClean / targetJumlah) * 100), 100);

      const tombolHapus = terkumpulClean > 0
        ? `<button class="btn btn-secondary btn-sm" disabled title="Tidak bisa menghapus karena sudah ada tabungan">Hapus</button>`
        : `<button class="btn btn-danger btn-sm" onclick="hapusGoal('${g.id}')">Hapus</button>`;

      html += `
        <div class="goal-card mb-3 p-3 border rounded shadow-sm">
            <div class="goal-header d-flex justify-content-between align-items-center mb-2">
              <strong>${escapeHtml(g.nama_goal)}</strong> 
              <span class="badge bg-primary">${persen}%</span>
            </div>
            <div class="progress mb-2" style="height: 15px;">
              <div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" style="width: ${persen}%"></div>
            </div>
            <div class="d-flex justify-content-between">
              <small class="text-muted">${fmt(terkumpulClean)} / ${fmt(targetJumlah)}</small>
              ${g.deadline ? `<small class="text-danger">Tenggat: ${g.deadline}</small>` : ''}
            </div>
            <div class="d-flex gap-2 mt-3">
                <button class="btn btn-success btn-sm" onclick="bukaModalTabungan('${g.id}')">Isi Tabungan</button>
                <button class="btn btn-warning btn-sm text-white" onclick="bukaModalTarik('${g.id}')">Tarik Dana</button>
                ${tombolHapus}
            </div>
        </div>`;
    });
    listContainer.innerHTML = html;
  } else {
    listContainer.innerHTML = `<div class="goal-card text-center p-4 border rounded"><div class="goal-header text-muted">Belum ada target tabungan dibuat.</div></div>`;
  }
}

// Tambah Target Baru (Form Submit)
const formGoal = document.getElementById("formGoal");
if (formGoal) {
  formGoal.onsubmit = async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      alert("Sesi Anda habis. Silakan login kembali.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerText = "Menyimpan...";

    const { error } = await supabaseClient.from("goals").insert([
      {
        user_id: user.id,
        nama_goal: e.target.nama_goal.value,
        target_jumlah: parseInt(e.target.target_jumlah.value), 
        terkumpul: 0,
        deadline: e.target.deadline.value,
      },
    ]);

    submitBtn.disabled = false;
    submitBtn.innerText = "Simpan & Sisihkan Saldo";

    if (error) {
      alert("Gagal membuat target: " + error.message);
    } else {
      alert("Target berhasil dibuat!");
      const modalEl = document.getElementById("modalGoal");
      if (modalEl) bootstrap.Modal.getInstance(modalEl).hide();
      e.target.reset();
      muatGoals();
      await hitungDataDashboard();
    }
  };
}

// ==========================================
// 5. MODAL INTERAKSI (ISI & TARIK TABUNGAN)
// ==========================================
window.bukaModalTabungan = function (id) {
  const elId = document.getElementById("isi_goal_id");
  if (elId) elId.value = id;
  const modalEl = document.getElementById("modalIsiTabungan");
  if (modalEl) new bootstrap.Modal(modalEl).show();
};

const formIsiTabungan = document.getElementById("formIsiTabungan");
if (formIsiTabungan) {
  formIsiTabungan.onsubmit = async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const goalId = document.getElementById("isi_goal_id").value;
    const nominal = parseInt(e.target.jumlah_tabungan.value);

    const { data: { user } } = await supabaseClient.auth.getUser();

    submitBtn.disabled = true;
    const originalText = submitBtn.innerText;
    submitBtn.innerText = "Memproses...";

    const { data, error } = await supabaseClient.rpc("proses_tabungan", {
      p_user_id: user.id,
      p_goal_id: goalId,
      p_nominal: nominal,
    });

    submitBtn.disabled = false;
    submitBtn.innerText = originalText;

    if (error) {
      alert("Terjadi kesalahan sistem: " + error.message);
    } else if (data && data.success === false) {
      alert(data.message);
    } else {
      alert("Berhasil! " + fmt(nominal) + " telah ditabung.");
      const modalEl = document.getElementById("modalIsiTabungan");
      if (modalEl) bootstrap.Modal.getInstance(modalEl).hide();
      e.target.reset();
      muatGoals();
      await hitungDataDashboard();
    }
  };
}

window.bukaModalTarik = function (id) {
  const elId = document.getElementById("tarik_goal_id");
  if (elId) elId.value = id;
  const modalEl = document.getElementById("modalTarikTabungan");
  if (modalEl) new bootstrap.Modal(modalEl).show();
};

const formTarikTabungan = document.getElementById("formTarikTabungan");
if (formTarikTabungan) {
  formTarikTabungan.onsubmit = async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const goalId = document.getElementById("tarik_goal_id").value;
    const nominal = parseInt(e.target.jumlah_tarik.value);

    const { data: { user } } = await supabaseClient.auth.getUser();

    submitBtn.disabled = true;
    const originalText = submitBtn.innerText;
    submitBtn.innerText = "Memproses...";

    const { data, error } = await supabaseClient.rpc("tarik_tabungan", {
      p_user_id: user.id,
      p_goal_id: goalId,
      p_nominal: nominal,
    });

    submitBtn.disabled = false;
    submitBtn.innerText = originalText;

    if (error) {
      alert("Terjadi kesalahan sistem: " + error.message);
    } else if (data && data.success === false) {
      alert(data.message); 
    } else {
      alert("Berhasil! " + fmt(nominal) + " telah ditarik dari target.");
      const modalEl = document.getElementById("modalTarikTabungan");
      if (modalEl) bootstrap.Modal.getInstance(modalEl).hide();
      e.target.reset();
      muatGoals();
      await hitungDataDashboard();
    }
  };
}

window.hapusGoal = async function (id) {
  if (confirm("Yakin ingin menghapus target ini?")) {
    const { error } = await supabaseClient.from("goals").delete().eq("id", id);
    if (error) {
      alert("Gagal menghapus target: " + error.message);
    } else {
      alert("Target berhasil dihapus.");
      muatGoals();
      await hitungDataDashboard();
    }
  }
};


// ==========================================
// 6. INITIALIZER (RUN ON LOAD)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  hitungDataDashboard();
  muatGoals();
});