
/* =====================
  Breadcrumbs
  ===================== */

type Crumb = {
  label: string;
  href?: string;
};

export function AdminBreadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav className="text-sm text-gray-500">
      <ol className="flex items-center gap-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2">
            {item.href ? (
              <a
                href={item.href}
                className="hover:text-black transition"
              >
                {item.label}
              </a>
            ) : (
              <span className="text-gray-800 font-medium">
                {item.label}
              </span>
            )}

            {i < items.length - 1 && <span>/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
