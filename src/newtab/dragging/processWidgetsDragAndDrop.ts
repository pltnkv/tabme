import { findParentWithClass } from "../helpers/utils"
import { hideWidgetsContextMenu, updateWidgetsContextMenu } from "../components/canvas/widgetsContextMenu"
import { updateWidgetsSelectionFrame_RAF_NotPerformant } from "../components/canvas/widgetsSelectionFrame"
import { setScrollByDummyClientY, subscribeMouseEvents } from "./dragAndDropUtils"
import { getIdFromElement, getIdsFromElements, getPosFromElement, PConfigWidgets } from "./dragAndDrop"
import { round10 } from "../helpers/mathUtils"

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
  const bookmarksElement = document.querySelector(".bookmarks")!
  const initScrollTop = bookmarksElement.scrollTop

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

    let deltaX = round10(mouseDownEvent.clientX - e.clientX)
    let deltaY = round10(mouseDownEvent.clientY - e.clientY + initScrollTop - bookmarksElement.scrollTop)
    initWidgetPositions.forEach(i => {
      if (selectedWidgetIds.includes(i.id) || targetWidgetId === i.id) {
        const newLeft = Math.max(0, round10(i.pos.x - deltaX))
        const newTop = Math.max(0, round10(i.pos.y - deltaY))
        i.element.style.left = `${newLeft}px`
        i.element.style.top = `${newTop}px`
        movedWidgetIds.add(i.id)
      }
    })
    updateWidgetsSelectionFrame_RAF_NotPerformant()
    setScrollByDummyClientY(e.clientY)
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
      if (e.shiftKey) {
        if (selectedWidgetIds.includes(targetWidgetId)) {
          // Deselect if already selected
          selectedWidgetIds = selectedWidgetIds.filter(id => id !== targetWidgetId)
        } else {
          // Add to selection
          selectedWidgetIds.push(targetWidgetId)
        }
        widgetsConfig.onWidgetsSelected(selectedWidgetIds)
        widgetsConfig.onSetEditingWidget(undefined)
      } else {
        widgetsConfig.onWidgetsSelected([targetWidgetId])
        if (selectedWidgetIds.includes(targetWidgetId)) {
          widgetsConfig.onSetEditingWidget(targetWidgetId)
        } else {
          widgetsConfig.onSetEditingWidget(undefined)
        }
      }
      updateWidgetsSelectionFrame_RAF_NotPerformant()
    }
    updateWidgetsContextMenu()
  }

  return subscribeMouseEvents(mouseDownEvent, onMouseMove, onMouseUp)
}
