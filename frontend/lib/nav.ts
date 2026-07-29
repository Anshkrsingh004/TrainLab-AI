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
      { label: "Datasets", href: "/datasets", icon: Database },
      { label: "Training", href: "/training", icon: Cpu },
      { label: "Experiments", href: "/experiments", icon: FlaskConical },
      { label: "Models", href: "/models", icon: Boxes },
    ],
  },
  {
    heading: "Account",
    items: [{ label: "Settings", href: "/settings", icon: Settings, soon: true }],
  },
];
