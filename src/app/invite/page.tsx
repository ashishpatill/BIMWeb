import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { AcceptInviteClient } from "./accept-invite-client";
import { LoginLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";

interface InvitePageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function InvitePage({ searchParams }: InvitePageProps) {
  const { token } = await searchParams;
  const { isAuthenticated } = getKindeServerSession();
  const authenticated = await isAuthenticated();

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6">
        <div className="glass-panel max-w-md w-full rounded-2xl border border-white/5 p-8 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-red-500/10">
            <AlertCircle className="size-6 text-red-400" />
          </div>
          <h1 className="text-xl font-semibold text-white mb-2">Invalid Invite Link</h1>
          <p className="text-sm text-zinc-400 mb-6">
            This invite link is missing a token. Please check the link you received or ask the sender to resend it.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const returnUrl = `${appUrl}/invite?token=${token}`;

    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6">
        <div className="glass-panel max-w-md w-full rounded-2xl border border-white/5 p-8 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
            <Loader2 className="size-6 text-primary" />
          </div>
          <h1 className="text-xl font-semibold text-white mb-2">Sign In to Accept Invite</h1>
          <p className="text-sm text-zinc-400 mb-6">
            You need to sign in or create an account to accept this team invitation.
          </p>
          <div className="flex flex-col gap-3">
            <LoginLink
              postLoginRedirectURL={returnUrl}
              className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Sign In
            </LoginLink>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl border border-white/10 px-6 py-3 text-sm font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <AcceptInviteClient token={token} />;
}
