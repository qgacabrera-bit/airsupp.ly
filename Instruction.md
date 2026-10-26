You are a Principal Frontend UI/UX Designer and Frontend Engineer. We are upgrading the React PWA dashboard for **AirSupp.ly** (Tagline: *"All Out of Smog"*), our real-time Philippine air quality platform. 

Refactor the CSS and Tailwind styling to remove the generic "AI-generated dashboard" look (harsh pitch-black backgrounds, neon-saturated primary borders, and flashing toxic status colors) and replace it with a refined, organic, professional SaaS design system. Implement the following adjustments:

### 1. Warm Slate & Atmospheric Backgrounds
- Replace pure black (`#000000` or `#0a0e17`) with a deep, organic **Warm Slate / Midnight Navy** background base (e.g., `#0b1329` or Tailwind's `slate-950` layered with a subtle radial gradient vignette to mimic soft studio lighting).

### 2. Desaturated Status Tints & Muted Badges
- Instead of blazing neon status pills (pure red/green/orange), use **desaturated surface tints** with soft matching text.
- *Example:* For "Unhealthy / Warning" states, use a deep burnt-amber surface tint (`bg-amber-950/30`), a refined subtle border (`border-amber-800/40`), and soft muted text (`text-amber-300`). 
- Let color act as a sophisticated semantic accent rather than a flashing wall of neon.

### 3. Layered Shadows Over Hard 1px Borders
- Eliminate uniform, harsh 1px bright borders (`border-slate-800`) on every single card.
- Rely on depth and shadow layering: Give cards an almost invisible, ultra-subtle border (`border-white/[0.06]`) paired with soft, diffused drop shadows (`shadow-[0_8px_30px_rgb(0,0,0,0.25)]`).
- For active or selected cards, use a multi-layered ambient glow instead of a harsh solid outline.

### 4. Introduce a Signature Editorial Accent
- Move away from standard default blue chrome for the UI. Introduce a signature brand anchor like a sophisticated **soft teal** (`#2dd4bf`) or **muted sage** for your primary interactive elements, loading indicators, and branding accents to give it distinct art direction.

### 5. Harmonized Recharts & Data Visualizations
- Update all Recharts lines and area fills to use curated, restrained gradients (e.g., a smooth transition from a muted cyan to a warm amber with low fill opacity like `fillOpacity={0.12}`) so charts blend organically into the card surface rather than sitting on top of it like a glaring sticker.