import React, { useEffect, useRef } from "react"
import { hlSearch } from "../helpers/utils"

export function EditableTitle(p: {
  className?: string,
  onClick?: () => void,
  inEdit: boolean,
  setEditing?: (value: boolean) => void,
  localTitle: string,
  setLocalTitle: (val: string) => void,
  search: string
  onSaveTitle: (title: string) => void,
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    // Select all text when entering edit mode
    if (p.inEdit && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [p.inEdit])

  useEffect(() => {
    if (p.inEdit && textareaRef.current) {
      textareaRef.current.style.height = "0px" // Reset height to recalculate
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`
    }
  }, [p.inEdit, p.localTitle])

  function handleTitleChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    p.setLocalTitle(event.target.value)
  }

  function trySaveChange() {
    if (p.setEditing) {
      p.setEditing(false)
    }
    p.onSaveTitle(p.localTitle)
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const isCmdEnter = event.metaKey && event.key === "Enter"
    const isCtrlEnter = event.ctrlKey && event.key === "Enter"
    const isEnter = event.key === "Enter" && !event.shiftKey
    const isEscape = event.key === "Escape"

    if (isEscape) {
      if (p.setEditing) {
        p.setEditing(false)
      }
    } else if (isEnter || isCmdEnter || isCtrlEnter) {
      event.preventDefault() // Prevent the default action to avoid inserting a newline
      trySaveChange()
    }
  }

  return <>
    {
      p.inEdit ?
        <textarea
          tabIndex={2}
          ref={textareaRef}
          onKeyDown={handleKeyDown}
          onChange={handleTitleChange}
          onBlur={trySaveChange}
          value={p.localTitle}
        />
        :
        <span onClick={p.onClick} className={p.className} dangerouslySetInnerHTML={hlSearch(p.localTitle, p.search)}/>
    }
  </>
}
