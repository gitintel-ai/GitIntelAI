import { EmptyState } from "@/components/empty-state";
import { FileCode } from "lucide-react";

export default function ContextPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Context Optimization</h1>
        <p className="text-muted-foreground">
          Optimize your CLAUDE.md files to reduce token usage and costs
        </p>
      </div>

      <EmptyState
        icon={FileCode}
        title="Context Optimization"
        description="Analyze and optimize your CLAUDE.md files to reduce token usage and costs."
        steps={[
          "Install the GitIntel CLI",
          "Run `gitintel context analyze` in your repository",
          "Review optimization suggestions here",
        ]}
        action={{ label: "Install CLI", href: "/" }}
      />
    </div>
  );
}
