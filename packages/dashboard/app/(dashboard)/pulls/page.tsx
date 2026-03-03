import { GitPullRequest } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

export default function PullRequestsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pull Requests</h1>
        <p className="text-muted-foreground">
          AI cost annotations for pull requests
        </p>
      </div>

      <EmptyState
        icon={GitPullRequest}
        title="Pull Request Insights"
        description="See AI cost annotations on every PR once GitHub webhooks are configured."
        steps={[
          "Install the GitIntel CLI",
          "Configure a GitHub webhook for your repository",
          "PRs are automatically annotated with AI cost data",
        ]}
        action={{ label: "View Documentation", href: "https://github.com/anthropics/gitintel" }}
      />
    </div>
  );
}
