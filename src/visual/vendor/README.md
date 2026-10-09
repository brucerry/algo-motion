# Orbit controls

`OrbitControls.js` and `EventDispatcher.js` are copied from the installed
`three-stdlib` 2.36.1 package under its MIT license (included in `LICENSE`).

The optional `enableFullRotation` mode retains unwrapped spherical angles and
uses a continuous tangent up vector for this project's Y-up scenes. Set polar
limits to negative and positive infinity to pass both poles. External camera
or target changes initialize a new orbit. Ordinary mouse/touch handling, drag
sensitivity, damping, wheel zoom, and pan behavior remain upstream code.

The showcase also enables `screenRelativeRotation`. It derives the rotation
axes from the current camera quaternion on every update, so a drag keeps its
screen direction through upside-down, rolled, and pole views. Rotation uses
the upstream input angles and damping directly, without a second camera or
additional smoothing. Algorithm coordinates and move notation remain fixed.

The local declaration reuses the upstream public API. Source-map references
are removed; imported dependencies are local or existing Three.js dependencies.
