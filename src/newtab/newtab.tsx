import React from "react"
import { App } from "./components/App"
import { setInitAppState } from "./state/state"
import { applyTheme, getStateFromLS, ISavingAppState, isBetaMode, saveStateThrottled } from "./state/storage"
import { apiGetDashboard, loadFromNetwork } from "../api/api"
import { createRoot } from "react-dom/client"
import { getFirstSortedByPosition, insertBetween, regeneratePositions } from "./helpers/fractionalIndexes"
import { ISpace } from "./helpers/types"
import { genUniqLocalId } from "./state/actionHelpers"
import { initStats } from "./helpers/stats"
import { faviconsStorage } from "./helpers/faviconUtils"
import { getAvailableWhatsNew } from "./helpers/whats-new"

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

async function runLocally() {
  await initStats()
  // loading state from LS
  getStateFromLS((res) => {
    migrateToSpaces(res)
    preprocessLoadedState(res)
    disableHideItemFunctionality(res)
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

// TODO remove in JUNE WHEN EVERYONE has version more than v1.30
function migrateToSpaces(state: ISavingAppState) {
  if (Array.isArray(state.folders)) {
    const initSpace: ISpace = {
      id: genUniqLocalId(),
      title: "Bookmarks",
      folders: regeneratePositions(state.folders.map(f => {
        return {
          ...f,
          items: regeneratePositions(f.items)
        }
      })),
      position: insertBetween("", "")
    }
    state.spaces = [initSpace]
    state.folders = null! // to prevent the next migrations
  }
}

function preprocessLoadedState(state: ISavingAppState): void {
  ////////////////////////////////////////////////////////////
  // initialize app.stat
  ////////////////////////////////////////////////////////////
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

  ////////////////////////////////////////////////////////////
  // Making sure that selected space exists
  ////////////////////////////////////////////////////////////
  const selectedSpace = state.spaces.find(s => s.id === state.currentSpaceId)
  if (!selectedSpace) {
    const firstSortedSpace = getFirstSortedByPosition(state.spaces)
    if (firstSortedSpace) {
      state.currentSpaceId = firstSortedSpace.id
    }
  }

  ////////////////////////////////////////////////////////////
  // Process FavIcons
  ////////////////////////////////////////////////////////////

  state.spaces.forEach(s => {
    s.folders.forEach(f => {
      f.items.forEach(i => {
        faviconsStorage.registerInCache(i.favIconUrl, i.url)
      })
    })
  })

  ////////////////////////////////////////////////////////////
  // Check if user in betaMode
  ////////////////////////////////////////////////////////////
  state.betaMode = isBetaMode()

  ////////////////////////////////////////////////////////////
  // Init available "Whats new"
  ////////////////////////////////////////////////////////////
  state.currentWhatsNew = getAvailableWhatsNew(state.betaMode)

  ////////////////////////////////////////////////////////////
  // Apply Dark Light Themes
  ////////////////////////////////////////////////////////////
  applyTheme(state.colorTheme)

  ////////////////////////////////////////////////////////////
  // save updated stat in state
  ////////////////////////////////////////////////////////////
  saveStateThrottled(state)
}

function disableHideItemFunctionality(res: ISavingAppState) {
  res.hiddenFeatureIsEnabled = res.spaces.some(s => s.folders.some(f => f.archived || f.items.some(i => i.archived)))
}