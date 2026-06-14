// assets/js/supabase-init.js

// 1. Konfigurasi API Supabase Anda
const SUPABASE_URL = "https://dpyxvokyihreduzgpwyv.supabase.co";
const SUPABASE_ANON_KEY = "https://dpyxfokyihreduzgpwyv.supabase.co/rest/v1/";

// 2. Inisialisasi client Supabase secara global
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);