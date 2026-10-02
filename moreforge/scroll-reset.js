'use strict';
// Match Fuel Forge: discard a saved scroll position until the visitor interacts.
history.scrollRestoration = 'manual';
(() => {
  let initialScrollGuard = true;
  function keepInitialViewAtTop() {
    if (initialScrollGuard && (window.scrollY || window.scrollX)) {
      window.scrollTo({top: 0, left: 0, behavior: 'instant'});
    }
  }
  function releaseInitialScrollGuard() {
    initialScrollGuard = false;
    window.removeEventListener('scroll', keepInitialViewAtTop);
  }
  for (const eventName of ['pointerdown', 'touchstart', 'wheel', 'keydown']) {
    window.addEventListener(eventName, releaseInitialScrollGuard, {once: true, passive: true});
  }
  window.addEventListener('scroll', keepInitialViewAtTop, {passive: true});
  window.addEventListener('pageshow', () => requestAnimationFrame(keepInitialViewAtTop));
  window.addEventListener('load', () => requestAnimationFrame(keepInitialViewAtTop), {once: true});
})();
