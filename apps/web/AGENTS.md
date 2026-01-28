# apps/web - Torre Tempo Frontend

**Generated:** 2026-01-28 21:43
**Commit:** 0255da4
**Branch:** main

## OVERVIEW
React 18 + Vite PWA with Tailwind. Routes are inline in App.tsx; i18n and state tooling are wired but API integration is minimal.

## STRUCTURE

```
web/
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── features/landing/
│   ├── i18n/
│   ├── lib/
│   ├── components/
│   └── hooks/
└── vite.config.ts
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add route/page | `src/App.tsx` | Inline routes/components |
| Landing page | `src/features/landing/LandingPage.tsx` | Public marketing |
| Auth state | `src/lib/store.ts` | Zustand store |
| i18n config | `src/i18n/index.ts` | i18next setup |
| Locales | `src/i18n/locales/` | JSON translations |
| PWA config | `vite.config.ts` | VitePWA + proxy |

## CONVENTIONS
- Tailwind utility classes only; no inline styles.
- Mobile-first layouts.
- Use path alias `@/*`.
- Query cache configured in `src/main.tsx`.

## ANTI-PATTERNS
- No `console.log` in components.
- No `any` types.
- No hardcoded UI strings (use i18n keys).

## NOTES
- Service worker registration lives in `src/main.tsx`.
- Dev proxy maps `/api` → `http://localhost:4000`.
