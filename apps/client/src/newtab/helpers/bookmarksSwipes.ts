import { MutableRefObject, useContext, useEffect, useRef } from "react"
import { Action } from "../state/state"
import { DispatchContext } from "../state/actions"

const LEN = 3

function createStepTracker() {
  let steps: any[] = []

  return function trackLastSteps(step: number) {
    steps = [...steps, step].slice(-LEN)
    return steps
  }
}

const trackLastSteps = createStepTracker()

function isMonotonicallyIncreasing(steps: number[]): boolean {
  if (steps.length !== LEN) {
    return false
  }
  for (let i = 1; i < steps.length; i++) {
    if (steps[i] <= steps[i - 1]) {
      return false
    }
  }
  return true
}

export function useSwipeAnimation(bookmarksRef: MutableRefObject<HTMLElement | null>, currentSpaceId: number, numberOfSpaces: number) {
  const dispatch = useContext(DispatchContext)
  const prevSpaceIdRef = useRef<number | null>(currentSpaceId)
  const lastSwipeDirRef = useRef<string | null>(null)

  useEffect(() => {
    if (!bookmarksRef.current) {
      return
    }

    bookmarksRef.current.scrollTo({ top: 0 })

    // support animation
    if (prevSpaceIdRef.current && lastSwipeDirRef.current && prevSpaceIdRef.current !== currentSpaceId) {
      bookmarksRef.current.style.transform = lastSwipeDirRef.current === "right" ? "translateX(20%)" : "translateX(-20%)"
      bookmarksRef.current.style.overflowY = "hidden"
      bookmarksRef.current.style.opacity = "0.2"
      requestAnimationFrame(() => {
        bookmarksRef.current!.style.transform = "translateX(0px)"
        bookmarksRef.current!.style.transition = "transform 0.2s ease-in-out, opacity 0.2s ease-in-out"
        bookmarksRef.current!.style.opacity = "1"
      })
      setTimeout(() => {
        bookmarksRef.current!.style.transform = "none"
        bookmarksRef.current!.style.transition = "none"
        bookmarksRef.current!.style.overflowY = "auto"
        lastSwipeDirRef.current = null
      }, 200)
    }

    prevSpaceIdRef.current = currentSpaceId
  }, [currentSpaceId])

  useEffect(() => {
    if (numberOfSpaces < 2) {
      return
    }

    let THRESHOLD_IN_MS = 200
    let timeoutId: number | undefined = undefined
    let wheelStep = 0
    let maxOfLastDeltas: number = Number.MAX_SAFE_INTEGER

    const onWheel = (event: WheelEvent) => {
      const isTrackpad = event.deltaMode === 0 && Math.abs(event.deltaY) < 50 // Smooth scrolling
      const isMouseWheel = event.deltaMode === 1 || Math.abs(event.deltaY) >= 50 // Larger jumps

      if (isTrackpad) {
        // console.log("Trackpad detected")
      } else if (isMouseWheel) {
        // console.log("Mouse wheel detected")
      }

      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        wheelStep++

        if (!timeoutId && Math.abs(event.deltaX) - Math.abs(maxOfLastDeltas) > 3 && Math.abs(event.deltaX) > 5) { // new start
          const swipeDirection = event.deltaX > 0 ? "right" : "left"
          dispatch({
            type: Action.SwipeSpace,
            direction: swipeDirection
          })
          lastSwipeDirRef.current = swipeDirection
          bookmarksRef.current!.style.opacity = "0"

          timeoutId = window.setTimeout(() => {
            //block switching space for some timeout
            timeoutId = undefined
          }, THRESHOLD_IN_MS)
        }

        maxOfLastDeltas = Math.max(...trackLastSteps(Math.abs(event.deltaX)))
        event.preventDefault() // Prevent vertical scrolling when swiping
      }
    }

    bookmarksRef.current!.addEventListener("wheel", onWheel)

    return () => {
      if (bookmarksRef.current) {
        bookmarksRef.current.removeEventListener("wheel", onWheel)
      }
    }
  }, [numberOfSpaces])
}