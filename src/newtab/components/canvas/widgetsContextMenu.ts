import { RefObject, useEffect } from "react"
import { OptionsConfig } from "../SettingsOptions"
import { canvasAPI } from "./canvasAPI"

let menuElement: HTMLDivElement | null = null

export function useWidgetsContextMenu(menuRef: RefObject<HTMLDivElement>) {
  menuElement = menuRef.current
}

export function hideWidgetsContextMenu() {
  if (!menuElement) {
    return
  }
  menuElement.style.display = "none"
}

export function updateWidgetsContextMenu() {
  requestAnimationFrame(() => {
    if (!menuElement) {
      return
    }

    const bookmarks = document.querySelector<HTMLElement>(".bookmarks")!
    const scrollTop = bookmarks.scrollTop
    const selectedWidgetElements = Array.from(document.querySelectorAll<HTMLElement>(".widget.selected"))
    if (selectedWidgetElements.length >= 1) {
      const widgetsBounds = selectedWidgetElements.map(el => ({
        rect: el.getBoundingClientRect(),
        top: parseInt(el.style.top),
        left: parseInt(el.style.left)
      }))

      let minY = Number.MAX_SAFE_INTEGER
      let minX = Number.MAX_SAFE_INTEGER
      let maxX = 0
      widgetsBounds.forEach(bound => {
        minY = Math.min(minY, bound.top)
        minX = Math.min(minX, bound.left)
        maxX = Math.max(maxX, bound.left + bound.rect.width)
      })

      let menuY = minY - 60
      const menuX = minX + (maxX - minX) / 2 // Center horizontally
      if(menuY < scrollTop + 10) {
        menuY = scrollTop + 10
      }

      menuElement.style.top = `${menuY}px`
      menuElement.style.left = `${menuX}px`

      menuElement.style.display = "flex"
    } else {
      menuElement.style.display = "none"
    }
  })
}
