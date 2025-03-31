import { IWidget } from "../../helpers/types"
import React, { useContext, useRef } from "react"
import { DispatchContext } from "../../state/actions"
import { useWidgetsContextMenu } from "./widgetsContextMenu"
import { Action } from "../../state/state"
import IconStrikethrough from "../../icons/strikethrough_s.svg"
import { updateWidgetsSelectionFrame_RAF_NotPerformant } from "./widgetsSelectionFrame"
import { CL } from "../../helpers/classNameHelper"

const Colors = ["#FFF598", "#D1F09E", "#FFBAF5"]
const SizeLabels = ["M", "S", "L"]
const LabelToSize: { [x: string]: number } = {
  "S": 12,
  "M": 18,
  "L": 26
}
const SizeToLabel: { [x: string]: string } = {
  "12": "S",
  "18": "M",
  "26": "L"
}

function getNextVal(color: string | undefined, arr: string[]): string | undefined {
  const currentIndex = arr.indexOf(color!)
  if (currentIndex === -1) {
    return undefined
  }
  if (currentIndex === arr.length - 1) {
    return arr[0] // Return first color if not found or at the last color
  }
  return arr[currentIndex + 1] // Return next color in the array
}

export function WidgetsHorMenu(p: {
  selectedWidgetIds: number[],
  widgets: IWidget[]
}) {

  const dispatch = useContext(DispatchContext)
  const widgetsMenuRef = useRef<HTMLDivElement>(null)
  const selectedWidgets = p.widgets.filter(w => p.selectedWidgetIds.includes(w.id))

  useWidgetsContextMenu(widgetsMenuRef)

  const onChangeColor = () => {
    selectedWidgets.forEach((widget: IWidget) => {
      dispatch({
        type: Action.UpdateWidget,
        widgetId: widget.id,
        content: {
          color: getNextVal(currentColor, Colors) ?? Colors[0]
        }
      })
    })
  }

  const onChangeSize = () => {
    selectedWidgets.forEach((widget: IWidget) => {
      const nextLabel = getNextVal(currentFontSizeLabel, SizeLabels) ?? SizeLabels[0]

      dispatch({
        type: Action.UpdateWidget,
        widgetId: widget.id,
        content: {
          fontSize: LabelToSize[nextLabel] ?? LabelToSize["mid"]
        }
      })
      updateWidgetsSelectionFrame_RAF_NotPerformant()
    })
  }

  const onToggleStrike = () => {
    selectedWidgets.forEach((widget: IWidget) => {
      dispatch({
        type: Action.UpdateWidget,
        widgetId: widget.id,
        content: {
          strikethrough: !currentStrikethrough
        }
      })
    })
  }

  let currentColor: string | undefined
  let currentFontSize: number | undefined
  let currentStrikethrough = false
  if (selectedWidgets.length > 0) {
    currentColor = selectedWidgets[0].content.color
    currentFontSize = selectedWidgets[0].content.fontSize
    currentStrikethrough = Boolean(selectedWidgets[0].content.strikethrough)
    for (let i = 1; i < selectedWidgets.length; i++) {
      const w = selectedWidgets[i]
      if (currentColor !== w.content.color) {
        currentColor = undefined
      }
      if (currentFontSize !== w.content.fontSize) {
        currentFontSize = undefined
      }
      if(w.content.strikethrough) {
        currentStrikethrough = true
      }
    }
  }

  const currentFontSizeLabel = SizeToLabel[currentFontSize!] ?? "mixed"

  return <div ref={widgetsMenuRef} className="widgets-hor-menu">
    <button className="widget-menu-item sticker-color" onClick={onChangeColor} title='Change color'>
      <div className="sticker-color__inner" style={{ background: currentColor }}></div>
    </button>
    <button className="widget-menu-item sticker-size" onClick={onChangeSize}  title='Change size'>
      <span>{currentFontSizeLabel}</span>
    </button>
    <button className={CL("widget-menu-item sticker-strike", {
      active: currentStrikethrough
    })} onClick={onToggleStrike} title='Toggle strikethrough'>
      <IconStrikethrough/>
    </button>
  </div>
}
