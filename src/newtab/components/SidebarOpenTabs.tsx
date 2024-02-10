import React, { useContext, useEffect, useState } from "react"
import {
  blurSearch,
  convertTabToItem,
  createNewSection,
  extractHostname,
  filterTabsBySearch,
  hlSearch,
  removeUselessProductName,
  SECTION_ICON_BASE64
} from "../helpers/utils"
import { bindDADItemEffect, getDraggedItemId } from "../helpers/dragAndDropItem"
import { Action, DispatchContext, IAppState } from "../state"
import { createFolder, getCanDragChecker, showMessage, showMessageWithUndo } from "../helpers/actions"
import { IFolder, IFolderItem } from "../helpers/types"
import Tab = chrome.tabs.Tab

export function SidebarOpenTabs(props: {
  search: string;
  appState: IAppState;
}) {
  const { dispatch } = useContext(DispatchContext)
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

      const onDrop = (folderId: number, itemIdInsertAfter: number | undefined, targetTabId: number) => {
        const tab = props.appState.tabs.find((t) => t.id === targetTabId)

        if (folderId === -1) { // we need to create new folder first
          folderId = createFolder(dispatch)
        }

        if (tab && tab.id) { // Add existing Tab
          dispatch({
            type: Action.AddBookmarkToFolder,
            folderId,
            itemIdInsertAfter,
            item: convertTabToItem(tab)
          })

          // TODO: ask confirmation before closing the current tab
          dispatch({
            type: Action.CloseTab,
            tabId: tab.id
          })
        } else { // Add section
          dispatch({
            type: Action.AddBookmarkToFolder,
            folderId,
            itemIdInsertAfter,
            item: createNewSection()
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
        chrome.tabs.update(tabId, { active: true })
        dispatchDraggingStop()
      }
      const onDragStarted = () => {
        dispatch({
          type: Action.UpdateAppState,
          newState: {
            sidebarItemDragging: true
          }
        })
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
    chrome.tabs.remove(getTabIdFromCloseButton(e.target as HTMLElement))
    showMessage("Tab has been closed", dispatch)
  }

  // const items = props.tabs.filter(filterNonImportant).map((t) => {
  const items = filterTabsBySearch(props.appState.tabs, props.search).map(t => {
    let titleHTML = removeUselessProductName(t.title) + (
      isTabSavedInBookmarks(t, props.appState.folders)
        ? " <b> [ ★ ]</b>"
        : "")

    //TODO experiment later
    let domain = extractHostname(t.url)
    // if(isTabSavedInBookmarks(t, props.appState.folders)) {
    //   domain = domain + ' <span style="font-size: 11px;\n'
    //     + '    vertical-align: top;\n'
    //     + '    margin-top: 1px;\n'
    //     + '    display: inline-block;">★</span>'
    // }

    return (
      <div
        key={t.id}
        className="inbox-item draggable-item"
        data-id={t.id}
      >
        <img src={t.favIconUrl}/>
        <div className="inbox-item__text">
          <div className="inbox-item__title"
               title={t.title}
               dangerouslySetInnerHTML={hlSearch(titleHTML, props.search)}></div>
          <div className="inbox-item__url"
               title={t.url}
               dangerouslySetInnerHTML={hlSearch(domain, props.search)}></div>
        </div>
        <div onClick={onCloseTab} className="inbox-item__close">⨉</div>
      </div>
    )
  })

  const SectionItem = <div
    className="inbox-item draggable-item"
    data-id={0}
  >
    <img src={SECTION_ICON_BASE64}/>
    <div className="inbox-item__text">
      <div className="inbox-item__title">Section</div>
      <div className="inbox-item__url">Drag to create new one</div>
    </div>
  </div>

  return (
    <div className="inbox-box" onMouseDown={onMouseDown}>
      {items}
      {items.length === 0 && props.search === "" ? <p className="no-opened-tabs">...will display here</p> : null}
      {props.appState.search.length === 0 ? SectionItem : null}
    </div>
  )
}

function isTabSavedInBookmarks(curTab: Tab, folders: IFolder[]): boolean {
  return folders.some(folder => {
    return folder.items.some((item: IFolderItem) => item.url === curTab.url)
  })
}
