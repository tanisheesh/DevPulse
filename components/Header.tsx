"use client";

import { signOut } from "next-auth/react";
import Image from "next/image";
import { Zap, LogOut } from "lucide-react";
import type { User } from "next-auth";

export default function Header({ user }: { user: User }) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur">
      <div className="container mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center">
            <Zap size={15} className="text-white" />
          </div>
          <span className="font-bold text-base tracking-tight">DevPulse</span>
        </div>

        <div className="flex items-center gap-3">
          {user.image && (
            <Image
              src={user.image}
              alt={user.name ?? "avatar"}
              width={30}
              height={30}
              className="rounded-full"
            />
          )}
          <span className="text-sm text-slate-600 dark:text-slate-300 hidden sm:block">
            {user.name}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition"
          >
            <LogOut size={15} />
            <span className="hidden sm:block">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
