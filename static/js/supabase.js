/* ============================================================
   MAXX VEÍCULOS — SUPABASE.JS
   Configuração global do Supabase
   ============================================================ */

const MAXX_SUPABASE_URL = 'https://anwcdznwsgwtprvqofps.supabase.co';

const MAXX_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFud2Nkem53c2d3dHBydnFvZnBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMTc2NDIsImV4cCI6MjA5Njc5MzY0Mn0.84pTVivh2dae4NqgdCa0mkgmJbzP89-ZgE2scyxio_A';

const MAXX_SUPABASE = supabase.createClient(
  MAXX_SUPABASE_URL,
  MAXX_SUPABASE_ANON_KEY
);

window.MAXX_SUPABASE = MAXX_SUPABASE;