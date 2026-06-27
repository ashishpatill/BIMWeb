/**
 * Email notification service using Resend.
 * Falls back to console.log in development when no API key is set.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.EMAIL_FROM || "noreply@bimrag.io"

interface EmailParams {
  to: string
  subject: string
  html: string
}

async function sendEmail({ to, subject, html }: EmailParams): Promise<{ success: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    console.log(`[Email Dev] To: ${to}, Subject: ${subject}`)
    return { success: true }
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to,
        subject,
        html,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return { success: false, error: err }
    }

    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

export async function sendWelcomeEmail(email: string, name: string): Promise<{ success: boolean; error?: string }> {
  return sendEmail({
    to: email,
    subject: "Welcome to BIMRAG",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h1 style="color: #f4f4f5;">Welcome to BIMRAG, ${name}!</h1>
        <p style="color: #a1a1aa;">Your account has been created. Start exploring your 3D models and collaborating with your team.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard"
           style="display: inline-block; padding: 12px 24px; background: #18181b; color: #f4f4f5; text-decoration: none; border-radius: 8px; margin-top: 16px;">
          Go to Dashboard
        </a>
      </div>
    `,
  })
}

export async function sendInviteEmail(
  email: string,
  invitedBy: string,
  projectName: string,
  inviteLink: string,
  role?: string
): Promise<{ success: boolean; error?: string }> {
  const roleDescription = role
    ? { admin: "full control", editor: "upload and edit models", viewer: "read-only access" }[role] || role
    : "";

  return sendEmail({
    to: email,
    subject: `${invitedBy} invited you to ${projectName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h1 style="color: #f4f4f5;">You've been invited!</h1>
        <p style="color: #a1a1aa;">
          <strong>${invitedBy}</strong> has invited you to collaborate on the project
          <strong>${projectName}</strong> in BIMRAG.
        </p>
        ${roleDescription ? `<p style="color: #a1a1aa; margin-top: 8px;">You've been invited as <strong>${role}</strong> — ${roleDescription}.</p>` : ""}
        <a href="${inviteLink}"
           style="display: inline-block; padding: 12px 24px; background: #18181b; color: #f4f4f5; text-decoration: none; border-radius: 8px; margin-top: 16px;">
          Accept Invitation
        </a>
      </div>
    `,
  })
}

export async function sendProjectSharedEmail(email: string, sharedBy: string, projectName: string): Promise<{ success: boolean; error?: string }> {
  return sendEmail({
    to: email,
    subject: `${sharedBy} shared "${projectName}" with you`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h1 style="color: #f4f4f5;">Project Shared</h1>
        <p style="color: #a1a1aa;">
          <strong>${sharedBy}</strong> has shared the project
          <strong>${projectName}</strong> with you.
        </p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard"
           style="display: inline-block; padding: 12px 24px; background: #18181b; color: #f4f4f5; text-decoration: none; border-radius: 8px; margin-top: 16px;">
          View Project
        </a>
      </div>
    `,
  })
}
