import { createClient } from '@supabase/supabase-js';

// En un entorno de producción real en Vercel, estas deberían ser variables de entorno
// import.meta.env.VITE_SUPABASE_URL y import.meta.env.VITE_SUPABASE_ANON_KEY
const supabaseUrl = 'https://qwjawulzcbddsijebncb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3amF3dWx6Y2JkZHNpamVibmNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MTgzMzgsImV4cCI6MjA4NDA5NDMzOH0.mHggfcYX145x4EZFvonVtWid08rB-7nIf-M-tF7Jcn8';

export const supabase = createClient(supabaseUrl, supabaseKey);