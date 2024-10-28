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

export const saveStateThrottled = throttle(saveState, 1000)

const savingStateDefaultValues = {
  "folders": [],
  "sidebarCollapsed": false,
  "colorTheme": "light", // todo I don't use system because it's not ready to used by default
  "stat": undefined
}
type SavingStateKeys = keyof typeof savingStateDefaultValues
const savingStateKeys = Object.keys(savingStateDefaultValues)

export type ISavingAppState = {
  [key in SavingStateKeys]: IAppState[key]
}

export function getStateFromLS(callback: (state: ISavingAppState) => void): void {
  chrome.storage.local.get(savingStateKeys, (res) => {
    for (const resKey in res) {
      if (typeof res[resKey] === "undefined" && savingStateKeys.includes(resKey)) {
        res[resKey] = savingStateDefaultValues[resKey as SavingStateKeys]
      }
    }
    callback(res as ISavingAppState)
  })
}