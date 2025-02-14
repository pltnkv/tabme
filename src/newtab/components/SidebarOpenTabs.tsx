import React, { memo, useContext, useEffect, useState } from "react"
import { blurSearch, extractHostname, filterTabsBySearch, hlSearch, isTargetSupportsDragAndDrop, removeUselessProductName, scrollElementIntoView } from "../helpers/utils"
import { bindDADItemEffect } from "../helpers/dragAndDropItem"
import { IFolderItem, ISpace } from "../helpers/types"
import { DispatchContext, mergeStepsInHistory } from "../state/actions"
import { Action } from "../state/state"
import IconSaved from "../icons/saved.svg"
import { DropdownMenu, DropdownSubMenu } from "./dropdown/DropdownMenu"
import { CL } from "../helpers/classNameHelper"
import { getFoldersList } from "./dropdown/moveToHelpers"
import { convertTabToItem, findSpaceByFolderId } from "../state/actionHelpers"
import { createFolder, getCanDragChecker, showMessage } from "../helpers/actionsHelpersWithDOM"
import Tab = chrome.tabs.Tab

export const SidebarOpenTabs = memo((props: {
  search: string;
  tabs: Tab[]
  spaces: ISpace[];
  lastActiveTabIds: number[]
  currentWindowId: number | undefined
}) => {
  const dispatch = useContext(DispatchContext)
  const [mouseDownEvent, setMouseDownEvent] = useState<React.MouseEvent | undefined>(undefined)

  useEffect(() => {
    if (mouseDownEvent) {
      const onDrop = (folderId: number, insertBeforeItemId: number | undefined, targetTabsIds: number[]) => {
        const targetTabId = targetTabsIds[0] // we support D&D only single element from sidebar
        const tab = props.tabs.find((t) => t.id === targetTabId)

        if (folderId === -1) { // we need to create new folder first
          folderId = createFolder(dispatch)
        }

        if (tab && tab.id) { // Add existing Tab
          const item = convertTabToItem(tab)
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
        } else {
          console.error("ERROR: tab not found")
        }
        setMouseDownEvent(undefined)
      }
      const onCancel = () => {
        setMouseDownEvent(undefined)
      }
      const onClick = (tabId: number) => {
        const tab = props.tabs.find(t => t.id === tabId)
        chrome.tabs.update(tabId, { active: true })
        if (tab) {
          chrome.windows.update(tab.windowId, { focused: true })
        }
      }
      const onDragStarted = () => {
        return getCanDragChecker(props.search, dispatch)()
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

  function onCloseTab(tabId: number) {
    dispatch({
      type: Action.CloseTabs,
      tabIds: [tabId]
    })
    showMessage("Tab has been closed", dispatch)
  }

  const tabsByWindows: Map<number, Tab[]> = new Map()
  let tabsCount = 0
  filterTabsBySearch(props.tabs, props.search).forEach(t => {
    let tabsInWindow = tabsByWindows.get(t.windowId)
    if (!tabsInWindow) {
      tabsInWindow = []
      tabsByWindows.set(t.windowId, tabsInWindow)
    }
    tabsInWindow.push(t)
    tabsCount++
  })

  const sortedWindowsWithTabs = getSortedWindowsWithTabs(tabsByWindows, props.currentWindowId)

  return (
    <div className="inbox-box" onMouseDown={onMouseDown}>
      {
        sortedWindowsWithTabs.length === 1 ?
          sortedWindowsWithTabs[0].tabs.map((t) =>
            <TabItem key={t.id} tab={t} lastActiveTabId={props.lastActiveTabIds[1]} spaces={props.spaces} search={props.search} onCloseTab={onCloseTab}/>)
          :
          sortedWindowsWithTabs.map((window, index) => {
            return <div key={window.windowId}>
              <div className="window-name">{index === 0 ? "current window" : "window"}</div>
              {window.tabs.map((t) =>
                <TabItem key={t.id} tab={t} lastActiveTabId={props.lastActiveTabIds[1]} spaces={props.spaces} search={props.search} onCloseTab={onCloseTab}/>)}
            </div>
          })

      }
      {tabsCount === 0 && props.search === "" ? <p className="no-opened-tabs">No open tabs.<br/> Pinned tabs are filtered oup.tab.</p> : null}
      {
        /* disabled it because it looks wierd with several Windows */
        /*{props.search === "" ? SectionItem : null}*/
      }
    </div>
  )
})

const TabItem = (p: {
  tab: Tab,
  lastActiveTabId: number,
  spaces: ISpace[],
  search: string,
  onCloseTab: (tabId: number) => void
}) => {
  const dispatch = useContext(DispatchContext)
  const [showMenu, setShowMenu] = useState<boolean>(false)

  function getBgColor(tabId?: number): string {
    if (tabId && p.lastActiveTabId === tabId) {
      return "rgba(181, 192, 235, 0.6)"
    } else {
      return ""
    }
    // const index = props.lastActiveTabIds.indexOf(tabId!)
    // switch (index) {
    //   case 0:
    //     return "rgba(181, 192, 235, 0.6)"
    // case 1:
    //   return "#d3dcfd"
    // case 2:
    //   return "#e7ebff"
    // default:
    //   return "transparent"
    // }
  }

  const hideMenu = () => {
    setShowMenu(false)
  }

  const onTabContextMenu = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setShowMenu(true)
  }

  const onMenuCloseClicked = (e: React.MouseEvent) => {
    p.onCloseTab(p.tab.id!)
    hideMenu()
  }

  const onMenuCopyClicked = (e: React.MouseEvent) => {
    navigator.clipboard.writeText(p.tab.url ?? "")
    showMessage("URL has been copied", dispatch) // !!! place all texts in a single file
    hideMenu()
  }

  const moveToFolder = (folderId: number) => {
    const item = convertTabToItem(p.tab)
    const targetSpaceId = findSpaceByFolderId(p, folderId)?.id

    dispatch({
      type: Action.CreateFolderItem,
      folderId,
      insertBeforeItemId: undefined,
      item
    })

    dispatch({
      type: Action.UpdateAppState,
      newState: {
        itemInEdit: item.id
      }
    })

    // todo !!! switching space after creation does not work
    if (targetSpaceId) {
      dispatch({
        type: Action.SelectSpace,
        spaceId: targetSpaceId
      })
    }

    scrollElementIntoView(`a[data-id="${item.id}"]`)

    hideMenu()
  }

  const moveToNewFolder = (spaceId: number) => {
    mergeStepsInHistory((historyStepId) => {
      const folderId = createFolder(dispatch, undefined, undefined, historyStepId, spaceId)
      moveToFolder(folderId)
    })
  }

  let shortenedTitle = removeUselessProductName(p.tab.title)
  let domain = extractHostname(p.tab.url)
  const folderTitles = findFoldersTitlesWhereTabSaved(p.tab, p.spaces)

  return (
    <div
      key={p.tab.id}
      style={{ backgroundColor: getBgColor(p.tab.id) }}
      className={CL("inbox-item draggable-item", {
        "active": showMenu
      })}
      data-id={p.tab.id}
      onContextMenu={onTabContextMenu}
    >
      <img src={p.tab.favIconUrl} alt=""/>
      <div className="inbox-item__text">
        <div className="inbox-item__title"
             title={p.tab.title}
             dangerouslySetInnerHTML={hlSearch(shortenedTitle, p.search)}/>
        <div className="inbox-item__url"
             title={p.tab.url}
             dangerouslySetInnerHTML={hlSearch(domain, p.search)}/>
        {
          folderTitles
            ? <div className="inbox-item__already-saved">Already saved in {folderTitles}</div>
            : null
        }
      </div>
      <div onClick={() => p.onCloseTab(p.tab.id!)} className="inbox-item__close stop-click-propagation2 stop-dad-propagation" title="Close tab">⨉</div>
      {
        folderTitles ? <IconSaved className="saved-tab-icon"></IconSaved> : null
      }

      {showMenu ? (
        <DropdownMenu onClose={hideMenu} className="stop-dad-propagation" offset={{top: -16, left: -8}}>
          {
            p.spaces.length === 1
              ? (<DropdownSubMenu
                menuId={1}
                title={"Save to"}
                submenuContent={getFoldersList(p.spaces[0], moveToFolder, moveToNewFolder)}
              />)
              : p.spaces.map(s => {
                return <DropdownSubMenu
                  menuId={s.id}
                  title={`Save to "${s.title}"`}
                  submenuContent={getFoldersList(s, moveToFolder, moveToNewFolder)}
                />
              })
          }

          <button className="dropdown-menu__button focusable" onClick={onMenuCopyClicked}>
            Copy url
          </button>
          <button className="dropdown-menu__button dropdown-menu__button--dander focusable" onClick={onMenuCloseClicked}>
            Close tab
          </button>
        </DropdownMenu>
      ) : null}
    </div>
  )
}

function findFoldersTitlesWhereTabSaved(curTab: Tab, spaces: ISpace[]): string {
  let res: string[] = []
  spaces.forEach((space) => {
    const titles = space.folders
      .filter(folder => folder.items.some((item: IFolderItem) => item.url === curTab.url))
      .map(folder => `«${folder.title}»`)
    res.push(...titles)
  })
  return res.join(", ")

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