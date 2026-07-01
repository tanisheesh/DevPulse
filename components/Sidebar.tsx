"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  FileText,
  BarChart2,
  GitBranch,
  TrendingUp,
  Target,
  Settings,
  Zap,
  LogOut,
} from "lucide-react";
import type { User } from "next-auth";

const NAV = [
  { href: "/dashboard",           label: "Overview",      icon: LayoutDashboard, exact: true },
  { href: "/dashboard/standup",   label: "Standup",       icon: FileText,        exact: false },
  { href: "/dashboard/weekly",    label: "Weekly",        icon: BarChart2,       exact: false },
  { href: "/dashboard/repos",     label: "Repositories",  icon: GitBranch,       exact: false },
  { href: "/dashboard/analytics", label: "Analytics",     icon: TrendingUp,      exact: false },
  { href: "/dashboard/goals",     label: "Goals",         icon: Target,          exact: false },
  { href: "/dashboard/settings",  label: "Settings",      icon: Settings,        exact: false },
];

function isActive(pathname: string, href: string, exact: boolean) {
  return exact ? pathname === href : pathname.startsWith(href);
}

export default function Sidebar({ user }: { user: User }) {
  const pathname = usePathname();

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside
        className="hidden lg:flex flex-col h-dvh sticky top-0 z-40 shrink-0"
        style={{ width: 260 }}
      >
        <div
          className="flex flex-col h-full glass-heavy"
          style={{ borderRadius: 0, borderTop: "none", borderLeft: "none", borderBottom: "none" }}
        >
          {/* Logo */}
          <div className="flex items-center gap-2.5 px-5 pt-6 pb-4">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "linear-gradient(135deg, rgba(10,132,255,0.9), rgba(0,80,200,0.9))",
                boxShadow: "0 0 0 1px rgba(10,132,255,0.4), 0 4px 12px rgba(10,132,255,0.3), inset 0 1px 0 rgba(255,255,255,0.25)",
              }}
            >
              <Zap size={16} className="text-white" />
            </div>
            <span className="font-semibold text-base tracking-tight text-primary heading">DevPulse</span>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
            {NAV.map(({ href, label, icon: Icon, exact }) => {
              const active = isActive(pathname, href, exact);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm ${
                    active ? "active text-primary font-medium" : "text-secondary"
                  }`}
                >
                  <Icon
                    size={17}
                    style={{ color: active ? "#0A84FF" : undefined }}
                    className={active ? "" : "opacity-60"}
                  />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* User */}
          <div className="px-3 pb-5 pt-3 border-t border-white/[0.08]">
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl glass-subtle">
              {user.image ? (
                <Image
                  src={user.image}
                  alt={user.name ?? "avatar"}
                  width={28}
                  height={28}
                  className="rounded-full ring-1 ring-white/20"
                />
              ) : (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                  style={{ background: "#0A84FF" }}
                >
                  {(user.name ?? "U")[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-primary truncate">{user.name}</p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-secondary hover:text-primary transition p-1 rounded-lg"
                title="Sign out"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Mobile bottom nav ───────────────────────────────────────────── */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-heavy flex"
        style={{ borderRadius: 0, borderBottom: "none", borderLeft: "none", borderRight: "none" }}
      >
        {NAV.slice(0, 5).map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(pathname, href, exact);
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-[9px] transition-all ${
                active ? "text-primary" : "text-tertiary"
              }`}
            >
              <Icon size={19} style={{ color: active ? "#0A84FF" : undefined }} />
              <span className="hidden sm:block">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
