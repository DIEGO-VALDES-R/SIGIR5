import { createClient } from '@supabase/supabase-js';

// DEBUG - Verificar que las variables se carguen
console.log('🔍 Verificando Variables de Entorno:');
console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Configurada' : '❌ FALTA');

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ FALTAN VARIABLES DE ENTORNO');
  console.error('Por favor verifica tu archivo .env.local');
  throw new Error('Missing Supabase environment variables');
}

console.log('✅ Creando cliente de Supabase...');
export const supabase = createClient(supabaseUrl, supabaseKey);
console.log('✅ Cliente de Supabase creado correctamente');