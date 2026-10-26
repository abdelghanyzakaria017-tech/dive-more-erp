# Phase 40 — Interactive Lamp Login

## What changed
- Added a CSS-animated SVG desk lamp with a warm light cone, glow halo, drifting dust accents, and subtle movement to the left login scene.
- Added a working LIGHT ON / LIGHT OFF control that changes the lamp glow without affecting login behavior.
- Updated the login palette toward the supplied reference: deep charcoal/navy surfaces, warm amber highlights, a dark glass-like login card, and a gold gradient submit button.
- Kept the Dive More and PADI images imported from project assets, plus existing language selection, email/password inputs, password visibility toggle, remember-email preference, and demo login flow.
- Added responsive positioning and reduced-motion handling.

## Validation
- `node --test tests/*.test.js`: all 30 tests passed.
- The TypeScript/JSX source was syntax-transpiled for validation.
- A full Vite production build was not run because dependency installation timed out in this environment. Run `npm.cmd install` and `npm.cmd run build` locally to validate the full build.

## Prototype limitations
- Login remains the existing local demo flow; this change is a visual/interaction layer, not production authentication.
