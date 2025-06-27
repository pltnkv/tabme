import React, { useContext, useState } from "react"
import { extractHostname, hlSearch, removeUselessProductName, scrollElementIntoView } from "../helpers/utils"
import { DropdownMenu, DropdownSubMenu } from "./dropdown/DropdownMenu"
import { CL } from "../helpers/classNameHelper"
import { Action } from "../state/state"
import { DispatchContext, mergeStepsInHistory } from "../state/actions"
import { convertTabOrRecentToItem, isTabData, ITabOrRecentItem } from "../state/actionHelpers"
import { createFolderWithStat, showMessage } from "../helpers/actionsHelpersWithDOM"
import { IFolderItem, ISpace } from "../helpers/types"
import IconSaved from "../icons/saved.svg"
import { getFoldersList } from "./dropdown/moveToHelpers"
import { getBrokenImgSVG } from "../helpers/faviconUtils"
import IconClose from "../icons/close.svg"

export const TabOrRecentItem = (p: {
  data: ITabOrRecentItem,
  lastActiveTabId: number,
  spaces: ISpace[],
  search: string,
  onCloseTab?: (tabId: number) => void
}) => {
  const dispatch = useContext(DispatchContext)
  const [showMenu, setShowMenu] = useState<boolean>(false)
  const isTab = isTabData(p.data)

  const hideMenu = () => {
    setShowMenu(false)
  }

  const onTabContextMenu = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setShowMenu(true)
  }

  const onMenuCloseClicked = (e: React.MouseEvent) => {
    if (p.onCloseTab) {
      p.onCloseTab(p.data.id!)
    }
    hideMenu()
  }

  const onMenuCopyClicked = (e: React.MouseEvent) => {
    navigator.clipboard.writeText(p.data.url ?? "")
    showMessage("URL has been copied", dispatch) // !!! place all texts in a single file
    hideMenu()
  }

  const moveToFolder = (folderId: number, spaceId: number) => {
    const item = convertTabOrRecentToItem(p.data)

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

    dispatch({
      type: Action.SelectSpace,
      spaceId
    })

    scrollElementIntoView(`a[data-id="${item.id}"]`)

    hideMenu()
  }

  function handleImageError(e: React.SyntheticEvent) {
    const imgElement = e.target as HTMLImageElement
    imgElement.src = getBrokenImgSVG()
  }

  const moveToNewFolder = (spaceId: number) => {
    mergeStepsInHistory((historyStepId) => {
      const folderId = createFolderWithStat(dispatch, { historyStepId, spaceId }, "by-save-to-new-folder") // TODO
      moveToFolder(folderId, spaceId)
    })
  }

  let shortenedTitle = removeUselessProductName(p.data.title)
  let domain = isTabData(p.data)
    ? extractHostname(p.data.url)
    : extractHostname(p.data.url) + ", " + formatDate(new Date(p.data.lastVisitTime || 0))
  const savedInFolders = findFoldersTitlesWhereTabSaved(p.data, p.spaces)

  return (
    <div
      key={p.data.id}
      className={CL("inbox-item draggable-item", {
        "active": showMenu,
        "recent-item": !isTab,
        "last-visited": p.lastActiveTabId === p.data.id,
        "is-already-saved": savedInFolders
      })}
      data-tooltip={p.data.title}
      data-tooltip-more={p.data.url}
      data-tooltip-position="top-left"
      data-id={p.data.id}
      onContextMenu={onTabContextMenu}
    >
      <img src={p.data.favIconUrl} alt="" onError={handleImageError}/>
      <div className="inbox-item__text">
        <div className="inbox-item__title" dangerouslySetInnerHTML={hlSearch(shortenedTitle, p.search)}/>
        {
          savedInFolders
            ? <div className="inbox-item__already-saved">Already saved in {savedInFolders}</div>
            : null
        }
      </div>
      {
        p.onCloseTab && <div onClick={() => p.onCloseTab!(p.data.id!)}
                             className="inbox-item__close stop-click-propagation2 stop-dad-propagation"
                             title="Close tab"><IconClose/></div>
      }

      {
        savedInFolders ? <IconSaved className="saved-tab-icon"></IconSaved> : null
      }

      {showMenu ? (
        <DropdownMenu onClose={hideMenu} className="stop-dad-propagation" offset={{ top: 8, left: -8 }}>
          <button className="dropdown-menu__button focusable" onClick={onMenuCopyClicked}>
            Copy url
          </button>
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

          {
            isTab && <button className="dropdown-menu__button dropdown-menu__button--dander focusable" onClick={onMenuCloseClicked}>
              Close tab
            </button>
          }

        </DropdownMenu>
      ) : null}
    </div>
  )
}

function findFoldersTitlesWhereTabSaved(curTab: { url?: string }, spaces: ISpace[]): string {
  let res: string[] = []
  spaces.forEach((space) => {
    const titles = space.folders
      .filter(folder => folder.items.some((item: IFolderItem) => item.url === curTab.url))
      .map(folder => `«${folder.title}»`)
    res.push(...titles)
  })
  return res.join(", ")
}

function formatDate(d: Date): string {
  const today = new Date()
  // Strip out the time part by creating new dates at midnight.
  const inputDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const yesterdayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)

  if (inputDate.getTime() === todayDate.getTime()) {
    return "Today"
  } else if (inputDate.getTime() === yesterdayDate.getTime()) {
    return "Yesterday"
  } else {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    let formatted = d.getDate() + " " + months[d.getMonth()]
    // Optionally, include the year if it is not the current year:
    if (d.getFullYear() !== today.getFullYear()) {
      formatted += " " + d.getFullYear()
    }
    return formatted
  }
}

