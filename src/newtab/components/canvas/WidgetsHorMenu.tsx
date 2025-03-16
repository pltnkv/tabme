import { IWidget } from "../../helpers/types"
import React, { useContext, useRef } from "react"
import { DispatchContext } from "../../state/actions"
import { useWidgetsContextMenu } from "./widgetsContextMenu"
import { Action } from "../../state/state"
import LinkIcon from "../../icons/link.svg"
import { updateWidgetsSelectionFrameNonPerformant } from "./widgetsSelectionFrame"
import { DropdownMenu } from "../dropdown/DropdownMenu"

const Colors = ["#FFF598", "#D1F09E", "#FFBAF5"]
const SizeLabels = ["mid", "small", "big"]
const LabelToSize: { [x: string]: number } = {
  "small": 10,
  "mid": 18,
  "big": 26
}
const SizeToLabel: { [x: string]: string } = {
  "10": "small",
  "18": "mid",
  "26": "big"
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
  const [isLinkMenuVisible, setIsLinkMenuVisible] = React.useState(false)

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
      updateWidgetsSelectionFrameNonPerformant()
    })
  }

  const onSetLink = () => {
    setIsLinkMenuVisible(true)
  }

  let currentColor: string | undefined
  let currentFontSize: number | undefined
  if (selectedWidgets.length > 0) {
    currentColor = selectedWidgets[0].content.color
    currentFontSize = selectedWidgets[0].content.fontSize
    for (let i = 1; i < selectedWidgets.length; i++) {
      const w = selectedWidgets[i]
      if (currentColor !== w.content.color) {
        currentColor = undefined
      }
      if (currentFontSize !== w.content.fontSize) {
        currentFontSize = undefined
      }
    }
  }

  const currentFontSizeLabel = SizeToLabel[currentFontSize!] ?? "mixed"

  return <div ref={widgetsMenuRef} className="widgets-hor-menu">
    <div className="widget-menu-item sticker-color" onClick={onChangeColor}>
      <div className="sticker-color__inner" style={{ background: currentColor }}></div>
    </div>
    <div className="widget-menu-item sticker-size" onClick={onChangeSize}>
      <span>{currentFontSizeLabel}</span>
    </div>
    <div className="widget-menu-item sticker-link disabled" onClick={onSetLink}>
      <LinkIcon/>
    </div>
    {isLinkMenuVisible && <DropdownMenu onClose={() => {setIsLinkMenuVisible(false)}} offset={{ }}>
      <p>Set URL</p>
      <p><input/>
        <button className="dropdown-menu__button focusable">Done</button>
      </p>

    </DropdownMenu>}
  </div>
}
