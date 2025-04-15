import React, { useContext, useEffect, useState } from "react"
import { IFolderItem, ISpace } from "../helpers/types"
import { findTabsByURL, isFolderItemNotUsed } from "../helpers/utils"
import { EditableTitle } from "./EditableTitle"
import { Action } from "../state/state"
import { DispatchContext } from "../state/actions"
import { CL } from "../helpers/classNameHelper"
import IconClose from "../icons/close.svg"
import IconMore from "../icons/more.svg"
import { FolderItemMenu } from "./dropdown/FolderItemMenu"
import { trackStat } from "../helpers/stats"
import { getBrokenImgSVG, loadFaviconUrl } from "../helpers/faviconUtils"
import { RecentItem } from "../helpers/recentHistoryUtils"
import Tab = chrome.tabs.Tab

export const FolderItem = React.memo((p: {
  spaces: ISpace[];
  item: IFolderItem;
  inEdit: boolean
  tabs: Tab[];
  recentItems: RecentItem[];
  showNotUsed: boolean;
  search: string;
  hiddenFeatureIsEnabled: boolean
}) => {
  const dispatch = useContext(DispatchContext)
  const [showMenu, setShowMenu] = useState<boolean>(false)
  const [localTitle, setLocalTitle] = useState<string>(p.item.title)

  useEffect(() => {
    // to support UNDO operation
    setLocalTitle(p.item.title)
  }, [p.item.title])

  function trySaveTitleAndURL(newTitle: string, newUrl?: string) {
    const titleChanged = p.item.title !== newTitle
    const urlChanged = newUrl && p.item.url !== newUrl
    if (titleChanged || urlChanged) {
      dispatch({
        type: Action.UpdateFolderItem,
        itemId: p.item.id,
        title: newTitle,
        url: newUrl ?? p.item.url
      })

      if (urlChanged) {
        loadFaviconUrl(newUrl).then(faviconUrl => {
          dispatch({
            type: Action.UpdateFolderItem,
            itemId: p.item.id,
            favIconUrl: faviconUrl
          })
        })
      }
    }
  }

  function setEditing(val: boolean) {
    dispatch({
      type: Action.UpdateAppState,
      newState: { itemInEdit: val ? p.item.id : undefined }
    })
  }

  function onContextMenu(e: React.MouseEvent) {
    setShowMenu(true)
    e.preventDefault()
  }

  function onCloseTab() {
    const tabs = findTabsByURL(p.item.url, p.tabs)
    const tabIds = tabs.filter(t => t.id).map(t => t.id!)
    dispatch({
      type: Action.CloseTabs,
      tabIds: tabIds
    })
    trackStat("tabClosed", { source: "bookmarks" })
  }

  function handleImageError(e: React.SyntheticEvent) {
    const imgElement = e.target as HTMLImageElement
    imgElement.src = getBrokenImgSVG()
  }

  const folderItemOpened = findTabsByURL(p.item.url, p.tabs).length !== 0

  return (
    <div className={
      CL("folder-item", {
        "section": p.item.isSection,
        "selected": showMenu,
        "archived": p.item.archived
      })}>
      {showMenu
        ? <FolderItemMenu
          spaces={p.spaces}
          item={p.item}
          hiddenFeatureIsEnabled={p.hiddenFeatureIsEnabled}
          localTitle={localTitle}
          setLocalTitle={setLocalTitle}
          onSave={trySaveTitleAndURL}
          onClose={() => setShowMenu(false)}/>
        : null
      }
      <button className="folder-item__menu"
              onContextMenu={onContextMenu}
              onClick={() => setShowMenu(!showMenu)}>
        <IconMore/>
      </button>

      <a className={
        CL("folder-item__inner draggable-item", {
          "section": p.item.isSection,
          "open": folderItemOpened
        })
      }
         onDragStart={(e) => {e.preventDefault()}} // to prevent text drag-and-drop in the textarea
         tabIndex={2}
         data-id={p.item.id}
         onClick={e => e.preventDefault()}
         title={p.item.url}
         href={p.item.url}
         onContextMenu={onContextMenu}>
        <img src={p.item.favIconUrl} alt="" onError={handleImageError}/>
        <EditableTitle className={CL("folder-item__inner__title", {
          "not-used": p.showNotUsed && isFolderItemNotUsed(p.item, p.recentItems)
        })}
                       inEdit={p.inEdit}
                       setEditing={setEditing}
                       localTitle={localTitle}
                       setLocalTitle={setLocalTitle}
                       onSaveTitle={trySaveTitleAndURL}
                       search={p.search}
        />
        {
          folderItemOpened ? <button className="btn__close-tab stop-dad-propagation"
                                     tabIndex={2}
                                     title="Close tab"
                                     onClick={onCloseTab}>
            <IconClose></IconClose>
          </button> : null
        }
      </a>
    </div>
  )
})