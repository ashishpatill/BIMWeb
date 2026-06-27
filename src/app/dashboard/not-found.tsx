import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeftIcon } from "lucide-react"

export default function DashboardNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="glass-panel flex max-w-sm flex-col items-center rounded-xl px-8 py-12 text-center">
        <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
          <span className="text-2xl font-bold text-muted-foreground">BIM</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This dashboard page doesn&apos;t exist or you may not have access.
        </p>
        <Link href="/dashboard" className="mt-6">
          <Button>
            <ArrowLeftIcon className="size-4" />
            Back to dashboard
          </Button>
        </Link>
      </div>
    </div>
  )
}
