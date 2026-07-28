// Copie este arquivo para supabase-config.js no ambiente de homologacao/deploy.
// Nao versionar supabase-config.js com valores reais.
// Use somente a anon key publica. Nunca use service role key no navegador.
window.RAIZES_SUPABASE = {
  url: "https://SEU_PROJECT_REF.supabase.co",
  anonKey: "SUPABASE_ANON_KEY_PUBLICA",
  // Opcional: use apenas em desenvolvimento local. Em producao, deixe false/ausente
  // para que falhas de conexao aparecam como erro explicito.
  allowLocalFallback: false,
};
