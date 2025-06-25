# VirtualClothes

This project displays 3D models of clothing using React and Three.js.

## Logging

Logging helpers are available in `src/logger.js`. The log level can be
controlled globally through the `VITE_LOG_LEVEL` environment variable at build
time or by setting `window.LOG_LEVEL` in the browser console.

Available levels are `debug`, `info`, `warn`, and `error`.

```javascript
// Increase logging while debugging
window.LOG_LEVEL = 'debug';
```

By default the level is `info`.
