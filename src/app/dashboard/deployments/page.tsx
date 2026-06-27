import { redirect } from "next/navigation";

/**
 * Permanent redirect from /dashboard/deployments → /dashboard/health.
 * T-PAGE-HEALTH: renamed Deployments to Platform Health.
 */
export default function DeploymentsPage() {
  redirect("/dashboard/health");
}
