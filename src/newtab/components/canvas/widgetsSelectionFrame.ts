import { IOffset, IPoint } from "../../helpers/MathTypes"
import { getIdFromElement } from "../../dragging/dragAndDrop"
import { uniteRects } from "../../helpers/mathUtils"

export type WidgetInfo = {
  id: number,
  rect: DOMRect,
  element: HTMLElement,
}

export function updateWidgetsSelectionFrameNonPerformant() {
  requestAnimationFrame(() => {
    const widgetsElements = Array.from(document.querySelectorAll(".widget.selected")) as HTMLElement[]
    const selectedWidgetsInfos: WidgetInfo[] = widgetsElements.map(el => ({
      id: getIdFromElement(el),
      rect: el.getBoundingClientRect(),
      element: el
    }))
    if (selectedWidgetsInfos.length > 1) {
      // Draw selection frame for several selected widgets. You need to join rects
      const selectionRect = uniteRects(selectedWidgetsInfos.map(w => w.rect))
      renderWidgetsSelectionFrame(selectionRect)
    } else {
      hideWidgetsSelectionFrame()
    }
  })
}

export function renderWidgetsSelectionFrame(rectInScreen: IOffset) {
  const canvasOffset = getCanvasScrolledOffset()
  const selectionEl = document.querySelector<HTMLElement>(".widgets-selection-frame")!
  selectionEl.style.visibility = "visible"
  selectionEl.style.top = `${rectInScreen.top + canvasOffset.y + 2}px`
  selectionEl.style.left = `${rectInScreen.left + canvasOffset.x + 2}px`
  selectionEl.style.width = `${rectInScreen.right - rectInScreen.left - 4}px`
  selectionEl.style.height = `${rectInScreen.bottom - rectInScreen.top - 4}px`
}

export function hideWidgetsSelectionFrame() {
  const selectionEl = document.querySelector<HTMLElement>(".widgets-selection-frame")!
  selectionEl.style.visibility = "hidden"
}

export function getCanvasScrolledOffset(): IPoint {
  const bookmarks = document.querySelector<HTMLElement>(".bookmarks")!
  return {
    x: -bookmarks.offsetLeft + bookmarks.scrollLeft,
    y: -bookmarks.offsetTop + bookmarks.scrollTop
  }
}