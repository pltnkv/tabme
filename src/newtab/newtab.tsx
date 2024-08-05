import React from "react"
import ReactDOM from "react-dom"
import { initKeyboardManager } from "./helpers/keyboardManager"
import { getStateFromLS, ISavingAppState, saveStateThrottled, setInitAppState } from "./state"
import { App } from "./components/App"
import { applyTheme } from "./helpers/utils"

/**
 * TODOs
 * - implement search like in Slack by ctrl+K
 * - автоматом создавать папку, когда дропаешь таб над кнопкой "create new folder" (создавать на mouseUp)
 */

// loading state from LS
getStateFromLS((res) => {
  preprocessLoadedState(res)
  setInitAppState(res)
  mountApp()
})

function mountApp() {
  initKeyboardManager()
  ReactDOM.render(
    <React.StrictMode>
      <App/>
    </React.StrictMode>,
    document.getElementById("root")
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