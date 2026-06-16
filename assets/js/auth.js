// auth.js - Penjaga Gerbang & Penyedia User ID
const sessionRaw = localStorage.getItem("user_session");

// 1. Jika belum login, tendang ke index.html
if (!sessionRaw) {
    window.location.href = "/";
}

// 2. Ambil data user
const sessionData = JSON.parse(sessionRaw);
const userId = sessionData.id; // Ini UUID yang akan dipakai semua file

// 3. Fungsi Logout Universal
function logout() {
    localStorage.removeItem("user_session");
    window.location.href = "/";
}