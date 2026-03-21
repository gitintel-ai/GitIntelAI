# typed: false
# frozen_string_literal: true

# Homebrew formula for GitIntel AI.
# Tap: brew tap gitintel-ai/tap
# Install: brew install gitintel-ai/tap/gitintel
#
# This file is auto-updated by the release workflow on every tagged release.
# SHA256 checksums are filled in by CI after binaries are built.

class Gitintel < Formula
  desc "Git-native AI adoption tracking, cost intelligence & context optimization"
  homepage "https://gitintel.com"
  version "0.1.0"
  license "MIT"

  on_macos do
    on_arm do
      url "https://github.com/gitintel-ai/GitIntelAI/releases/download/v#{version}/gitintel-macos-arm64"
      sha256 "PLACEHOLDER_MACOS_ARM64_SHA256"
    end

    on_intel do
      url "https://github.com/gitintel-ai/GitIntelAI/releases/download/v#{version}/gitintel-macos-amd64"
      sha256 "PLACEHOLDER_MACOS_AMD64_SHA256"
    end
  end

  on_linux do
    on_arm do
      url "https://github.com/gitintel-ai/GitIntelAI/releases/download/v#{version}/gitintel-linux-arm64"
      sha256 "PLACEHOLDER_LINUX_ARM64_SHA256"
    end

    on_intel do
      url "https://github.com/gitintel-ai/GitIntelAI/releases/download/v#{version}/gitintel-linux-amd64"
      sha256 "PLACEHOLDER_LINUX_AMD64_SHA256"
    end
  end

  def install
    bin.install Dir["gitintel-*"].first => "gitintel"
  end

  def caveats
    <<~EOS
      To enable AI adoption tracking in a repo, run:
        gitintel init

      To enable Claude Code cost telemetry, add to your shell profile:
        export CLAUDE_CODE_ENABLE_TELEMETRY=1
        export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317

      Documentation: https://gitintel.com/docs/getting-started
    EOS
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/gitintel --version")
  end
end
