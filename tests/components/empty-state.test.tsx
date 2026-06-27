import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { EmptyState } from "@/components/common/empty-state"
import { HomeIcon } from "lucide-react"

// framer-motion renders regular HTML in jsdom; mock to avoid animation warnings
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<"div">) => (
      <div {...props}>{children}</div>
    ),
  },
}))

describe("EmptyState", () => {
  it("renders title and description", () => {
    render(
      <EmptyState
        title="No projects"
        description="Create your first project to get started."
      />,
    )
    expect(screen.getByText("No projects")).toBeInTheDocument()
    expect(
      screen.getByText("Create your first project to get started."),
    ).toBeInTheDocument()
  })

  it("renders icon when provided", () => {
    render(<EmptyState title="Empty" icon={HomeIcon} />)
    const svg = document.querySelector("svg")
    expect(svg).toBeInTheDocument()
  })

  it("renders primary action button and calls onClick", () => {
    const onClick = vi.fn()
    render(
      <EmptyState
        title="No items"
        primaryAction={{ label: "Add item", onClick }}
      />,
    )
    const button = screen.getByRole("button", { name: "Add item" })
    expect(button).toBeInTheDocument()
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("renders primary action as link when href is provided", () => {
    render(
      <EmptyState
        title="No items"
        primaryAction={{ label: "Go to settings", href: "/settings" }}
      />,
    )
    const link = screen.getByRole("link", { name: "Go to settings" })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute("href", "/settings")
  })

  it("renders both primary and secondary actions", () => {
    render(
      <EmptyState
        title="No items"
        primaryAction={{ label: "Create", onClick: () => {} }}
        secondaryAction={{ label: "Learn more", href: "/docs" }}
      />,
    )
    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Learn more" })).toBeInTheDocument()
  })

  it("does not render actions when no actions are provided", () => {
    render(<EmptyState title="No items" />)
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })
})
