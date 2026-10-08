# App Raízes e Saberes

Shell mobile visual em Expo/React Native para homologação de navegação e layout.

## Fase 01

- Sem Supabase obrigatório.
- Sem integração remota.
- Sem alterações em backend, RLS ou migrations.
- Dados demonstrativos isolados em `src/data/fixtures.ts`.
- WebView não é usado como app principal.

## Auth Web

O app mobile/web não deve publicar `service_role` nem depender de project-ref fixo no bundle.

Para Preview/Produção, configurar no projeto Vercel existente `app-raizes-e-saberes`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<publishable-or-anon-key>
```

No modo web, também é aceito `window.RAIZES_SUPABASE = { url, anonKey }` antes do bundle Expo, quando a página hospedeira controlar a configuração.

Contratos Supabase usados pelo login institucional:

- `profiles(id, display_name, platform_role, status)`;
- `teacher_get_context()`;
- `student_get_context()`, incluindo `segment` quando disponível.

## Rodar

```bash
cd mobile
npm install
npm run start
```

Depois da homologação visual, a Fase 03 troca fixtures pelos motores reais já homologados na plataforma web.
