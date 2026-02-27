"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarCheck,
  Newspaper,
  Languages,
  MessageCircle,
  PenLine,
  BarChart3,
  Settings,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "仪表盘", icon: LayoutDashboard },
  { href: "/plan", label: "学习计划", icon: CalendarCheck },
  { href: "/discover", label: "外刊发现", icon: Newspaper },
  { href: "/vocab", label: "生词本", icon: Languages },
  { href: "/speaking", label: "口语陪练", icon: MessageCircle },
  { href: "/writing", label: "写作批改", icon: PenLine },
  { href: "/stats", label: "学习统计", icon: BarChart3 },
  { href: "/settings", label: "设置", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-white border-r-2 md:border-r-4 border-black flex flex-col z-40">
      {/* Logo */}
      <div className="px-5 py-6 border-b-2 border-black">
        <Link href="/" className="block">
          <h1 className="font-black text-xl tracking-wider leading-none">
            ENGLISH
          </h1>
          <p className="font-mono text-xs text-gray-500 mt-1">学习中心</p>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 overflow-y-auto">
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
                flex items-center gap-3 px-5 py-3 font-sans text-sm transition-all duration-150
                ${
                  isActive
                    ? "bg-black text-white font-bold"
                    : "text-gray-500 hover:text-black hover:bg-gray-50"
                }
              `}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="tracking-wide">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t-2 border-black">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-400">
          Swiss Style
        </p>
      </div>
    </aside>
  );
}
