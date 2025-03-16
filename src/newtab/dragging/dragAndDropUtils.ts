const DAD_THRESHOLD = 4

export function subscribeMouseEvents(
  mouseDownEvent: React.MouseEvent,
  onMouseMove: (e: MouseEvent, mouseMoved: boolean, mouseMovedFirstTime: boolean) => void,
  onMouseUp: (e: MouseEvent, mouseMoved: boolean) => void): () => void {
  let mouseMoved = false
  let mouseMovedFirstTimeReported = false

  function onMouseMoveWrapper(e: MouseEvent) {
    if (!mouseMoved) {
      mouseMoved = Math.abs(mouseDownEvent.clientX - e.clientX) > DAD_THRESHOLD || Math.abs(mouseDownEvent.clientY - e.clientY) > DAD_THRESHOLD
    }
    const mouseMovedFirstTime = mouseMoved && !mouseMovedFirstTimeReported
    if(mouseMovedFirstTime) {
      mouseMovedFirstTimeReported = true
    }
    onMouseMove(e, mouseMoved, mouseMovedFirstTime)
  }

  function onMouseUpWrapper(e: MouseEvent) {
    unsubscribeEvents()
    onMouseUp(e, mouseMoved)
  }

  function unsubscribeEvents() {
    document.removeEventListener("mousemove", onMouseMoveWrapper)
    document.removeEventListener("mouseup", onMouseUpWrapper)
  }

  document.addEventListener("mousemove", onMouseMoveWrapper)
  document.addEventListener("mouseup", onMouseUpWrapper)

  return unsubscribeEvents
}


////////////////////////////////////////////////////////
// VIEWPORT SCROLLING
////////////////////////////////////////////////////////

let viewportWasScrolled = false //performance optimization
let scrollByDummyClientY: number | undefined = undefined

const MAX_SCROLL_SPEED = 22
const SCROLL_THRESHOLD = 60

function getBookmarksElement(): HTMLElement {
  return document.querySelector(".bookmarks") as HTMLElement
}

function tryToScrollViewport() {
  viewportWasScrolled = false
  if (typeof scrollByDummyClientY === "number") {
    // Check if the element is too close to the bottom edge of the viewport
    const bottomThreshold = window.innerHeight - SCROLL_THRESHOLD
    if (scrollByDummyClientY > bottomThreshold) { // scroll down
      const speed = Math.min((scrollByDummyClientY - bottomThreshold) / SCROLL_THRESHOLD * MAX_SCROLL_SPEED, MAX_SCROLL_SPEED)
      getBookmarksElement().scrollBy(0, speed)
      viewportWasScrolled = true
    } else if (scrollByDummyClientY < SCROLL_THRESHOLD) { // scroll up
      const speed = Math.min((SCROLL_THRESHOLD - scrollByDummyClientY) / SCROLL_THRESHOLD * MAX_SCROLL_SPEED, MAX_SCROLL_SPEED)
      getBookmarksElement().scrollBy(0, -speed)
      viewportWasScrolled = true
    }
  }

  requestAnimationFrame(tryToScrollViewport)
}

export function isViewportWasScrolled(): boolean {
  return viewportWasScrolled
}

export function setViewportWasScrolled(val: boolean): void {
  viewportWasScrolled = false
}

export function getScrollByDummyClientY(): number | undefined {
  return scrollByDummyClientY
}

export function setScrollByDummyClientY(val: number | undefined) {
  scrollByDummyClientY = val
}

requestAnimationFrame(tryToScrollViewport)