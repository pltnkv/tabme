import React, { useContext, useEffect, useRef } from "react"
import { IWidget } from "../helpers/types"
import { CL } from "../helpers/classNameHelper"
import { DispatchContext } from "../state/actions"
import { Action } from "../state/state"
import { WidgetsHorMenu } from "./canvas/WidgetsHorMenu"

export function Canvas(p: {
  selectedWidgetIds: number[],
  editingWidgetId: number | undefined,
  widgets: IWidget[]
}) {

  return <div className="canvas-container">
    {
      p.widgets.map((widget: IWidget) => <StickerWidget
        key={widget.id}
        data={widget}
        selected={p.selectedWidgetIds.includes(widget.id)}
        inEdit={p.editingWidgetId === widget.id}
      />)
    }
    <div className="widgets-selection-frame"></div>
    <WidgetsHorMenu widgets={p.widgets} selectedWidgetIds={p.selectedWidgetIds}/>
  </div>
}


function StickerWidget(p: {
  data: IWidget,
  selected: boolean
  inEdit: boolean,
}) {
  const dispatch = useContext(DispatchContext)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const setText = (value: string) => {
    dispatch({
      type: Action.UpdateWidget,
      widgetId: p.data.id,
      content: {
        text: value
      }
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
  }, [p.inEdit, p.data.content.text, p.data.content.fontSize])

  const bgColor = `linear-gradient(to bottom, rgba(0, 0, 0, 0.02), 16%, rgba(0, 0, 0, 0), 30%, rgba(0, 0, 0, 0)), ${p.data.content.color ?? "#FFF598"}`

  // TEMP HACK
  if(!p.data.pos.point) {
    p.data.pos.point = {
      x: 100 , y:100
    }
  }

  return <div data-id={p.data.id}
              className={CL("widget widget-sticker", {
                "selected": p.selected
              })}
              style={{
                left: `${p.data.pos.point.x}px`,
                top: `${p.data.pos.point.y}px`
              }}
  >
    <div className="widget-sticker-shadow"></div>
    <div className="widget-sticker-bg" style={{ background: bgColor }}></div>
    {!p.inEdit && <div className="widget-sticker-text"
                       style={{ fontSize: p.data.content.fontSize }}
    >{p.data.content.text}<span style={{ visibility: "hidden" }}>.</span></div>}
    {p.inEdit && <textarea className="widget-sticker-text"
                           style={{ fontSize: p.data.content.fontSize }}
                           ref={textareaRef}
                           value={p.data.content.text}
                           onChange={(e) => setText(e.target.value)}></textarea>}

  </div>
}
