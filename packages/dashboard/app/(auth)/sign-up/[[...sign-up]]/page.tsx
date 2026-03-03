import { SignUpContent } from "./sign-up-content";

const hasClerkKey = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_");

export default function SignUpPage() {
  if (!hasClerkKey) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-2xl font-bold">Sign Up</h1>
          <p className="text-muted-foreground">
            Authentication is not configured. Set{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded text-sm">
              NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
            </code>{" "}
            in your <code className="bg-muted px-1.5 py-0.5 rounded text-sm">.env.local</code> to
            enable sign-up.
          </p>
          <a href="/team" className="inline-block text-sm text-blue-600 hover:underline">
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <SignUpContent />
    </div>
  );
}
