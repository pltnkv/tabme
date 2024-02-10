import React, { createContext, useEffect, useReducer } from "react"
import ReactDOM from "react-dom"
import { Bookmarks } from "./components/Bookmarks"
import { Sidebar } from "./components/Sidebar"
import { Notification } from "./components/Notification"
import { KeyboardSearch } from "./components/KeyboardSearch"
import { filterIrrelevantHistory } from "./helpers/utils"
import { initKeyboardManager } from "./helpers/keyboardManager"
import { showMessage } from "./helpers/actions"
import { Welcome } from "./components/Welcome"
import { Action, FoldersAction, getBC, getInitAppState, getStateFromLS, IAppState, stateReducer, DispatchContext} from "./state"
import Tab = chrome.tabs.Tab

/**
 * TODOs
 * - implement search like in Slack by ctrl+K
 * - автоматом создавать папку, когда дропаешь таб над кнопкой "create new folder" (создавать на mouseUp)
 */

declare global {
  interface Window {
    devMode: () => void
  }
}

let globalAppState: IAppState

function App() {
  const [appState, dispatch] = useReducer(stateReducer, getInitAppState())

  function updateTabsAndHistory() {
    console.log("updateTabsAndHistory")

    chrome.tabs.query({}, (tabs) => {
      const offset = 1000 * 60 * 60 * 24 * 60 //1000ms * 60sec *  60min * 24h * 60d
      const startTime = Date.now() - offset
      const openedTabs = tabs.reverse()
      dispatch({
        type: Action.SetTabsAndHistory,
        tabs: openedTabs,
        history: []
      })

      chrome.history.search({ text: "", maxResults: 10000, startTime }, function(data) {
        dispatch({
          type: Action.SetTabsAndHistory,
          tabs: openedTabs,
          history: filterIrrelevantHistory(data) //filterOpenedTabsFromHistory(tabs, data)
        })
        //searching top 7 most visited sites
        // const data2 = Array.from(data)
        // data2.sort((a,b) => (b.visitCount || 0) - (a.visitCount || 0))
        // data2.forEach(historyItem => {
        //   console.log(historyItem.title, historyItem.url, historyItem.visitCount)
        // })
      })
    })
  }

  function onTabUpdated(tabId: number, info: Partial<Tab>) {
    if (info.url || info.title || info.favIconUrl) {
      dispatch({ type: Action.UpdateTab, tabId, opt: info })
    }
  }

  useEffect(() => {
    globalAppState = appState
  })

  //entry point
  useEffect(() => {
    updateTabsAndHistory()

    chrome.tabs.onCreated.addListener(updateTabsAndHistory)
    chrome.tabs.onRemoved.addListener(updateTabsAndHistory)
    chrome.tabs.onUpdated.addListener(onTabUpdated)

    getStateFromLS((res) => {
      dispatch({
        type: Action.InitFolders,
        init: true, // TODO TO CHECK
        ignoreSaving: true,
        ...res
      })
    })

    getBC().onmessage = function(ev: MessageEvent) {
      if (ev.data === "folders-updated") {
        getStateFromLS((res) => {
          if (globalAppState.sidebarCollapsed !== res.sidebarCollapsed) {
            dispatch({ type: Action.InitFolders, sidebarCollapsed: res.sidebarCollapsed, ignoreSaving: true })
          }
          if (JSON.stringify(globalAppState.folders) !== JSON.stringify(res.folders)) {
            dispatch({ type: Action.InitFolders, folders: res.folders, ignoreSaving: true })
          }
        })
      }
    }

    return () => {
      chrome.tabs.onCreated.removeListener(updateTabsAndHistory)
      chrome.tabs.onRemoved.removeListener(updateTabsAndHistory)
      chrome.tabs.onUpdated.removeListener(onTabUpdated)
    }
  }, [])

  useEffect(() => {
    window.devMode = () => {
      dispatch({ type: Action.UpdateAppState, newState: { devMode: true } })
      showMessage("DevMode enabled", dispatch)
    }
  }, [])

  return appState.loaded ? (
      <DispatchContext.Provider value={{dispatch}}>
        <div className={"app " + (appState.sidebarCollapsed ? "collapsible-sidebar" : "")}>
          <Notification appState={appState}/>
          {
            appState.page === "import"
              ? <Welcome appState={appState} />
              : <>
                <Sidebar appState={appState}/>
                <Bookmarks appState={appState} />
                <KeyboardSearch search={appState.search}/>
              </>
          }
        </div>
      </DispatchContext.Provider>
  ) : null
}

initKeyboardManager()

ReactDOM.render(
  <React.StrictMode>
    <App/>
  </React.StrictMode>,
  document.getElementById("root")
)
