# Repository Guidelines

## Project Structure & Module Organization
- `src/` houses React code: `components/` for UI, `hooks/` for data and state, `services/` for Supabase clients, `utils/` for constants/helpers, and `App.jsx` orchestrates board views.
- `public/` serves static assets and metadata for Vercel; `dist/` is generated output—never edit.
- SQL migrations and fixes live at the repo root (`supabase-*.sql`, `migration-*.sql`); keep them versioned alongside feature work.
- CSS is centered in `src/index.css` with Tailwind directives and component-level classes.

## Build, Test, and Development Commands
- `npm install` installs dependencies; rerun after updating Supabase client or Tailwind config.
- `npm run dev` launches Vite at `http://localhost:5173`; pass `-- --host` to test on devices.
- `npm run build` produces production assets into `dist/`.
- `npm run preview` serves the build locally to verify before deployment.

## Coding Style & Naming Conventions
- Follow existing two-space indentation, single quotes, trailing commas, and no semicolons; configure your editor or run Prettier to match the repo style.
- Components use `PascalCase`, hooks `useCamelCase`, helpers/constants `camelCase` or `UPPER_SNAKE` as seen in `src/utils/constants.js`.
- Use Tailwind utility classes for layout; keep custom styles in `src/index.css`.
- Keep Supabase-facing modules async and colocate types/config in `services/`.

## Testing Guidelines
- Automated tests are not yet configured; when adding tests, place `*.test.jsx` files near components and use React Testing Library with Vitest.
- Before opening a PR, smoke-test drag-and-drop flows, authentication modals, and Supabase writes via the Vite dev server.
- Update SQL fixtures or provide new scripts when schema changes require manual setup.

## Commit & Pull Request Guidelines
- Mirror the existing log: optional emoji prefix, then a short imperative summary (e.g., `✨ Improve drag sorting`).
- Reference related Supabase scripts or assets in the body when applicable.
- PRs should include a purpose summary, screenshots or GIFs for UI changes, manual test notes, and links to tracking issues.
- Flag breaking schema updates clearly and attach the relevant `.sql` files or migration steps.

## Supabase & Configuration Tips
- Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` before running locally.
- Apply SQL files in logical order on new environments; keep credentials out of commits and align the Vercel environment with the local `.env`.
