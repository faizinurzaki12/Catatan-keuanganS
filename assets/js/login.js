const togglePassword = document.querySelector("#togglePassword");
const passwordField = document.querySelector("#password");

togglePassword.addEventListener("click", function () {
  // Cek tipe input saat ini dan balikkan nilainya
  const type = passwordField.getAttribute("type") === "password" ? "text" : "password";
  passwordField.setAttribute("type", type);

  // Mengubah ikon mata (Mata terbuka saat sembunyi, mata tertutup saat terlihat)
  this.textContent = type === "password" ? "👁️" : "🙈";
});

document.getElementById("login").addEventListener("submit", async (e) => {
  e.preventDefault(); // Mencegah reload halaman

  const emailInput = document.getElementById("email").value;
  const passwordInput = document.getElementById("password").value;
  const alertBox = document.getElementById("alertLogin");

  // Reset alert sembunyi setiap kali tombol ditekan
  alertBox.classList.add("d-none");

  // 🛠️ PERBAIKAN: Diubah menjadi supabaseClient agar singkron dengan file supabase-init.js kamu
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: emailInput,
    password: passwordInput,
  });

  if (error) {
    // 🛠️ 1. Memunculkan teks peringatan di Alert Bootstrap
    alertBox.innerText = "Email atau password anda salah!";
    alertBox.classList.remove("d-none");

    // 🛠️ 2. HANYA mengosongkan password (email tetap ada, tidak dibalikin kosong)
    document.getElementById("password").value = "";
  } else {
    alertBox.classList.add("d-none");

    // Simpan data session ke local storage
    localStorage.setItem("user_session", JSON.stringify(data.user));

    // Lolos ke halaman utama
    window.location.href = "/dashboard";
  }
});
