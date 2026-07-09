/**
 * =========================================================
 * FILE: aktivitas.js (TERKOREKSI TOTAL & BEBAS BUG)
 * =========================================================
 */

function fmt(angka) {
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

/** Helper: mendapatkan rentang tanggal bulan berjalan (Awal & Akhir Bulan) */
function getRentangBulanIni() {
  const sekarang = new Date();
  // Awal bulan: Tanggal 1 jam 00:00:00
  const awal = new Date(sekarang.getFullYear(), sekarang.getMonth(), 1);
  // Akhir bulan: Tanggal 1 di bulan berikutnya jam 00:00:00
  const akhir = new Date(sekarang.getFullYear(), sekarang.getMonth() + 1, 1);
  
  return { awal: awal.toISOString(), akhir: akhir.toISOString() };
}

/**
 * ---------------------------------------------------------
 * 1. Muat Data Transaksi (Filtered Server-Side Bulan Ini)
 * ---------------------------------------------------------
 */
async function muatData() {
  const listAktivitas = document.getElementById("listAktivitas");
  if (!listAktivitas) return;

  try {
    // Pastikan `supabaseClient` sudah siap sebelum dipanggil
    if (typeof supabaseClient === "undefined") {
      console.error("Supabase client belum terinisialisasi. Cek file supabase-init.js Anda.");
      listAktivitas.innerHTML = `<div class="p-3 text-danger text-center">Koneksi database belum siap.</div>`;
      return;
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.warn("User tidak terautentikasi, mengalihkan ke halaman login...");
      window.location.href = "/";
      return;
    }

    const { awal, akhir } = getRentangBulanIni();

    // Tarik data langsung difilter dari database Supabase
    const { data: dataBulanIni, error } = await supabaseClient
      .from("transaksi")
      .select("*")
      .eq("user_id", user.id)
      .gte("created_at", awal)
      .lt("created_at", akhir)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    // Render hasil ke UI
    if (dataBulanIni && dataBulanIni.length > 0) {
      let html = "";
      dataBulanIni.forEach((i) => {
        const isMasuk = i.tipe === "pemasukan";
        const tglObj = new Date(i.created_at);
        const tglFormat = tglObj.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
        const jamFormat = tglObj.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

        html += `
          <div class="aktivitas-item">
              <div class="item-left">
                  <div class="item-title">${escapeHtml(i.deskripsi)}</div>
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
      listAktivitas.innerHTML = `
          <div class="aktivitas-item">
              <div class="item-title text-center py-4 text-muted">Belum ada transaksi di bulan ini.</div>
          </div>`;
    }
  } catch (err) {
    console.error("Error fatal saat memuat data:", err.message || err);
    listAktivitas.innerHTML = `<div class="p-3 text-danger text-center">Gagal memuat data transaksi: ${escapeHtml(err.message)}</div>`;
  }
}

/**
 * ---------------------------------------------------------
 * 2. Simpan Transaksi Baru
 * ---------------------------------------------------------
 */
async function simpanTransaksi(tipe, jumlah, deskripsi) {
  try {
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      window.location.href = "/";
      return null;
    }

    const { data, error } = await supabaseClient
      .from("transaksi")
      .insert([
        {
          user_id: user.id,
          tipe,
          jumlah,
          deskripsi,
        },
      ])
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Gagal menambah transaksi:", error.message);
    Swal.fire({
      icon: 'error',
      title: 'Waduh, Gagal!',
      text: 'Gagal menyimpan transaksi: ' + error.message,
      confirmButtonColor: '#dc3545'
    });
    return null;
  }
}

/**
 * ---------------------------------------------------------
 * 3. Pasang Handler Submit ke Form Modal
 * ---------------------------------------------------------
 */
function pasangFormHandler(formId, modalId) {
  const form = document.getElementById(formId);
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const tipe = formData.get("tipe");
    const jumlah = parseInt(formData.get("jumlah"), 10);
    const deskripsi = formData.get("deskripsi");

    if (!jumlah || jumlah <= 0 || !deskripsi) {
      Swal.fire({
        icon: 'warning',
        title: 'Input Belum Lengkap',
        text: 'Mohon isi deskripsi dan jumlah uang dengan benar ya!',
        confirmButtonColor: '#ffc107',
      });
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const teksAsli = submitBtn ? submitBtn.innerText : null;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerText = "Menyimpan...";
    }

    const hasil = await simpanTransaksi(tipe, jumlah, deskripsi);

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerText = teksAsli;
    }

    if (hasil !== null) {
      form.reset();
      
      const modalEl = document.getElementById(modalId);
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) {
        modal.hide();
      }

      Swal.fire({
        icon: 'success',
        title: 'Mantap!',
        text: `Transaksi "${deskripsi}" sebesar ${fmt(jumlah)} berhasil disimpan!`,
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });

      await muatData(); 
    }
  });
}

// 4. Jalankan semuanya saat DOM selesai dimuat
document.addEventListener("DOMContentLoaded", () => {
  muatData();
  pasangFormHandler("formPemasukan", "modalPemasukan");
  pasangFormHandler("formPengeluaran", "modalPengeluaran");
});