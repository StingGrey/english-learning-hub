"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarCheck,
  Newspaper,
  Languages,
  BookMarked,
  MessageCircle,
  PenLine,
  BarChart3,
  Settings,
  Menu,
  X,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "仪表盘", icon: LayoutDashboard },
  { href: "/plan", label: "学习计划", icon: CalendarCheck },
  { href: "/discover", label: "外刊发现", icon: Newspaper },
  { href: "/vocab", label: "生词本", icon: Languages },
  { href: "/wordbook", label: "词汇书", icon: BookMarked },
  { href: "/speaking", label: "口语陪练", icon: MessageCircle },
  { href: "/writing", label: "写作批改", icon: PenLine },
  { href: "/stats", label: "学习统计", icon: BarChart3 },
  { href: "/settings", label: "设置", icon: Settings },
];

// 移动端底部导航栏显示的核心项目（最多5个）
const MOBILE_NAV_ITEMS = [
  { href: "/", label: "首页", icon: LayoutDashboard },
  { href: "/discover", label: "发现", icon: Newspaper },
  { href: "/vocab", label: "生词", icon: Languages },
  { href: "/speaking", label: "口语", icon: MessageCircle },
  { href: "/settings", label: "设置", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* ─── 桌面端侧边栏 ─── */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-56 bg-white border-r-4 border-black flex-col z-40">
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

      {/* ─── 移动端/iPad 顶部导航栏 ─── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b-2 border-black">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/" className="flex items-center gap-2">
            <h1 className="font-black text-lg tracking-wider leading-none">
              ENGLISH
            </h1>
          </Link>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 border-2 border-black transition-all hover:bg-black hover:text-white"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* 展开的移动端菜单 */}
        {mobileOpen && (
          <nav className="border-t-2 border-black bg-white max-h-[calc(100vh-3.5rem)] overflow-y-auto">
            {NAV_ITEMS.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`
                    flex items-center gap-3 px-5 py-3.5 font-sans text-sm border-b border-gray-100 transition-all
                    ${
                      isActive
                        ? "bg-black text-white font-bold"
                        : "text-gray-600 hover:text-black hover:bg-gray-50"
                    }
                  `}
                >
                  <Icon size={18} strokeWidth={isActive ? 2.5 : 1.5} />
                  <span className="tracking-wide">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      {/* ─── 移动端底部快捷导航 ─── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-black">
        <div className="flex items-center justify-around h-14">
          {MOBILE_NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-all ${
                  isActive
                    ? "text-black font-bold"
                    : "text-gray-400 hover:text-black"
                }`}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 1.5} />
                <span className="font-sans text-[10px] tracking-wide">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* 移动端菜单遮罩 */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
}
