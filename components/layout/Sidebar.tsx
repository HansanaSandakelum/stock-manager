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
  Undo2,
  Receipt,
  Gift,
  Store,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Categories", href: "/categories", icon: Tags },
  { name: "Products", href: "/products", icon: Package },
  { name: "Inventory", href: "/inventory", icon: Warehouse },
  { name: "Stock Handling", href: "/stock", icon: ClipboardList },
  { name: "Shops", href: "/shops", icon: Store },
  { name: "Transactions", href: "/transactions", icon: ArrowRightLeft },
  { name: "Credit Bills", href: "/credit-bills", icon: Receipt },
  { name: "Free Issues", href: "/free-issues", icon: Gift },
  { name: "Returns", href: "/returns", icon: Undo2 },
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
    const role = (session?.user as any)?.role;
    
    // Admin-only routes
    if (item.href === "/users") {
      return role === "admin";
    }
    
    // Deliver-only routes
    if (role === "deliver") {
      return ["/products", "/stock", "/shops", "/categories", "/transactions", "/returns", "/credit-bills", "/free-issues"].includes(item.href);
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
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-dark-surface border-r border-border dark:border-dark-border flex flex-col transition-transform duration-300 lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-border dark:border-dark-border">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-bold text-lg tracking-tight text-text dark:text-dark-text"
          >
            <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center shadow-sm shadow-primary-500/20">
              <Package className="w-5 h-5 text-white" />
            </div>
            <span>
              Araliya
              <span className="text-primary-600 dark:text-primary-400">Stocks</span>
            </span>
          </Link>
          <button
            className="lg:hidden text-text-tertiary hover:text-text dark:text-dark-text-tertiary dark:hover:text-dark-text p-1.5 rounded-lg border border-transparent hover:bg-surface-hover dark:hover:bg-dark-surface-hover"
            onClick={() => setMobileOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {filteredNavigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all relative duration-200 group active:scale-[0.98] ${
                  isActive
                    ? "bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400"
                    : "text-text-secondary hover:text-text hover:bg-surface-hover dark:text-dark-text-secondary dark:hover:text-dark-text dark:hover:bg-dark-surface-hover"
                }`}
                onClick={() => setMobileOpen(false)}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-primary-600 dark:bg-primary-400 rounded-r-full" />
                )}
                <item.icon
                  className={`w-4.5 h-4.5 transition-transform duration-200 group-hover:scale-105 ${
                    isActive
                      ? "text-primary-600 dark:text-primary-400"
                      : "text-text-tertiary group-hover:text-text-secondary dark:text-dark-text-tertiary dark:group-hover:text-dark-text-secondary"
                  }`}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border dark:border-dark-border">
          <div className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-surface-alt dark:bg-dark-surface-alt border border-border dark:border-dark-border mb-2">
            <div className="w-9 h-9 rounded-xl bg-primary-100 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold text-sm">
              {session?.user?.name?.charAt(0) || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-text dark:text-dark-text truncate">
                {session?.user?.name}
              </p>
              <p className="text-[10px] text-text-tertiary dark:text-dark-text-tertiary truncate">
                {session?.user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-3 px-3.5 py-2.5 w-full rounded-xl text-xs font-medium text-danger-600 hover:text-danger-700 dark:text-danger-400 dark:hover:text-danger-300 hover:bg-danger-50 dark:hover:bg-danger-500/10 transition-all duration-200 active:scale-[0.98]"
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
    <header className="h-16 bg-white/70 dark:bg-dark-surface/70 backdrop-blur-xl border-b border-border dark:border-dark-border flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button
          className="lg:hidden p-2 text-text-tertiary hover:bg-surface-hover dark:hover:bg-dark-surface-hover rounded-xl border border-border dark:border-dark-border transition-all"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="w-4 h-4" />
        </button>
        <h1 className="text-base font-semibold text-text dark:text-dark-text tracking-tight">
          {title}
        </h1>
      </div>

      <button
        onClick={toggleTheme}
        className="p-2 text-text-tertiary dark:text-dark-text-tertiary hover:text-text dark:hover:text-dark-text border border-transparent hover:border-border dark:hover:border-dark-border hover:bg-surface-hover dark:hover:bg-dark-surface-hover rounded-xl transition-all active:scale-95"
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
