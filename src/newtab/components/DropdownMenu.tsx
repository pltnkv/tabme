import React, { useEffect, useRef, useState } from "react"

export function DropdownMenu(props: {
  className?: string;
  topOffset?: number
  children: React.ReactChild[];
  onClose: () => void;
}) {
  const formEl = useRef<HTMLDivElement>(null)
  const [focusedButtonIndex, setFocusedButtonIndex] = useState(-1)
  const [menuStyles, setMenuStyles] = useState<{ top?: string, bottom?: string, left?: string }>({}) // State to hold dynamic styles

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (formEl.current && !formEl.current.contains(e.target as HTMLElement)) {
        props.onClose()
      }
    }

    document.addEventListener("click", onClick)
    document.addEventListener("contextmenu", onClick)

    return () => {
      document.removeEventListener("click", onClick)
      document.removeEventListener("contextmenu", onClick)
    }
  }, [props])

  const getButtons = () => Array.from(formEl.current?.querySelectorAll(".focusable") || [])

  useEffect(() => {
    function onKeydown(e: KeyboardEvent) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault() // Prevent page scrolling
        const buttons = getButtons()
        let nextIndex = focusedButtonIndex

        if (e.key === "ArrowDown") {
          nextIndex = focusedButtonIndex + 1 >= buttons.length ? 0 : focusedButtonIndex + 1
        } else if (e.key === "ArrowUp") {
          nextIndex = focusedButtonIndex - 1 < 0 ? buttons.length - 1 : focusedButtonIndex - 1
        }

        setFocusedButtonIndex(nextIndex);

        // Focus the next button
        (buttons[nextIndex] as HTMLElement)?.focus()
      }
    }

    document.addEventListener("keydown", onKeydown)
    return () => document.removeEventListener("keydown", onKeydown)
  }, [focusedButtonIndex])

  const onFocus = (target: Element) => {
    const buttons = getButtons()
    const index = buttons.indexOf(target)
    setFocusedButtonIndex(index)
  }

  // Adjust menu position based on available space when it opens
  useEffect(() => {
    if (formEl.current) {
      const rect = formEl.current.getBoundingClientRect()
      const viewportHeight = window.document.body.clientHeight
      const bufferSpace = 10 // Buffer space between dropdown and viewport edges

      // Check if there is enough space below
      if (rect.bottom + bufferSpace > viewportHeight) {
        // If not enough space below, position it above
        formEl.current.style.top = "auto"
        formEl.current.style.bottom = `${30}px`
      } else {
        // Otherwise, keep it below
        formEl.current.style.top = props.topOffset ? `${props.topOffset}px` : "auto"
        formEl.current.style.bottom = "initial"
      }
    }
  }, [])

  return (
    <div
      className={"dropdown-menu " + (props.className || "")}
      ref={formEl}
      style={menuStyles}
    >
      {React.Children.map(props.children, (child) => {
        return React.cloneElement(child as React.ReactElement, {
          // Clone each child and modify it to be focusable
          tabIndex: 0,
          // Adding onFocus to manage focused item index
          onFocus: (e: React.FocusEvent) => onFocus(e.target)
        })
      })}
    </div>
  )
}