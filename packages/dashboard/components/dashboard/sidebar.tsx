"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  DollarSign,
  Users,
  FileCode,
  Settings,
  GitBranch,
  GitPullRequest,
} from "lucide-react";

const navigation = [
  { name: "Team", href: "/team", icon: Users },
  { name: "Cost", href: "/cost", icon: DollarSign },
  { name: "Developers", href: "/developers", icon: BarChart3 },
  { name: "Repos", href: "/repos", icon: GitBranch },
  { name: "Pull Requests", href: "/pulls", icon: GitPullRequest },
  { name: "Context", href: "/context", icon: FileCode },
  { name: "Settings", href: "/settings/alerts", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col bg-card border-r">
      <div className="flex h-16 items-center px-6 border-b">
        <Link href="/team" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold">D</span>
          </div>
          <span className="text-xl font-bold">GitIntel</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href as any}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <div className="text-xs text-muted-foreground">
          GitIntel v0.1.0
        </div>
      </div>
    </div>
  );
}
