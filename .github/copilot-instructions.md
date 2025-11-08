This repository is a Vite + React + TypeScript storefront/admin app with Firebase as the backend. The file below collects the most important, discoverable patterns and developer workflows an AI coding agent should know to be productive immediately.

Key points (short):
- App type: Vite + React (TypeScript), server-side helper using `tsx` at `src/server/index.ts` (dev: `npm run dev` or `npm run dev:full`).
- Backend: Firebase (Firestore) is the single source of truth. Main integration surface: `src/lib/firebase.ts` (services: `productsService`, `salesService`, atomic transactions helpers).
- Admin auth: Lightweight custom admin flow stored in Firestore or localStorage. See `src/lib/adminAuth.ts` and `src/hooks/useAdminAuth.ts`.
- Data SDK: A generated Data Connect SDK is included at `src/dataconnect-generated` and published locally as `@dataconnect/generated` in `package.json`.

Files to inspect first:
- `package.json` — dev scripts and important dependencies (vite, tsx, dataconnect-generated alias).
- `src/lib/firebase.ts` — product/sales services, slug rules, date handling, and atomic quantity transactions.
- `src/lib/adminAuth.ts` — admin password flow, session token storage, and initialize/login helpers. Default admin password is set here (45086932) — used by init flows and docs.
- `src/store/useStore.ts` — client state logic (Zustand), how cart updates call Firebase atomic helpers and optimistic local updates.
- `src/types/product.ts` — canonical Product shape (zod schema) used across components and services.
- `src/dataconnect-generated/README.md` — generated DataConnect SDK usage and emulator instructions.

Why these matter (architecture):
- Single-page React app with client-side state in `useStore` and serverless persistence in Firestore. Many UI flows are implemented optimistically (update local state first then call Firebase) — look for patterns where `products` in state are updated before Firebase calls.
- Firebase service classes in `src/lib/firebase.ts` encapsulate Firestore queries and conversions (Timestamps ↔ ISO strings). Prefer using `productsService` and `salesService` rather than re-implementing Firestore calls.
- Inventory changes must be atomic: the codebase uses `updateProductQuantitiesAtomically` and `restoreProductQuantitiesAtomically` to prevent race conditions. When adding or removing from cart, the local state is updated optimistically and these functions are called async (often not awaited). If you modify flows touching inventory, preserve or improve atomic transaction usage.

Project-specific conventions and gotchas:
- Slug generation: `FirebaseProductsService.slugifyProductName` enforces a 120-char limit and removes non-letter/number characters (supports Unicode). When creating product IDs, the slug is used as the Firestore document ID — avoid auto-generating numeric IDs for products unless you migrate the rest of the code.
- Date fields in Firestore are stored as Timestamps; all service returns convert timestamps to ISO strings. Follow that conversion when reading/writing products (`createdAt`, `offerEndsAt`, `expirationDate`).
- Product identity: product `id` is the Firestore doc id (slug). Several components and the store expect `product.id` to be stable and URL-friendly.
- Admin setup: many docs and the UI expect an initialization step that writes admin config to Firestore or localStorage. The default password is in `src/lib/adminAuth.ts` — update that when configuring a new deployment and check `PROJECT_SETUP_GUIDE.md` and `README_ADMIN_SETUP.md`.
- Local-first optimistic updates: `useStore.addToCart` updates local quantities first, then calls `updateProductQuantitiesAtomically` (async, not awaited). Failures are logged but not automatically rolled back — consider adding user-visible error handling if you change this behavior.
- Persisted local state: Zustand persist middleware stores only the `cart` in localStorage under key `shop-storage`.

Developer workflows (commands and notes):
- Run development UI: `npm run dev` (starts Vite). If you need the internal Node server, `npm run server` or `npm run dev:full` runs both the server and dev client in parallel.
- Build for production: `npm run build` (runs tsc then vite build). `npm run build:dev` builds in development mode.
- Preview production build: `npm run preview`.
- Clean helpers: `npm run clean`, `npm run dev:clean`, `npm run build:clean`, `npm run dev:fresh`.
- Lint: `npm run lint` (ESLint config in repo root).
- Data Connect SDK: `@dataconnect/generated` is a local package at `src/dataconnect-generated`. Follow `src/dataconnect-generated/README.md` to use emulator or generated queries/mutations.

Integration points & external dependencies:
- Firebase (Firestore, Analytics). The Firebase config is in `src/lib/firebase.ts`. Many scripts and docs assume Firestore rules are permissive during development (see `PROJECT_SETUP_GUIDE.md`) — secure rules before production.
- Data Connect (generated SDK) — used via `@dataconnect/generated` and can be pointed to the emulator with `connectDataConnectEmulator`.
- Third-party UI libs: Radix UI, Tailwind, React Query, Zustand, Zod. Follow the existing styling and component conventions inside `src/components/*` (shadcn-style components, e.g. `ProductForm.tsx`, `ProductTable.tsx`).

Examples to copy or extend (concrete snippets):
- Use productsService.addProduct when creating new products (keeps slug + timestamp logic): `import { productsService } from '@/lib/firebase'; await productsService.addProduct(productPayload)`.
- Use atomic updates for inventory changes: `await updateProductQuantitiesAtomically([{ productId, quantityToDeduct }])`.
- Read/store admin config via `adminAuthService.initializeAdminConfig()` and `adminAuthService.login(password)` (see `src/lib/adminAuth.ts`).

Search tips for maintainers:
- To find usages of inventory transactions: search for `updateProductQuantitiesAtomically` or `restoreProductQuantitiesAtomically`.
- To find product shape expectations: search for `ProductSchema` in `src/types/product.ts` and usages in `src/components` and `src/pages`.

When changing code, preserve these invariants:
- Product document IDs are URL slugs and must remain stable.
- Date fields returned by services are ISO strings (not Timestamps) unless explicitly used within Firebase service code.
- Inventory updates must use Firestore transactions to avoid race conditions.

If you need more context or a deeper architectural map, tell me which area to expand (auth flows, inventory, DataConnect, server helpers) and I will add a focused section with file call graphs and examples.

---
If you want I can merge this with an existing `.github/copilot-instructions.md` if you already have one elsewhere — I searched and did not find one.
