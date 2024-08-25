import React, { useEffect, useReducer } from "react"
import { Bookmarks } from "./Bookmarks"
import { Sidebar } from "./Sidebar"
import { Notification } from "./Notification"
import { KeyboardManager } from "./KeyboardManager"
import { filterIrrelevantHistory, tryToCreateWelcomeFolder } from "../helpers/utils"
import { showMessage } from "../helpers/actions"
import { Welcome } from "./Welcome"
import { Action, DispatchContext, getBC, getInitAppState, getStateFromLS, IAppState, stateReducer } from "../state"
import Tab = chrome.tabs.Tab

let globalAppState: IAppState

export function App() {
  const [appState, dispatch] = useReducer(stateReducer, getInitAppState())

  function updateTabsAndHistory(init = false) {
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
        console.log(data.slice(0, 3))
        const historyItems = filterIrrelevantHistory(data)
        dispatch({
          type: Action.SetTabsAndHistory,
          tabs: openedTabs,
          history: historyItems //filterOpenedTabsFromHistory(tabs, data)
        })

        if (init) {
          tryToCreateWelcomeFolder(appState, historyItems, dispatch)
        }
      })
    })
  }

  function onTabUpdated(tabId: number, info: Partial<Tab>) {
    if (info.url || info.title || info.favIconUrl) {
      dispatch({ type: Action.UpdateTab, tabId, opt: info })
    }
  }

  useEffect(() => {
    // hack for getting last instance of appState in "getBC().onmessage" callback
    globalAppState = appState
  })

  useEffect(() => {
    updateTabsAndHistory(true)

    chrome.tabs.onCreated.addListener(() => updateTabsAndHistory())
    chrome.tabs.onRemoved.addListener(() => updateTabsAndHistory()) // can do it more efficiently (don't update history)
    chrome.tabs.onUpdated.addListener(onTabUpdated)

    chrome.runtime.sendMessage({ type: "get-last-active-tabs" }, function(response) {
      console.log('init', response)
      dispatch({ type: Action.UpdateAppState, newState: { lastActiveTabIds: response.tabs } })
    })

    getBC().onmessage = function(ev: MessageEvent) {
      console.log(ev)
      if (ev.data?.type === "folders-updated") {
        getStateFromLS((res) => {
          if (globalAppState.sidebarCollapsed !== res.sidebarCollapsed) {
            dispatch({ type: Action.InitFolders, sidebarCollapsed: res.sidebarCollapsed, ignoreSaving: true })
          }
          if (JSON.stringify(globalAppState.folders) !== JSON.stringify(res.folders)) {
            dispatch({ type: Action.InitFolders, folders: res.folders, ignoreSaving: true })
          }
        })
      }

      if (ev.data?.type === "last-active-tabs-updated") {
        dispatch({ type: Action.UpdateAppState, newState: { lastActiveTabIds: ev.data.tabs } })
      }
    }

    // Enable Dev mode via browser console
    window.devMode = () => {
      dispatch({ type: Action.UpdateAppState, newState: { devMode: true } })
      showMessage("DevMode enabled", dispatch)
    }
  }, [])

  return (
    <DispatchContext.Provider value={{ dispatch }}>
      <div className={"app " + (appState.sidebarCollapsed ? "collapsible-sidebar" : "")}>
        <Notification appState={appState}/>
        {
          appState.page === "import"
            ? <Welcome appState={appState}/>
            : <>
              <Sidebar appState={appState}/>
              <Bookmarks appState={appState}/>
              <KeyboardManager search={appState.search}/>
            </>
        }
      </div>
    </DispatchContext.Provider>
  )
}

declare global {
  interface Window {
    devMode: () => void
  }
}