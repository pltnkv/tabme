import React from "react"
import { App } from "./components/App"
import { setInitAppState } from "./state/state"
import { applyTheme, getStateFromLS, ISavingAppState, saveStateThrottled } from "./state/storage"
import { apiGetDashboard, loadFromNetwork } from "../api/api"
import { preprocessSortedFolders } from "./helpers/dataConverters"
import { createRoot } from "react-dom/client"
import { getFirstSortedByPosition } from "./helpers/fractionalIndexes"

declare global {
  const __OVERRIDE_NEWTAB: boolean
}

console.log("__OVERRIDE_NEWTAB", __OVERRIDE_NEWTAB)

if (loadFromNetwork()) {
  // todo: Always start from LS. rendering should happen without loaded cloud data
  // todo: and load last data async (optional). Maybe in background thread
  getStateFromLS((res) => {
    apiGetDashboard().then(dashboard => {
      console.log(dashboard.spaces)
      setInitAppState(res)
      mountApp()
    }).catch(error => {
      console.error(error)
      // alert("Failed to load from the cloud. Fallback to local version")
      runLocally()
    })
  })
} else {
  runLocally()
}

function runLocally() {
  // loading state from LS
  getStateFromLS((res) => {
    preprocessLoadedState(res)
    setInitAppState(res)
    mountApp()
  })
}

function mountApp() {
  const root = createRoot(document.getElementById("root")!)
  root.render(
    // <React.StrictMode>
      <App/>
    // </React.StrictMode>
  )
}

function preprocessLoadedState(state: ISavingAppState): void {
  // initialize app.stat
  if (state.stat) { // not first run, need to update stat
    state.stat.sessionNumber++
    state.stat.lastVersion = chrome.runtime.getManifest().version
  } else { // the most first run of the extension
    state.stat = {
      sessionNumber: 1,
      firstSessionDate: Date.now(),
      lastVersion: chrome.runtime.getManifest().version
    }
  }

  // todo check if no spaces exists

  // Check if selected space exists
  const selectedSpace = state.spaces.find(s => s.id === state.currentSpaceId)
  if (!selectedSpace) {
    const firstSortedSpace = getFirstSortedByPosition(state.spaces)
    if (firstSortedSpace) {
      state.currentSpaceId = firstSortedSpace.id
    }
  }

  applyTheme(state.colorTheme)

  // save updated stat in state
  saveStateThrottled(state)
}