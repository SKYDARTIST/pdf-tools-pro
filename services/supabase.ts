import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eydbnogluccjhmofsnhu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5ZGJub2dsdWNjamhtb2Zzbmh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4ODgwMTgsImV4cCI6MjA4MzQ2NDAxOH0.acvpbJi0N0eWE6J8ohjvkJWCxV7cg6IEUpWAYlILl48';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
