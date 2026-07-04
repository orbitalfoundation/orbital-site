// slash-based SPA routing: the URL pathname IS the filespace slug. The query
// string carries the viewer's LENS (?view=chat|folder) — a local, shareable
// way of looking at an area that never mutates the area itself.

const currentView = () => new URLSearchParams(window.location.search).get('view');

export const route = $state({ path: window.location.pathname, view: currentView() });

export function navigate(path) {
  if (path === route.path && !route.view) return;
  history.pushState({}, '', path); // a fresh area presents its default face
  route.path = path;
  route.view = null;
}

// change the lens in place — replaceState so flipping views doesn't pile up
// history entries; null returns to the area's own default (and a clean URL)
export function setView(view) {
  route.view = view;
  history.replaceState({}, '', view ? `${route.path}?view=${view}` : route.path);
}

window.addEventListener('popstate', () => {
  route.path = window.location.pathname;
  route.view = currentView();
});
