import React, { useContext, useEffect, useRef } from "react"
import { IWidgetData } from "../helpers/types"
import { CL } from "../helpers/classNameHelper"
import { DispatchContext } from "../state/actions"
import { Action } from "../state/state"

export function Canvas(p: {
  selectedWidgetIds: number[],
  editingWidgetId: number | undefined,
  widgets: IWidgetData[]
}) {

  return <div className="canvas-container">
    {
      p.widgets.map((widget: IWidgetData) => <StickerWidget
        key={widget.id}
        data={widget}
        selected={p.selectedWidgetIds.includes(widget.id)}
        inEdit={p.editingWidgetId === widget.id}
      />)
    }
  </div>
}

function StickerWidget(p: {
  data: IWidgetData,
  selected: boolean
  inEdit: boolean,
}) {
  const dispatch = useContext(DispatchContext)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const setText = (value: string) => {
    dispatch({
      type: Action.UpdateWidget,
      widgetId: p.data.id,
      text: value
    })
  }

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
  }, [p.inEdit, p.data.content.text])

  return <div data-id={p.data.id}
              className={CL("widget widget-sticker", {
                "selected": p.selected
              })}
              style={{
                left: `${p.data.pos.x}px`,
                top: `${p.data.pos.y}px`
              }}
  >
    <div className="widget-sticker-shadow"></div>
    <div className="widget-sticker-bg"></div>
    {!p.inEdit && <div className="widget-sticker-text">{p.data.content.text}<span style={{visibility:"hidden"}}>.</span></div>}
    {p.inEdit && <textarea className="widget-sticker-text"
                           ref={textareaRef}
                           value={p.data.content.text}
                           onChange={(e) => setText(e.target.value)}></textarea>}

  </div>
}
