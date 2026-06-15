// assets/js/aktivitas.js

// Fungsi format Rupiah
const fmt = (n) => "Rp " + new Intl.NumberFormat("id-ID").format(n);

async function muatData() {
  const listAktivitas = document.getElementById("listAktivitas");
  if (!listAktivitas) return;

  // 1. Ambil user secara aman dari Supabase Auth
  const {
    data: { user },
    error: authError,
  } = await supabaseClient.auth.getUser();

  if (authError || !user) {
    window.location.href = "index.html"; // Redirect jika belum login
    return;
  }

  // 2. Ambil transaksi berdasarkan user.id
  const { data, error } = await supabaseClient.from("transaksi").select("*").eq("user_id", user.id).order("created_at", { ascending: false });

  if (error) {
    console.error("Error:", error.message);
    listAktivitas.innerHTML = `<div class="p-3 text-danger">Gagal memuat data.</div>`;
    return;
  }

  // 3. Render HTML dengan Tanggal, Bulan, Tahun, dan Jam
  if (data && data.length > 0) {
    let html = "";
    data.forEach((i) => {
      const isMasuk = i.tipe === "pemasukan";

      // Membuat objek waktu dari created_at
      const tglObj = new Date(i.created_at);

      // Format Tanggal: 15 Juni 2026
      const tglFormat = tglObj.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      // Format Jam: 20:37
      const jamFormat = tglObj.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });

      html += `
                <div class="aktivitas-item">
                    <div class="item-left">
                        <div class="item-title">${i.deskripsi}</div>
                        <div class="item-time" style="font-size: 0.8rem; color: #6c757d;">
                            ${tglFormat} | ${jamFormat}
                        </div>
                    </div>
                    <div class="item-price ${isMasuk ? "masuk" : "keluar"}">
                        ${isMasuk ? "+" : "-"}${fmt(i.jumlah)}
                    </div>
                </div>`;
    });
    listAktivitas.innerHTML = html;
  } else {
    listAktivitas.innerHTML = `<div class="p-3 text-center">Belum ada transaksi.</div>`;
  }
}

async function simpan(e, idForm) {
  e.preventDefault();
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();
  if (!user) return alert("Sesi habis, silakan login kembali.");

  const form = document.getElementById(idForm);
  const formData = new FormData(form);

  const { error } = await supabaseClient.from("transaksi").insert([
    {
      user_id: user.id,
      deskripsi: formData.get("deskripsi"),
      jumlah: parseInt(formData.get("jumlah")),
      tipe: formData.get("tipe"),
    },
  ]);

  if (!error) {
    form.reset();
    const modalEl = document.querySelector(".modal.show");
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();
    muatData();
  } else {
    alert("Gagal menyimpan: " + error.message);
  }
}

// Inisialisasi Event Listener
document.addEventListener("DOMContentLoaded", () => {
  const formMasuk = document.getElementById("formPemasukan");
  const formKeluar = document.getElementById("formPengeluaran");

  if (formMasuk) formMasuk.onsubmit = (e) => simpan(e, "formPemasukan");
  if (formKeluar) formKeluar.onsubmit = (e) => simpan(e, "formPengeluaran");

  // Logout
  const logoutD = document.getElementById("logoutD");
  const logoutM = document.getElementById("logoutM");
  if (logoutD) logoutD.onclick = () => supabaseClient.auth.signOut().then(() => (window.location.href = "index.html"));
  if (logoutM) logoutM.onclick = () => supabaseClient.auth.signOut().then(() => (window.location.href = "index.html"));

  muatData();
});
