import React, { useContext, useEffect, useState } from "react"
import { Action, DispatchContext, IAppState, wrapIntoTransaction } from "../state"
import { createFolder, showMessage } from "../helpers/actions"
import { SidebarHistory } from "./SidebarHistory"
import { SidebarOpenTabs } from "./SidebarOpenTabs"
import Tab = chrome.tabs.Tab
import { isTabmeTab } from "../helpers/isTabmeTab"
import { convertTabToItem, getCurrentData } from "../helpers/utils"

export function Sidebar(props: {
  appState: IAppState;
}) {

  const { dispatch } = useContext(DispatchContext)
  const keepSidebarOpened = !props.appState.sidebarCollapsed || props.appState.sidebarHovered
  const sidebarClassName = keepSidebarOpened ? "" : "collapsed"

  const onSidebarMouseEnter = () => {
    if (!props.appState.sidebarCollapsed) {
      return
    }

    dispatch({
      type: Action.UpdateAppState,
      newState: { sidebarHovered: true }
    })
  }

  const onSidebarMouseLeave = (e: any) => {
    if (!props.appState.sidebarCollapsed) {
      return
    }

    if (e.relatedTarget.id !== "toggle-sidebar-btn") {
      dispatch({
        type: Action.UpdateAppState,
        newState: { sidebarHovered: false }
      })
    }
  }

  function onToggleSidebar() {
    dispatch({
      type: Action.UpdateAppState, newState: {
        sidebarCollapsed: !props.appState.sidebarCollapsed,
        sidebarHovered: false
      }
    })
  }

  return (
    <div className={"app-sidebar " + sidebarClassName} onMouseEnter={onSidebarMouseEnter} onMouseLeave={onSidebarMouseLeave}>
      <h1>Open tabs <CleanupButton tabs={props.appState.tabs}/><ShelveButton tabs={props.appState.tabs}/></h1>
      <button id="toggle-sidebar-btn"
              className={"btn__collapse-sidebar"}
              onClick={onToggleSidebar}
              title={props.appState.sidebarCollapsed ? "Pin" : "Collapse"}>
        {props.appState.sidebarCollapsed ? "»" : "«"}
      </button>
      <SidebarOpenTabs
        tabs={props.appState.tabs}
        folders={props.appState.folders}
        search={props.appState.search}
        lastActiveTabIds={props.appState.lastActiveTabIds}
      />
      <SidebarHistory appState={props.appState}/>
    </div>
  )
}

const ShelveButton = React.memo((props: { tabs: Tab[] }) => {
  const { dispatch } = useContext(DispatchContext)

  const onClick = () => {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      const tabsToShelve: Tab[] = []
      tabs.forEach(t => {
        if (t.id && !t.pinned) {
          if (!isTabmeTab(t)) {
            tabsToShelve.push(t)
          }
          if (!t.active) {
            chrome.tabs.remove(t.id)
          }
        }
      })

      if (tabsToShelve.length === 0) {
        // probably all the tabs where pinned
        return
      }

      wrapIntoTransaction(() => {
        const folderTitle = `Saved on ${getCurrentData()}`
        const folderId = createFolder(dispatch, folderTitle, "All Tabs has been saved")

        tabsToShelve.forEach((tab) => {
          const item = convertTabToItem(tab)
          dispatch({
            type: Action.AddNewBookmarkToFolder,
            folderId,
            itemIdInsertAfter: undefined,
            item
          })
        })

        requestAnimationFrame(() => {
          const folderElement = document.querySelector(`[data-folder-id="${folderId}"]`)
          if (folderElement) {
            folderElement.scrollIntoView()
          }
        })
      })
    })
  }

  const filteredTabs = props.tabs.filter(t => !t.pinned && !isTabmeTab(t))

  return <button className="btn__setting btn__shelve-tabs"
                 disabled={filteredTabs.length < 1}
                 title="Save All Tabs in the new Folder"
                 onClick={onClick}>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8.5 9L12 12M12 12L15.5 9M12 12V4.5M4 19V12.75H7.07692L8.92308 15.25H15.6923L16.9231 12.75H20V19H4Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square"/>
    </svg>
  </button>
})

const CleanupButton = React.memo((props: { tabs: Tab[] }) => {
  const [duplicateTabsCount, setDuplicateTabsCount] = useState(0)
  const { dispatch } = useContext(DispatchContext)

  function onCleanupTabs() {
    getDuplicatedTabs((duplicatedTabs) => {
      duplicatedTabs.forEach((t => {
        if (t.id) {
          chrome.tabs.remove(t.id)
        }
      }))
      const message = duplicatedTabs.length > 0 ? `${duplicatedTabs.length} duplicate tabs was closed` : "There are no duplicate tabs"
      showMessage(message, dispatch)
    })
  }

  useEffect(() => {
    getDuplicatedTabs((dt => {
      setDuplicateTabsCount(dt.length)
    }))
  }, [props.tabs])

  return <button className="btn__setting btn__cleanup"
                 title="Close duplicate tabs"
                 disabled={duplicateTabsCount === 0}
                 onClick={onCleanupTabs}>Dedup {duplicateTabsCount ? duplicateTabsCount : ""}</button>
})

function getDuplicatedTabs(cb: (value: Tab[]) => void): void {
  const tabsByUrl = new Map<string, Tab[]>()
  chrome.windows.getCurrent(chromeWindow => {
    chrome.tabs.query({ windowId: chromeWindow.id }, (tabs) => {
      tabs.reverse().forEach(t => {
        if (!t.url) {
          return
        }
        if (!tabsByUrl.has(t.url)) {
          tabsByUrl.set(t.url, [])
        }
        const groupedTabsByUrl = tabsByUrl.get(t.url)!

        //special condition to now close current tab with Tabme but close all others
        if (isTabmeTab(t) && t.active) {
          groupedTabsByUrl.unshift(t)
        } else {
          groupedTabsByUrl.push(t)
        }
      })
      const duplicatedTabs: Tab[] = []
      tabsByUrl.forEach(groupedTabs => {
        for (let i = 1; i < groupedTabs.length; i++) {
          const duplicatedTab = groupedTabs[i]
          if (duplicatedTab.id) {
            duplicatedTabs.push(duplicatedTab)
          }
        }
      })
      cb(duplicatedTabs)
    })
  })
}