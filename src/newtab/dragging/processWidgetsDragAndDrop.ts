import { findParentWithClass } from "../helpers/utils"
import { hideWidgetsContextMenu, updateWidgetsContextMenu } from "../components/canvas/widgetsContextMenu"
import { hideWidgetsSelectionFrame, updateWidgetsSelectionFrameNonPerformant } from "../components/canvas/widgetsSelectionFrame"
import { subscribeMouseEvents } from "./dragAndDropUtils"
import { getIdFromElement, getIdsFromElements, getPosFromElement, PConfigWidgets } from "./dragAndDrop"

export function processWidgetsDragAndDrop(mouseDownEvent: React.MouseEvent, widgetsConfig: PConfigWidgets) {
  let selectedWidgets = Array.from(document.querySelectorAll<HTMLElement>(".widget.selected"))
  let selectedWidgetIds = getIdsFromElements(selectedWidgets)
  let movedWidgetIds = new Set<number>()
  const initWidgetPositions = Array.from(document.querySelectorAll<HTMLElement>(".widget"))
    .map(el => ({
      element: el,
      id: getIdFromElement(el),
      pos: getPosFromElement(el)
    }))
  const targetWidget = findParentWithClass(mouseDownEvent.target, "widget")!
  if (!targetWidget) {
    return
  }
  const targetWidgetId = getIdFromElement(targetWidget)

  const onMouseMove = (e: MouseEvent, mouseMoved: boolean, mouseMovedFirstTime: boolean) => {
    if (!mouseMoved) {
      return
    }

    if (mouseMovedFirstTime) {
      if (!selectedWidgetIds.includes(targetWidgetId)) {
        widgetsConfig.onWidgetsSelected([])
        selectedWidgets = []
        selectedWidgetIds = []
      }
      hideWidgetsContextMenu()
    }

    let deltaX = mouseDownEvent.clientX - e.clientX
    let deltaY = mouseDownEvent.clientY - e.clientY
    initWidgetPositions.forEach(i => {
      if (selectedWidgetIds.includes(i.id) || targetWidgetId === i.id) {
        i.element.style.left = `${i.pos.x - deltaX}px`
        i.element.style.top = `${i.pos.y - deltaY}px`
        movedWidgetIds.add(i.id)
      }
    })
    updateWidgetsSelectionFrameNonPerformant()
  }

  const onMouseUp = (e: MouseEvent, mouseMoved: boolean) => {
    if (mouseMoved) {
      const res = Array.from(movedWidgetIds).map(id => ({
        id: id,
        pos: getPosFromElement(document.querySelector(`.widget[data-id="${id}"]`)!)
      }))
      widgetsConfig.onWidgetsMoved(res)
      widgetsConfig.onSetEditingWidget(undefined)
    } else {
      if (selectedWidgetIds.includes(targetWidgetId)) {
        widgetsConfig.onWidgetsSelected([targetWidgetId])
        widgetsConfig.onSetEditingWidget(targetWidgetId)
      } else {
        widgetsConfig.onWidgetsSelected([targetWidgetId])
        widgetsConfig.onSetEditingWidget(undefined)
      }
      hideWidgetsSelectionFrame()
    }
    updateWidgetsContextMenu()
  }

  return subscribeMouseEvents(mouseDownEvent, onMouseMove, onMouseUp)
}

