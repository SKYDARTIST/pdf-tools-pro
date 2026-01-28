import { createClient } from '@supabase/supabase-js';
import Config from './configService';

// Initialize Supabase Client
const supabaseUrl = Config.VITE_SUPABASE_URL;
const supabaseKey = Config.VITE_SUPABASE_ANON_KEY;

// Export shared instance
export const supabase = createClient(supabaseUrl, supabaseKey);
