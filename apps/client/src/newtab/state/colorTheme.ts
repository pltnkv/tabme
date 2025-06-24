
////////////////////////////////////////////////////////
// LIGHT & DARK THEMAS
////////////////////////////////////////////////////////

import { ColorTheme } from "../helpers/types"
import { setCommonStatProps } from "../helpers/stats"

const darkThemeMq = window.matchMedia("(prefers-color-scheme: dark)")
let canUseSystemTheme = false

darkThemeMq.addEventListener("change", () => {
  if (canUseSystemTheme) {
    setThemeStyle(darkThemeMq.matches)
  }
})

export function applyTheme(theme: ColorTheme) {
  canUseSystemTheme = false
  switch (theme) {
    case "light":
      setThemeStyle(false)
      break
    case "dark":
      setThemeStyle(true)
      break
    default:
      setThemeStyle(false)
      // who need system color?
      // canUseSystemTheme = true
      // setThemeStyle(darkThemeMq.matches)
      break
  }
}

function setThemeStyle(useDarkMode: boolean) {
  if (useDarkMode) {
    document.documentElement.classList.add("dark-theme")
  } else {
    document.documentElement.classList.remove("dark-theme")
  }
  setCommonStatProps({
    zColorTheme: useDarkMode ? "dark" : "light"
  })
}