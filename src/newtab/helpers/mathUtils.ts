import { IRect } from "./MathTypes"

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