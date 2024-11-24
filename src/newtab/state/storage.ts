import { IAppState } from "./state"
import { throttle } from "../helpers/utils"

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
    console.log("SAVED")
    bc.postMessage({ type: "folders-updated" })
  })
}

export const saveStateThrottled = throttle(saveState, 500)

const savingStateDefaultValues = { // if was not saved to LS yet
  "folders": [],
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

;(window as any).debugClearStorage = () => {
  chrome.storage.local.clear()
}