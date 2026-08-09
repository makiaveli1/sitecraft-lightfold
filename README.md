# LIGHTFOLD

LIGHTFOLD is an interactive spatial web experiment built to explore how SITECRAFT should coordinate native interface code, a 3D rendering library, and a motion timeline without letting them fight over the same parts of the page.

## Concept

At the centre of the experience is a live procedural light sculpture. The surrounding interface is intentionally restrained so the 3D object can carry the visual identity. Scroll progression changes the sculpture and presentation in deliberate stages rather than applying generic animation to every element.

## Highlights

- Real-time WebGL sculpture
- Three.js for the spatial scene
- GSAP / ScrollTrigger for bounded timeline choreography
- Native HTML and CSS for document structure and layout
- Clear ownership between browser layout, 3D rendering, and timeline motion
- Static and reduced-motion fallbacks
- Responsive composition
- No visual-framework dependency layered over the experience

## Tech stack

- HTML5
- CSS
- JavaScript ES modules
- Three.js
- GSAP + ScrollTrigger
- Vite

## Install and run

```bash
npm install
npm run dev
```

Vite will print the local development URL.

For a production build:

```bash
npm run build
```

## Project structure

```text
.
├── index.html
├── styles.css
├── main.js
├── package.json
├── package-lock.json
└── .gitignore
```

`node_modules` and generated `dist` output are intentionally not committed.

## Design approach

The project was built around a simple ownership rule:

- the browser owns document layout and accessibility;
- Three.js owns the spatial sculpture;
- GSAP owns the timed relationship between states;
- no layer is allowed to casually overwrite another layer's job.

That sounds simple, but it prevents a common failure in ambitious websites where multiple libraries manipulate the same transforms, scroll state, or element lifecycle and the experience becomes fragile.

## Reduced motion

LIGHTFOLD does not treat reduced motion as “the animated site, but slower.” Motion-heavy choreography can collapse into a stable visual state while the hierarchy and core spatial idea remain understandable.

## What SITECRAFT learned from it

LIGHTFOLD became the capability-orchestration test for SITECRAFT. It helped establish rules for deciding when a library genuinely earns its place, mapping one owner per behaviour, providing static fallbacks, and verifying the combined system in a real browser.

## Status

**Portfolio / interactive WebGL study.** The implementation is a SITECRAFT development project rather than a production client website.

## Credits

Designed and built as part of the SITECRAFT website-system development programme.
