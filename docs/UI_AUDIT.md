# DORI — UI Audit & Design System Specification

**Date:** 2026-09-18  
**Source:** DORI Specification (Indian folk-art infrastructure aesthetic)  
**Status:** Greenfield — tokens derived from specification, not extracted from existing code.

---

## Color Palette

### Primary Colors
| Token | Name | Value | Usage |
|---|---|---|---|
| `--color-teal` | Teal | `#1a6b6a` | Decorative borders, frames, primary actions |
| `--color-teal-dark` | Dark Teal | `#145453` | Hover states, deeper accents |
| `--color-teal-light` | Light Teal | `#e8f4f3` | Backgrounds, subtle tints |
| `--color-crimson` | Crimson | `#8b1a2b` | Hero background, section accents |
| `--color-crimson-dark` | Dark Crimson | `#6b1520` | Geometric patterns, overlays |
| `--color-crimson-light` | Light Crimson | `#f5e8eb` | Soft backgrounds |
| `--color-gold` | Gold | `#c9a84c` | Decorative elements, accents, highlights |
| `--color-gold-dark` | Dark Gold | `#a8893d` | Active/hover gold |
| `--color-gold-light` | Light Gold | `#f5f0e0` | Subtle gold tints |

### Secondary Colors
| Token | Name | Value | Usage |
|---|---|---|---|
| `--color-deep-green` | Deep Green | `#1b4332` | Extrusions, depth, success states |
| `--color-navy` | Navy | `#1b2a4a` | Footer, dark sections, text emphasis |
| `--color-burgundy` | Burgundy | `#6b1d2e` | Accent borders, section dividers |

### Neutral Colors
| Token | Name | Value | Usage |
|---|---|---|---|
| `--color-white` | White | `#ffffff` | Backgrounds, text on dark |
| `--color-off-white` | Off White | `#faf8f5` | Page backgrounds |
| `--color-cream` | Cream | `#f5f0e6` | Card backgrounds |
| `--color-warm-gray` | Warm Gray | `#6b6560` | Body text |
| `--color-dark-gray` | Dark Gray | `#2d2926` | Headings, primary text |
| `--color-light-gray` | Light Gray | `#e8e4e0` | Borders, dividers |

### Semantic Colors
| Token | Name | Value | Usage |
|---|---|---|---|
| `--color-success` | Success | `#1b7a4a` | Success states, confirmations |
| `--color-warning` | Warning | `#c9a84c` | Warnings (uses gold) |
| `--color-error` | Error | `#b82838` | Errors, critical alerts |
| `--color-info` | Info | `#1a6b6a` | Info states (uses teal) |

---

## Typography

### Font Families
| Token | Family | Fallback | Usage |
|---|---|---|---|
| `--font-display` | `'Playfair Display'` | `Georgia, serif` | Headings, hero text, section titles |
| `--font-body` | `'Source Sans 3'` | `'Segoe UI', sans-serif` | Body text, UI elements |
| `--font-mono` | `'Source Code Pro'` | `'Courier New', monospace` | Code, technical data |

### Font Sizes
| Token | Size | Line Height | Usage |
|---|---|---|---|
| `--text-xs` | `0.75rem` (12px) | 1.5 | Captions, labels |
| `--text-sm` | `0.875rem` (14px) | 1.5 | Small text, metadata |
| `--text-base` | `1rem` (16px) | 1.6 | Body text |
| `--text-lg` | `1.125rem` (18px) | 1.5 | Lead text |
| `--text-xl` | `1.25rem` (20px) | 1.4 | Subheadings |
| `--text-2xl` | `1.5rem` (24px) | 1.3 | Section subheads |
| `--text-3xl` | `2rem` (32px) | 1.2 | Section titles |
| `--text-4xl` | `2.5rem` (40px) | 1.1 | Hero subhead |
| `--text-5xl` | `3.5rem` (56px) | 1.05 | Hero title |

### Font Weights
| Token | Weight | Usage |
|---|---|---|
| `--weight-regular` | 400 | Body text |
| `--weight-medium` | 500 | Emphasis |
| `--weight-semibold` | 600 | Subheadings |
| `--weight-bold` | 700 | Headings |
| `--weight-black` | 900 | Hero display text |

---

## Spacing Scale

| Token | Value | Usage |
|---|---|---|
| `--space-1` | `0.25rem` (4px) | Tight inner padding |
| `--space-2` | `0.5rem` (8px) | Small gaps |
| `--space-3` | `0.75rem` (12px) | Compact padding |
| `--space-4` | `1rem` (16px) | Standard padding |
| `--space-5` | `1.5rem` (24px) | Card padding |
| `--space-6` | `2rem` (32px) | Section gaps |
| `--space-7` | `3rem` (48px) | Large section gaps |
| `--space-8` | `4rem` (64px) | Section padding |
| `--space-9` | `6rem` (96px) | Hero padding |
| `--space-10` | `8rem` (128px) | Major spacing |

---

## Border & Radius

| Token | Value | Usage |
|---|---|---|
| `--border-thin` | `1px` | Subtle dividers |
| `--border-medium` | `2px` | Card borders |
| `--border-thick` | `4px` | Decorative borders |
| `--border-hero` | `8px` | Hero decorative frame |
| `--radius-sm` | `4px` | Buttons, inputs |
| `--radius-md` | `8px` | Cards |
| `--radius-lg` | `12px` | Panels |
| `--radius-none` | `0` | Strict geometric elements |

---

## Shadows

| Token | Value | Usage |
|---|---|---|
| `--shadow-sm` | `0 1px 3px rgba(45,41,38,0.08)` | Subtle lift |
| `--shadow-md` | `0 4px 12px rgba(45,41,38,0.12)` | Cards |
| `--shadow-lg` | `0 8px 24px rgba(45,41,38,0.16)` | Elevated panels |
| `--shadow-hero` | `0 12px 40px rgba(45,41,38,0.24)` | Hero elements |

---

## Breakpoints

| Token | Value | Target |
|---|---|---|
| `--bp-xs` | `320px` | Small phones |
| `--bp-sm` | `375px` | Standard phones |
| `--bp-md` | `768px` | Tablets |
| `--bp-lg` | `1024px` | Small laptops |
| `--bp-xl` | `1280px` | Desktops |
| `--bp-2xl` | `1440px` | Large screens |
| `--bp-3xl` | `1920px` | Full HD |

---

## Transitions & Animation

| Token | Value | Usage |
|---|---|---|
| `--transition-fast` | `150ms ease` | Micro interactions |
| `--transition-base` | `250ms ease` | Standard transitions |
| `--transition-slow` | `400ms ease` | Entrance animations |
| `--transition-reveal` | `500ms ease-out` | Section reveals |

---

## Z-Index Hierarchy

| Token | Value | Usage |
|---|---|---|
| `--z-base` | `0` | Default |
| `--z-elevated` | `10` | Cards, raised elements |
| `--z-sticky` | `100` | Sticky header |
| `--z-dropdown` | `200` | Dropdowns, tooltips |
| `--z-modal` | `300` | Modal overlays |
| `--z-toast` | `400` | Toast notifications |
| `--z-critical` | `500` | Emergency alerts |

---

## Component Dimensions

| Component | Property | Value |
|---|---|---|
| Hero | Min height | `100vh` |
| Header | Height | `64px` |
| Decorative border | Width | `8px` outer, `4px` inner |
| Corner motif | Size | `80px × 80px` (desktop), `48px × 48px` (mobile) |
| CTA Button | Min width | `200px` |
| CTA Button | Height | `48px` |
| Card | Max width | `400px` |
| Content max | Max width | `1200px` |
| Sidebar | Width | `280px` (desktop), full-width (mobile) |

---

## Visual Identity Rules

### Hero Section
- Thick teal decorative frame (`--border-hero`)
- Geometric repeating border pattern
- Crimson textured background with subtle horizontal panel lines
- Dark-crimson geometric pattern overlay
- Four corner folk-art motifs (gold + teal)
- DORI custom SVG wordmark (gold face, dark outline, deep-green extrusion)
- Dimensional poster treatment

### Below-the-Fold
- Progressively calmer, more readable
- Same color palette, reduced decorative density
- Cream/off-white backgrounds for readability
- Teal section accents and borders
- Gold highlights for emphasis

### Design Feeling
> "Government-grade digital health infrastructure illustrated through Indian folk-art."

### Forbidden Elements
- Generic SaaS cards
- Glassmorphism
- Purple gradients
- Neon colors
- AI-looking interfaces
- Floating blobs
- Excessive rounded containers
- Stock healthcare illustrations
- Stock photographs
- Random icon packs
- Gradient hero text
- Excessive animations
- Particles, glow, spinning 3D, parallax
