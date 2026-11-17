export type AccountNavigationItem = {
  label: string;
  href?: string;
  adminOnly?: boolean;
  children?: Array<{ label: string; href: string }>;
};

export const accountNavigationItems: AccountNavigationItem[] = [
  { label: "Inicio", href: "/dashboard" },
  { label: "Mis grupos", href: "/dashboard/groups" },
  { label: "Explorar grupos", href: "/dashboard/groups/explore" },
  {
    label: "Mi perfil",
    children: [
      { label: "Resumen", href: "/profile/info" },
      { label: "Ficha personal", href: "/profile/person" },
      { label: "Mis obligaciones", href: "/dashboard/obligations" },
    ],
  },
];

export function visibleAccountNavigationItems(isAdmin: boolean) {
  return accountNavigationItems.filter((item) =>
    (!item.adminOnly || isAdmin) && (Boolean(item.href) || Boolean(item.children?.length))
  );
}
