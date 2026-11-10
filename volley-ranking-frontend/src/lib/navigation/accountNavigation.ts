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
  { label: "Grupos", href: "/groups" },
  { label: "Torneos", href: "/tournaments" },
  {
    label: "Mi perfil",
    children: [
      { label: "Ficha personal", href: "/profile/person" },
      { label: "Mis torneos", href: "/profile/tournaments" },
    ],
  },
  {
    label: "Mi gestión",
    adminOnly: true,
    children: [{ label: "Torneos", href: "/admin/tournaments" }],
  },
];

export function visibleAccountNavigationItems(isAdmin: boolean) {
  return accountNavigationItems.filter((item) => !item.adminOnly || isAdmin);
}
