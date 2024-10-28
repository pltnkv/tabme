import React, { useEffect, useReducer } from "react"
import { Bookmarks } from "./Bookmarks"
import { Sidebar } from "./Sidebar"
import { Notification } from "./Notification"
import { KeyboardManager } from "./KeyboardManager"
import { filterIrrelevantHistory } from "../helpers/utils"
import { showMessage } from "../helpers/actionsHelpers"
import { Welcome } from "./Welcome"
import { tryToCreateWelcomeFolder } from "../helpers/welcomeLogic"
import { Action, getInitAppState, IAppState } from "../state/state"
import { DispatchContext, stateReducer } from "../state/actions"
import { getBC, getStateFromLS } from "../state/storage"
import { executeAPICall } from "../../api/serverCommands"
import Tab = chrome.tabs.Tab

let notificationTimeout: number | undefined
let globalAppState: IAppState

export function getGlobalAppState(): IAppState {
  return globalAppState
}

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
        tabs: openedTabs
      })

      if (init) {
        dispatch({ type: Action.UpdateAppState, newState: { appLoaded: true } })
      }

      chrome.history.search({ text: "", maxResults: 10000, startTime }, function(data) {
        // logging top 3 visited sides
        // console.log(data.slice(0, 3))
        const historyItems = filterIrrelevantHistory(data)
        dispatch({
          type: Action.SetTabsAndHistory,
          history: historyItems //filterOpenedTabsFromHistory(tabs, data)
        })

        if (init) {
          tryToCreateWelcomeFolder(appState, historyItems, dispatch)
        }
      })
    })
  }

  function onTabUpdated(tabId: number, info: Partial<Tab>, tab: Tab) {
    dispatch({ type: Action.UpdateTab, tabId, opt: tab })
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

    chrome.windows.getCurrent((window) => {
      dispatch({ type: Action.UpdateAppState, newState: { currentWindowId: window.id } })
    })

    chrome.windows.onFocusChanged.addListener((windowId) => {
      if (windowId !== -1) { // to don't do useless jumps when switch between browser and other windows
        dispatch({ type: Action.UpdateAppState, newState: { currentWindowId: windowId } })
      }
    })

    window.betaMode = () => {
      dispatch({ type: Action.UpdateAppState, newState: { betaMode: true } })
      showMessage("Beta Mode enabled", dispatch)
    }
  }, [])

  useEffect(() => {
    if (notificationTimeout) {
      clearTimeout(notificationTimeout)
      notificationTimeout = undefined
    }

    if (appState.notification.visible) {
      notificationTimeout = window.setTimeout(() => {
        dispatch({ type: Action.HideNotification })
      }, 3500)
    }

  }, [appState.notification])

  useEffect(() => {
    // here we run the next command if any
    if (!appState.apiCommandId && appState.apiCommandsQueue.length > 0) {
      // take the new command from queue
      dispatch({ type: Action.UpdateAppState, newState: { apiCommandId: appState.apiCommandsQueue[0].commandId } })
    }
  }, [appState.apiCommandsQueue, appState.apiCommandId])

  useEffect(() => {
    if (appState.apiCommandId) {
      const currentCommand = appState.apiCommandsQueue.find(cmd => cmd.commandId === appState.apiCommandId)
      if (currentCommand) {
        executeAPICall(currentCommand, dispatch)
      } else {
        throw new Error("Unacceptable flow, no currentCommand")
      }
    }
  }, [appState.apiCommandId])

  return (
    <DispatchContext.Provider value={dispatch}>
      <div className={"app " + (appState.sidebarCollapsed ? "collapsible-sidebar" : "")}>
        <Notification notification={appState.notification}/>
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
    betaMode: () => void
  }
}