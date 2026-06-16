// assets/js/goals.js

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

  const { data, error } = await supabaseClient.from("goals").select("*").eq("user_id", user.id).order("created_at", { ascending: false });

  if (error) {
    listContainer.innerHTML = `<p class="text-danger">Gagal memuat data: ${error.message}</p>`;
    return;
  }

  if (data && data.length > 0) {
    let html = "";
    data.forEach((g) => {
      // Menggunakan Math.max untuk memastikan nilai negatif di database tidak muncul di UI
      const terkumpulClean = Math.max(g.terkumpul, 0);
      const persen = Math.min(Math.round((terkumpulClean / g.target_jumlah) * 100), 100);

      // Logika tambahan: Tombol hapus dinonaktifkan jika sudah ada tabungan
      const tombolHapus =
        terkumpulClean > 0 ? `<button class="btn btn-secondary btn-sm" disabled title="Tidak bisa menghapus karena sudah ada tabungan">Hapus</button>` : `<button class="btn btn-danger btn-sm" onclick="hapusGoal('${g.id}')">Hapus</button>`;

      html += `
        <div class="goal-card">
            <div class="goal-header"><strong>${g.nama_goal}</strong> <span>${persen}%</span></div>
            <div class="progress-bar-custom"><div class="progress-fill" style="width: ${persen}%"></div></div>
            <small class="text-muted">${fmt(terkumpulClean)} / ${fmt(g.target_jumlah)}</small>
            <div class="d-flex gap-2 mt-2">
                <button class="btn btn-primary btn-sm" onclick="bukaModalTabungan('${g.id}')">Isi Tabungan</button>
                ${tombolHapus}
            </div>
        </div>`;
    });
    listContainer.innerHTML = html;
  } else {
    listContainer.innerHTML = `<div class="goal-card"><div class="goal-header">Belum ada target.</div></div>`;
  }
}

/**
 * 2. Tambah Target Baru
 */
document.getElementById("formGoal").onsubmit = async (e) => {
  e.preventDefault();
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();

  const { error } = await supabaseClient.from("goals").insert([
    {
      user_id: user.id,
      nama_goal: e.target.nama_goal.value,
      target_jumlah: parseInt(e.target.target_jumlah.value),
      terkumpul: 0,
      deadline: e.target.deadline.value,
    },
  ]);

  if (error) {
    alert("Gagal membuat target: " + error.message);
  } else {
    alert("Target berhasil dibuat!");
    bootstrap.Modal.getInstance(document.getElementById("modalGoal")).hide();
    e.target.reset();
    muatGoals();
  }
};

/**
 * 3. Isi Tabungan (Versi Aman dengan RPC)
 */
window.bukaModalTabungan = function (id) {
  document.getElementById("isi_goal_id").value = id;
  new bootstrap.Modal(document.getElementById("modalIsiTabungan")).show();
};

document.getElementById("formIsiTabungan").onsubmit = async (e) => {
  e.preventDefault();
  const goalId = document.getElementById("isi_goal_id").value;
  const nominal = parseInt(e.target.jumlah_tabungan.value);

  const {
    data: { user },
  } = await supabaseClient.auth.getUser();

  // Memanggil fungsi database (RPC) untuk keamanan saldo
  const { data, error } = await supabaseClient.rpc("proses_tabungan", {
    p_user_id: user.id,
    p_goal_id: goalId,
    p_nominal: nominal,
  });

  if (error) {
    alert("Terjadi kesalahan sistem: " + error.message);
  } else if (!data.success) {
    // Menampilkan pesan error dari database jika saldo kurang
    alert(data.message);
  } else {
    alert("Berhasil! " + fmt(nominal) + " telah ditabung.");
    bootstrap.Modal.getInstance(document.getElementById("modalIsiTabungan")).hide();
    e.target.reset();
    muatGoals();
  }
};

/**
 * 4. Hapus Target
 */
window.hapusGoal = async function (id) {
  if (confirm("Yakin ingin menghapus target ini?")) {
    const { error } = await supabaseClient.from("goals").delete().eq("id", id);
    if (error) {
      alert("Gagal menghapus target.");
    } else {
      alert("Target berhasil dihapus.");
      muatGoals();
    }
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const sessionRaw = localStorage.getItem("user_session");
  if (!sessionRaw) {
    window.location.href = "/";
  } else {
    muatGoals();
  }
});
