import { IWidget } from "../../helpers/types"
import React, { useContext, useEffect, useRef, useState } from "react"
import { DispatchContext } from "../../state/actions"
import { Action } from "../../state/state"
import { CL } from "../../helpers/classNameHelper"

export function WidgetSticker(p: {
  data: IWidget,
  selected: boolean,
  inEdit: boolean,
}) {
  const dispatch = useContext(DispatchContext)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Use local state to temporarily hold text changes
  const [localText, setLocalText] = useState(p.data.content.text)

  // Update localText when the external text changes
  useEffect(() => {
    setLocalText(p.data.content.text)
  }, [p.data.content.text])

  // Helper function to dispatch the text update only if it changed
  const saveText = () => {
    if (localText !== p.data.content.text) {
      dispatch({
        type: Action.UpdateWidget,
        widgetId: p.data.id,
        content: { text: localText }
      })
    }
  }

  // Trigger save when the textarea loses focus
  const handleBlur = () => {
    saveText()
  }

  // Listen for browser tab blur event to trigger save
  useEffect(() => {
    const handleWindowBlur = () => {
      if (p.inEdit) {
        saveText()
      }
    }
    window.addEventListener("blur", handleWindowBlur)
    return () => {
      window.removeEventListener("blur", handleWindowBlur)
    }
  }, [localText, p.inEdit])

  useEffect(() => {
    if (textareaRef.current && p.inEdit) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [p.inEdit])

  useEffect(() => {
    if (p.inEdit && textareaRef.current) {
      textareaRef.current.style.height = "0px" // Reset height to recalculate
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [p.inEdit, localText, p.data.content.fontSize])

  const bgColor = `linear-gradient(to bottom, rgba(0, 0, 0, 0.02), 16%, rgba(0, 0, 0, 0), 30%, rgba(0, 0, 0, 0)), ${p.data.content.color ?? "#FFF598"}`

  // TEMP HACK: Ensure default position exists
  // if (!p.data.pos.point) {
  //   p.data.pos.point = { x: 100, y: 100 }
  // }

  const textStyle = {
    fontSize: p.data.content.fontSize,
    textDecoration: p.data.content.strikethrough ? "line-through" : "none"
  }

  return (
    <div data-id={p.data.id}
         className={CL("widget widget-sticker", { "selected": p.selected })}
         style={{
           left: `${p.data.pos.point.x}px`,
           top: `${p.data.pos.point.y}px`
         }}>
      <div className="widget-sticker-shadow"></div>
      <div className="widget-sticker-bg" style={{ background: bgColor }}></div>
      {!p.inEdit && (
        <div className="widget-sticker-text" style={textStyle}>
          {p.data.content.text}
          <span style={{ visibility: "hidden" }}>.</span>
        </div>
      )}
      {p.inEdit && (
        <textarea className="widget-sticker-text"
                  style={textStyle}
                  ref={textareaRef}
                  value={localText}
                  onChange={(e) => setLocalText(e.target.value)}
                  onBlur={handleBlur}></textarea>
      )}
    </div>
  )
}