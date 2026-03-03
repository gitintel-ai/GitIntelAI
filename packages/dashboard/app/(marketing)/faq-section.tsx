"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqItems = [
  {
    question: "How do I track AI-generated code in my repository?",
    answer:
      "GitIntel AI automatically tracks AI-generated code at the line level using git hooks. Install the CLI with a single command, and it intercepts your normal git commit workflow to detect which lines were written by AI assistants like Claude Code, Cursor, Copilot, or Codex. Attribution data is stored in git refs alongside your commits, requiring no workflow changes.",
  },
  {
    question: "How do I measure AI coding costs per developer or project?",
    answer:
      "GitIntel AI captures token usage metrics (input, output, cache read, cache write) from AI coding tools via OpenTelemetry and maps them to USD costs per commit, per feature branch, per developer, and per team. You get a real-time dashboard showing exactly how much each AI-assisted feature costs to build.",
  },
  {
    question: "What percentage of my codebase is AI-generated?",
    answer:
      "GitIntel AI provides precise AI attribution percentages at every level: per file, per commit, per developer, per repository, and across your entire organization. Each line is classified as AI-written, human-written, or mixed (human-edited AI output), giving you a clear picture of AI adoption across your team.",
  },
  {
    question: "Does GitIntel AI work with Claude Code, Cursor, and Copilot?",
    answer:
      "Yes. GitIntel AI is vendor-agnostic and works with all major AI coding assistants including Claude Code, Cursor, GitHub Copilot, OpenAI Codex, and Google Gemini CLI. It detects AI-authored code regardless of which tool was used to generate it.",
  },
  {
    question: "Is my code and data sent to the cloud?",
    answer:
      "No. GitIntel AI is local-first and privacy-first. All tracking and attribution happens on your machine. Code, prompts, and transcripts never leave your environment unless you explicitly configure cloud sync. The tool uses a local SQLite database and stores attribution in git refs within your repository.",
  },
  {
    question: "How does GitIntel AI compare to gitai (usegitai.com)?",
    answer:
      "GitIntel AI is an open-source alternative to gitai that provides deeper attribution (line-level vs file-level), built-in cost tracking, context optimization, and full enterprise features including self-hosting and air-gapped deployment. Unlike gitai, GitIntel AI is local-first and does not require sending your code to a third-party cloud service.",
  },
  {
    question: "Can I self-host GitIntel AI for my enterprise?",
    answer:
      "Yes. GitIntel AI is designed for enterprise self-hosting from day one. It ships as a single Docker image or Helm chart for Kubernetes, supports air-gapped deployment, SSO via SAML/OIDC, role-based access control, and audit logging. Your data stays entirely within your infrastructure.",
  },
  {
    question: "What is the GitIntel attribution standard?",
    answer:
      "The GitIntel attribution standard (v1.0) is an open specification for storing AI authorship metadata in git. Attribution data is stored at refs/ai/authorship/{commit-sha} and includes per-file line ranges for AI-written and human-written code, token usage, cost, model information, and agent session details. It is designed to be vendor-neutral and interoperable.",
  },
];

export function FaqSection() {
  return (
    <Accordion type="single" collapsible className="w-full">
      {faqItems.map((item, index) => (
        <AccordionItem key={index} value={`item-${index}`}>
          <AccordionTrigger className="text-left text-base">
            {item.question}
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            {item.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
