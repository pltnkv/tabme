import React, { memo, useContext, useEffect, useState } from "react"
import { blurSearch, convertTabToItem, createNewSection, extractHostname, filterTabsBySearch, hlSearch, removeUselessProductName, SECTION_ICON_BASE64 } from "../helpers/utils"
import { bindDADItemEffect, getDraggedItemId } from "../helpers/dragAndDropItem"
import { createFolder, getCanDragChecker, showMessage } from "../helpers/actionsHelpers"
import { IFolder, IFolderItem } from "../helpers/types"
import { DispatchContext, wrapIntoTransaction } from "../state/actions"
import { Action } from "../state/state"
import Tab = chrome.tabs.Tab

export const SidebarOpenTabs = memo((props: {
  search: string;
  tabs: Tab[]
  folders: IFolder[];
  lastActiveTabIds: number[]
  currentWindowId: number | undefined
}) => {
  const dispatch = useContext(DispatchContext)
  const [mouseDownEvent, setMouseDownEvent] = useState<React.MouseEvent | undefined>(undefined)

  useEffect(() => {
    if (mouseDownEvent) {
      const dispatchDraggingStop = () => {
        dispatch({
          type: Action.UpdateAppState,
          newState: {
            sidebarItemDragging: false
          }
        })
      }

      const onDrop = (folderId: number, itemIdInsertBefore: number | undefined, targetTabsIds: number[]) => {
        const targetTabId = targetTabsIds[0] // we support D&D only single element from sidebar
        const tab = props.tabs.find((t) => t.id === targetTabId)

        if (folderId === -1) { // we need to create new folder first
          folderId = createFolder(dispatch)
        }

        if (tab && tab.id) { // Add existing Tab
          wrapIntoTransaction(() => {
            const item = convertTabToItem(tab)
            dispatch({
              type: Action.CreateFolderItem,
              folderId,
              itemIdInsertBefore,
              item
            })

            dispatch({
              type: Action.UpdateAppState,
              newState: {
                itemInEdit: item.id
              }
            })
          })
        } else { // Add section
          wrapIntoTransaction(() => {

            const newSection = createNewSection()
            dispatch({
              type: Action.CreateFolderItem,
              folderId,
              itemIdInsertBefore,
              item: newSection
            })
            dispatch({
              type: Action.UpdateAppState,
              newState: { itemInEdit: newSection.id }
            })
          })
        }
        setMouseDownEvent(undefined)
        dispatchDraggingStop()
      }
      const onCancel = () => {
        setMouseDownEvent(undefined)
        dispatchDraggingStop()
      }
      const onClick = (tabId: number) => {
        const tab = props.tabs.find(t => t.id === tabId)
        chrome.tabs.update(tabId, { active: true })
        if (tab) {
          chrome.windows.update(tab.windowId, { focused: true })
        }
        dispatchDraggingStop()
      }
      const onDragStarted = () => {
        // dispatch({
        //   type: Action.UpdateAppState,
        //   newState: {
        //     sidebarItemDragging: true
        //   }
        // })
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
    blurSearch(e)
    const target = e.target as HTMLElement | undefined
    if (target && target.classList.contains("inbox-item__close")) {
      return
    }
    setMouseDownEvent(e)
  }

  function getTabIdFromCloseButton(target: HTMLElement): number {
    return getDraggedItemId(target.parentElement!)
  }

  function onCloseTab(e: React.MouseEvent) {
    dispatch({
      type: Action.CloseTabs,
      tabIds: [getTabIdFromCloseButton(e.target as HTMLElement)]
    })
    showMessage("Tab has been closed", dispatch)
  }

  // const openTabs = props.tabs.filter(filterNonImportant).map((t) => {
  const tabsByWindows: Map<number, Tab[]> = new Map()
  filterTabsBySearch(props.tabs, props.search).forEach(t => {
    let tabsInWindow = tabsByWindows.get(t.windowId)
    if (!tabsInWindow) {
      tabsInWindow = []
      tabsByWindows.set(t.windowId, tabsInWindow)
    }
    tabsInWindow.push(t)
  })

  const sortedWindowsWithTabs = getSortedWindowsWithTabs(tabsByWindows, props.currentWindowId)

  const openTabs = filterTabsBySearch(props.tabs, props.search).map(t => {
    return
  })

  const SectionItem = <div
    className="inbox-item draggable-item"
    data-id={0}
  >
    <img src={SECTION_ICON_BASE64} alt=""/>
    <div className="inbox-item__text">
      <div className="inbox-item__title">Header</div>
      <div className="inbox-item__url">Drag to create new one</div>
    </div>
  </div>

  return (
    <div className="inbox-box" onMouseDown={onMouseDown}>
      {
        sortedWindowsWithTabs.length === 1 ?
          sortedWindowsWithTabs[0].tabs.map((t) => getTabView(t, props.lastActiveTabIds[0], props.folders, props.search, onCloseTab))
          :
          sortedWindowsWithTabs.map((window, index) => {
            return <div key={window.windowId}>
              <div className="window-name">{index === 0 ? "current window" : "window"}</div>
              {window.tabs.map((t) => getTabView(t, props.lastActiveTabIds[0], props.folders, props.search, onCloseTab))}
            </div>
          })

      }
      {openTabs.length === 0 && props.search === "" ? <p className="no-opened-tabs">...are displayed here.<br/> Pinned tabs are filtered out.</p> : null}
      {
        /* disabled it because it looks wierd with several Windows */
        /*{props.search === "" ? SectionItem : null}*/
      }
    </div>
  )
})

function getTabView(t: Tab, lastActiveTabIds: number, folders: IFolder[], search: string, onCloseTab: (e: React.MouseEvent) => void) {
  function getBgColor(tabId?: number): string {
    if (tabId && lastActiveTabIds === tabId) {
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

  let shortenedTitle = removeUselessProductName(t.title)
  let domain = extractHostname(t.url)
  const folderTitles = findFoldersTitlesWhereTabSaved(t, folders)

  return (<div
    key={t.id}
    style={{ backgroundColor: getBgColor(t.id) }}
    className="inbox-item draggable-item"
    data-id={t.id}
  >
    <img src={t.favIconUrl} alt=""/>
    <div className="inbox-item__text">
      <div className="inbox-item__title"
           title={t.title}
           dangerouslySetInnerHTML={hlSearch(shortenedTitle, search)}/>
      <div className="inbox-item__url"
           title={t.url}
           dangerouslySetInnerHTML={hlSearch(domain, search)}/>
      {
        folderTitles
          ? <div className="inbox-item__already-saved">Already saved in {folderTitles}</div>
          : null
      }
    </div>
    <div onClick={onCloseTab} className="inbox-item__close">⨉</div>
  </div>)

}

function findFoldersTitlesWhereTabSaved(curTab: Tab, folders: IFolder[]): string {
  return folders
    .filter(folder => folder.items.some((item: IFolderItem) => item.url === curTab.url))
    .map(folder => `«${folder.title}»`)
    .join(", ")
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