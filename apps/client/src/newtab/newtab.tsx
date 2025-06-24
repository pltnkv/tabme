import React from "react"
import { App } from "./components/App"
import { setInitAppState } from "./state/state"
import { getStateFromLS, IStoredAppState } from "./state/storage"
import { apiGetDashboard, loadFromNetwork } from "../api/api"
import { createRoot } from "react-dom/client"
import { insertBetween, regeneratePositions } from "./helpers/fractionalIndexes"
import { ISpace } from "./helpers/types"
import { genUniqLocalId } from "./state/actionHelpers"
import { initStats } from "./helpers/stats"
import { preprocessLoadedState } from "./state/preprocessLoadedState"

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
function migrateToSpaces(state: IStoredAppState) {
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

