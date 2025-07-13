import React, { useContext, useEffect, useRef, useState } from "react"
import { IGroupItem, ISpace } from "../helpers/types"
import { EditableTitle } from "./EditableTitle"
import { Action } from "../state/state"
import { DispatchContext } from "../state/actions"
import { CL } from "../helpers/classNameHelper"
import IconMore from "../icons/more.svg"
import { FolderItemMenu } from "./dropdown/FolderItemMenu"
import { RecentItem } from "../helpers/recentHistoryUtils"
import IconArrowRight from "../icons/arrow-right.svg"
import IconOpenInNew from "../icons/open_in_new.svg"
import { FolderBookmarkItem } from "./FolderBookmarkItem"
import { getTooltipForGroup } from "../helpers/debugTooltips"
import { openTabsInGroup } from "../helpers/tabManagementAPI"
import { trackStat } from "../helpers/stats"

export const FolderGroupItem = React.memo((p: {
  spaces: ISpace[];
  groupItem: IGroupItem;
  itemInEdit: undefined | number,
  tabs: any[]; // Use any[] to avoid type conflicts
  recentItems: RecentItem[];
  showNotUsed: boolean;
  search: string;
  isBeta: boolean
}) => {
  const dispatch = useContext(DispatchContext)
  const [showMenu, setShowMenu] = useState<boolean>(false)
  const [localTitle, setLocalTitle] = useState<string>(p.groupItem.title)

  useEffect(() => {
    // to support UNDO operation
    setLocalTitle(p.groupItem.title)
  }, [p.groupItem.title])

  function trySaveTitleAndURL(newTitle: string) {
    const titleChanged = p.groupItem.title !== newTitle
    if (titleChanged) {
      dispatch({
        type: Action.UpdateFolderItem,
        itemId: p.groupItem.id,
        props: { title: newTitle }
      })
    }
  }

  function setEditing(val: boolean) {
    dispatch({
      type: Action.UpdateAppState,
      newState: { itemInEdit: val ? p.groupItem.id : undefined }
    })
  }

  function onContextMenu(e: React.MouseEvent) {
    setShowMenu(true)
    e.preventDefault()
  }

  const numberOfHiddenItems = p.groupItem.collapsed
    ? (Number(p.groupItem.groupItems.length) >= 0 ? ` (${p.groupItem.groupItems.length})` : "")
    : ""

  const onOpenAsGroup = () => {
    openTabsInGroup(p.groupItem.groupItems, p.groupItem.title)
    trackStat("openAllInGroup", {})
  }

  return (
    <div className={CL("folder-group", { "selected": showMenu })}
         data-id={p.groupItem.id}>

      <div className="folder-group-item__inner draggable-item"
           onDragStart={(e) => {e.preventDefault()}} // to prevent text drag-and-drop in the textarea
           data-id={p.groupItem.id}
           onClick={e => e.preventDefault()}
           onContextMenu={onContextMenu}>
        <div className="folder-group-item__header">
          {showMenu
            ? <FolderItemMenu
              spaces={p.spaces}
              item={p.groupItem}
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
          <IconArrowRight className="group-icon" style={{ transform: p.groupItem.collapsed ? undefined : "rotate(90deg)" }}/>
          <EditableTitle className={CL("folder-item__inner__title")}
                         inEdit={p.itemInEdit === p.groupItem.id}
                         setEditing={setEditing}
                         value={localTitle + numberOfHiddenItems}
                         setNewValue={setLocalTitle}
                         onSaveTitle={trySaveTitleAndURL}
                         search={p.search}
                         dataTooltip={getTooltipForGroup(p.groupItem)}
                         dataTooltipPosition="top-left"
          />
          <div className="space-filler"></div>
          {/*<button className="btn__icon open-in-new stop-dad-propagation"*/}
          {/*        onClick={onOpenAsGroup}*/}
          {/*        data-tooltip="Open as group"*/}
          {/*        data-tooltip-position="top-center">*/}
          {/*  <IconOpenInNew/>*/}
          {/*</button>*/}
        </div>

        <div className="group-items-box" data-id={p.groupItem.id}>
          {
            p.groupItem.collapsed
              ? null
              : p.groupItem.groupItems.map((nestedItem, i) => {
                return <FolderBookmarkItem
                  key={nestedItem.id}
                  spaces={p.spaces}
                  item={nestedItem}
                  inEdit={p.itemInEdit === nestedItem.id}
                  tabs={p.tabs}
                  recentItems={p.recentItems}
                  showNotUsed={p.showNotUsed}
                  search={p.search}
                  isBeta={p.isBeta}
                />
              })
          }
        </div>
      </div>
    </div>
  )
})