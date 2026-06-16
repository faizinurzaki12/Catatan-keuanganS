/**
 * 1. Muat Daftar Goals (DIPERBAIKI)
 */
async function muatGoals() {
  const listContainer = document.getElementById("listGoals");
  if (!listContainer) return;

  // A. Cek sesi lokal dulu sebagai proteksi
  const sessionRaw = localStorage.getItem("user_session");
  if (!sessionRaw) {
    window.location.href = "/";
    return;
  }

  // B. Ambil user
  const {
    data: { user },
    error: authError,
  } = await supabaseClient.auth.getUser();

  if (authError || !user) {
    listContainer.innerHTML = `<p class="text-danger">Sesi habis, silakan login ulang.</p>`;
    return;
  }

  // C. Ambil data goals
  const { data, error } = await supabaseClient.from("goals").select("*").eq("user_id", user.id).order("created_at", { ascending: false });

  // D. Handle Error Database
  if (error) {
    listContainer.innerHTML = `<p class="text-danger">Gagal memuat data: ${error.message}</p>`;
    return;
  }

  // E. Render data
  if (data && data.length > 0) {
    let html = "";
    data.forEach((g) => {
      const persen = Math.min(Math.round((g.terkumpul / g.target_jumlah) * 100), 100);
      html += `
        <div class="goal-card">
            <div class="goal-header"><strong>${g.nama_goal}</strong> <span>${persen}%</span></div>
            <div class="progress-bar-custom"><div class="progress-fill" style="width: ${persen}%"></div></div>
            <small class="text-muted">${fmt(g.terkumpul)} / ${fmt(g.target_jumlah)}</small>
            <div class="d-flex gap-2 mt-2">
                <button class="btn btn-primary btn-sm" onclick="bukaModalTabungan('${g.id}')">Isi Tabungan</button>
                <button class="btn btn-danger btn-sm" onclick="hapusGoal('${g.id}')">Hapus</button>
            </div>
        </div>`;
    });
    listContainer.innerHTML = html;
  } else {
    listContainer.innerHTML = `<div class="goal-card"><div class="goal-header">Belum ada target.</div></div>`;
  }
}

// Inisialisasi dengan proteksi sesi
document.addEventListener("DOMContentLoaded", () => {
  const sessionRaw = localStorage.getItem("user_session");
  if (sessionRaw) {
    muatGoals();
  } else {
    window.location.href = "/";
  }
});
