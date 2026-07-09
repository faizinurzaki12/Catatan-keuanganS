/**
 * =========================================================
 * FILE: auth.js
 * Dipakai di SEMUA halaman:
 * - Di login.html      -> menangani form Login
 * - Di register.html   -> menangani form Register
 * - Di dashboard/catatan/aktivitas/admin -> menyediakan fungsi
 *   logout() untuk tombol #logoutM, #logoutD, #logoutAdmin
 *
 * Urutan include (WAJIB):
 * 1. supabase-js (CDN)
 * 2. supabase-init.js   (bikin variabel global `supabaseClient`)
 * 3. guard.js / admin-guard.js  (HANYA di halaman yang butuh login)
 * 4. auth.js             (file ini)
 * 5. dashboard.js / catatan.js / admin.js / dst
 * =========================================================
 */

// ---------- LOGOUT (dipakai di halaman yang sudah login) ----------
async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = "/index.html";
}

document.addEventListener("DOMContentLoaded", () => {
  ["logoutM", "logoutD", "logoutAdmin"].forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        logout();
      });
    }
  });

  // ---------- FORM LOGIN (hanya ada di login.html) ----------
  const formLogin = document.getElementById("formLogin");
  if (formLogin) {
    formLogin.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("loginEmail").value.trim();
      const password = document.getElementById("loginPassword").value;
      const btn = formLogin.querySelector("button[type=submit]");
      const errBox = document.getElementById("loginError");

      errBox.classList.add("d-none");
      btn.disabled = true;
      btn.innerText = "Memproses...";

      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        btn.disabled = false;
        btn.innerText = "Masuk";
        errBox.innerText = terjemahkanError(error.message);
        errBox.classList.remove("d-none");
        return;
      }

      // Cek role user ini untuk menentukan halaman tujuan
      const { data: profile, error: profError } = await supabaseClient
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profError) {
        console.error("[auth.js] Gagal ambil profile setelah login:", profError.message, profError);
      }

      btn.disabled = false;
      btn.innerText = "Masuk";

      if (profile && (profile.role === "admin" || profile.role === "superadmin")) {
        window.location.href = "/admin/dashboard.html";
      } else {
        window.location.href = "/dashboard.html";
      }
    });
  }

  // ---------- FORM REGISTER (hanya ada di register.html) ----------
  const formRegister = document.getElementById("formRegister");
  if (formRegister) {
    formRegister.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("regEmail").value.trim();
      const password = document.getElementById("regPassword").value;
      const passwordConfirm = document.getElementById("regPasswordConfirm").value;
      const btn = formRegister.querySelector("button[type=submit]");
      const errBox = document.getElementById("regError");
      const okBox = document.getElementById("regSuccess");

      errBox.classList.add("d-none");
      okBox.classList.add("d-none");

      if (password !== passwordConfirm) {
        errBox.innerText = "Konfirmasi password tidak cocok.";
        errBox.classList.remove("d-none");
        return;
      }
      if (password.length < 6) {
        errBox.innerText = "Password minimal 6 karakter.";
        errBox.classList.remove("d-none");
        return;
      }

      btn.disabled = true;
      btn.innerText = "Memproses...";

      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
      });

      btn.disabled = false;
      btn.innerText = "Daftar";

      if (error) {
        errBox.innerText = terjemahkanError(error.message);
        errBox.classList.remove("d-none");
        return;
      }

      if (data.user && !data.session) {
        okBox.innerText =
          "Pendaftaran berhasil! Silakan cek email kamu untuk konfirmasi sebelum login.";
        okBox.classList.remove("d-none");
        formRegister.reset();
        return;
      }

      window.location.href = "/dashboard.html";
    });
  }
});

/** Ubah pesan error Supabase jadi bahasa Indonesia yang lebih ramah */
function terjemahkanError(msg) {
  if (msg.includes("Invalid login credentials")) return "Email atau password salah.";
  if (msg.includes("User already registered")) return "Email ini sudah terdaftar. Silakan login.";
  if (msg.includes("Password should be at least")) return "Password minimal 6 karakter.";
  if (msg.includes("Unable to validate email")) return "Format email tidak valid.";
  return msg;
}