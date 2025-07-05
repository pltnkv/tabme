import { useEffect } from "react"

export function TooltipsManager(p: {
  tooltipsEnabled: boolean;
}) {

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null
    let hideTimeout: ReturnType<typeof setTimeout> | null = null
    let currentTooltipEl: HTMLElement | null = null
    const tooltip = document.createElement("div")

    tooltip.style.position = "fixed"
    tooltip.style.padding = "4px 8px"
    tooltip.style.background = "rgba(0,0,0,0.8)"
    tooltip.style.color = "white"
    tooltip.style.borderRadius = "4px"
    tooltip.style.fontSize = "14px"
    tooltip.style.pointerEvents = "none"
    tooltip.style.zIndex = "9999"
    tooltip.style.display = "none"
    tooltip.style.backdropFilter = "blur(2px)"
    tooltip.style.maxWidth = "400px"
    tooltip.style.wordBreak = "break-word"

    document.body.appendChild(tooltip)

    const onMouseMove = (e: MouseEvent) => {
      if (!p.tooltipsEnabled) {
        return
      }
      const target = e.target as HTMLElement
      const el = target.closest("[data-tooltip]") as HTMLElement | null

      if (el && el.dataset.tooltip) {
        if (currentTooltipEl !== el) {
          currentTooltipEl = el
          if (timeout) {
            clearTimeout(timeout)
          }
          if (hideTimeout) {
            clearTimeout(hideTimeout)
          }
          timeout = setTimeout(() => {
            tooltip.style.display = "block"
            updateTooltipElement(tooltip, el)
          }, 800)
        } else {
          updateTooltipElement(tooltip, el)
        }
      } else {

        if (timeout) {
          clearTimeout(timeout)
        }
        if (hideTimeout) {
          clearTimeout(hideTimeout)
        }
        hideTimeout = setTimeout(() => {
          currentTooltipEl = null
          tooltip.style.display = "none"
        }, 100)
      }
    }

    const immediatelyHideTooltip = () => {
      if (timeout) {
        clearTimeout(timeout)
      }
      if (hideTimeout) {
        clearTimeout(hideTimeout)
      }
      currentTooltipEl = null
      tooltip.style.display = "none"
    }

    document.body.addEventListener("mousemove", onMouseMove)
    document.body.addEventListener("mousedown", immediatelyHideTooltip)
    document.body.addEventListener("scroll", immediatelyHideTooltip, true)

    return () => {
      if (timeout) {
        clearTimeout(timeout)
      }
      document.body.removeEventListener("mousemove", onMouseMove)
      document.body.removeEventListener("mousedown", immediatelyHideTooltip)
      document.body.removeEventListener("scroll", immediatelyHideTooltip, true)
      tooltip.remove()
    }
  }, [p.tooltipsEnabled])

  return null
}

function updateTooltipElement(tooltip: HTMLElement, target: HTMLElement) {
  const firstLine = target.dataset.tooltip || ""
  const secondLine = target.dataset.tooltipMore || ""
  tooltip.innerHTML = firstLine + (secondLine ? `<div class="tooltip-more">${secondLine}</div>` : "")
  const { top, left, transform } = calculateTooltipPosition(target, tooltip)
  tooltip.style.top = `${top}px`
  tooltip.style.left = `${left}px`
  tooltip.style.transform = transform
}

function calculateTooltipPosition(targetEl: HTMLElement, tooltipEl: HTMLElement) {
  const trgtRect = targetEl.getBoundingClientRect()
  const ttRect = tooltipEl.getBoundingClientRect()
  const position = targetEl.dataset.tooltipPosition || "top-center"
  let top = 0
  let left = 0
  let transform = "none"

  switch (position) {
    case "bottom-center":
      top = trgtRect.bottom + 8
      left = trgtRect.left + trgtRect.width / 2
      transform = "translateX(-50%)"
      break
    case "bottom-left":
      top = trgtRect.bottom + 2
      left = trgtRect.left + 22
      transform = "none"
      break
    case "bottom-right":
      top = trgtRect.bottom + 8
      left = trgtRect.right
      transform = "translateX(-100%)"
      break
    case "top-right":
      top = trgtRect.top - ttRect.height
      left = trgtRect.right
      transform = "translateX(-100%)"
      break
    case "top-left":
      top = trgtRect.top - ttRect.height
      left = trgtRect.left + 28
      transform = "none"
      break
    case "top-center":
    default:
      top = trgtRect.top - ttRect.height
      left = trgtRect.left + trgtRect.width / 2
      transform = "translateX(-50%)"
      break
  }

  return { top, left, transform }
}