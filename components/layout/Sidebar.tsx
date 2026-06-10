"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Package,
  Tags,
  ArrowRightLeft,
  FileText,
  Warehouse,
  ClipboardList,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Users,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Products", href: "/products", icon: Package },
  { name: "Inventory", href: "/inventory", icon: Warehouse },
  { name: "Stock Handling", href: "/stock", icon: ClipboardList },
  { name: "Categories", href: "/categories", icon: Tags },
  { name: "Transactions", href: "/transactions", icon: ArrowRightLeft },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Users", href: "/users", icon: Users },
];

export function Sidebar({
  mobileOpen,
  setMobileOpen,
}: {
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const filteredNavigation = navigation.filter((item) => {
    if (item.href === "/users") {
      return (session?.user as any)?.role === "admin";
    }
    return true;
  });

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-zinc-950/40 z-40 lg:hidden backdrop-blur-sm dark:bg-black/60"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-[#0c0c14] border-r border-zinc-100 dark:border-zinc-800/80 flex flex-col transition-transform duration-300 lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-zinc-100 dark:border-zinc-800/80">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-50"
          >
            <div className="w-9 h-9 bg-gradient-to-tr from-indigo-600 to-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/15">
              <Package className="w-5 h-5 text-white" />
            </div>
            <span>
              Stock
              <span className="text-indigo-600 dark:text-indigo-400">Mgr</span>
            </span>
          </Link>
          <button
            className="lg:hidden text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1.5 rounded-lg border border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900"
            onClick={() => setMobileOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {filteredNavigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all relative duration-200 group active:scale-[0.98] ${
                  isActive
                    ? "bg-indigo-50/50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900/40 dark:hover:text-zinc-100"
                }`}
                onClick={() => setMobileOpen(false)}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/3 bottom-1/3 w-1 bg-indigo-600 dark:bg-indigo-400 rounded-r-md" />
                )}
                <item.icon
                  className={`w-5 h-5 transition-transform duration-200 group-hover:scale-105 ${isActive ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200"}`}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800/80">
          <div className="flex items-center gap-3 px-3.5 py-3.5 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800/40 mb-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm border border-indigo-100/50 dark:border-indigo-900/30">
              {session?.user?.name?.charAt(0) || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                {session?.user?.name}
              </p>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">
                {session?.user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-3 px-3.5 py-2.5 w-full rounded-xl text-xs font-medium text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-all duration-200 active:scale-[0.98]"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </>
  );
}

export function Topbar({
  setMobileOpen,
}: {
  setMobileOpen: (v: boolean) => void;
}) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  // Create title from pathname
  const title =
    pathname === "/"
      ? "Dashboard"
      : pathname.split("/")[1].charAt(0).toUpperCase() +
        pathname.split("/")[1].slice(1);

  return (
    <header className="h-16 bg-white/80 dark:bg-[#0c0c14]/80 backdrop-blur-md border-b border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button
          className="lg:hidden p-2 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-xl border border-zinc-200/50 dark:border-zinc-800 transition-all"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="w-4 h-4" />
        </button>
        <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
          {title}
        </h1>
      </div>

      <button
        onClick={toggleTheme}
        className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 border border-transparent hover:border-zinc-200/40 dark:hover:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl transition-all active:scale-95 cursor-pointer"
        aria-label="Toggle dark mode"
      >
        {theme === "dark" ? (
          <Sun className="w-4.5 h-4.5" />
        ) : (
          <Moon className="w-4.5 h-4.5" />
        )}
      </button>
    </header>
  );
}
