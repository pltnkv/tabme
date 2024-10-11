import React, { useContext, useEffect, useState } from "react"
import { Action, DispatchContext, IAppState, wrapIntoTransaction } from "../state"
import { createFolder, showMessage } from "../helpers/actions"
import { SidebarHistory } from "./SidebarHistory"
import { SidebarOpenTabs } from "./SidebarOpenTabs"
import Tab = chrome.tabs.Tab
import { isTabmeTab } from "../helpers/isTabmeTab"
import { convertTabToItem, getCurrentData } from "../helpers/utils"
import { DropdownMenu } from "./DropdownMenu"
import { CL } from "../helpers/classNameHelper"

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
      <div className="app-sidebar__header">
        <span  className="app-sidebar__header__text">Open tabs</span>
        <CleanupButton tabs={props.appState.tabs}/>
        <StashButton tabs={props.appState.tabs}/>
      </div>
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

const StashButton = React.memo((props: { tabs: Tab[] }) => {
  const [confirmationOpened, setConfirmationOpened] = useState(false)
  const { dispatch } = useContext(DispatchContext)

  const onStashClick = () => {
    setConfirmationOpened(!confirmationOpened)
  }

  const shelveTabs = () => {
    setConfirmationOpened(false)
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

  return <div style={{display: 'inline-block', position: 'relative'}}>
    <button className={CL("btn__setting btn__shelve-tabs", { "btn__setting--active": confirmationOpened })}
            disabled={filteredTabs.length < 1}
            title="Stash open Tabs in the new Folder"
            onClick={onStashClick}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8.5 9L12 12M12 12L15.5 9M12 12V4.5M4 19V12.75H7.07692L8.92308 15.25H15.6923L16.9231 12.75H20V19H4Z" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="square"/>
      </svg>
    </button>
    {
      confirmationOpened ?
        <DropdownMenu onClose={() => setConfirmationOpened(false)}
                      className="stash-confirmation-popup"
                      width={232}
                      leftOffset={-200}
                      topOffset={10}>
          <div style={{ width: "100%" }}>
            <p><b>Stash open Tabs to a new Folder</b></p>
            <p>It will close all non-pinned Tabs. Click "Open All" in the Folder menu to restore them.</p>
          </div>
          <div style={{ width: "100%", display: "flex", justifyContent: "right" }}>
            <button className="focusable btn__setting">Cancel</button>
            <button className="focusable btn__setting primary" onClick={shelveTabs}>Stash</button>
          </div>
        </DropdownMenu>
        : null
    }
  </div>
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