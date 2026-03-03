import type { Route } from "next";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface EmptyStateAction {
  label: string;
  href: Route;
}

interface EmptyStateProps {
  message?: string;
  icon?: LucideIcon;
  title?: string;
  description?: string;
  steps?: string[];
  action?: EmptyStateAction;
}

export function EmptyState({
  message,
  icon: Icon,
  title,
  description,
  steps,
  action,
}: EmptyStateProps) {
  // Simple fallback: just message (backward-compatible)
  if (!title && !description && !steps && !action) {
    const DisplayIcon = Icon ?? Inbox;
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <DisplayIcon className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">{message ?? "No data yet"}</p>
      </div>
    );
  }

  const DisplayIcon = Icon ?? Inbox;

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto">
      <div className="rounded-full bg-muted p-4 mb-6">
        <DisplayIcon className="h-10 w-10 text-muted-foreground" />
      </div>

      {title && <h3 className="text-xl font-semibold mb-2">{title}</h3>}

      {description && (
        <p className="text-muted-foreground mb-6">{description}</p>
      )}

      {steps && steps.length > 0 && (
        <ol className="text-left text-sm space-y-3 mb-8 w-full">
          {steps.map((step, i) => (
            <li key={step} className="flex gap-3 items-start">
              <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                {i + 1}
              </span>
              <span className="text-muted-foreground pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      )}

      {action && (
        <Button asChild variant="outline">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}
