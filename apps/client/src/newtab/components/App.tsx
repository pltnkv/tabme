import React, { useEffect, useReducer, useState } from "react"
import { Bookmarks } from "./Bookmarks"
import { Sidebar } from "./Sidebar"
import { Notification } from "./Notification"
import { KeyboardAndMouseManager } from "./KeyboardAndMouseManager"
import { ImportBookmarksFromSettings } from "./ImportBookmarksFromSettings"
import { createWelcomeFolder } from "../helpers/welcomeLogic"
import { Action, getInitAppState, IAppState } from "../state/state"
import { DispatchContext, stateReducer } from "../state/actions"
import { getBC, getStateFromLS } from "../state/storage"
import { executeAPICall } from "../../api/serverCommands"
import { apiGetToken } from "../../api/api"
import { CL } from "../helpers/classNameHelper"
import { Welcome } from "./Welcome"
import { CommonStatProps, setCommonStatProps } from "../helpers/stats"
import { getHistory, tryLoadMoreHistory } from "../helpers/recentHistoryUtils"
import { HiddenDeprecationModal } from "./modals/HiddenDeprecationModal"
import { selectItems } from "../helpers/selectionUtils"
import Tab = chrome.tabs.Tab
import { TooltipsManager } from "./TooltipsManager"
import { Tutorial } from "./Tutorial"

let notificationTimeout: number | undefined
let globalAppState: IAppState

export function getGlobalAppState(): IAppState {
  return globalAppState
}

function invalidateStats(newState: IAppState, prevState: IAppState | undefined) {
  const statProps: Partial<CommonStatProps> = {}

  statProps.zTotalSpacesCount = newState.spaces.length
  statProps.zSidebarCollapsed = newState.sidebarCollapsed
  statProps.zIsBeta = newState.betaMode
  statProps.zIsFirstTime = newState.stat?.sessionNumber === 1
  statProps.zIsRecentVisible = newState.showRecent

  if (newState.tabs !== prevState?.tabs) {
    const uniqWinIds: number[] = []
    newState.tabs.forEach(tab => {
      if (!uniqWinIds.includes(tab.windowId)) {
        uniqWinIds.push(tab.windowId)
      }
    })

    statProps.zTotalOpenTabsCount = newState.tabs.length
    statProps.zTotalWindowsCount = uniqWinIds.length
  }

  if (newState.spaces !== prevState?.spaces) {
    statProps.zTotalFoldersCount = newState.spaces.reduce((sum, curSpace) => sum + curSpace.folders.length, 0)
    statProps.zTotalBookmarksCount = newState.spaces.reduce((sSum, curSpace) => sSum + curSpace.folders.reduce((fSum, folder) => fSum + folder.items.length, 0), 0)
    statProps.zTotalStickersCount = newState.spaces.reduce((sum, curSpace) => sum + (curSpace.widgets?.length ?? 0), 0)
  }

  setCommonStatProps(statProps)
}

export function App() {
  const [appState, dispatch] = useReducer(stateReducer, getInitAppState())
  const [isHiddenDeprecatedModalOpen, setHiddenDeprecatedModalOpen] = useState(false)

  useEffect(() => {
    invalidateStats(appState, globalAppState)
    // hack for getting last instance of appState in "getBC().onmessage" callback
    globalAppState = appState
  })

  useEffect(() => {
    if (appState.betaMode) {
      document.body.classList.add("beta")
    }
  }, [appState.betaMode])

  useEffect(() => {
    if (appState.loaded) {
      requestAnimationFrame(() => {
        document.body.classList.add("app-loaded")
      })
    }
  }, [appState.loaded])

  useEffect(() => {
    if (appState.hasHiddenObjects) {
      const hiddenDeprecatedModalShown = localStorage.getItem("hiddenDeprecatedModalShown")
      if (!hiddenDeprecatedModalShown) {
        localStorage.setItem("hiddenDeprecatedModalShown", "true")
        setHiddenDeprecatedModalOpen(true)
      }
    }
  }, [])

  useEffect(function() {
    Promise.all([
      getTabs(),
      getHistory(), // TODO: !! now history updated only once, when app loaded. Fix it next time
      getLastActiveTabsIds(),
      getCurrentWindow()
    ]).then(([tabs, historyItems, lastActiveTabIds, currentWindowId]) => {
      dispatch({
        type: Action.SetTabsOrHistory,
        tabs: tabs,
        recentItems: historyItems
      })
      dispatch({ type: Action.UpdateAppState, newState: { lastActiveTabIds } })
      dispatch({ type: Action.UpdateAppState, newState: { currentWindowId } })
      dispatch({ type: Action.UpdateAppState, newState: { version: 2 } })

      setTimeout(() => { // preload more history
        tryLoadMoreHistory(dispatch)
      }, 2000)

      // activate app
      dispatch({ type: Action.UpdateAppState, newState: { loaded: true } })

      if (appState.stat?.sessionNumber === 1 && appState.spaces.length === 0) {
        createWelcomeFolder(dispatch)
        dispatch({ type: Action.UpdateAppState, newState: { page: "welcome" } })
      } else {
        dispatch({ type: Action.UpdateAppState, newState: { page: "default" } })
      }

      // highlight item by URL
      requestAnimationFrame(() => {
        const urlParams = new URLSearchParams(window.location.search)
        const itemIdFromUrl = parseInt(urlParams.get("focusItemId") ?? "", 10)
        if (!isNaN(itemIdFromUrl)) {
          const folderItem = document.querySelector<HTMLElement>(`[data-id="${itemIdFromUrl}"]`)
          if (folderItem) {
            selectItems([folderItem])
            folderItem.scrollIntoView({ block: "center", behavior: "smooth" })
          }
        }
      })
    })

    function onTabUpdated(tabId: number, info: Partial<Tab>, tab: Tab) {
      dispatch({ type: Action.UpdateTab, tabId, opt: tab })
    }

    function updateTabs() {
      getTabs().then(tabs => {
        dispatch({ type: Action.SetTabsOrHistory, tabs })
      })
    }

    chrome.tabs.onCreated.addListener(updateTabs)
    chrome.tabs.onRemoved.addListener(updateTabs)
    chrome.tabs.onUpdated.addListener(onTabUpdated)
    chrome.windows.onCreated.addListener(updateTabs)
    chrome.windows.onRemoved.addListener(updateTabs)

    getBC().onmessage = function(ev: MessageEvent) {
      if (ev.data?.type === "folders-updated") {
        getStateFromLS((res) => {
          if (globalAppState.sidebarCollapsed !== res.sidebarCollapsed) {
            dispatch({ type: Action.InitDashboard, sidebarCollapsed: res.sidebarCollapsed, saveToLS: false })
          }
          if (JSON.stringify(globalAppState.spaces) !== JSON.stringify(res.spaces)) {
            dispatch({ type: Action.InitDashboard, spaces: res.spaces, saveToLS: false })
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
        alert("Login successful!")
      } catch (e) {
        alert("Invalid credentials. Please try again.")
      }
    }
  }, [])

  useEffect(() => {
    if (appState.tabs.length > 0) {
      getTabs().then(tabs => {
        dispatch({ type: Action.SetTabsOrHistory, tabs })
      })
    }
  }, [appState.reverseOpenTabs])

  useEffect(() => {
    if (notificationTimeout) {
      clearTimeout(notificationTimeout)
      notificationTimeout = undefined
    }

    if (appState.notification.visible && !appState.notification.isLoading) {
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

  const onWelcomeComplete = () => {
    dispatch({ type: Action.UpdateAppState, newState: { page: "default", tutorialVisible: true } })
  }

  const onTutorialComplete = () => {
    dispatch({ type: Action.UpdateAppState, newState: { tutorialVisible: false } })
  }

  return (
    <DispatchContext.Provider value={dispatch}>
      {
        appState.loaded && <div className={CL("app", {
          "collapsible-sidebar": appState.sidebarCollapsed
        })}>
          <Notification notification={appState.notification}/>
          {
            appState.page === "welcome" && <Welcome appState={appState} onComplete={onWelcomeComplete}/>
          }
          {
            appState.page === "import" && <ImportBookmarksFromSettings appState={appState}/>
          }
          {
            appState.page === "default" && <>
              <Sidebar
                sidebarCollapsed={appState.sidebarCollapsed}
                sidebarHovered={appState.sidebarHovered}
                tabs={appState.tabs}
                recentItems={appState.recentItems}
                search={appState.search}
                currentWindowId={appState.currentWindowId}
                currentSpaceId={appState.currentSpaceId}
                spaces={appState.spaces}
                lastActiveTabIds={appState.lastActiveTabIds}
                showRecent={appState.showRecent}
                alphaMode={appState.alphaMode}
                reverseOpenTabs={appState.reverseOpenTabs}
              />
              <Bookmarks appState={appState}/>
              <KeyboardAndMouseManager search={appState.search} selectedWidgetIds={appState.selectedWidgetIds}/>
            </>
          }
          {
            isHiddenDeprecatedModalOpen && <HiddenDeprecationModal onClose={() => setHiddenDeprecatedModalOpen(false)}/>
          }
          {
            appState.tutorialVisible && <Tutorial appState={appState} onComplete={onTutorialComplete}/>
          }
          <TooltipsManager tooltipsEnabled={appState.tooltipsEnabled}/>
        </div>
      }
    </DispatchContext.Provider>
  )
}

function getTabs() {
  return new Promise<Tab[]>((response) => {
    chrome.tabs.query({}, response)
  })
}

function getLastActiveTabsIds() {
  return new Promise<number[]>((res) => {
    chrome.runtime.sendMessage({ type: "get-last-active-tabs" }, function(response) {
      if (response) {
        res(response.tabs)
      } else {
        res([])
      }
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