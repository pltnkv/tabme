import React, { useEffect } from "react"

function isTargetInputOrTextArea(target: Element): boolean {
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA"
}

export const PopupKeyboardManager = React.memo((p: {
  onSaveTab: () => void
}) => {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {

      if (document.activeElement && isTargetInputOrTextArea(document.activeElement)) {
        return
      }

      if (e.code === "Enter") {
        p.onSaveTab()
        e.preventDefault()
        return
      }

      if (e.code === "Enter") {
        p.onSaveTab()
        e.preventDefault()
        return
      }

    }
    document.addEventListener("keydown", onKeyDown)

    return () => {
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [p.onSaveTab])
  return null
})

