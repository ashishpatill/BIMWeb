import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { SegmentedTabs } from "@/components/common/segmented-tabs"
import { HomeIcon } from "lucide-react"

const mockPush = vi.fn()
const mockSearchParams = new URLSearchParams()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/test",
  useSearchParams: () => mockSearchParams,
}))

const tabs = [
  { value: "overview", label: "Overview" },
  { value: "details", label: "Details" },
  { value: "settings", label: "Settings", badge: 3 },
]

describe("SegmentedTabs", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSearchParams.delete("tab")
  })

  it("renders all tabs", () => {
    render(<SegmentedTabs tabs={tabs} />)
    const tabElements = screen.getAllByRole("tab")
    expect(tabElements).toHaveLength(3)
  })

  it("calls onValueChange on tab click", () => {
    const onValueChange = vi.fn()
    render(<SegmentedTabs tabs={tabs} onValueChange={onValueChange} />)
    fireEvent.click(screen.getByRole("tab", { name: /Details/ }))
    expect(onValueChange).toHaveBeenCalledWith("details")
  })

  it("renders badges on tabs", () => {
    render(<SegmentedTabs tabs={tabs} />)
    expect(screen.getByText("3")).toBeInTheDocument()
  })

  it("highlights the first tab as active by default", () => {
    render(<SegmentedTabs tabs={tabs} />)
    const overviewTab = screen.getByRole("tab", { name: /Overview/ })
    expect(overviewTab).toHaveAttribute("aria-selected", "true")

    const detailsTab = screen.getByRole("tab", { name: /Details/ })
    expect(detailsTab).toHaveAttribute("aria-selected", "false")
  })

  it("uses controlled value when provided", () => {
    render(<SegmentedTabs tabs={tabs} value="details" />)
    const detailsTab = screen.getByRole("tab", { name: /Details/ })
    expect(detailsTab).toHaveAttribute("aria-selected", "true")

    const overviewTab = screen.getByRole("tab", { name: /Overview/ })
    expect(overviewTab).toHaveAttribute("aria-selected", "false")
  })

  it("reads initial value from searchParams when searchParam is provided", () => {
    mockSearchParams.set("tab", "settings")
    render(<SegmentedTabs tabs={tabs} searchParam="tab" />)
    const settingsTab = screen.getByRole("tab", { name: /Settings/ })
    expect(settingsTab).toHaveAttribute("aria-selected", "true")
  })

  it("updates URL search params when searchParam is provided and tab is clicked", () => {
    render(<SegmentedTabs tabs={tabs} searchParam="tab" />)
    fireEvent.click(screen.getByRole("tab", { name: /Details/ }))
    expect(mockPush).toHaveBeenCalledWith("/test?tab=details")
  })

  it("does not push to router when searchParam is not provided", () => {
    render(<SegmentedTabs tabs={tabs} onValueChange={() => {}} />)
    fireEvent.click(screen.getByRole("tab", { name: /Details/ }))
    expect(mockPush).not.toHaveBeenCalled()
  })

  it("renders icon when provided on a tab", () => {
    const tabsWithIcon = [
      { value: "home", label: "Home", icon: HomeIcon },
      { value: "away", label: "Away" },
    ]
    const { container } = render(<SegmentedTabs tabs={tabsWithIcon} />)
    const svgs = container.querySelectorAll("svg")
    expect(svgs.length).toBeGreaterThan(0)
  })
})
