const fmt = (n) => "Rp " + new Intl.NumberFormat("id-ID").format(n);

/**
 * 1. Muat Daftar Goals
 */
async function muatGoals() {
  const listContainer = document.getElementById("listGoals");
  if (!listContainer) return;

  const {
    data: { user },
  } = await supabaseClient.auth.getUser();
  if (!user) return;

  listContainer.innerHTML = `<!-- nothing -->`;

  const { data, error } = await supabaseClient.from("goals").select("*").eq("user_id", user.id).order("created_at", { ascending: false });

  if (error) {
    listContainer.innerHTML = `<p class="text-danger">Gagal: ${error.message}</p>`;
    return;
  }

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
    listContainer.innerHTML = `
    <div class="goal-card">
      <div class="goal-header">Belum ada target.</div>
    </div>
    `;
  }
}

/**
 * 2. Tambah Target Baru (TIDAK Memotong Saldo Utama)
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
 * 3. Isi Tabungan (MENGAMBIL Saldo Utama)
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

  const { data: goal } = await supabaseClient.from("goals").select("terkumpul, target_jumlah, nama_goal").eq("id", goalId).single();

  // Update Goals
  const { error: errorUpdate } = await supabaseClient
    .from("goals")
    .update({ terkumpul: goal.terkumpul + nominal })
    .eq("id", goalId);

  // Insert Transaksi (Saldo Berkurang)
  const { error: errorTrans } = await supabaseClient.from("transaksi").insert([
    {
      user_id: user.id,
      deskripsi: "Isi Tabungan: " + goal.nama_goal,
      jumlah: nominal,
      tipe: "pengeluaran",
    },
  ]);

  if (errorUpdate || errorTrans) {
    alert("Terjadi kesalahan saat menyimpan tabungan.");
  } else {
    alert("Berhasil! Tabungan " + fmt(nominal) + " telah masuk ke target.");
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

document.addEventListener("DOMContentLoaded", muatGoals);
