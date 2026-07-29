import {
  Boxes,
  Cpu,
  Database,
  FlaskConical,
  FolderKanban,
  LayoutDashboard,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Sections delivered by later milestones — shown disabled with a "Soon" tag. */
  soon?: boolean;
}

export interface NavSection {
  heading?: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    heading: "Workspace",
    items: [
      { label: "Projects", href: "/projects", icon: FolderKanban },
      { label: "Datasets", href: "/datasets", icon: Database, soon: true },
      { label: "Training", href: "/training", icon: Cpu, soon: true },
      {
        label: "Experiments",
        href: "/experiments",
        icon: FlaskConical,
        soon: true,
      },
      { label: "Models", href: "/models", icon: Boxes, soon: true },
    ],
  },
  {
    heading: "Account",
    items: [{ label: "Settings", href: "/settings", icon: Settings, soon: true }],
  },
];
