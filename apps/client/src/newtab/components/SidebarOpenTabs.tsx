import React, { memo, useContext } from "react"
import { ISpace } from "../helpers/types"
import { DispatchContext } from "../state/actions"
import { Action } from "../state/state"
import { showMessage } from "../helpers/actionsHelpersWithDOM"
import { trackStat } from "../helpers/stats"
import { TabOrRecentItem } from "./SidebarItem"
import { CL } from "../helpers/classNameHelper"
import { StashButton } from "./Sidebar"
import Icon24Close from "../icons/close24.svg"
import IconArrowRight from "../icons/arrow-right.svg"
import IconClose from "../icons/close.svg"
import { EditableTitle, SimpleEditableTitle } from "./EditableTitle"
import Tab = chrome.tabs.Tab
import TabGroup = chrome.tabGroups.TabGroup

interface TabGroupWithTabs extends TabGroup {
  tabs: Tab[];
}

type TabsAndGroups = Array<Tab | TabGroupWithTabs>

const opacity = 0.15

function mapChromeGroupColorToRGBA(color: string | undefined): string {
  if (!color) {
    return "rgba(200, 200, 200, 0.2)"
  } // default gray for undefined

  const colorMap: { [key: string]: string } = {
    grey: `rgba(145, 145, 145, ${opacity})`,
    blue: `rgba(66, 133, 244, ${opacity})`,
    red: `rgba(234, 67, 53, ${opacity})`,
    yellow: `rgba(251, 188, 4, ${opacity})`,
    green: `rgba(52, 168, 83, ${opacity})`,
    pink: `rgba(249, 171, 211, ${opacity})`,
    purple: `rgba(161, 136, 229, ${opacity})`,
    cyan: `rgba(36, 176, 244, ${opacity})`,
    orange: `rgba(255, 138, 34, ${opacity})`
  }

  return colorMap[color.toLowerCase()] || colorMap.grey
}

export const SidebarOpenTabs = memo((p: {
  search: string;
  tabs: Tab[]
  tabGroups: TabGroup[]
  sortedWindowsByTabs: { windowId: number, tabs: Tab[] }[]
  tabsCount: number
  spaces: ISpace[];
  lastActiveTabIds: number[]
  currentWindowId: number | undefined
  reverseOpenTabs: boolean
}) => {
  const dispatch = useContext(DispatchContext)
  const [groupIdInEdit, setGroupIdInEdit] = React.useState<number>(NaN)

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

  function onToggleGroup(groupId: number, collapsed: boolean) {
    // @ts-ignore - Chrome API types are not up to date
    chrome.tabGroups.update(groupId, { collapsed: !collapsed })
  }

  function onCloseGroup(e: React.MouseEvent, groupId: number) {
    e.stopPropagation()

    dispatch({
      type: Action.CloseTabGroup,
      groupId: groupId
    })

    // Find all tabs in this group
    const tabsInGroup = p.tabs.filter(tab => tab.groupId === groupId)
    const tabIds = tabsInGroup.map(tab => tab.id!).filter(Boolean)
    showMessage(`Group with ${tabIds.length} tabs has been closed`, dispatch)

    trackStat("tabClosed", { source: "sidebar-group" })
  }

  function onGroupTitleSave(title: string, groupId: number) {
    chrome.tabGroups.update(groupId, {title: title})
    setGroupIdInEdit(-1)
  }

  function onGroupTitleClick(e: React.MouseEvent, groupId: number) {
    e.stopPropagation()
    setGroupIdInEdit(groupId)
  }

  function renderTabGroup(group: TabGroupWithTabs) {
    return (
      <div key={group.id}
           className={CL("tab-group-box draggable-item is-tab-group", { "collapsed": group.collapsed })}
           data-id={group.id}
           style={{ backgroundColor: mapChromeGroupColorToRGBA(group.color) }}
      >
        <div className="tab-group-header" onClick={() => onToggleGroup(group.id, group.collapsed)}>
          <IconArrowRight className="group-icon"
                          style={{ transform: group.collapsed ? undefined : "rotate(90deg)" }}
          />
          <div className="tab-group-title">
            <SimpleEditableTitle
              inEdit={groupIdInEdit === group.id}
              value={group.title || "Unnamed group"}
              onSave={(title) => onGroupTitleSave(title, group.id)}
              onClick={(e) => onGroupTitleClick(e, group.id)}
            />
            {group.collapsed ? <span className="tabs-number"> ({group.tabs.length})</span> : null}
          </div>
          <div style={{ flexGrow: "1" }}/>
          <div onClick={(e) => onCloseGroup(e, group.id)}
               className="inbox-item__close stop-dad-propagation"
               data-tooltip="Close group"
               data-tooltip-position="top-center">
            <IconClose/>
          </div>
        </div>
        {!group.collapsed && (
          <div className="tab-group-content">
            {group.tabs.map((t) => (
              <TabOrRecentItem
                key={t.id}
                data={t}
                lastActiveTabId={p.lastActiveTabIds[1]}
                spaces={p.spaces}
                search={p.search}
                onCloseTab={onCloseTab}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="inbox-box">
      {
        p.sortedWindowsByTabs.map((window, index) => {
          // Group tabs by their groupId
          const tabsAndGroups: TabsAndGroups = []
          const groupsById = new Map<number, TabGroupWithTabs>()

          window.tabs.forEach((tab) => {
            if (tab.groupId && tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
              if (!groupsById.has(tab.groupId)) {
                const group = p.tabGroups.find(g => g.id === tab.groupId) as TabGroupWithTabs | undefined
                if (group) {
                  const groupWithTabs = { ...group, tabs: [tab] }
                  groupsById.set(tab.groupId, groupWithTabs)
                  tabsAndGroups.push(groupWithTabs)
                }
              } else {
                groupsById.get(tab.groupId)?.tabs.push(tab)
              }
            } else {
              tabsAndGroups.push(tab)
            }
          })

          return (
            <div key={window.windowId} className={CL("window-box", { "active": index === 0 })} data-folder-id={window.windowId}>
              {p.sortedWindowsByTabs.length > 1 && (
                <div className="window-header draggable-folder">
                  <span className="tabs-number">{window.tabs.length} tabs</span>
                  <span className="window-title">{index === 0 ? "Current window" : "Inactive window"}</span>
                  <StashButton tabs={window.tabs} windowId={window.windowId} reverseOpenTabs={p.reverseOpenTabs}/>
                  <button className="btn__icon" onClick={() => onCloseWindow(window.windowId)} title="Close window with all Tabs">
                    <Icon24Close/>
                  </button>
                </div>
              )}

              {
                tabsAndGroups.map(tabsOrGroup => {
                  if (Object.hasOwn(tabsOrGroup, "tabs")) {
                    tabsOrGroup = tabsOrGroup as TabGroupWithTabs // just fixing types
                    return renderTabGroup(tabsOrGroup)
                  } else {
                    const tab = tabsOrGroup as Tab
                    return <TabOrRecentItem
                      key={tab.id}
                      data={tab}
                      lastActiveTabId={p.lastActiveTabIds[1]}
                      spaces={p.spaces}
                      search={p.search}
                      onCloseTab={onCloseTab}
                    />
                  }
                })
              }
            </div>
          )
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
