import React, { useContext, useEffect, useRef, useState } from "react"
import { SidebarOpenTabs } from "./SidebarOpenTabs"
import { isTabmeTab } from "../helpers/isTabmeTab"
import { blurSearch, filterTabsBySearch, getCurrentData, isTargetSupportsDragAndDrop, scrollElementIntoView } from "../helpers/utils"
import { DropdownMenu } from "./dropdown/DropdownMenu"
import { CL } from "../helpers/classNameHelper"
import { Action, IAppState } from "../state/state"
import { DispatchContext } from "../state/actions"
import IconClean from "../icons/clean.svg"
import IconDownload from "../icons/download.svg"
import IconPin from "../icons/pin.svg"
import Tab = chrome.tabs.Tab
import { convertTabOrRecentToItem, convertTabToItem } from "../state/actionHelpers"
import { createFolderWithStat, showMessage } from "../helpers/actionsHelpersWithDOM"
import { trackStat } from "../helpers/stats"
import { SidebarRecent } from "./SidebarRecent"
import { bindDADItemEffect } from "../dragging/dragAndDrop"
import { RecentItem } from "../helpers/recentHistoryUtils"
import { ISpace } from "../helpers/types"

export function Sidebar(p: {
  sidebarCollapsed: boolean
  sidebarHovered: boolean
  tabs: Tab[]
  recentItems: RecentItem[]
  search: string
  currentWindowId: number | undefined
  spaces: ISpace[]
  lastActiveTabIds: number[]
  showRecent: boolean
  alphaMode: boolean
}) {
  const dispatch = useContext(DispatchContext)
  const keepSidebarOpened = !p.sidebarCollapsed || p.sidebarHovered
  const sidebarClassName = keepSidebarOpened ? "" : "collapsed"
  const sidebarRef = useRef<HTMLDivElement | null>(null)
  const openTabsHeaderRef = useRef<HTMLDivElement | null>(null)

  const [mouseDownEvent, setMouseDownEvent] = useState<React.MouseEvent | undefined>(undefined)

  useEffect(() => {
    if (mouseDownEvent) {
      // todo technically TabsIds and RecentIds can have collisions
      const onDrop = (folderId: number, insertBeforeItemId: number | undefined, targetTabsOrRecentIds: number[]) => {
        const targetTabId = targetTabsOrRecentIds[0] // we support D&D only single element from sidebar
        let tabOrRecentItem: Tab | RecentItem | undefined = p.tabs.find((t) => t.id === targetTabId)

        if (!tabOrRecentItem) {
          tabOrRecentItem = p.recentItems.find(hi => hi.id === targetTabId)
        }

        if (folderId === -1) { // we need to create new folder first
          folderId = createFolderWithStat(dispatch, {}, "by-drag-in-new-folder--sidebar")
        }

        if (tabOrRecentItem && tabOrRecentItem.id) { // Add existing Tab
          const item = convertTabOrRecentToItem(tabOrRecentItem)
          dispatch({
            type: Action.CreateFolderItem,
            folderId,
            insertBeforeItemId,
            item
          })

          dispatch({
            type: Action.UpdateAppState,
            newState: {
              itemInEdit: item.id
            }
          })
          trackStat("tabsSaved", { source: "sidebar-open-tabs" })
        } else {
          console.error("ERROR: tab not found")
        }
        setMouseDownEvent(undefined)
      }
      const onCancel = () => {
        setMouseDownEvent(undefined)
      }
      const onClick = (tabOrRecentId: number) => {
        const tab = p.tabs.find(t => t.id === tabOrRecentId)
        if (tab) {
          chrome.tabs.update(tabOrRecentId, { active: true })
          chrome.windows.update(tab.windowId, { focused: true })
          trackStat("tabFocused", { source: "sidebar-open-tabs" })
        } else {
          const recent = p.recentItems.find(ri => ri.id === tabOrRecentId)
          if (recent && recent.url) {
            chrome.tabs.create({ url: recent.url, active: true })
            trackStat("tabFocused", { source: "sidebar-recent" })
          }
        }
      }
      const onDragStarted = () => {
        return true
      }

      return bindDADItemEffect(mouseDownEvent,
        {
          isFolderItem: false,
          onDrop,
          onCancel,
          onClick,
          onDragStarted
        }
      )
    }
  }, [mouseDownEvent])

  function onMouseDown(e: React.MouseEvent) {
    if (isTargetSupportsDragAndDrop(e)) {
      blurSearch(e)
      setMouseDownEvent(e)
    }
  }

  const onSidebarMouseEnter = () => {
    if (!p.sidebarCollapsed) {
      return
    }

    dispatch({
      type: Action.UpdateAppState,
      newState: { sidebarHovered: true }
    })
  }

  const onSidebarMouseLeave = (e: any) => {

    if (!p.sidebarCollapsed) {
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
    trackStat("toggleSidebar", { sidebarCollapsed: !p.sidebarCollapsed })
    dispatch({
      type: Action.UpdateAppState, newState: {
        sidebarCollapsed: !p.sidebarCollapsed,
        sidebarHovered: false
      }
    })
  }

  const tabsByWindows: Map<number, Tab[]> = new Map()
  let tabsCount = 0
  filterTabsBySearch(p.tabs, p.search).forEach(t => {
    let tabsInWindow = tabsByWindows.get(t.windowId)
    if (!tabsInWindow) {
      tabsInWindow = []
      tabsByWindows.set(t.windowId, tabsInWindow)
    }
    tabsInWindow.push(t)
    tabsCount++
  })

  const sortedWindowsByTabs = getSortedWindowsWithTabs(tabsByWindows, p.currentWindowId)

  return (
    <div className={"app-sidebar " + sidebarClassName}
         ref={sidebarRef}
         onMouseEnter={onSidebarMouseEnter}
         onMouseLeave={onSidebarMouseLeave}
         onMouseDown={onMouseDown}
    >
      <div className="app-sidebar__header app-sidebar__header--open-tabs" ref={openTabsHeaderRef}>
        <span className="app-sidebar__header__text">Open tabs</span>
        <CleanupButton tabs={p.tabs}/>
        {
          sortedWindowsByTabs.length === 1 && <StashButton tabs={p.tabs} windowId={sortedWindowsByTabs[0].windowId}/>
        }
        <button id="toggle-sidebar-btn"
                className={CL("btn__icon")}
                onClick={onToggleSidebar}
                style={p.sidebarCollapsed ? { transform: "rotate(180deg)" } : {}}
                title={p.sidebarCollapsed ? "Pin" : "Collapse"}>
          <IconPin/>
        </button>
      </div>

      <SidebarOpenTabs
        tabs={p.tabs}
        spaces={p.spaces}
        search={p.search}
        lastActiveTabIds={p.lastActiveTabIds}
        currentWindowId={p.currentWindowId}
        sortedWindowsByTabs={sortedWindowsByTabs}
        tabsCount={tabsCount}
      />
      {
        (p.showRecent || p.search) && <SidebarRecent
          search={p.search}
          alphaMode={p.alphaMode}
          recentItems={p.recentItems}
          spaces={p.spaces}
        ></SidebarRecent>
      }
    </div>
  )
}

export const StashButton = React.memo((p: { windowId: number, tabs: Tab[] }) => {
  const [confirmationOpened, setConfirmationOpened] = useState(false)
  const [shouldCloseTabs, setShouldCloseTabs] = useState(true)
  const dispatch = useContext(DispatchContext)

  const onStashClick = () => {
    setConfirmationOpened(!confirmationOpened)
  }

  const shelveTabs = () => {
    setConfirmationOpened(false)
    chrome.tabs.query({ windowId: p.windowId }, (tabs) => {
      const tabsToShelve: Tab[] = []
      tabs.forEach(t => {
        if (t.id && !t.pinned) {
          if (!isTabmeTab(t)) {
            tabsToShelve.push(t)
          }
          if (shouldCloseTabs) {
            chrome.tabs.remove(t.id)
          }
        }
      })

      if (tabsToShelve.length === 0) {
        // probably all the tabs where pinned
        return
      }

      const items = tabsToShelve.map(convertTabToItem)
      const title = `Saved ${getCurrentData()}`
      const folderId = createFolderWithStat(dispatch, { title, items }, "by-stash")

      dispatch({ type: Action.ShowNotification, message: "All Tabs has been saved" })
      trackStat("tabsStashed", { stashedTabsClosed: shouldCloseTabs })

      requestAnimationFrame(() => {
        scrollElementIntoView(`[data-folder-id="${folderId}"]`)
      })
    })
  }

  const filteredTabs = p.tabs.filter(t => !t.pinned && !isTabmeTab(t))

  return <div style={{ display: "inline-block", position: "relative" }}>
    <button className={CL("btn__icon", { "active": confirmationOpened })}
            disabled={filteredTabs.length < 1}
            title="Stash open Tabs in the new Folder"
            onClick={onStashClick}>
      <IconDownload/>
    </button>
    {
      confirmationOpened ?
        <DropdownMenu onClose={() => setConfirmationOpened(false)}
                      className="stash-confirmation-popup"
                      width={240}
                      offset={{ top: 12, left: 4 }}
                      skipTabIndexes={true}>
          <div style={{ width: "100%" }}>
            <p>Save open Tabs to a new Folder</p>
            <p>
              <label>
                <input
                  type="checkbox"
                  checked={shouldCloseTabs}
                  onChange={(e) => setShouldCloseTabs(e.target.checked)}
                />
                and close them
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

const CleanupButton = React.memo((props: {
  tabs: Tab[]
}) => {
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
      trackStat("tabsDeduplicated", { count: duplicatedTabs.length })
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

function getSortedWindowsWithTabs(map: Map<number, Tab[]>, currentWindowId: number | undefined): { windowId: number, tabs: Tab[] }[] {
  const res = Array.from(map.entries()) // Get entries to maintain access to the window ID
  let allWindows: { windowId: number, tabs: Tab[] }[] = []

  // Filter out the current window tabs and store them separately
  res.forEach(([windowId, tabs]) => {
    if (windowId === currentWindowId) {
      allWindows.splice(0, 0, { windowId, tabs })
    } else {
      allWindows.push({ windowId, tabs })
    }
  })

  return allWindows
}