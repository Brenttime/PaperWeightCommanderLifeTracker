# PaperWeight — Commander Life Tracker

A touch-first, browser-based life tracker for Magic: The Gathering Commander (EDH) games. Built to breathe new life into old iPads — including devices running **iOS 9.3.5** — so they don't end up in a drawer or a landfill.

Inspired by apps like LifeTap, but designed to work where those apps can't.

---

## Why This Exists

Older iPads (iPad 2, iPad mini 1st gen, etc.) are locked to iOS 9.3.5 and can no longer run most modern apps. They make perfect dedicated life trackers — large screens, always-on table props — but the app ecosystem has left them behind.

PaperWeight is a single HTML file + one JS file. No app store, no install, no internet required after the first load. Just open it in Safari on any device.

---


### iOS 9.3.5 Constraints (enforced throughout the codebase)
- `var` only — no `let` / `const`
- No arrow functions, no template literals
- No `Array.forEach` / `map` / `filter` — all loops use `for`
- All flex, transform, transition properties carry `-webkit-` prefixes
- No CSS Grid, no CSS custom properties (`--var`)
- Minimum 44×44 px touch targets on all interactive elements
- `event.preventDefault()` on all touch handlers to suppress the 300ms click delay

---

## Running Locally

No build step, no dependencies.

```
git clone https://github.com/your-username/PaperWeightCommanderLifeTracker.git
```

Open `index.html` in any browser. That's it.

For iPad use: host the file on a local server or serve it from any static host (GitHub Pages, Netlify, etc.) and open it in Safari. Add to Home Screen for a full-screen, app-like experience.

---

There is no bundler, no framework, and no runtime dependencies beyond Font Awesome (loaded via CDN for icons).

---
