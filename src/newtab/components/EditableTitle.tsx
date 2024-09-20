import React, { useEffect, useRef, useState } from "react"
import { hlSearch } from "../helpers/utils"

export function EditableTitle(p: {
  className?: string,
  onClick?:() => void,
  inEdit: boolean,
  setEditing?: (value: boolean) => void,
  initTitle: string,
  search: string
  onSaveTitle: (val: string) => void,
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [title, setTitle] = useState(p.initTitle)

  useEffect(() => {
    // to support UNDO operation
    setTitle(p.initTitle)
  }, [p.initTitle])

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
  }, [p.inEdit, title])

  function handleTitleChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setTitle(event.target.value)
  }

  function trySaveChange() {
    if (p.setEditing) {
      p.setEditing(false)
    }
    p.onSaveTitle(title)
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
      setTitle(p.initTitle)
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
          value={title}
        />
        :
        <span onClick={p.onClick} className={p.className} dangerouslySetInnerHTML={hlSearch(title, p.search)}/>
    }
  </>
}
