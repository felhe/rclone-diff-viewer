# Rclone Diff Viewer

A small web app to visualize and explore differences between two directories based on rclone reports. Paste or upload rclone output and get interactive source/remote trees with color-coded statuses and quick counts.

## What it does
- Builds two trees (Source and Remote) from your inputs
- Colors each file/folder by status:
  - Identical: gray
  - Differ: orange
  - Additional (Source only): blue
  - Additional (Remote only): blue
- Lets you collapse/expand folders and optionally hide all matches to focus on differences
- Shows totals for each status at a glance

## Accepted inputs
You can provide either:

1) A combined report (single textarea)
- Expected format is one entry per line: `<symbol><space><path>`
- Symbols:
  - `= ` identical
  - `* ` differ
  - `+ ` only in Source (i.e., missing in Destination)
  - `- ` only in Remote (i.e., missing in Source)

Example combined report:
```
= docs/readme.md
* src/App.tsx
+ only-in-source.txt
- only-in-remote.txt
```

2) Separate lists (four textareas)
- One path per line in each box:
  - Identical (match)
  - Differ
  - Missing in Source (i.e., present only on Remote)
  - Missing in Destination (i.e., present only on Source)

You can paste text or upload a simple .txt file for any box.

All parsing is done locally in your browser; no data leaves your machine.

## Getting started (local dev)
Prerequisites: Node.js 18+ recommended.

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Then open the printed local URL (Vite defaults to http://localhost:5173).

## Build and preview
Create a production build and preview it locally:

```bash
npm run build
npm run preview
```

## Tech stack
- React + TypeScript (Vite)
- Tailwind CSS
- shadcn/ui components
- lucide-react icons

## Notes
- The combined format requires a leading symbol and a space before the path (e.g., `* src/file.tsx`).
- “Additional (Source)” corresponds to entries present in Source but missing in Destination.
- “Additional (Remote)” corresponds to entries present in Remote but missing in Source.
