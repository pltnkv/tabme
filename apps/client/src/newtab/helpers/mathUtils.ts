import { IOffset, IRect } from "./MathTypes"

export function areRectsOverlapping(rect1: IRect, rect2: IRect): boolean {
  // Check if one rectangle is to the left of the other
  if (rect1.x + rect1.width <= rect2.x || rect2.x + rect2.width <= rect1.x) {
    return false
  }

  // Check if one rectangle is above the other
  if (rect1.y + rect1.height <= rect2.y || rect2.y + rect2.height <= rect1.y) {
    return false
  }

  // If neither condition is true, the rectangles must overlap
  return true
}

export function normalizeRect(rect: IRect): IRect {
  let normalizedRect = { ...rect }

  // If width is negative, adjust the x coordinate and make width positive
  if (normalizedRect.width < 0) {
    normalizedRect.x += normalizedRect.width
    normalizedRect.width = Math.abs(normalizedRect.width)
  }

  // If height is negative, adjust the y coordinate and make height positive
  if (normalizedRect.height < 0) {
    normalizedRect.y += normalizedRect.height
    normalizedRect.height = Math.abs(normalizedRect.height)
  }

  return normalizedRect
}

export function uniteRects(rects: IOffset[]): IOffset {
  if (rects.length > 0) {
    const res = {
      left: rects[0].left,
      right: rects[0].right,
      top: rects[0].top,
      bottom: rects[0].bottom
    }
    for (let i = 1; i < rects.length; i++) {
      res.left = Math.min(res.left, rects[i].left)
      res.right = Math.max(res.right, rects[i].right)
      res.top = Math.min(res.top, rects[i].top)
      res.bottom = Math.max(res.bottom, rects[i].bottom)
    }
    return res
  } else {
    return {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0
    }
  }
}

export function inRange(index: number, min: number, max: number) {
  return index >= min && index <= max
}

export function round10(val:number):number {
  return Math.round(val / 10) * 10;
}