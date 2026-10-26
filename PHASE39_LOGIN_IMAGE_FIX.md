# Phase 39 — Login logo asset fix
- Replaced the PADI logo with the user-provided full PADI diver mark.
- Replaced the Dive More logo with the user-provided clean circular Dive More International Diving School mark.
- Moved both assets into `src/assets` and imported them through Vite so they are bundled reliably instead of relying on root-relative public URLs.
- Kept the existing login branding layout and logo sizing rules.
- Validation: source changes and zip integrity checked. A full Vite build still requires installing project dependencies first (`npm.cmd install`, then `npm.cmd run build`).
