// assets/js/aktivitas.js

// Fungsi format Rupiah
const fmt = (n) => "Rp " + new Intl.NumberFormat("id-ID").format(n);

/**
 * 1. Muat Data Transaksi
 */
async function muatData() {
  const listAktivitas = document.getElementById("listAktivitas");
  if (!listAktivitas) return;

  const {
    data: { user },
    error: authError,
  } = await supabaseClient.auth.getUser();
  if (authError || !user) {
    window.location.href = "index.html";
    return;
  }

  const { data, error } = await supabaseClient.from("transaksi").select("*").eq("user_id", user.id).order("created_at", { ascending: false });

  if (error) {
    console.error("Error:", error.message);
    listAktivitas.innerHTML = `<div class="p-3 text-danger">Gagal memuat data.</div>`;
    return;
  }

  if (data && data.length > 0) {
    let html = "";
    data.forEach((i) => {
      const isMasuk = i.tipe === "pemasukan";
      const tglObj = new Date(i.created_at);
      const tglFormat = tglObj.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
      const jamFormat = tglObj.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

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

/**
 * 2. Fungsi Simpan Transaksi dengan Alert
 */
async function simpan(e, idForm) {
  e.preventDefault();
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();
  if (!user) return alert("Sesi habis, silakan login kembali.");

  const form = document.getElementById(idForm);
  const formData = new FormData(form);
  const deskripsi = formData.get("deskripsi");
  const jumlah = parseInt(formData.get("jumlah"));
  const tipe = formData.get("tipe");

  const { error } = await supabaseClient.from("transaksi").insert([
    {
      user_id: user.id,
      deskripsi: deskripsi,
      jumlah: jumlah,
      tipe: tipe,
    },
  ]);

  if (!error) {
    // Alert sukses
    alert(`Berhasil! Transaksi "${deskripsi}" sebesar ${fmt(jumlah)} telah disimpan.`);

    form.reset();
    const modalEl = document.querySelector(".modal.show");
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();

    // Refresh data
    muatData();
  } else {
    // Alert error
    alert("Gagal menyimpan: " + error.message);
  }
}

/**
 * 3. Inisialisasi
 */
document.addEventListener("DOMContentLoaded", () => {
  const formMasuk = document.getElementById("formPemasukan");
  const formKeluar = document.getElementById("formPengeluaran");

  if (formMasuk) formMasuk.onsubmit = (e) => simpan(e, "formPemasukan");
  if (formKeluar) formKeluar.onsubmit = (e) => simpan(e, "formPengeluaran");

  const logoutD = document.getElementById("logoutD");
  const logoutM = document.getElementById("logoutM");

  if (logoutD) logoutD.onclick = () => supabaseClient.auth.signOut().then(() => (window.location.href = "index.html"));
  if (logoutM) logoutM.onclick = () => supabaseClient.auth.signOut().then(() => (window.location.href = "index.html"));

  muatData();
});
