import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { StatCard } from "@/components/common/stat-card"
import { UsersIcon } from "lucide-react"

describe("StatCard", () => {
  it("shows skeleton when loading", () => {
    const { container } = render(
      <StatCard label="Projects" value={42} loading={true} />,
    )
    // Value should not render while loading
    expect(screen.queryByText("42")).not.toBeInTheDocument()
    // Skeleton div should be present
    const skeleton = container.querySelector('[data-slot="skeleton"]')
    expect(skeleton).toBeInTheDocument()
  })

  it("shows em dash when value is undefined and not loading", () => {
    render(<StatCard label="Projects" value={undefined} />)
    expect(screen.getByText("—")).toBeInTheDocument()
  })

  it("shows the numeric value when provided", () => {
    render(<StatCard label="Projects" value={42} />)
    expect(screen.getByText("42")).toBeInTheDocument()
  })

  it("shows 0 when value is 0", () => {
    render(<StatCard label="Projects" value={0} />)
    expect(screen.getByText("0")).toBeInTheDocument()
  })

  it("shows the string value when provided as string", () => {
    render(<StatCard label="Status" value="Active" />)
    expect(screen.getByText("Active")).toBeInTheDocument()
  })

  it("renders the label", () => {
    render(<StatCard label="Projects" value={5} />)
    expect(screen.getByText("Projects")).toBeInTheDocument()
  })

  it("renders source text when provided", () => {
    render(
      <StatCard label="Projects" value={5} source="Updated 2 hours ago" />,
    )
    expect(screen.getByText("Updated 2 hours ago")).toBeInTheDocument()
  })

  it("renders icon when provided", () => {
    render(<StatCard label="Team" value={3} icon={UsersIcon} />)
    const svg = document.querySelector("svg")
    expect(svg).toBeInTheDocument()
  })

  it("renders hint trigger when hint is provided", () => {
    render(
      <StatCard label="Projects" value={5} hint="Total active projects" />,
    )
    // The hint renders a "?" trigger element
    expect(screen.getByText("?")).toBeInTheDocument()
  })

  it("formats large numbers with locale string", () => {
    render(<StatCard label="Models" value={1234} />)
    expect(screen.getByText("1,234")).toBeInTheDocument()
  })

  // Note: null is not in the type contract (number|string|undefined),
  // but the runtime code handles it gracefully via displayValue logic
})
