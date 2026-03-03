"use client";

let UserButton: any = null;
try {
  // Only import Clerk if a valid key is configured
  if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_")) {
    UserButton = require("@clerk/nextjs").UserButton;
  }
} catch {
  // Clerk not available
}

export function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold">Dashboard</h2>
      </div>

      <div className="flex items-center gap-4">
        {UserButton && <UserButton afterSignOutUrl="/" />}
      </div>
    </header>
  );
}
