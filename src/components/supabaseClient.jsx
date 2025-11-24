// supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dnoyntieudnkwiqdpwjt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRub3ludGlldWRua3dpcWRwd2p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5NjgxODQsImV4cCI6MjA3OTU0NDE4NH0.35W1x4_SgT-CYmQ8pMQnIW1RAsBAEFv-ZsHs58Wpg8s';

// Create a single client instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
