# App Raízes e Saberes

App mobile em Expo/React Native do Ecossistema Educacional Raízes e Saberes.

## Status V1

- Raízes Crescer: FROZEN.
- Fundamental/Médio: FROZEN.
- Professor: FROZEN.
- App Structural V1: FROZEN.
- P0: ZERO.
- P1: ZERO.
- P2 runtime: ZERO.
- Conteúdo definitivo e mobiliário editorial: FUTURE.
- Próxima fase: NATIVE BUILD.

Este checkpoint representa o Golden Master estrutural do App V1 após a última navegação aprovada. Não reabrir funcionalidades durante a fase nativa salvo regressão concreta.

## Rodar

```bash
cd mobile
npm install
npm run start
```

## Web App

O Preview/Produção na Vercel deve usar somente variáveis públicas:

```bash
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Use somente chave publicável/anon de cliente. Nunca configure `service_role` no Web App.
