---
name: add-feature
description: Add a new frontend feature (domain) under frontend/src/features with the clean-architecture layers. Use when asked to add a new page, section or domain to the frontend, or when a new backend tag needs a frontend.
---

# Add a frontend feature

Read `docs/frontend.md` first. The existing feature folders are the working example.

1. Create `frontend/src/features/<domain>/` with:
   - `domain/<domain>.ts`: the domain types and pure rules. No imports from React or the API.
   - `api/<domain>Api.ts`: one hook per use case, wrapping the generated hooks from
     `@/shared/api/generated/<tag>/<tag>`, mapping DTOs to domain types, invalidating queries on mutations.
   - `hooks/`: URL state (`nuqs`) and use cases that combine `api/` and `domain/`, only if needed.
   - `components/`: built with the `react-component` skill.
   - `index.ts`: exports only what `app/` needs (usually the top-level component and public types).
2. Add the route in `frontend/src/app/router.tsx`, importing from `@/features/<domain>` only.
3. If it needs data from another feature, compose them in `app/` (slots or `children`). Don't import across features.
4. Add a behaviour test with the generated MSW handlers (see `docs/testing.md`).
5. `make check`.
