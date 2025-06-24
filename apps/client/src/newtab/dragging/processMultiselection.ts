import { hideWidgetsContextMenu, updateWidgetsContextMenu } from "../components/canvas/widgetsContextMenu"
import { getCanvasScrolledOffset, hideWidgetsSelectionFrame, renderWidgetsSelectionFrame, WidgetInfo } from "../components/canvas/widgetsSelectionFrame"
import { areRectsOverlapping, normalizeRect, uniteRects } from "../helpers/mathUtils"
import { selectItems, unselectAllItems } from "../helpers/selectionUtils"
import { subscribeMouseEvents } from "./dragAndDropUtils"
import { PConfigWidgets, getIdFromElement } from "./dragAndDrop"
import { sticker_size_half } from "../components/canvas/const"

const DOUBLE_CLICK_THRESHOLD_MS = 200
let prevClickTime: number | undefined

export function processMultiselection(mouseDownEvent: React.MouseEvent,
                                      config: PConfigWidgets) {
  hideWidgetsContextMenu()

  const canvas = config.canvasEl
  const rect = canvas.getBoundingClientRect()
  const startPos = {
    x: mouseDownEvent.clientX - rect.left,
    y: mouseDownEvent.clientY - rect.top
  }
  const dpr = window.devicePixelRatio || 1
  canvas.width = canvas.clientWidth * dpr
  canvas.height = canvas.clientHeight * dpr
  const context = canvas.getContext("2d")!
  context.scale(dpr, dpr)
  if (!context) {
    return
  }

  const itemElements = Array.from(document.querySelectorAll(".bookmarks .folder-item__inner")) as HTMLElement[]
  const itemsByRect = itemElements.map(el => ({
    rect: el.getBoundingClientRect(),
    element: el
  }))

  const widgetsElements = Array.from(document.querySelectorAll(".widget")) as HTMLElement[]
  const allWidgetsInfos: WidgetInfo[] = widgetsElements.map(el => ({
    id: getIdFromElement(el),
    rect: el.getBoundingClientRect(),
    element: el
  }))

  const onMouseMove = (e: MouseEvent, mouseMoved: boolean) => {
    if (!mouseMoved) {
      return
    }

    canvas.style.pointerEvents = "auto"

    const currentX = e.clientX - rect.left
    const currentY = e.clientY - rect.top

    // Clear the canvas before drawing the new rectangle
    context.clearRect(0, 0, canvas.width * dpr, canvas.height * dpr)

    // Draw the rectangle
    context.strokeStyle = "rgba(56, 89, 255, 1)"
    context.fillStyle = "rgba(56, 89, 255, 0.15)"
    context.lineWidth = 1
    context.fillRect(startPos.x, startPos.y, currentX - startPos.x, currentY - startPos.y)
    context.strokeRect(startPos.x, startPos.y, currentX - startPos.x, currentY - startPos.y)

    const selectionRect = normalizeRect({
      x: mouseDownEvent.clientX,
      y: mouseDownEvent.clientY,
      width: e.clientX - mouseDownEvent.clientX,
      height: e.clientY - mouseDownEvent.clientY
    })

    const selectedWidgetsInfos = allWidgetsInfos.filter(w => areRectsOverlapping(selectionRect, w.rect))

    if (selectedWidgetsInfos.length > 0) {
      config.onWidgetsSelected(selectedWidgetsInfos.map(w => w.id))
      unselectAllItems()

      if (selectedWidgetsInfos.length > 1) {
        // Draw selection frame for several selected widgets. You need to join rects
        const selectionRect = uniteRects(selectedWidgetsInfos.map(w => w.rect))
        renderWidgetsSelectionFrame(selectionRect)
      } else {
        hideWidgetsSelectionFrame()
      }
    } else {
      const itemsToSelect: HTMLElement[] = []
      itemsByRect.forEach(i => {
        if (areRectsOverlapping(selectionRect, i.rect)) {
          itemsToSelect.push(i.element)
        }
      })
      config.onWidgetsSelected([])
      selectItems(itemsToSelect)
    }
  }

  const onMouseUp = (e: MouseEvent, mouseMoved: boolean) => {
    if (!mouseMoved) {
      const target = e.target as HTMLElement
      const folderItemFirstSelected = document.querySelector(".folder-item--first-selected")
      if (folderItemFirstSelected && folderItemFirstSelected.contains(target)) {
        // todo hacking hack. make possible to click content menu button on first selected element
        // ideally we need to move selected-items management to store.
      } else {
        unselectAllItems()
        config.onWidgetsSelected([])
        hideWidgetsSelectionFrame()

        if (Date.now() - (prevClickTime ?? 0) < DOUBLE_CLICK_THRESHOLD_MS) {
          const canvasOffset = getCanvasScrolledOffset()

          config.onCanvasDoubleClick({
            x: e.clientX + canvasOffset.x - sticker_size_half,
            y: e.clientY + canvasOffset.y - sticker_size_half
          })
        }
        prevClickTime = Date.now()
      }
    }
    updateWidgetsContextMenu()
    context.clearRect(0, 0, canvas.width * dpr, canvas.height * dpr)
    canvas.style.pointerEvents = "none"
  }

  return subscribeMouseEvents(mouseDownEvent, onMouseMove, onMouseUp)
}