import React, { memo, useContext, useEffect, useState } from "react"
import { blurSearch, extractHostname, filterTabsBySearch, hlSearch, isTargetSupportsDragAndDrop, removeUselessProductName, scrollElementIntoView } from "../helpers/utils"
import { bindDADItemEffect } from "../dragging/dragAndDrop"
import { IFolderItem, ISpace } from "../helpers/types"
import { DispatchContext, mergeStepsInHistory } from "../state/actions"
import { Action } from "../state/state"
import IconSaved from "../icons/saved.svg"
import { DropdownMenu, DropdownSubMenu } from "./dropdown/DropdownMenu"
import { CL } from "../helpers/classNameHelper"
import { getFoldersList } from "./dropdown/moveToHelpers"
import { convertTabToItem } from "../state/actionHelpers"
import { createFolderWithStat, getCanDragChecker, showMessage } from "../helpers/actionsHelpersWithDOM"
import { trackStat } from "../helpers/stats"
import Tab = chrome.tabs.Tab
import { TabOrRecentItem } from "./SidebarItem"

export const SidebarOpenTabs = memo((p: {
  search: string;
  tabs: Tab[]
  spaces: ISpace[];
  lastActiveTabIds: number[]
  currentWindowId: number | undefined
}) => {
  const dispatch = useContext(DispatchContext)

  function onCloseTab(tabId: number) {
    dispatch({
      type: Action.CloseTabs,
      tabIds: [tabId]
    })
    showMessage("Tab has been closed", dispatch)
    trackStat("tabClosed", { source: "sidebar" })
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

  const sortedWindowsWithTabs = getSortedWindowsWithTabs(tabsByWindows, p.currentWindowId)

  return (
    <div className="inbox-box">
      {
        sortedWindowsWithTabs.length === 1 ?
          sortedWindowsWithTabs[0].tabs.map((t) =>
            <TabOrRecentItem key={t.id} data={t} lastActiveTabId={p.lastActiveTabIds[1]} spaces={p.spaces} search={p.search} onCloseTab={onCloseTab}/>)
          :
          sortedWindowsWithTabs.map((window, index) => {
            return <div key={window.windowId}>
              <div className="window-name">{index === 0 ? "current window" : "window"}</div>
              {window.tabs.map((t) =>
                <TabOrRecentItem key={t.id} data={t} lastActiveTabId={p.lastActiveTabIds[1]} spaces={p.spaces} search={p.search} onCloseTab={onCloseTab}/>)}
            </div>
          })

      }
      {tabsCount === 0 && p.search === "" ? <p className="sidebar-message">No open tabs.<br/> Pinned tabs are filtered out.</p> : null}
      {
        /* disabled it because it looks wierd with several Windows */
        /*{props.search === "" ? SectionItem : null}*/
      }
    </div>
  )
})


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