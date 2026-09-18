# Demon — Infernal Sanctum

An interactive 3D scene built around a winged demon, molten terrain and a monumental ritual seal. The room is lit entirely by direct lights, with a giant shadow cast across a faded angel-versus-demon mural.

**[Enter the scene →](https://crapthings.github.io/noamblight/)**

## Inside the sanctum

- **Molten terrain:** a 64 × 64 metre room with static OpenSimplex2 + four-octave FBM elevation, and animated shader lava running through irregular cracks.
- **Infernal atmosphere:** warm key lighting, red accents, drifting volumetric fog and rising GPU-driven embers.
- **Burning lettering:** extruded Demon text with molten gold bevels, restrained surface deformation and a shared, depth-aware volume of fire that follows the glyphs.
- **Ritual geometry:** an approximately 21 metre summoning circle generated mathematically, with an inverted pentagram, twenty runes, aligned seals and slowly rotating arcs.
- **A painted backdrop:** a faded wall mural blended into the wall material so the demon's silhouette remains visible across it.
- **Loading sequence:** a dark red and gold loading screen showing asset progress, fading out once the scene has rendered.

## Explore

Drag to orbit the camera. Scroll or pinch to zoom. Camera panning is disabled to keep the demon at the centre of the scene.

A desktop browser with WebGL2 support gives the best view. The first visit downloads about 48 MiB of model and mural assets; subsequent visits can use the browser cache.

## Run locally

Use Node.js 24 and pnpm 12.4.1, matching the deployment workflow. The pnpm version is pinned in `package.json`.

```sh
pnpm install --frozen-lockfile --strict-peer-dependencies=false
pnpm dev
```

Open the local address printed by Vite, usually `http://localhost:5173`.

To create and inspect a production build:

```sh
pnpm build
pnpm preview
```

## GitHub Pages

The workflow in [`.github/workflows/pages.yml`](.github/workflows/pages.yml) builds and deploys on pushes to `main`. It can also be started manually from the Actions tab.

Pages uses **GitHub Actions** as its deployment source. The workflow sets Vite's base path from the repository name, while model and texture URLs use `import.meta.env.BASE_URL` so assets resolve beneath `/noamblight/`.

## Scene code

| File | Purpose |
| --- | --- |
| `src/Scene.jsx` | Room, lighting, camera and postprocessing |
| `src/terrain.js` / `src/groundShader.js` | Heightfield and flowing lava |
| `src/Emberwing.jsx` | GLB loading, scale and ground placement |
| `src/TitleInferno.jsx` / `src/titleFuel.js` | Depth-aware fire and glyph fuel mask |
| `src/DemonTitle.jsx` | Extruded text and golden bevels |
| `src/magicCircleShader.js` | Ritual layout, mathematical runes and line rendering |
| `src/VolumetricFog.jsx` / `src/Sparks.jsx` | Fog and rising embers |
| `src/LoadingScreen.jsx` / `src/SceneReady.jsx` | Loading overlay and scene readiness |

## Rendering notes

Terrain heights and normals are computed once. Lava, fire, embers and ritual markings animate on the GPU. Device pixel ratio is capped at 1.5, with bounded ray-marching samples for the volume effects.

A committed pnpm patch replaces React Three Fiber 9.7.0's deprecated Three.js clock with a Timer adapter. Installation applies it automatically; see [`patches/README.md`](patches/README.md) before upgrading Fiber. Shadows use `PCFShadowMap`.

## Assets

The supplied Meshy GLB is stored at `public/models/emberwing.glb`. The supplied angel-versus-demon artwork is stored at `public/textures/angel-demon-mural.jpeg`. Both are included with the scene; procedural terrain, fire and ritual lines are generated in code.
