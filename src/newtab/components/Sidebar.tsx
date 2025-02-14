import React, { useContext, useEffect, useState } from "react"
import { SidebarHistory } from "./SidebarHistory"
import { SidebarOpenTabs } from "./SidebarOpenTabs"
import { isTabmeTab } from "../helpers/isTabmeTab"
import { getCurrentData, scrollElementIntoView } from "../helpers/utils"
import { DropdownMenu } from "./dropdown/DropdownMenu"
import { CL } from "../helpers/classNameHelper"
import { Action, IAppState } from "../state/state"
import { DispatchContext } from "../state/actions"
import IconClean from "../icons/clean.svg"
import IconStash from "../icons/stash.svg"
import IconPin from "../icons/pin.svg"
import Tab = chrome.tabs.Tab
import { convertTabToItem } from "../state/actionHelpers"
import { createFolder, showMessage } from "../helpers/actionsHelpersWithDOM"

export function Sidebar(props: {
  appState: IAppState;
}) {

  const dispatch = useContext(DispatchContext)
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
        <span className="app-sidebar__header__text">Open tabs</span>
        <CleanupButton tabs={props.appState.tabs}/>
        <StashButton tabs={props.appState.tabs}/>
        <button id="toggle-sidebar-btn"
                className={CL("btn__icon", { "active": !props.appState.sidebarCollapsed })}
                onClick={onToggleSidebar}
                style={props.appState.sidebarCollapsed ? { transform: "rotate(180deg)" } : {}}
                title={props.appState.sidebarCollapsed ? "Pin" : "Collapse"}>
          <IconPin/>
        </button>
      </div>

      <SidebarOpenTabs
        tabs={props.appState.tabs}
        spaces={props.appState.spaces}
        search={props.appState.search}
        lastActiveTabIds={props.appState.lastActiveTabIds}
        currentWindowId={props.appState.currentWindowId}
      />
      <SidebarHistory search={props.appState.search} historyItems={props.appState.historyItems}/>
    </div>
  )
}

const StashButton = React.memo((props: { tabs: Tab[] }) => {
  const [confirmationOpened, setConfirmationOpened] = useState(false)
  const [shouldCloseTabs, setShouldCloseTabs] = useState(true)
  const dispatch = useContext(DispatchContext)

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
          if (!t.active && shouldCloseTabs) {
            chrome.tabs.remove(t.id)
          }
        }
      })

      if (tabsToShelve.length === 0) {
        // probably all the tabs where pinned
        return
      }

      const items = tabsToShelve.map(convertTabToItem)
      const folderTitle = `Saved ${getCurrentData()}`
      const folderId = createFolder(dispatch, folderTitle, items)

      dispatch({ type: Action.ShowNotification, message: "All Tabs has been saved" })

      scrollElementIntoView(`[data-folder-id="${folderId}"]`)
    })
  }

  const filteredTabs = props.tabs.filter(t => !t.pinned && !isTabmeTab(t))

  return <div style={{ display: "inline-block", position: "relative" }}>
    <button className={CL("btn__icon", { "active": confirmationOpened })}
            disabled={filteredTabs.length < 1}
            title="Stash open Tabs in the new Folder"
            onClick={onStashClick}>
      <IconStash/>
    </button>
    {
      confirmationOpened ?
        <DropdownMenu onClose={() => setConfirmationOpened(false)}
                      className="stash-confirmation-popup"
                      width={240}
                      offset={{ top: -12, left: 4 }}
                      skipTabIndexes={true}>
          <div style={{ width: "100%" }}>
            <p>Place all open Tabs to a new Folder</p>
            <p>
              <label>
                <input
                  type="checkbox"
                  checked={shouldCloseTabs}
                  onChange={(e) => setShouldCloseTabs(e.target.checked)}
                />
                and close all the tabs
              </label>
            </p>
          </div>
          <div style={{ width: "100%", display: "flex" }}>
            <button className="focusable btn__setting primary" style={{ marginRight: "8px" }} onClick={shelveTabs}>Stash tabs</button>
            <button className="focusable btn__setting" onClick={() => setConfirmationOpened(false)}>Cancel</button>
          </div>
        </DropdownMenu>
        : null
    }
  </div>
})

const CleanupButton = React.memo((props: { tabs: Tab[] }) => {
  const [duplicateTabsCount, setDuplicateTabsCount] = useState(0)
  const dispatch = useContext(DispatchContext)

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
  return <button className="btn__icon"
                 style={{ position: "relative" }}
                 title="Close duplicate tabs"
                 disabled={duplicateTabsCount === 0}
                 onClick={onCleanupTabs}>
    <IconClean/>
    {duplicateTabsCount > 0 ? <div className="duplicate-tabs-number">{duplicateTabsCount}</div> : null}

  </button>
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