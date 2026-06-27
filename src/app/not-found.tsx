import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeftIcon } from "lucide-react"

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="glass-panel flex max-w-sm flex-col items-center rounded-xl px-8 py-12 text-center">
        <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
          <span className="text-2xl font-bold text-muted-foreground">BIM</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link href="/" className="mt-6">
          <Button>
            <ArrowLeftIcon className="size-4" />
            Back to home
          </Button>
        </Link>
      </div>
    </div>
  )
}
