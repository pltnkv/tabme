import React, { useEffect, useRef } from "react"

export function DropdownMenu(props: {
  className?: string
  children: React.ReactChild[]
  onClose: () => void
}) {
  const formEl = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (formEl.current && !(formEl.current as HTMLElement).contains((e.target as HTMLElement))) {
        props.onClose()
      }
    }

    document.addEventListener("click", onClick)
    document.addEventListener("contextmenu", onClick)
    return () => {
      document.removeEventListener("click", onClick)
      document.removeEventListener("contextmenu", onClick)
    }
  }, [])

  return (
    <div className={"dropdown-menu " + (props.className || '')} ref={formEl}>
      {props.children}
    </div>
  )
}
