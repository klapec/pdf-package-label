# PDF Package Label

Mobile-first Next.js 16 app for repositioning a single shipping label within a portrait A4 PDF.

## Stack

- Next.js 16 App Router
- Node.js route handlers for Vercel
- `pdf-lib` for output PDF generation
- `pdfjs-dist` for text-based label bounds detection
- `oxlint` + `oxfmt` for linting and formatting
- Tailwind CSS v4 + shadcn/ui-style components

## Run

```bash
pnpm install
pnpm dev
```

## Notes

- The current detection strategy uses PDF text content to estimate the occupied label area and adds padding around it.
- If a source PDF contains only graphics with no text layer, the handler falls back to using the full source page.
