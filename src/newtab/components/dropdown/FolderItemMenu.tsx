import React, { useContext, useEffect, useState } from "react"
import { IFolderItem, ISpace } from "../../helpers/types"
import { DropdownMenu, DropdownSubMenu } from "./DropdownMenu"
import { getSelectedItems } from "../../helpers/selectionUtils"
import { Action } from "../../state/state"
import { DispatchContext, mergeStepsInHistory } from "../../state/actions"
import { getSpacesWithNestedFoldersList } from "./moveToHelpers"
import { createFolderWithStat, showMessage, showMessageWithUndo } from "../../helpers/actionsHelpersWithDOM"
import { findFolderByItemId } from "../../state/actionHelpers"
import { scrollElementIntoView } from "../../helpers/utils"
import { trackStat } from "../../helpers/stats"

export const FolderItemMenu = React.memo((p: {
  spaces: ISpace[],
  localTitle: string,
  setLocalTitle: (val: string) => void
  onSave: (title: string, url: string) => void,
  onClose: () => void,
  item: IFolderItem;
  hiddenFeatureIsEnabled: boolean
}) => {
  const dispatch = useContext(DispatchContext)
  const [selectedItems, setSelectedItems] = useState<IFolderItem[]>([])
  const [localURL, setLocalURL] = useState<string>(p.item.url)

  useEffect(() => {
    const items = getSelectedItems()
    if (items.length > 0) {
      setSelectedItems(items)
    } else {
      setSelectedItems([p.item])
    }
  }, [])

  // support multiple
  function onOpenNewTab() {
    selectedItems.forEach((item) => {
      if (item.url) {
        chrome.tabs.create({ url: item.url })
      }
    })

    p.onClose()
  }

  // support multiple
  function onDeleteItem() {
    dispatch({
      type: Action.DeleteFolderItems,
      itemIds: selectedItems.map(i => i.id)
    })
    showMessageWithUndo("Bookmark has been deleted", dispatch)
  }

  function onCopyUrl() {
    navigator.clipboard.writeText(p.item.url)
    p.onClose()
    showMessage("URL has been copied", dispatch)
  }

  // support multiple
  function onArchive() {
    mergeStepsInHistory((historyStepId) => {
      selectedItems.forEach((item) => {
        dispatch({
          type: Action.UpdateFolderItem,
          itemId: item.id,
          archived: true,
          historyStepId
        })
      })
    })
    showMessageWithUndo("Bookmark has been hidden", dispatch)
    trackStat('bookmarksHidden', {})
  }

  function onRestore() {
    mergeStepsInHistory((historyStepId) => {
      selectedItems.forEach((item) => {
        dispatch({
          type: Action.UpdateFolderItem,
          itemId: item.id,
          archived: false,
          historyStepId
        })
      })
    })
    showMessage("Bookmark has been restored", dispatch)
  }

  function onSaveAndClose() {
    p.onSave(p.localTitle, localURL)
    p.onClose()
  }

  const moveToFolder = (folderId: number) => {

    dispatch({
      type: Action.MoveFolderItems,
      itemIds: [p.item.id],
      targetFolderId: folderId,
      insertBeforeItemId: undefined
    })

    showMessage("Bookmarks has been moved", dispatch) // todo place all texts in a single file

    scrollElementIntoView(`a[data-id="${p.item.id}"]`)

    p.onClose()
  }

  const moveToNewFolder = (spaceId: number) => {
    mergeStepsInHistory((historyStepId) => {
      const folderId = createFolderWithStat(dispatch, {historyStepId, spaceId}, 'by-move-to-new-folder')
      dispatch({
        type: Action.MoveFolderItems,
        itemIds: [p.item.id],
        targetFolderId: folderId,
        insertBeforeItemId: undefined,
        historyStepId
      })
    })

    showMessage("Bookmarks has been moved", dispatch)

    p.onClose()
  }

  return <>
    {
      selectedItems.length > 1 ?
        <DropdownMenu onClose={p.onClose} className={"dropdown-menu--folder-item"} offset={{ top: 5 , bottom: 32}}>
          <button className="dropdown-menu__button focusable" onClick={onOpenNewTab}>Open in New Tab</button>
          {
            p.hiddenFeatureIsEnabled ? (selectedItems.some(item => item.archived)
                ?
                <button className="dropdown-menu__button focusable" onClick={onRestore}>Unhide</button>
                :
                <button className="dropdown-menu__button focusable" onClick={onArchive}>Hide</button>
            ) : null
          }

          <button className="dropdown-menu__button dropdown-menu__button--dander focusable" onClick={onDeleteItem}>Delete</button>
        </DropdownMenu>
        :
        <>
          {p.item.isSection ?
            <DropdownMenu onClose={onSaveAndClose} className={"dropdown-menu--folder-item dropdown-menu--folder-section"} offset={{ top: 13, bottom: 32 }}>
              <label className="input-label">
                <span>Title</span>
                <input
                  type="text"
                  className="focusable"
                  autoFocus={true}
                  value={p.localTitle}
                  onChange={e => p.setLocalTitle(e.target.value)}/>
              </label>
              {
                p.hiddenFeatureIsEnabled ? (
                  p.item.archived
                    ? <button className="dropdown-menu__button focusable" onClick={onRestore}>Unhide</button>
                    : <button className="dropdown-menu__button focusable" onClick={onArchive}>Hide</button>
                ) : null
              }
              <button className="dropdown-menu__button dropdown-menu__button--dander focusable" onClick={onDeleteItem}>Delete</button>
            </DropdownMenu>
            :
            <DropdownMenu onClose={onSaveAndClose} className={"dropdown-menu--folder-item"} offset={{ top: 5, bottom: 32 }} width={334}>
              <label className="input-label">
                <span>Title</span>
                <input type="text"
                       className="focusable"
                       autoFocus={true}
                       value={p.localTitle}
                       onChange={e => p.setLocalTitle(e.target.value)}/>
              </label>
              <label className="input-label">
                <span>URL</span>
                <input type="text"
                       className="focusable"
                       value={localURL}
                       onChange={e => setLocalURL(e.target.value)}/>
              </label>
              <button className="dropdown-menu__button focusable" onClick={onOpenNewTab}>Open in New Tab</button>
              <button className="dropdown-menu__button focusable" onClick={onCopyUrl}>Copy url</button>
              {
                p.hiddenFeatureIsEnabled ? (
                  p.item.archived
                    ? <button className="dropdown-menu__button focusable" onClick={onRestore}>Unhide</button>
                    : <button className="dropdown-menu__button focusable" onClick={onArchive}>Hide</button>
                ) : null
              }
              <DropdownSubMenu
                menuId={1}
                title={"Move to"}
                submenuContent={getSpacesWithNestedFoldersList(p.spaces, moveToFolder, moveToNewFolder, findFolderByItemId(p, p.item.id)?.id)}
              />
              <button className="dropdown-menu__button dropdown-menu__button--dander focusable" onClick={onDeleteItem}>Delete</button>
            </DropdownMenu>
          }
        </>
    }
  </>
})