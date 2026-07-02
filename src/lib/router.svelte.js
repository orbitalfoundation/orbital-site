// slash-based SPA routing: the URL pathname IS the filespace slug.

export const route = $state({ path: window.location.pathname });

export function navigate(path) {
  if (path === route.path) return;
  history.pushState({}, '', path);
  route.path = path;
}

window.addEventListener('popstate', () => {
  route.path = window.location.pathname;
});
