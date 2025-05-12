import React, { memo, useContext } from "react"
import { ISpace } from "../helpers/types"
import { DispatchContext } from "../state/actions"
import { Action } from "../state/state"
import { showMessage } from "../helpers/actionsHelpersWithDOM"
import { trackStat } from "../helpers/stats"
import { TabOrRecentItem } from "./SidebarItem"
import Tab = chrome.tabs.Tab
import { CL } from "../helpers/classNameHelper"
import { StashButton } from "./Sidebar"
import Icon24Close from "../icons/close24.svg"

export const SidebarOpenTabs = memo((p: {
  search: string;
  tabs: Tab[]
  sortedWindowsByTabs: { windowId: number, tabs: Tab[] }[]
  tabsCount: number
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

  function onCloseWindow(windowId: number) {
    chrome.windows.remove(windowId)
  }

  return (
    <div className="inbox-box">
      {
        p.sortedWindowsByTabs.length === 1 ?
          p.sortedWindowsByTabs[0].tabs.map((t) =>
            <TabOrRecentItem key={t.id} data={t} lastActiveTabId={p.lastActiveTabIds[1]} spaces={p.spaces} search={p.search} onCloseTab={onCloseTab}/>)
          :
          p.sortedWindowsByTabs.map((window, index) => {
            return <div key={window.windowId} className={CL("window-box", { "active": index === 0 })} data-folder-id={window.windowId}>
              <div className="window-name draggable-folder">
                <span>{index === 0 ? "Current window" : "Inactive window"}</span>
                <StashButton tabs={window.tabs} windowId={window.windowId}/>
                <button className="btn__icon" onClick={() => onCloseWindow(window.windowId)} title="Close window with all Tabs">
                  <Icon24Close/>
                </button>
              </div>
              {window.tabs.map((t) =>
                <TabOrRecentItem key={t.id} data={t} lastActiveTabId={p.lastActiveTabIds[1]} spaces={p.spaces} search={p.search} onCloseTab={onCloseTab}/>)}
            </div>
          })

      }
      {p.tabsCount === 0 && p.search === "" ? <p className="sidebar-message">No open tabs.<br/> Pinned tabs are filtered out.</p> : null}
      {
        /* disabled it because it looks wierd with several Windows */
        /*{props.search === "" ? SectionItem : null}*/
      }
    </div>
  )
})
