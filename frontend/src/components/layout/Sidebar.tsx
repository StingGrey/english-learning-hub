"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarCheck,
  Newspaper,
  BookOpen,
  Languages,
  MessageCircle,
  PenLine,
  BarChart3,
  Settings,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/plan", label: "Plan", icon: CalendarCheck },
  { href: "/discover", label: "Discover", icon: Newspaper },
  { href: "/vocab", label: "Vocabulary", icon: Languages },
  { href: "/speaking", label: "Speaking", icon: MessageCircle },
  { href: "/writing", label: "Writing", icon: PenLine },
  { href: "/stats", label: "Statistics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-swiss-white border-r border-swiss-light flex flex-col z-40">
      {/* Logo */}
      <div className="px-6 py-8 border-b border-swiss-light">
        <h1 className="text-lg font-bold tracking-tight leading-none">
          English
          <br />
          <span className="text-swiss-gray font-normal">Learning Hub</span>
        </h1>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-6 py-3 text-sm transition-colors
                ${
                  isActive
                    ? "text-swiss-black font-medium bg-swiss-bg border-r-2 border-swiss-black"
                    : "text-swiss-gray hover:text-swiss-black"
                }
              `}
            >
              <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
              <span className="tracking-wide">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-swiss-light">
        <p className="text-[10px] uppercase tracking-[0.2em] text-swiss-gray">
          Swiss Style
        </p>
      </div>
    </aside>
  );
}
