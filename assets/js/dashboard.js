async function hitungDataDashboard() {
  const userDisplay = document.getElementById("namaUserAktif");
  const containerGoals = document.getElementById("containerGoals");

  const {
    data: { user },
    error: authError,
  } = await supabaseClient.auth.getUser();

  if (authError || !user) {
    window.location.href = "/";
    return;
  }

  if (userDisplay) {
    userDisplay.innerText = user.email.split("@")[0];
  }

  const { awal, akhir, sekarang } = getRentangBulanIni();

  // 1. AMBIL SEMUA TRANSAKSI (Untuk hitung Saldo Riil Akhir)
  const { data: semuaTransaksi, error: errSemua } = await supabaseClient
    .from("transaksi")
    .select("tipe, jumlah, deskripsi")
    .eq("user_id", user.id);

  if (errSemua) console.error("Gagal ambil semua transaksi:", errSemua.message);

  // 2. AMBIL TRANSAKSI BULAN INI
  const { data: transaksiBulanIni, error: errBulan } = await supabaseClient
    .from("transaksi")
    .select("*")
    .eq("user_id", user.id)
    .gte("created_at", awal)
    .lt("created_at", akhir)
    .order("created_at", { ascending: false });

  if (errBulan) console.error("Gagal ambil transaksi bulan ini:", errBulan.message);

  // 3. AMBIL DATA GOALS
  const { data: listGoals, error: errGoals } = await supabaseClient
    .from("goals")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(3);

  if (errGoals) console.error("Gagal ambil goals:", errGoals.message);

  // ==========================================
  // LOGIKA 1: HITUNG SALDO AKHIR (ALL-TIME)
  // ==========================================
  // Saldo akhir harus menghitung SEMUA transaksi termasuk mutasi Goals 
  // supaya uang yang masuk ke celengan memotong saldo utama.
  let totalMasukSelamanya = 0;
  let totalKeluarSelamanya = 0;
  
  (semuaTransaksi || []).forEach((i) => {
    const jumlah = parseInt(i.jumlah) || 0;
    if (i.tipe === "pemasukan") totalMasukSelamanya += jumlah;
    else totalKeluarSelamanya += jumlah;
  });
  const totalSaldoBersih = Math.max(totalMasukSelamanya - totalKeluarSelamanya, 0);

  // ==========================================
  // LOGIKA 2: HITUNG UTAMA BULAN INI (FILTER INTERNAL TRANSAKSI)
  // ==========================================
  let bulanMasuk = 0;
  let bulanKeluar = 0;
  let htmlT = "";
  let jumlahTransaksiTampil = 0;

  if (transaksiBulanIni && transaksiBulanIni.length > 0) {
    transaksiBulanIni.forEach((i) => {
      const jumlah = parseInt(i.jumlah) || 0;
      const deskripsiUlc = (i.deskripsi || "").toLowerCase();
      
      // Deteksi apakah ini transaksi internal alokasi Goals
      // Sesuaikan kata kunci ini dengan apa yang di-insert oleh fungsi RPC (proses_tabungan / tarik_tabungan) Anda
      const isTransaksiGoals = deskripsiUlc.includes("goals") || 
                               deskripsiUlc.includes("tabungan") || 
                               deskripsiUlc.includes("tarik dana");

      if (!isTransaksiGoals) {
        // HANYA transaksi riil yang masuk ke perhitungan statistik bulanan
        if (i.tipe === "pemasukan") {
          bulanMasuk += jumlah;
        } else {
          bulanKeluar += jumlah;
        }

        // HANYA transaksi riil yang dimasukkan ke daftar "Transaksi Terbaru" (Maksimal 5)
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

  // Jika setelah difilter ternyata kosong
  if (jumlahTransaksiTampil === 0) {
    htmlT = `<div class="text-center nama py-3">Belum ada transaksi riil di bulan ini.</div>`;
  }
  
  const bulanSaldo = Math.max(bulanMasuk - bulanKeluar, 0);

  // ==========================================
  // RENDER DATA KE UI
  // ==========================================
  setText("totalSaldo", fmt(totalSaldoBersih)); // Saldo berkurang/bertambah real-time sesuai isi/tarik goals
  
  // Statistik di bawah ini murni Arus Kas Riil, bersih dari aktivitas Goals
  setText("totalMasuk", fmt(bulanMasuk));
  setText("totalKeluar", fmt(bulanKeluar));
  setText("bulanMasuk", fmt(bulanMasuk));
  setText("bulanKeluar", fmt(bulanKeluar));
  setText("bulanSaldo", fmt(bulanSaldo));
  setText(
    "periodeBulanIni",
    sekarang.toLocaleDateString("id-ID", { month: "long", year: "numeric" })
  );

  const elTransaksi = document.getElementById("containerTransaksi");
  if (elTransaksi) elTransaksi.innerHTML = htmlT;

  // Render Ringkasan Target Goals
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
}