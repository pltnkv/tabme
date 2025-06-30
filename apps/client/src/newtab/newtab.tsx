import React from "react"
import { App } from "./components/App"
import { Action, setInitAppState } from "./state/state"
import { getStateFromLS, IStoredAppState } from "./state/storage"
import { createRoot } from "react-dom/client"
import { insertBetween, regeneratePositions } from "./helpers/fractionalIndexes"
import { ISpace } from "./helpers/types"
import { genUniqLocalId } from "./state/actionHelpers"
import { initStats } from "./helpers/stats"
import { preprocessLoadedState } from "./state/preprocessLoadedState"
import { createTheme, MantineColorsTuple, MantineProvider } from "@mantine/core"
import "@mantine/core/styles.css"
import { isDarkMode } from "./state/colorTheme"
import { getAuthToken, sdk, setAuthTokenToContext } from "../api/client"
import { convertRemoteStateToLocal } from "./state/convertRemoteStateToLocal"

// other css files are required only if
// you are using components from the corresponding package
// import '@mantine/dates/styles.css';
// import '@mantine/dropzone/styles.css';
// import '@mantine/code-highlight/styles.css';
// ...

const myColor: MantineColorsTuple = [
  "#e5f3ff",
  "#cde2ff",
  "#9ac2ff",
  "#64a0ff",
  "#3884fe",
  "#1d72fe",
  "#0063ff",
  "#0058e4",
  "#004ecd",
  "#0043b5"
]

const theme = createTheme({
  colors: {
    myColor
  },
  primaryColor: "myColor",
  fontFamily: `'OpenSans', sans-serif`
})

//    font-family: var(--mantine-font-family);
//     font-size: var(--mantine-font-size-md);
//     line-height: var(--mantine-line-height);

runLocally()

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
    <MantineProvider theme={theme} forceColorScheme={isDarkMode() ? "dark" : "light"}>
      <App/>
    </MantineProvider>
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

