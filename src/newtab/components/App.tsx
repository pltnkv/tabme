import React, { useEffect, useReducer } from "react"
import { Bookmarks } from "./Bookmarks"
import { Sidebar } from "./Sidebar"
import { Notification } from "./Notification"
import { KeyboardManager } from "./KeyboardManager"
import { filterIrrelevantHistory } from "../helpers/utils"
import { Welcome } from "./Welcome"
import { tryToCreateWelcomeFolder } from "../helpers/welcomeLogic"
import { Action, getInitAppState, IAppState } from "../state/state"
import { DispatchContext, stateReducer } from "../state/actions"
import { getBC, getStateFromLS } from "../state/storage"
import { executeAPICall } from "../../api/serverCommands"
import Tab = chrome.tabs.Tab
import { apiGetToken } from "../../api/api"
import HistoryItem = chrome.history.HistoryItem

let notificationTimeout: number | undefined
let globalAppState: IAppState

export function getGlobalAppState(): IAppState {
  return globalAppState
}

export function App() {
  const [appState, dispatch] = useReducer(stateReducer, getInitAppState())

  function updateHistory() {
    const offset = 1000 * 60 * 60 * 24 * 60 //1000ms * 60sec *  60min * 24h * 60d
    const startTime = Date.now() - offset
    chrome.history.search({ text: "", maxResults: 10000, startTime }, function(data) {
      // logging top 3 visited sides
      // console.log(data.slice(0, 3))
      const historyItems = filterIrrelevantHistory(data)
      dispatch({
        type: Action.SetTabsOrHistory,
        history: historyItems //filterOpenedTabsFromHistory(tabs, data)
      })
    })
  }

  useEffect(() => {
    // hack for getting last instance of appState in "getBC().onmessage" callback
    globalAppState = appState
  })

  useEffect(function() {

    Promise.all([
      getTabs(),
      getHistory(), // TODO: now history updated only once, when app loaded. Fix it next time
      getLastActiveTabsIds(),
      getCurrentWindow()
    ]).then(([tabs, historyItems, lastActiveTabIds, currentWindowId]) => {
      dispatch({
        type: Action.SetTabsOrHistory,
        tabs: tabs,
        history: historyItems
      })
      dispatch({ type: Action.UpdateAppState, newState: { lastActiveTabIds } })
      dispatch({ type: Action.UpdateAppState, newState: { currentWindowId } })

      tryToCreateWelcomeFolder(appState, dispatch)
    })

    function onTabUpdated(tabId: number, info: Partial<Tab>, tab: Tab) {
      dispatch({ type: Action.UpdateTab, tabId, opt: tab })
    }

    function updateTabs() {
      getTabs().then(tabs => {
        dispatch({ type: Action.SetTabsOrHistory, tabs })
      })
    }

    chrome.tabs.onCreated.addListener(() => updateTabs())
    chrome.tabs.onRemoved.addListener(() => updateTabs())
    chrome.tabs.onUpdated.addListener(onTabUpdated)

    getBC().onmessage = function(ev: MessageEvent) {
      console.log(ev)
      if (ev.data?.type === "folders-updated") {
        getStateFromLS((res) => {
          if (globalAppState.sidebarCollapsed !== res.sidebarCollapsed) {
            dispatch({ type: Action.InitDashboard, sidebarCollapsed: res.sidebarCollapsed, ignoreSaving: true })
          }
          if (JSON.stringify(globalAppState.spaces) !== JSON.stringify(res.spaces)) {
            dispatch({ type: Action.InitDashboard, spaces: res.spaces, ignoreSaving: true })
          }
        })
      }

      if (ev.data?.type === "last-active-tabs-updated") {
        dispatch({ type: Action.UpdateAppState, newState: { lastActiveTabIds: ev.data.tabs } })
      }
    }

    chrome.windows.onFocusChanged.addListener((windowId) => {
      if (windowId !== -1) { // to don't do useless jumps when switch between browser and other windows
        dispatch({ type: Action.UpdateAppState, newState: { currentWindowId: windowId } })
      }
    })

    window.betaLogin = async () => {
      try {
        const userName = prompt("Enter your login")!
        const res = await apiGetToken(userName)
        localStorage.setItem("authToken", res.token)
        dispatch({ type: Action.UpdateAppState, newState: { betaMode: true } })
        // dispatch({ type: Action.SaveBookmarksToCloud })
        alert("Login successful!")
      } catch (e) {
        alert("Invalid credentials. Please try again.")
      }
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

function getHistory() {
  return new Promise<HistoryItem[]>((res) => {
    const offset = 1000 * 60 * 60 * 24 * 60 //1000ms * 60sec *  60min * 24h * 60d
    const startTime = Date.now() - offset
    chrome.history.search({ text: "", maxResults: 10000, startTime }, function(data) {
      // logging top 3 visited sides
      // console.log(data.slice(0, 3))
      const historyItems = filterIrrelevantHistory(data)
      res(historyItems)
    })
  })
}

function getTabs() {
  return new Promise<Tab[]>((res) => {
    chrome.tabs.query({}, (tabs) => {
      const openedTabs = tabs.reverse()
      res(openedTabs)
    })
  })
}

function getLastActiveTabsIds() {
  return new Promise<number[]>((res) => {
    chrome.runtime.sendMessage({ type: "get-last-active-tabs" }, function(response) {
      res(response.tabs)
    })
  })
}

function getCurrentWindow() {
  return new Promise<number>((res) => {
    chrome.windows.getCurrent((window) => {
      res(window.id)
    })
  })
}

declare global {
  interface Window {
    betaLogin: () => void
    pSBC: any
  }
}