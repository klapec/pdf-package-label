# AGENTS

## Repository Summary

`pdf-package-label` is a Next.js 16 (App Router) web app that repositions a single shipping label inside an A4 PDF.

Primary flow:

1. User uploads a single-page PDF in `components/upload-label-form.tsx`.
2. The app detects label bounds (when possible) via PDF.js text extraction.
3. The page/label content is moved to a selected A4 corner using `pdf-lib`.
4. The generated PDF is downloaded/opened in the browser.

## Tech Stack

- Next.js 16
- React 19 + TypeScript
- Tailwind CSS v4 + shadcn-style UI primitives
- `pdf-lib` for PDF manipulation
- `pdfjs-dist` for text-based bounds detection
- `oxlint` + `oxfmt` for linting/formatting

## Important Paths

- `app/page.tsx`: home page shell, renders the upload form.
- `components/upload-label-form.tsx`: upload UI and client-side submit pipeline.
- `lib/pdf/reposition-label-browser.ts`: browser entrypoint for PDF repositioning.
- `lib/pdf/reposition-label.ts`: runtime-agnostic entrypoint.
- `lib/pdf/reposition-label-core.ts`: core placement and page normalization logic.
- `lib/pdf/detect-label-bounds.ts`: lazy-load PDF.js and compute text bounds.
- `lib/pdf/constants.ts`: A4 dimensions, corner types, and placement constants.

## Runtime Notes

- Do not use top-level import of `pdfjs-dist/legacy/build/pdf.mjs` in server route dependencies.
- Prefer lazy `import()` inside request-time functions and gracefully fall back when PDF.js is unavailable.

## Dev Commands

- Install: `pnpm install`
- Dev server: `pnpm dev`
- Build: `pnpm build`
- Start: `pnpm start`
- Lint: `pnpm lint`
- Lint fix: `pnpm lint:fix`
- Format: `pnpm format`
- Format check: `pnpm format:check`

## Git / Commit Convention

Use Conventional Commits for every commit message.

Examples:

- `feat: add server-side PDF validation`
- `fix: handle empty text layer in bounds detection`
- `chore: update lint and format configs`
- `docs: expand README usage notes`

Current expectation in this repo: use an explicit type prefix (for example `chore:`) instead of plain free-form commit titles.
