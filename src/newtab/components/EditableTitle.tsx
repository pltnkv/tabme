import React, { useEffect, useRef, useState } from "react"
import { hlSearch } from "../helpers/utils"

export function EditableTitle(p: {
  className?: string,
  onClick?: () => void,
  inEdit: boolean,
  setEditing?: (value: boolean) => void, //todo seems like it can be simplified and setEditing() can be removed at all
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

export function SimpleEditableTitle(p: {
  onClick?: () => void,
  onContextMenu?: () => void,
  className?: string,
  inEdit: boolean,
  value: string,
  onSave: (title: string) => void,
  onUnmount?: () => void,
  onMouseDown?: (e: React.MouseEvent<HTMLTextAreaElement>) => void,
}) {
  const [localValue, setLocalValue] = useState(p.value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      // because onBlur from deleted input is not dispatched -> we dont set itemInEdit undefined -> "new space" button is not visible
      p.onUnmount && p.onUnmount()
    }
  }, [])

  useEffect(() => {
    setLocalValue(p.value)
  }, [p.value])

  useEffect(() => {
    // Select all text when entering edit mode
    if (p.inEdit && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [p.inEdit])

  useEffect(() => {
    if (p.inEdit && inputRef.current) {
      inputRef.current.style.width = `${getTextWidthWithSpan(inputRef.current)}px`
    }
  }, [p.inEdit, p.value, localValue, inputRef])

  function handleTitleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setLocalValue(event.target.value)
  }

  function saveChange() {
    p.onSave(localValue)
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const isCmdEnter = event.metaKey && event.key === "Enter"
    const isCtrlEnter = event.ctrlKey && event.key === "Enter"
    const isEnter = event.key === "Enter" && !event.shiftKey
    const isEscape = event.key === "Escape"

    if (isEscape) {
      if (p.onSave) {
        setLocalValue(p.value)
        p.onSave(p.value)
      }
    } else if (isEnter || isCmdEnter || isCtrlEnter) {
      event.preventDefault() // Prevent the default action to avoid inserting a newline
      saveChange()
    }
  }

  return <>
    {
      p.inEdit ?
        <input
          tabIndex={2}
          ref={inputRef}
          onKeyDown={handleKeyDown}
          onChange={handleTitleChange}
          onBlur={saveChange}
          value={localValue}
        />
        :
        <span className={p.className}
              onMouseDown={p.onMouseDown}
              onClick={p.onClick}
              onContextMenu={(e) => {
                e.preventDefault()
                p.onContextMenu && p.onContextMenu()
              }}>{localValue}</span>
    }
  </>
}

function getTextWidthWithSpan(inputElement: HTMLInputElement): number {
  const span = document.createElement("span")
  span.style.visibility = "hidden"
  span.style.whiteSpace = "nowrap"
  span.style.font = window.getComputedStyle(inputElement).font
  span.textContent = inputElement.value + '.'
  document.body.appendChild(span)
  const width = span.offsetWidth
  document.body.removeChild(span)
  return width
}