import { IAppState } from "./state"
import { throttle } from "../helpers/utils"
import { ColorTheme } from "../helpers/types"

/**
 * SAVING STATE AND BROADCASTING CHANGES
 */

const bc = new BroadcastChannel("sync-state-channel")

export function getBC() {
  return bc
}

function saveState(appState: IAppState): void {
  const savingState: any = {}
  savingStateKeys.forEach(key => {
    savingState[key] = appState[key as SavingStateKeys]
  })

  chrome.storage.local.set(savingState, () => {
    // TODO. store in LS only when last transaction confirmed by server
    // if last transaction was not confirmed, reload app and use prev state from LS
    console.log("SAVED")
    bc.postMessage({ type: "folders-updated" })
  })
}

export const saveStateThrottled = throttle(saveState, 500)

const savingStateDefaultValues = { // if was not saved to LS yet
  "spaces": [],
  "currentSpaceId": undefined,
  "sidebarCollapsed": false,
  "openBookmarksInNewTab": false,
  "colorTheme": "light", // todo I don't use system because it's not ready to used by default
  "stat": undefined,
  "showArchived": false,
  "showNotUsed": false
}
type SavingStateKeys = keyof typeof savingStateDefaultValues
export const savingStateKeys = Object.keys(savingStateDefaultValues) as SavingStateKeys[]

export type ISavingAppState = {
  [key in SavingStateKeys]: IAppState[key]
}

export function getStateFromLS(callback: (state: ISavingAppState) => void): void {
  chrome.storage.local.get(savingStateKeys, (res) => {
    const result = {} as ISavingAppState
    savingStateKeys.forEach(key => {
      if (res.hasOwnProperty(key)) {
        // @ts-ignore
        result[key] = res[key]
      } else {
        // @ts-ignore
        result[key] = savingStateDefaultValues[key as SavingStateKeys]
      }
    })
    console.log("getStateFromLS", res, result)
    callback(result)
  })
}

////////////////////////////////////////////////////////
// LIGHT & DARK THEMAS
////////////////////////////////////////////////////////

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
}

////////////////////////////////////////////////////////
// DEBUG COMMANDS
////////////////////////////////////////////////////////


;(window as any).debugClearStorage = () => {
  chrome.storage.local.clear()
}

;(window as any).startBeta = () => {
  localStorage.setItem("betaMode", "true")
}

;(window as any).stopBeta = () => {
  localStorage.removeItem("betaMode")
}

export function isBetaMode(): boolean {
  return !!localStorage.getItem("betaMode")
}

