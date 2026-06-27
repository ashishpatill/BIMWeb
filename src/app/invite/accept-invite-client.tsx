"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { acceptInvite } from "@/lib/actions";

interface AcceptInviteClientProps {
  token: string;
}

type AcceptState =
  | { status: "loading" }
  | { status: "success"; projectId: number; alreadyJoined: boolean }
  | { status: "error"; message: string };

export function AcceptInviteClient({ token }: AcceptInviteClientProps) {
  const router = useRouter();
  const [state, setState] = useState<AcceptState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function handleAccept() {
      const result = await acceptInvite(token);

      if (cancelled) return;

      if (result.success) {
        setState({
          status: "success",
          projectId: result.projectId,
          alreadyJoined: result.alreadyJoined,
        });

        // Redirect to project after a short delay
        setTimeout(() => {
          if (!cancelled) {
            router.push(`/dashboard/projects/${result.projectId}`);
          }
        }, 2000);
      } else {
        setState({
          status: "error",
          message: result.error || "Failed to accept invitation",
        });
      }
    }

    handleAccept();

    return () => {
      cancelled = true;
    };
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6">
      <div className="glass-panel max-w-md w-full rounded-2xl border border-white/5 p-8 text-center">
        {state.status === "loading" && (
          <>
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
              <Loader2 className="size-6 text-primary animate-spin" />
            </div>
            <h1 className="text-xl font-semibold text-white mb-2">
              Accepting Invitation...
            </h1>
            <p className="text-sm text-zinc-400">
              Please wait while we process your invitation.
            </p>
          </>
        )}

        {state.status === "success" && (
          <>
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="size-6 text-emerald-400" />
            </div>
            <h1 className="text-xl font-semibold text-white mb-2">
              {state.alreadyJoined
                ? "Already a Member"
                : "Invitation Accepted!"}
            </h1>
            <p className="text-sm text-zinc-400 mb-6">
              {state.alreadyJoined
                ? "You are already a member of this project."
                : "You have successfully joined the project. Redirecting..."}
            </p>
            <Link
              href={`/dashboard/projects/${state.projectId}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Go to Project
              <ArrowRight className="size-4" />
            </Link>
          </>
        )}

        {state.status === "error" && (
          <>
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-red-500/10">
              <AlertCircle className="size-6 text-red-400" />
            </div>
            <h1 className="text-xl font-semibold text-white mb-2">
              Could Not Accept Invitation
            </h1>
            <p className="text-sm text-zinc-400 mb-2">{state.message}</p>
            <p className="text-xs text-zinc-500 mb-6">
              If you believe this is an error, ask the project admin to resend the invitation.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Go to Dashboard
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-xl border border-white/10 px-6 py-3 text-sm font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Back to Home
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
