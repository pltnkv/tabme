import React from "react"
import { App } from "./components/App"
import { setInitAppState } from "./state/state"
import { getStateFromLS } from "./state/storage"
import { createRoot } from "react-dom/client"
import { initStats } from "./helpers/stats"
import { preprocessLoadedState } from "./state/preprocessLoadedState"
import { createTheme, MantineColorsTuple, MantineProvider } from "@mantine/core"
import "@mantine/core/styles.css"
import { isDarkMode } from "./state/colorTheme"
import { migrateSectionsToGroups_state, migrateToSpaces_state } from "./helpers/migrations"

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
    migrateToSpaces_state(res)
    migrateSectionsToGroups_state(res)
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

