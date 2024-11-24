import React from "react"
import { App } from "./components/App"
import { applyTheme } from "./helpers/utils"
import { setInitAppState } from "./state/state"
import { getStateFromLS, ISavingAppState, saveStateThrottled } from "./state/storage"
import { apiGetDashboard, loadFromNetwork } from "../api/api"
import { preprocessSortedFolders } from "./helpers/dataConverters"
import { createRoot } from "react-dom/client"

declare global {
  const __OVERRIDE_NEWTAB: boolean
}

console.log("__OVERRIDE_NEWTAB", __OVERRIDE_NEWTAB)

if (loadFromNetwork()) {
  getStateFromLS((res) => {
    apiGetDashboard().then(dashboard => {
      console.log(dashboard.spaces)
      //todo impl optimistic loading from LS first (and then later load from network)
      res.folders = preprocessSortedFolders(dashboard.spaces[0].folders)
      setInitAppState(res)
      mountApp()
    })
  })
} else {
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
    <React.StrictMode>
      <App/>
    </React.StrictMode>
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

  applyTheme(state.colorTheme)

  // save updated stat in state
  saveStateThrottled(state)
}