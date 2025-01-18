import React, { useContext, useEffect, useState } from "react"
import { IFolderItem } from "../helpers/types"
import { DropdownMenu } from "./DropdownMenu"
import { showMessage, showMessageWithUndo } from "../helpers/actionsHelpers"
import { getSelectedItems } from "../helpers/selectionUtils"
import { Action } from "../state/state"
import { DispatchContext, wrapIntoTransaction } from "../state/actions"

export const FolderItemMenu = React.memo((p: {
  localTitle: string,
  setLocalTitle: (val: string) => void
  onSave: (title: string, url: string) => void,
  onClose: () => void,
  item: IFolderItem;
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
    wrapIntoTransaction(() => {
      dispatch({
        type: Action.DeleteFolderItems,
        itemIds: selectedItems.map(i => i.id)
      })
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
    wrapIntoTransaction(() => {
      selectedItems.forEach((item) => {
        dispatch({
          type: Action.UpdateFolderItem,
          itemId: item.id,
          archived: true
        })
      })

    })
    showMessageWithUndo("Bookmark has been hidden", dispatch)
  }

  function onRestore() {
    wrapIntoTransaction(() => {
      selectedItems.forEach((item) => {
        dispatch({
          type: Action.UpdateFolderItem,
          itemId: item.id,
          archived: false
        })
      })
    })
    showMessage("Bookmark has been restored", dispatch)
  }

  function onSaveAndClose() {
    p.onSave(p.localTitle, localURL)
    p.onClose()
  }

  return <>
    {
      selectedItems.length > 1 ?
        <DropdownMenu onClose={p.onClose} className={"dropdown-menu--folder-item"} topOffset={5}>
          <button className="dropdown-menu__button focusable" onClick={onOpenNewTab}>Open in New Tab</button>
          {
            selectedItems.some(item => item.archived)
              ?
              <button className="dropdown-menu__button focusable" onClick={onRestore}>Unhide</button>
              :
              <button className="dropdown-menu__button focusable" onClick={onArchive}>Hide</button>
          }

          <button className="dropdown-menu__button dropdown-menu__button--dander focusable" onClick={onDeleteItem}>Delete</button>
        </DropdownMenu>
        :
        <>
          {p.item.isSection ?
            <DropdownMenu onClose={onSaveAndClose} className={"dropdown-menu--folder-item dropdown-menu--folder-section"} topOffset={13}>
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
                p.item.archived
                  ? <button className="dropdown-menu__button focusable" onClick={onRestore}>Unhide</button>
                  : <button className="dropdown-menu__button focusable" onClick={onArchive}>Hide</button>
              }
              <button className="dropdown-menu__button dropdown-menu__button--dander focusable" onClick={onDeleteItem}>Delete</button>
            </DropdownMenu>
            :
            <DropdownMenu onClose={onSaveAndClose} className={"dropdown-menu--folder-item"} topOffset={5} width={334}>
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
                p.item.archived
                  ? <button className="dropdown-menu__button focusable" onClick={onRestore}>Unhide</button>
                  : <button className="dropdown-menu__button focusable" onClick={onArchive}>Hide</button>
              }
              <button className="dropdown-menu__button dropdown-menu__button--dander focusable" onClick={onDeleteItem}>Delete</button>
            </DropdownMenu>
          }
        </>
    }
  </>
})