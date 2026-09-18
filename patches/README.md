# React Three Fiber Timer compatibility

`@react-three__fiber@9.7.0.patch` replaces Fiber's internal `THREE.Clock`
with a `THREE.Timer` adapter for this project's Three.js r186 dependency.
The upstream Clock deprecation is tracked in
[pmndrs/react-three-fiber#3741](https://github.com/pmndrs/react-three-fiber/issues/3741).

The adapter advances once per render frame, keeps `clock.elapsedTime`,
`getDelta()` and `getElapsedTime()` available to existing components, and
preserves start/stop and manual `frameloop='never'` behavior. Repeated reads
within one frame return the same values. It also pauses timing while the
document is hidden and removes the visibility listener when the root unmounts.

pnpm applies the patch through `pnpm-workspace.yaml`. It covers the ESM and
both CommonJS entry points. Review or remove it when upgrading Fiber to a
release that uses Timer natively. Restart Vite after installing or changing
this dependency patch so its optimized dependency cache is refreshed.

The shadow setting is configured separately with `shadows='percentage'` in
`src/Scene.jsx`, which selects `THREE.PCFShadowMap`.
