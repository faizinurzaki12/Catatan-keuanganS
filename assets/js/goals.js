const fmt = (n) => "Rp " + new Intl.NumberFormat("id-ID").format(n);

/**
 * 1. Muat Daftar Goals
 */
async function muatGoals() {
  const listContainer = document.getElementById("listGoals");
  if (!listContainer) return;

  const {
    data: { user },
    error: authError,
  } = await supabaseClient.auth.getUser();

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
      const targetJumlah = g.target_jumlah || g.target_nominal || 1; // Fallback jika nama kolom berbeda
      const persen = Math.min(Math.round((terkumpulClean / targetJumlah) * 100), 100);

      // Logika: Tombol hapus dinonaktifkan jika sudah ada tabungan
      const tombolHapus =
        terkumpulClean > 0
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

/**
 * Helper untuk mengamankan teks HTML dari XSS
 */
function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * 2. Tambah Target Baru
 */
document.getElementById("formGoal").onsubmit = async (e) => {
  e.preventDefault();
  const submitBtn = e.target.querySelector('button[type="submit"]');
  
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
  if (authError || !user) {
    alert("Sesi Anda habis. Silakan login kembali.");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerText = "Menyimpan...";

  // Sesuaikan properti target_jumlah / target_nominal dengan kolom asli tabel database Anda
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
    bootstrap.Modal.getInstance(modalEl).hide();
    e.target.reset();
    muatGoals();
  }
};

/**
 * 3. Isi Tabungan
 */
window.bukaModalTabungan = function (id) {
  document.getElementById("isi_goal_id").value = id;
  new bootstrap.Modal(document.getElementById("modalIsiTabungan")).show();
};

document.getElementById("formIsiTabungan").onsubmit = async (e) => {
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
    bootstrap.Modal.getInstance(document.getElementById("modalIsiTabungan")).hide();
    e.target.reset();
    muatGoals();
  }
};

/**
 * 4. Tarik Tabungan
 */
window.bukaModalTarik = function (id) {
  document.getElementById("tarik_goal_id").value = id;
  new bootstrap.Modal(document.getElementById("modalTarikTabungan")).show();
};

document.getElementById("formTarikTabungan").onsubmit = async (e) => {
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
    bootstrap.Modal.getInstance(document.getElementById("modalTarikTabungan")).hide();
    e.target.reset();
    muatGoals();
  }
};

/**
 * 5. Hapus Target
 */
window.hapusGoal = async function (id) {
  if (confirm("Yakin ingin menghapus target ini?")) {
    const { error } = await supabaseClient.from("goals").delete().eq("id", id);
    if (error) {
      alert("Gagal menghapus target: " + error.message);
    } else {
      alert("Target berhasil dihapus.");
      muatGoals();
    }
  }
};

// Inisialisasi halaman saat dokumen siap
document.addEventListener("DOMContentLoaded", () => {
  muatGoals();
});