---
name: react-component
description: Design and build a React + TypeScript component the way a staff frontend engineer would in a large codebase. Decides where it lives (shared UI, a feature, or a route), where its state lives (server, URL, form, store, context), and where the server/client boundary goes, then writes it with CSS Modules in its own folder, small flat subcomponents, no useEffect, no prop drilling, is/are boolean props and a 250-line cap. Use when the user asks to create, scaffold, build, add, split or refactor a React component, widget, card, form, modal, page section or any UI piece in a React or Next.js project.
argument-hint: <ComponentName> [what it should do]
---

# React component

Input: `$ARGUMENTS`, a component name and what it should do. If the behaviour is unclear, ask before designing.

Most component problems in big codebases aren't inside the component. They come from it living in the wrong
place, owning state that belongs elsewhere, or reaching across boundaries. So decide placement, state and
boundaries first, and write the code last.

## Principles

- **Colocate, then promote.** Code lives next to its only user. It moves up (to the feature, then to `shared/`)
  only when a second user appears, not in anticipation of one.
- **Flat beats deep.** Deep trees hide coupling and make every move expensive. One level of private
  subcomponents is the limit.
- **State has one home.** Each piece of state lives in the layer that owns it (server, URL, form, store,
  component). Most `useEffect`s and most prop drilling come from state living in the wrong place.
- **Boundaries are enforced by tooling, not goodwill.** A rule that isn't checked by lint or a script will be broken.
- **Composition over configuration.** Slots and `children` scale; a growing list of boolean props doesn't.
- **Follow the codebase.** If the project already has a structure, fit into it. Never introduce a second architecture.

## Hard rules

1. **Folder per component.** `MyComponent/MyComponent.tsx` + `MyComponent/MyComponent.module.css`, names matching.
2. **Subcomponents are flat and private.** One level deep inside the main component's folder, never nested,
   imported only from inside that folder.
3. **Size: main `.tsx` ≤ 250 lines, each subcomponent ≤ 120**, imports and types included. Hitting the limit
   means the design is wrong, not that the code needs squeezing.
4. **No `useEffect` / `useLayoutEffect`.** See the replacement table. If one really is unavoidable (syncing
   with a non-React widget that has no ref API), stop and explain why to the user before writing it.
5. **No prop drilling.** A prop passed through a component that doesn't read it is allowed one level at most.
6. **No cross-feature imports.** Features meet only at the route level, and only through each feature's `index.ts`.
7. **Boolean props start with `is` or `are`**: `isOpen`, `isDisabled`, `isLoading`, `areRowsSelectable`.
   Use `is` for one thing, `are` for many. This applies to every boolean prop you declare in a `*Props` type.
   Native attributes that a design-system primitive gets by spreading `React.ComponentProps<'button'>`
   (`disabled`, `checked`, `required`) keep their HTML names. Don't redeclare them.

```
MyComponent/
  MyComponent.tsx
  MyComponent.module.css
  MyComponentContext.tsx        # only for compound components / shared internal state
  useMyComponent.ts             # only when logic would push the .tsx past its limit
  MyComponent.test.tsx          # if the project tests components
  Header/
    Header.tsx
    Header.module.css
  Row/
    Row.tsx
    Row.module.css
```

## 1. Read the project

Spend a few minutes here; it decides everything after it.

- **Framework and rendering:** Next.js App Router, React Router v7 or another RSC framework → server
  components are the default and `'use client'` is opt-in. Vite SPA → everything is client.
- **React version and compiler:** React 19 → `ref` as a prop, ref cleanups, `use()`, `useActionState`. React
  Compiler enabled (`babel-plugin-react-compiler` or framework flag) → don't write `useMemo` / `useCallback` /
  `memo`.
- **Existing architecture:** feature folders (`src/features/*`), Feature-Sliced Design (`entities/`,
  `widgets/`, ...), route colocation (`app/**/_components`), or a flat `components/`. Note the import alias
  (`@/`) and whether features expose an `index.ts`.
- **Boundary tooling:** `eslint-plugin-boundaries`, `import/no-restricted-paths`, Steiger, dependency-cruiser.
- **State and data:** TanStack Query / SWR / RTK Query, Zustand / Jotai / Redux, `nuqs`, form library.
- **Design system:** `shared/ui` or a package, headless base (Radix, React Aria, Base UI), tokens file, `clsx`.
- **Conventions:** folder casing, named vs default exports, test runner, Storybook, `AGENTS.md` / `CLAUDE.md`.

Project conventions win over this skill's style defaults. They don't override the hard rules; if they conflict,
say so and ask.

## 2. Decide where it lives

| The component is... | It goes in |
|---------------------|------------|
| Domain-free UI (button, dialog, input, tooltip) used anywhere | `shared/ui/<Name>/` (or the design-system package) |
| About one business domain (product card, cart drawer) | `features/<domain>/components/<Name>/`, exported from `features/<domain>/index.ts` |
| Used by one route only and assembling features | next to the route (`app/<route>/_components/<Name>/`) |
| A piece of exactly one component | a flat subcomponent folder inside that component |

When unsure, place it as low (most local) as possible. Promoting later is cheap; demoting a premature
abstraction isn't.

A `shared/ui` component must not know any domain: no `Product` types, no feature imports, no data fetching.

## 3. Decide its shape

Sketch the tree before writing: the main component, its flat subcomponents, and one line per file.

- A subcomponent is a **piece** of the main component (header, row, empty state, toolbar), not a component of
  its own. It gets only the props it renders.
- If a subcomponent wants children of its own: **flatten** (make it a sibling and let the main component compose
  them, or pass them as `children`) or **promote** (it's a real component, give it its own top-level folder
  in the right place from step 2).
- If the main component is heading past 250 lines, it's usually doing two jobs. Split by responsibility (layout
  vs data vs interaction), not by line count.

Show the tree to the user and where state lives. For a small component with no subcomponents, skip the
confirmation.

## 4. Decide where state lives

| State | Home | Never |
|-------|------|-------|
| Data from the server | Server component / route loader; TanStack Query (or the project's equivalent) if it must refresh on the client | `useEffect` + `fetch` + `useState` |
| Anything shareable or bookmarkable (filters, tab, page, selected id) | URL: search params via `nuqs` or the router | `useState` that's lost on refresh |
| Form input and submission | The form library, or `<form action>` + `useActionState` | One `useState` per field synced by effects |
| Client app state shared across features (cart, session UI) | The project's store (Zustand, Jotai, Redux) | A new store library; context holding fast-changing app state |
| Internal state shared by one component's pieces | `MyComponentContext.tsx` in that folder | Drilling it through subcomponents |
| Local, ephemeral UI (hover, open, input draft) | `useState` in the component that uses it | Lifting it "just in case" |
| Values computed from the above | Computed during render | Copying into state |

## 5. Place the server/client boundary (RSC frameworks)

- Keep the boundary as low as possible: the server parent fetches and passes plain, serializable data down; only
  the interactive leaf gets `'use client'`.
- A client component can still render server content passed as `children` or slots.
- Never pass functions, class instances or non-serializable values from server to client components; pass
  data, and let the client component own its handlers (or use server actions).

## 6. Replace `useEffect`

| You want to... | Do this instead |
|----------------|-----------------|
| Compute a value from props or state | Compute it during render |
| React to a user action | The event handler |
| Reset state when an input changes | `key={id}` on the component |
| Fetch data | Step 4: server component, loader or query library |
| Subscribe to an external source (store, media query, online status) | `useSyncExternalStore` or the library's hook |
| Focus, measure or observe a DOM node | A callback ref (with cleanup in React 19), or `autoFocus` |
| Tell the parent something changed | Call its callback in the same handler that made the change |
| Keep two pieces of state in sync | Delete one; derive it from the other |
| Run once at startup | Module scope or the app entry, not a component |

## 7. Kill prop drilling

In this order:

1. **Move the state** to its proper home (step 4). Most drilling disappears here: a component reading the URL or
   a store doesn't need props.
2. **Composition**: the owner renders the element and passes it through `children` or a slot
   (`action={<AddToCartButton id={p.id} />}`, or `renderAction={(item) => ...}` for lists). This is also how
   two features meet at the route without importing each other.
3. **Compound components**: `<Tabs><Tabs.List /><Tabs.Panel /></Tabs>`, sharing state through the folder's
   context. `useMyComponentContext()` throws a clear error outside the provider. Split state and actions
   into two contexts when many consumers only need one.

## 8. Write it

**Component API**

- Function component, `type MyComponentProps`, destructured in the signature. Named export unless the project
  uses defaults.
- Smallest API that covers the real use cases. Variants as a string union (`variant: 'primary' | 'ghost'`),
  not stacks of booleans (`isPrimary`, `isGhost`, `isSmall`).
- Boolean props are named `isX` / `areX` and read as a yes/no question: `isExpanded`, not `expanded` or
  `expand`. Make them optional with a `false` default (`isOpen = false`) so a missing prop means "no".
- Prefer slots and `children` over config objects for content.
- Inputs support controlled use (`value` + `onChange`); add uncontrolled (`defaultValue`) only if needed.
- Accept `className` only to let a parent place it (margin, grid area), never to restyle internals.
- Spread native props (`...rest` typed with `React.ComponentProps<'button'>`) only on design-system primitives.
- Handlers: `handleX` inside, `onX` as props. No `any`.
- Accessible by default: semantic elements, `<button>` for actions, labels for inputs, focus management for
  overlays (or use the headless primitive that already does it).

**CSS Module**

- camelCase classes, the outermost called `root`.
- Use the tokens (CSS variables) for color, spacing, type, radius, motion. No hard-coded palette.
- **The root has no outer margin**; spacing between components belongs to the parent's layout.
- Style states through attributes, not class juggling: `data-state="open"`, `aria-selected`, `:disabled`.
- Dynamic values through custom properties: `style={{ '--progress': `${pct}%` } as React.CSSProperties}`.
- Component-level responsiveness with container queries; page-level with media queries.
- Logical properties (`margin-inline`, `padding-block`) for RTL support. No styling a child's internals; no
  `:global` unless unavoidable.

**Public API**

If the component is in a feature, export it from `features/<domain>/index.ts`. Nothing outside the feature
imports deeper than that file. Subcomponents are never exported.

## 9. Verify

1. Run the checker on the folder:

   ```bash
   bash "${CLAUDE_SKILL_DIR:-skills/react-component}/scripts/check.sh" path/to/MyComponent
   ```

   It fails on effects, files over their line limit, nested component folders, missing or mismatched files,
   and boolean props not named `is…` / `are…`.
2. Typecheck, lint (including boundary rules), and the tests near the change. Report failures plainly.
3. Review by hand against this checklist:
   - [ ] Lives at the lowest level that serves its users (step 2)
   - [ ] Every piece of state is in its home (step 4); nothing is derived into state
   - [ ] `'use client'` only on leaves that need it
   - [ ] Every prop is read by the component receiving it
   - [ ] Every boolean prop is `isX` / `areX`
   - [ ] No import from another feature or from a feature's internals
   - [ ] No `useMemo` / `useCallback` if the React Compiler is on
   - [ ] Root has no outer margin; only tokens are used
   - [ ] Keyboard and screen reader work for every interactive part

To enforce the boolean rule across the whole codebase, the project can add typescript-eslint's
`naming-convention` rule (needs type-aware linting; it covers every boolean type property, not only props).
Suggest it; don't add it without asking:

```js
'@typescript-eslint/naming-convention': ['error', {
  selector: 'typeProperty', types: ['boolean'], format: ['PascalCase'], prefix: ['is', 'are'],
}],
```

## 10. Report

Show the final tree with line counts, and in a few lines: where it lives and why, where each piece of state
lives, where the client boundary is, and anything that bent a rule (with the reason).

## Red flags

Stop and rethink the design if you're about to write:

- `useEffect(() => { setX(...) }, [y])`: derived state or a missing `key`.
- A prop passed through two components untouched: state in the wrong home.
- `import ... from '@/features/other/...'` inside a feature: compose at the route instead.
- `shared/ui` importing a domain type: it's a feature component.
- A fourth boolean prop: it's a variant union or a slot.
- `open?: boolean`, `loading: boolean` on a props type: rename to `isOpen`, `isLoading`.
- A subcomponent folder inside a subcomponent: flatten or promote.
- A `utils.ts` growing inside the component folder: it belongs in `shared/lib` or the feature's `lib/`.
