<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Tani Jaya implementation guardrails

- `docs/PRD.md` is the master product reference; `docs/PRD-PENJUALAN.md` is
  the source of truth for Sales/Penjualan rules.
- Do not change approved Pembelian rules without explicit instruction. Do not
  invent missing Sales rules; stop and report any difference between a PRD and
  the implementation instead of guessing.
- Treat stock and financial history carefully. Do not hard-delete historical
  financial records unless the relevant PRD explicitly permits it.
- Never edit an applied Supabase migration. Make schema changes through new
  migrations only.
- Preserve the existing Tani Jaya design system in UI work.
- Keep numeric inputs empty until the user supplies a value; do not coerce an
  empty input to `0`. Money uses integer Rupiah and weight uses whole kilograms
  unless a PRD explicitly changes those units.
