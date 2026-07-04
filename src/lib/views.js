// data-forward: the entity chooses its view (`about.view` is its preference,
// folder-of-cards the default) — but the VIEWER may hold a lens over it that
// wins for their session only. Map, list and friends grow here as layers land.

export const LENSES = ['folder', 'chat'];

export function viewOf(entity, lens = null) {
  if (LENSES.includes(lens)) return lens;
  if (entity?.components?.about?.view === 'chat') return 'chat';
  return 'folder';
}

export const basename = (slug) => {
  const segs = (slug ?? '/').split('/').filter(Boolean);
  return segs[segs.length - 1] ?? '';
};

export const labelOf = (node, slug = null) =>
  node?.components?.about?.label ?? basename(node?.slug ?? slug ?? '/') ?? 'home';
