function normalizeNavigationPath(value) {
  const path = String(value || "/").split(/[?#]/, 1)[0] || "/";
  if (path === "/") return path;
  return path.replace(/\/+$/, "") || "/";
}

function matchesNavigationHref(pathname, href) {
  const current = normalizeNavigationPath(pathname);
  const target = normalizeNavigationPath(href);

  if (target === "/" || target === "/dashboard") return current === target;
  return current === target || current.startsWith(`${target}/`);
}

export function getActiveNavigationHref(pathname, hrefs) {
  return [...new Set(hrefs.map(normalizeNavigationPath))]
    .filter((href) => matchesNavigationHref(pathname, href))
    .sort((left, right) => right.length - left.length)[0] ?? null;
}

export { normalizeNavigationPath };
