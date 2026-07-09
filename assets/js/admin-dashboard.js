/**
 * =========================================================
 * FILE: admin-dashboard.js
 * Logic khusus admin/dashboard.html (3 card ringkasan)
 * =========================================================
 */
async function initDashboardAdmin() {
  await muatDataBersama();

  const totalUser = AdminStore.profiles.filter((p) => p.role === "user").length;
  const totalAdmin = AdminStore.profiles.filter((p) => p.role === "admin" || p.role === "superadmin").length;
  const totalTransaksi = AdminStore.transaksi.length;

  document.getElementById("cardTotalUser").innerText = totalUser;
  document.getElementById("cardTotalAdmin").innerText = totalAdmin;
  document.getElementById("cardTotalTransaksi").innerText = totalTransaksi;
}

document.addEventListener("DOMContentLoaded", initDashboardAdmin);