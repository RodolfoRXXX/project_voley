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
  { label: "Mis obligaciones", href: "/dashboard/obligations" },
  {
    label: "Mi perfil",
    children: [
      { label: "Ficha personal", href: "/profile/person" },
    ],
  },
];

export function visibleAccountNavigationItems(isAdmin: boolean) {
  return accountNavigationItems.filter((item) =>
    (!item.adminOnly || isAdmin) && (Boolean(item.href) || Boolean(item.children?.length))
  );
}
