// Original Curiosity Atlas viewport math + interactions. No donor code or assets.
// Keeping the view separate from evidence data makes navigation reversible.
export const ATLAS_HOME_VIEW = Object.freeze({ x: 0, y: 0, width: 900, height: 620 });
const MIN_WIDTH = 180; // 5x maximum magnification
const MAX_WIDTH = 1800; // 0.5x minimum magnification

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
function clamp(value, low, high) {
  return Math.min(high, Math.max(low, value));
}
function limitPosition(view) {
  // Require part of the concept canvas to remain in reach after dragging.
  return {
    ...view,
    x: clamp(view.x, -view.width * 0.8, ATLAS_HOME_VIEW.width - view.width * 0.2),
    y: clamp(view.y, -view.height * 0.8, ATLAS_HOME_VIEW.height - view.height * 0.2),
  };
}
export function zoomAtlasView(view, anchor, factor) {
  if (!Number.isFinite(factor) || factor <= 0) return { ...view };
  const width = clamp(view.width * factor, MIN_WIDTH, MAX_WIDTH);
  const ratio = width / view.width;
  // A world-coordinate anchor remains at the same screen position.
  const next = {
    x: finite(anchor.x) + (view.x - finite(anchor.x)) * ratio,
    y: finite(anchor.y) + (view.y - finite(anchor.y)) * ratio,
    width,
    height: view.height * ratio,
  };
  return limitPosition(next);
}
export function panAtlasView(view, dx, dy) {
  return limitPosition({ ...view, x: view.x + finite(dx), y: view.y + finite(dy) });
}
export function atlasClientToWorld(view, rect, clientX, clientY) {
  if (!rect.width || !rect.height || !view.width || !view.height) {
    return { x: view.x + view.width / 2, y: view.y + view.height / 2 };
  }
  const scale = Math.min(rect.width / view.width, rect.height / view.height);
  const padX = (rect.width - view.width * scale) / 2;
  const padY = (rect.height - view.height * scale) / 2;
  return {
    x: view.x + (finite(clientX) - rect.left - padX) / scale,
    y: view.y + (finite(clientY) - rect.top - padY) / scale,
  };
}
export function atlasViewBox(view) {
  return [view.x, view.y, view.width, view.height].map((v) => String(Math.round(v * 10000) / 10000)).join(' ');
}

export function attachAtlasViewport(graph) {
  let view = { ...ATLAS_HOME_VIEW };
  let drag = null;
  function set(next) {
    view = next;
    graph.setAttribute('viewBox', atlasViewBox(view));
  }
  function center() {
    return { x: view.x + view.width / 2, y: view.y + view.height / 2 };
  }
  function zoom(factor, anchor = center()) {
    set(zoomAtlasView(view, anchor, factor));
  }
  function reset() {
    set({ ...ATLAS_HOME_VIEW });
  }
  function move(dx, dy) {
    set(panAtlasView(view, dx, dy));
  }
  graph.addEventListener('wheel', (event) => {
    // Do not hijack the page's normal scrolling.
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    const anchor = atlasClientToWorld(view, graph.getBoundingClientRect(), event.clientX, event.clientY);
    zoom(event.deltaY < 0 ? 0.88 : 1.12, anchor);
  }, { passive: false });

  graph.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || event.target.closest('.node')) return;
    drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    graph.setPointerCapture(event.pointerId);
    graph.classList.add('is-panning');
  });
  graph.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const rect = graph.getBoundingClientRect();
    const scale = Math.min(rect.width / view.width, rect.height / view.height);
    if (scale > 0) move(-(event.clientX - drag.x) / scale, -(event.clientY - drag.y) / scale);
    drag.x = event.clientX;
    drag.y = event.clientY;
  });
  function stopDrag(event) {
    if (drag && event.pointerId === drag.pointerId) {
      drag = null;
      graph.classList.remove('is-panning');
      if (graph.hasPointerCapture(event.pointerId)) graph.releasePointerCapture(event.pointerId);
    }
  }
  graph.addEventListener('pointerup', stopDrag);
  graph.addEventListener('pointercancel', stopDrag);
  graph.addEventListener('lostpointercapture', () => {
    drag = null;
    graph.classList.remove('is-panning');
  });

  graph.addEventListener('keydown', (event) => {
    // Keyboard events on a focused concept still belong to its node inspector.
    if (event.target !== graph) return;
    const stepX = view.width * 0.09;
    const stepY = view.height * 0.09;
    if (event.key === '+' || event.key === '=') zoom(0.8);
    else if (event.key === '-' || event.key === '_') zoom(1.25);
    else if (event.key === 'Home') reset();
    else if (event.key === 'ArrowLeft') move(-stepX, 0);
    else if (event.key === 'ArrowRight') move(stepX, 0);
    else if (event.key === 'ArrowUp') move(0, -stepY);
    else if (event.key === 'ArrowDown') move(0, stepY);
    else return;
    event.preventDefault();
  });
  reset();
  return { reset, zoomIn: () => zoom(0.8), zoomOut: () => zoom(1.25), getView: () => ({ ...view }) };
}
