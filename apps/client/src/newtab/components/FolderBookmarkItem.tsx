import React, { useContext, useEffect, useState } from "react"
import { IBookmarkItem, ISpace } from "../helpers/types"
import { findTabsByURL, isBookmarkItem, isBookmarkItemNotUsed } from "../helpers/utils"
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
import { getTooltipForBookmark } from "../helpers/debugTooltips"

export const FolderBookmarkItem = React.memo((p: {
  spaces: ISpace[]; // todo dont pass
  item: IBookmarkItem;
  inEdit: boolean
  tabs: Tab[]; // todo dont pass
  recentItems: RecentItem[]; // todo dont pass
  showNotUsed: boolean;
  search: string;
  isBeta: boolean
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
        props: {
          title: newTitle,
          url: newUrl ?? p.item.url
        }
      })

      if (urlChanged) {
        loadFaviconUrl(newUrl).then(faviconUrl => {
          dispatch({
            type: Action.UpdateFolderItem,
            itemId: p.item.id,
            props:{favIconUrl: faviconUrl}
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

  const folderItemOpened = isBookmarkItem(p.item) && findTabsByURL(p.item.url, p.tabs).length !== 0

  return (
    <div className={CL("folder-item", { "selected": showMenu })}
         data-id={p.item.id}
    >
      {showMenu
        ? <FolderItemMenu
          spaces={p.spaces}
          item={p.item}
          localTitle={localTitle}
          setLocalTitle={setLocalTitle}
          onSave={trySaveTitleAndURL}
          onClose={() => setShowMenu(false)}
          isBeta={p.isBeta}
        />
        : null
      }
      <button className="folder-item__menu"
              onContextMenu={onContextMenu}
              onClick={() => setShowMenu(!showMenu)}>
        <IconMore/>
      </button>

      <a className={
        CL("folder-item__inner draggable-item", {
          "open": folderItemOpened
        })
      }
         onDragStart={(e) => {e.preventDefault()}} // to prevent text drag-and-drop in the textarea
         tabIndex={2}
         data-id={p.item.id}
         onClick={e => e.preventDefault()}
         data-tooltip={p.item.title}
         data-tooltip-more={getTooltipForBookmark(p.item)}
         data-tooltip-position="top-left"
         href={p.item.url}
         onContextMenu={onContextMenu}>
        <img src={p.item.favIconUrl} alt="" onError={handleImageError}/>


        <EditableTitle className={CL("folder-item__inner__title", {
          "not-used": p.showNotUsed && isBookmarkItemNotUsed(p.item, p.recentItems)
        })}
                       inEdit={p.inEdit}
                       setEditing={setEditing}
                       value={localTitle}
                       setNewValue={setLocalTitle}
                       onSaveTitle={trySaveTitleAndURL}
                       search={p.search}
        />
        {
          folderItemOpened ? <button className="btn__close-tab stop-dad-propagation"
                                     tabIndex={2}
                                     data-tooltip="Close tab"
                                     data-tooltip-position="top-center"
                                     onClick={onCloseTab}>
            <IconClose/>
          </button> : null
        }
      </a>
    </div>
  )
})