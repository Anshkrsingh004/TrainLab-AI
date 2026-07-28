import { BrandMark, NavList } from "@/components/dashboard/nav-list";

/** Fixed desktop sidebar (hidden on small screens; see MobileNav). */
export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r bg-card lg:flex">
      <div className="flex h-16 items-center border-b px-6">
        <BrandMark />
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <NavList />
      </div>
      <div className="border-t p-4">
        <p className="px-3 text-xs text-muted-foreground">
          Release 1 · v0.1.0
        </p>
      </div>
    </aside>
  );
}
