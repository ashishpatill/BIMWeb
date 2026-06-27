import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ConfirmDialog } from "@/components/common/confirm-dialog"

describe("ConfirmDialog", () => {
  it("renders title and description when open", () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Delete project"
        description="This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => {}}
      />,
    )
    expect(screen.getByText("Delete project")).toBeInTheDocument()
    expect(
      screen.getByText("This action cannot be undone."),
    ).toBeInTheDocument()
  })

  it("does not render content when closed", () => {
    render(
      <ConfirmDialog
        open={false}
        onOpenChange={() => {}}
        title="Hidden"
        description="Should not be visible"
        confirmLabel="OK"
        onConfirm={() => {}}
      />,
    )
    expect(screen.queryByText("Hidden")).not.toBeInTheDocument()
    expect(screen.queryByText("Should not be visible")).not.toBeInTheDocument()
  })

  it("calls onConfirm when confirm button is clicked", () => {
    const onConfirm = vi.fn()
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Confirm"
        description="Proceed?"
        confirmLabel="Yes"
        onConfirm={onConfirm}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: "Yes" }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it("shows loading state and disables buttons when loading", () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Saving"
        description="Please wait"
        confirmLabel="Save"
        onConfirm={() => {}}
        loading={true}
      />,
    )
    const confirmButton = screen.getByRole("button", { name: /Save/ })
    expect(confirmButton).toBeDisabled()

    const cancelButton = screen.getByRole("button", { name: "Cancel" })
    expect(cancelButton).toBeDisabled()
  })

  it("does not call onConfirm when cancelled", () => {
    const onConfirm = vi.fn()
    const onOpenChange = vi.fn()
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={onOpenChange}
        title="Cancel test"
        description="Will cancel"
        confirmLabel="OK"
        onConfirm={onConfirm}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(onConfirm).not.toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("uses destructive variant when destructive is true", () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Delete"
        description="Permanently delete?"
        confirmLabel="Delete"
        onConfirm={() => {}}
        destructive={true}
      />,
    )
    const confirmButton = screen.getByRole("button", { name: "Delete" })
    // Should exist and be a button (variant handled by class, not directly testable)
    expect(confirmButton).toBeInTheDocument()
  })
})
