/**
 * =========================================================
 * FILE: admin-data-user.js
 * Versi FIX - Tanpa Kolom Nama (Menyesuaikan Database)
 * =========================================================
 */

// async function initDataUser() {
//   const tbody = document.getElementById("tabelUserBody");
//   if (!tbody) return;

//   try {
    // 1. Ambil info admin yang sedang login
    // const { data: { user } } = await supabaseClient.auth.getUser();
    // if (!user) {
    //   tbody.innerHTML = `<tr><td colspan="5" class="text-center py-3 text-danger">Kamu belum login.</td></tr>`;
    //   return;
    // }

    // // 2. Ambil role admin (Hanya select kolom yang pasti ada di database kamu)
    // const { data: myProfile } = await supabaseClient
    //   .from("profiles")
    //   .select("role, id")
    //   .eq("id", user.id)
    //   .single();

    // const myRole = myProfile?.role || "user";
    // const myId = myProfile?.id;

    // 3. Tarik semua data user (Kolom 'nama' SENGAJA dihapus karena tidak ada di tabel kamu)
    // const { data: profiles, error: errP } = await supabaseClient
    //   .from("profiles")
    //   .select("id, email, role, created_at")
    //   .order("created_at", { ascending: false });

    // if (errP) throw errP;

    // // 4. Jika data kosong
    // if (!profiles || profiles.length === 0) {
    //   tbody.innerHTML = `<tr><td colspan="5" class="text-center py-3 text-muted">Belum ada user terdaftar.</td></tr>`;
    //   return;
    // }

    // 5. Render data langsung ke HTML tabel
//     tbody.innerHTML = profiles.map((p) => {
//       const tanggal = p.created_at ? new Date(p.created_at).toLocaleDateString("id-ID") : "-";
      
//       // Karena kolom nama tidak ada, kita potong email sebelum tanda '@' untuk dijadikan username sementara
//       const namaTampil = p.email ? escapeHtml(p.email.split('@')[0]) : `<span class="text-muted fst-italic">(tanpa email)</span>`;

//       // Aturan hapus akun di frontend
//       const bolehHapus = (myRole === "superadmin") && (p.id !== myId) && (p.role !== "superadmin");

//       return `
//         <tr>
//           <td data-label="UUID"><code class="small">${escapeHtml(p.id)}</code></td>
//           <td data-label="Nama">${namaTampil}</td>
//           <td data-label="Email">${escapeHtml(p.email)}</td>
//           <td data-label="Terdaftar">${tanggal}</td>
//           <td data-label="Aksi">
//             ${
//               bolehHapus
//                 ? `<button class="btn btn-sm btn-outline-danger" onclick="hapusAkunSimpel('${p.id}', '${escapeHtml(p.email)}')">Hapus Akun</button>`
//                 : `<span class="text-muted small">-</span>`
//             }
//           </td>
//         </tr>`;
//     }).join("");

//   } catch (error) {
//     console.error("Gagal memuat data user:", error);
//     tbody.innerHTML = `<tr><td colspan="5" class="text-center py-3 text-danger">Gagal memuat data: ${error.message}</td></tr>`;
//   }
// }

/** Fungsi Hapus Akun Langsung via Database */
/** Fungsi Hapus Akun Melalui Supabase Auth Admin API */
/** Fungsi Hapus Akun Menggunakan RPC Supabase Aman */
// async function hapusAkunSimpel(userId, email) {
//   if (!confirm(`Yakin ingin menghapus akun "${email}" secara permanen dari sistem?`)) {
//     return;
//   }

//   try {
//     // Memanggil fungsi Postgres RPC yang kita buat di Supabase tadi
//     const { data, error } = await supabaseClient.rpc('hapus_user_oleh_admin', {
//       user_id_target: userId
//     });

//     if (error) throw error;

//     alert(`Akun "${email}" berhasil dihapus secara permanen dari database!`);
    
//     // Refresh isi tabel agar data yang terhapus langsung hilang dari layar
//     initDataUser(); 
//   } catch (error) {
//     alert("Gagal menghapus akun: " + error.message);
//     console.error("Detail Error:", error);
//   }
// }
// Jalankan fungsi begitu halaman selesai dimuat
// document.addEventListener("DOMContentLoaded", initDataUser);