/**
 * =========================================================
 * FILE: admin-guard.js
 * Pasang di admin/dashboard.html SEBELUM auth.js / admin.js.
 * Fungsi: pastikan yang buka halaman ini sudah login DAN
 * rolenya admin atau superadmin. Kalau tidak, dilempar balik.
 * =========================================================
 */
// (async function jagaHalamanAdmin() {
//   const {
//     data: { user },
//     error: authError,
//   } = await supabaseClient.auth.getUser();

//   if (authError || !user) {
//     console.warn("[admin-guard] Belum login, redirect ke login.html", authError);
//     window.location.href = "/";
//     return;
//   }

//   const { data: profile, error: profError } = await supabaseClient
//     .from("profiles")
//     .select("role")
//     .eq("id", user.id)
//     .single();

//   if (profError) {
//     // Ini yang paling sering bikin "ke-tendang ke dashboard user":
//     // tabel profiles belum ada / baris user ini belum ada / RLS memblokir.
//     console.error("[admin-guard] Gagal ambil profile:", profError.message, profError);
//   }

//   if (profError || !profile || (profile.role !== "admin" && profile.role !== "superadmin")) {
//     console.warn("[admin-guard] Role tidak memenuhi syarat:", profile);
//     window.location.href = "/dashboard";
//   }
// })();