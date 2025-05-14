import { IAppState } from "./state"
import { throttle } from "../helpers/utils"
import { IFolder } from "../helpers/types"
import { WhatsNew } from "../helpers/whats-new"

/**
 * SAVING STATE AND BROADCASTING CHANGES
 */

const bc = new BroadcastChannel("sync-state-channel")

export function getBC() {
  return bc
}

export function saveState(appState: Partial<IAppState>): void {
  const savingState: any = {}
  savingStateKeys.forEach(key => {
    savingState[key] = appState[key as StoredStateKeys]
  })

  chrome.storage.local.set(savingState, () => {
    // TODO. store in LS only when last transaction confirmed by server
    // if last transaction was not confirmed, reload app and use prev state from LS
    console.log("SAVED", savingState)
    bc.postMessage({ type: "folders-updated" })
  })
}

export const saveStateThrottled = throttle(saveState, 300)

const savingStateDefaultValues = { // if was not saved to LS yet
  "spaces": [],
  "currentSpaceId": undefined,
  "sidebarCollapsed": false,
  "openBookmarksInNewTab": !__OVERRIDE_NEWTAB,
  "colorTheme": "light", // todo I don't use system because it's not ready to used by default
  "stat": undefined,
  "showRecent": false,
  "reverseOpenTabs": true,
  "version": 1,
  "folders": undefined // "folders" is legacy. Dont delete it until all users are migrated
}
type StoredStateKeys = keyof typeof savingStateDefaultValues
export const savingStateKeys = Object.keys(savingStateDefaultValues) as StoredStateKeys[]

export type IStoredAppState = {
  [key in StoredStateKeys]: IAppState[key]
} & { hiddenFeatureIsEnabled: boolean, betaMode: boolean; folders: IFolder[], currentWhatsNew: WhatsNew | undefined, hasHiddenObjects: boolean }

export function getStateFromLS(callback: (state: IStoredAppState) => void): void {
  chrome.storage.local.get(savingStateKeys, (res) => {
    const result = {} as IStoredAppState
    savingStateKeys.forEach(key => {
      if (res.hasOwnProperty(key)) {
        // @ts-ignore
        result[key] = res[key]
      } else {
        // @ts-ignore
        result[key] = savingStateDefaultValues[key as StoredStateKeys]
      }
    })
    console.log("getStateFromLS", res, result)
    callback(result)
  })
}

////////////////////////////////////////////////////////
// DEBUG COMMANDS
////////////////////////////////////////////////////////
const cmd: any = {}
;(window as any).cmd = cmd

cmd.clearChromeStorage = () => {
  chrome.storage.local.clear()
}
cmd.clearLocalStorage = () => {
  localStorage.clear()
}

cmd.clearChromeAndLocalStorages = () => {
  chrome.storage.local.clear()
  localStorage.clear()
}

cmd.startBeta = () => {
  localStorage.setItem("betaMode", "true")
  location.reload()
}

cmd.stopBeta = () => {
  localStorage.removeItem("betaMode")
  location.reload()
}

cmd.startAlpha = () => {
  localStorage.setItem("betaStickers", "true")
  location.reload()
}

cmd.stopAlpha = () => {
  localStorage.removeItem("betaStickers")
  location.reload()
}

export function isBetaMode(): boolean {
  return !!localStorage.getItem("betaMode")
}

