/**
 * =========================================================
 * FILE: admin.js
 * Logic untuk admin/dashboard.html
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

let currentUserRole = null;
let semuaProfil = [];
let semuaTransaksiAll = [];

async function muatDataAdmin() {
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();
  if (!user) return;

  const { data: myProfile } = await supabaseClient
    .from("profiles")
    .select("role,email")
    .eq("id", user.id)
    .single();

  currentUserRole = myProfile?.role || null;
  const namaEl = document.getElementById("namaAdminAktif");
  if (namaEl) namaEl.innerText = (myProfile?.email || user.email).split("@")[0] + " (" + currentUserRole + ")";

  const { data: profiles, error: errP } = await supabaseClient
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: transaksi, error: errT } = await supabaseClient
    .from("transaksi")
    .select("*");

  if (errP) console.error("Gagal ambil profiles:", errP.message);
  if (errT) console.error("Gagal ambil transaksi:", errT.message);

  semuaProfil = profiles || [];
  semuaTransaksiAll = transaksi || [];

  renderStats();
  renderTabelUser();
}

function renderStats() {
  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.innerText = val;
  };

  setText("statTotalUser", semuaProfil.length);
  setText("statTotalTransaksi", semuaTransaksiAll.length);
  // Sengaja TIDAK ada saldo gabungan semua user di sini.
  // Saldo tiap user tetap ditampilkan per-baris di tabel (renderTabelUser).
}

function hitungSaldoUser(userId) {
  let masuk = 0;
  let keluar = 0;
  semuaTransaksiAll
    .filter((t) => t.user_id === userId)
    .forEach((t) => {
      const j = parseInt(t.jumlah) || 0;
      if (t.tipe === "pemasukan") masuk += j;
      else keluar += j;
    });
  return { masuk, keluar, saldo: Math.max(masuk - keluar, 0) };
}

function renderTabelUser() {
  const tbody = document.getElementById("tabelUserBody");
  if (!tbody) return;

  if (semuaProfil.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-3 text-muted">Belum ada user.</td></tr>`;
    return;
  }

  tbody.innerHTML = semuaProfil
    .map((p) => {
      const { masuk, keluar, saldo } = hitungSaldoUser(p.id);
      const jumlahTx = semuaTransaksiAll.filter((t) => t.user_id === p.id).length;
      const badgeClass =
        p.role === "superadmin" ? "bg-danger" : p.role === "admin" ? "bg-primary" : "bg-secondary";

      let tombolRole = "";
      if (currentUserRole === "superadmin" && p.role !== "superadmin") {
        tombolRole =
          p.role === "user"
            ? `<button class="btn btn-sm btn-outline-primary" onclick="ubahRole('${p.id}','admin')">Jadikan Admin</button>`
            : `<button class="btn btn-sm btn-outline-warning" onclick="ubahRole('${p.id}','user')">Cabut Admin</button>`;
      }

      return `
      <tr>
        <td>${escapeHtml(p.email)}</td>
        <td><span class="badge ${badgeClass}">${escapeHtml(p.role)}</span></td>
        <td>${jumlahTx}</td>
        <td class="text-success">${fmt(masuk)}</td>
        <td class="text-danger">${fmt(keluar)}</td>
        <td class="fw-bold">${fmt(saldo)}</td>
        <td class="d-flex gap-1 flex-wrap">
          <button class="btn btn-sm btn-outline-secondary" onclick="lihatDetailUser('${p.id}','${escapeHtml(p.email)}')">Detail</button>
          ${tombolRole}
        </td>
      </tr>`;
    })
    .join("");
}

async function ubahRole(userId, roleBaru) {
  if (currentUserRole !== "superadmin") {
    alert("Hanya super admin yang boleh mengubah role user.");
    return;
  }
  if (!confirm(`Ubah role user ini menjadi "${roleBaru}"?`)) return;

  const { error } = await supabaseClient.from("profiles").update({ role: roleBaru }).eq("id", userId);
  if (error) {
    alert("Gagal mengubah role: " + error.message);
    return;
  }
  await muatDataAdmin();
}

function lihatDetailUser(userId, email) {
  const list = semuaTransaksiAll
    .filter((t) => t.user_id === userId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const labelEl = document.getElementById("modalDetailLabel");
  if (labelEl) labelEl.innerText = "Transaksi milik " + email;

  const body = document.getElementById("modalDetailBody");
  if (!body) return;

  if (list.length === 0) {
    body.innerHTML = `<div class="text-center text-muted py-3">Belum ada transaksi.</div>`;
  } else {
    body.innerHTML = list
      .map(
        (t) => `
      <div class="d-flex justify-content-between border-bottom py-2">
        <div>
          <div>${escapeHtml(t.deskripsi)}</div>
          <small class="text-muted">${new Date(t.created_at).toLocaleString("id-ID")}</small>
        </div>
        <div class="text-end">
          <div class="${t.tipe === "pemasukan" ? "text-success" : "text-danger"}">
            ${t.tipe === "pemasukan" ? "+" : "-"}${fmt(parseInt(t.jumlah) || 0)}
          </div>
          <button class="btn btn-sm btn-outline-danger mt-1" onclick="hapusTransaksiAdmin('${t.id}','${userId}','${escapeHtml(email)}')">Hapus</button>
        </div>
      </div>`
      )
      .join("");
  }

  const modalEl = document.getElementById("modalDetail");
  const modal = new bootstrap.Modal(modalEl);
  modal.show();
}

async function hapusTransaksiAdmin(txId, userId, email) {
  if (!confirm("Yakin hapus transaksi ini? Tindakan tidak bisa dibatalkan.")) return;

  const { error } = await supabaseClient.from("transaksi").delete().eq("id", txId);
  if (error) {
    alert("Gagal menghapus transaksi: " + error.message);
    return;
  }
  await muatDataAdmin();
  lihatDetailUser(userId, email);
}

document.addEventListener("DOMContentLoaded", muatDataAdmin);