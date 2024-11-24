import React, { useEffect, useRef } from "react"

export function DropdownMenu(p: {
  className?: string;
  topOffset?: number
  leftOffset?: number
  width?: number
  children: React.ReactChild | React.ReactChild[];
  onClose: () => void;
  noSmartPositioning?: boolean,
  skipTabIndexes?: boolean
}) {
  const formEl = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (formEl.current && !formEl.current.contains(e.target as HTMLElement)) {
        p.onClose()
      }
    }

    document.addEventListener("mousedown", onMouseDown)
    return () => {
      document.removeEventListener("mousedown", onMouseDown)
    }
  }, [p.onClose])

  const getButtons = () => Array.from(formEl.current?.querySelectorAll(".focusable") || [])

  useEffect(() => {
    function onKeydown(e: KeyboardEvent) {
      const isInputInFocus = document.activeElement?.tagName === "INPUT"

      if (e.key === "Escape" || (isInputInFocus && e.key === "Enter")) {
        p.onClose()
        return
      }

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault() // Prevent page scrolling
        const buttons = getButtons()
        let nextIndex = buttons.indexOf(document.activeElement!)

        if (e.key === "ArrowDown") {
          nextIndex = nextIndex + 1 >= buttons.length ? 0 : nextIndex + 1
        } else if (e.key === "ArrowUp") {
          nextIndex = nextIndex - 1 < 0 ? buttons.length - 1 : nextIndex - 1
        }

        // Focus the next button
        (buttons[nextIndex] as HTMLElement)?.focus()
      }
    }

    document.addEventListener("keydown", onKeydown)
    return () => document.removeEventListener("keydown", onKeydown)
  }, [p.onClose])

  // Adjust menu position based on available space when it opens
  useEffect(() => {
    if (formEl.current) {
      const rect = formEl.current.getBoundingClientRect()
      const viewportHeight = window.document.body.clientHeight
      const bufferSpace = 10 // Buffer space between dropdown and viewport edges

      // Check if there is enough space below
      if (rect.bottom + bufferSpace < viewportHeight || p.noSmartPositioning) {
        // Show menu below button
        formEl.current.style.top = p.topOffset ? `${p.topOffset}px` : "auto"
        formEl.current.style.bottom = "initial"
      } else {
        // If not enough space below, position it above
        formEl.current.style.top = "auto"
        formEl.current.style.bottom = `${30}px`
      }
    }
  }, [])

  return (
    <div
      className={"dropdown-menu " + (p.className || "")}
      style={{
        left: p.leftOffset ? `${p.leftOffset}px` : "auto",
        width: p.width ? `${p.width}px` : "auto"
      }}
      ref={formEl}
    >
      {React.Children.map(p.children, (child) => {
        return React.cloneElement(child as React.ReactElement, {
          // Clone each child and modify it to be focusable
          //tabIndex: p.skipTabIndexes ? undefined : 0,
        })
      })}
    </div>
  )
}