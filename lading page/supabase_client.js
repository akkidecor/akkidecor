// ============================================
//  Supabase Client Configuration
// ============================================

// 1. Your Supabase Project URL (provided by user)
const SUPABASE_URL = 'https://twbgwixsdikwiwczsdzv.supabase.co';

// 2. Your Supabase anon key (Public Key)
const SUPABASE_ANON_KEY = 'sb_publishable_cpMH5QrMV_t_gq0BVXzuNw_iMyGNre8';

// Create a single supabase client for interacting with your database
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
