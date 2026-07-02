// data-forward: the entity chooses its view. `about.view` is the explicit
// preference; the default is a folder of cards. (Map, chat and friends grow
// here as their layers land.)

export function viewOf(entity) {
  if (entity?.components?.about?.view === 'chat') return 'chat';
  return 'folder';
}

export const basename = (slug) => {
  const segs = (slug ?? '/').split('/').filter(Boolean);
  return segs[segs.length - 1] ?? '';
};

export const labelOf = (node, slug = null) =>
  node?.components?.about?.label ?? basename(node?.slug ?? slug ?? '/') ?? 'home';
