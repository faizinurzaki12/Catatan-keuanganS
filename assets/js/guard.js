/**
 * =========================================================
 * FILE: auth-guard.js
 * PENEMPATAN: taruh di dashboard.html / catatan.html / aktivitas.html
 * SETELAH supabase-init.js dan SEBELUM auth.js & dashboard.js
 * =========================================================
 */
(async function proteksiHalaman() {
  const {
    data: { session },
    error,
  } = await supabaseClient.auth.getSession();

  if (error || !session) {
    window.location.href = "/";
  }
})();