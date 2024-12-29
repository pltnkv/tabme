import React, { useContext, useEffect, useRef, useState } from "react"
import { showMessage } from "../helpers/actionsHelpers"
import { createNewFolderItem, genUniqId, getFavIconUrl, getTopVisitedFromHistory } from "../helpers/utils"
import { DispatchContext, wrapIntoTransaction } from "../state/actions"
import { Action, IAppState } from "../state/state"
import HistoryItem = chrome.history.HistoryItem

// copy-paste Chrome types
type CustomBookmarkTreeNode = {
  checked?: boolean
  mostVisited?: boolean

  /** Optional. The 0-based position of this node within its parent folder.  */
  index?: number;
  /** Optional. When this node was created, in milliseconds since the epoch (new Date(dateAdded)).  */
  dateAdded?: number;
  /** The text displayed for the node. */
  title: string;
  /** Optional. The URL navigated to when a user clicks the bookmark. Omitted for folders.   */
  url?: string;
  /** Optional. When the contents of this folder last changed, in milliseconds since the epoch.   */
  dateGroupModified?: number;
  /** The unique identifier for the node. IDs are unique within the current profile, and they remain valid even after the browser is restarted.  */
  id: string;
  /** Optional. The id of the parent folder. Omitted for the root node.   */
  parentId?: string;
  /** Optional. An ordered list of children of this node.  */
  children?: CustomBookmarkTreeNode[];
  /**
   * Optional.
   * Since Chrome 37.
   * Indicates the reason why this node is unmodifiable. The managed value indicates that this node was configured by the system administrator or by the custodian of a supervised
   * user. Omitted if the node can be modified by the user and the extension (default).
   */
  unmodifiable?: any;
}

type PlainListRecord = {
  breadcrumbs: CustomBookmarkTreeNode[]
  folder: CustomBookmarkTreeNode
}
type BookmarksAsPlainList = PlainListRecord[]

const recordToTitle = (rec: PlainListRecord) => {
  const res = rec.breadcrumbs.map(r => r.title).join(" / ")
  return res.length > 0 ? `${res} / ` : ""
}

const BookmarkList = (props: {
  historyItems: HistoryItem[],
  onClose: () => void
}) => {
  const dispatch = useContext(DispatchContext)
  // Refs for folder checkboxes to manipulate the DOM for indeterminate state
  const recordsRefs = useRef<HTMLInputElement[]>([])

  const [records, setPlainRecords] = useState<BookmarksAsPlainList>([])

  useEffect(() => {
    const history = getTopVisitedFromHistory(props.historyItems, 1000)

    // Fetch bookmark folders from Chrome API
    chrome.bookmarks.getTree((bookmarks) => {
      const root = bookmarks[0]
      if (root.children) {
        const plain: BookmarksAsPlainList = []
        traverseTree(root.children, plain, [], history)
        setPlainRecords(plain)
      } else {
        // No root???
      }
    })
  }, [])

  const handleFolderCheckChange = (recIndex: number, isChecked: boolean) => {
    const updatedRecords = records.map<PlainListRecord>((rec: PlainListRecord, index: number) => {
      if (index === recIndex) {
        return {
          ...rec,
          folder: {
            ...rec.folder,
            checked: isChecked,
            children: rec.folder.children?.map(item => ({ ...item, checked: isChecked }))
          }
        }
      } else {
        return rec
      }
    })

    setPlainRecords(updatedRecords)
  }

  const handleItemCheckChange = (recIndex: number, itemIndex: number, isChecked: boolean) => {
    const updatedRecords = records.map<PlainListRecord>((rec, rIndex) => {
      if (rIndex === recIndex) {
        const updatedChildren = rec.folder.children?.map((item, iIndex) => {
          if (iIndex === itemIndex) {
            return { ...item, checked: isChecked }
          }
          return item
        })
        const folderChecked = updatedChildren?.some(item => item.checked) ?? false
        return {
          ...rec,
          folder: {
            ...rec.folder,
            checked: folderChecked,
            children: updatedChildren
          }
        }
      } else {
        return rec
      }
    })

    setPlainRecords(updatedRecords)
  }

  useEffect(() => {
    // Adjust the indeterminate state based on each folder's items checked state
    records.forEach((rec, index) => {
      const allChecked = rec.folder.children?.every(item => item.checked) ?? false
      const someChecked = rec.folder.children?.some(item => item.checked) ?? false

      const folderCheckbox = recordsRefs.current[index]
      if (folderCheckbox) {
        folderCheckbox.indeterminate = someChecked && !allChecked
      }
    })
  }, [records]) // Re-run this effect when 'records' state changes

  // Initialize or clear refs dynamically based on folders length
  recordsRefs.current = records.map((_, i) => recordsRefs.current[i] ?? React.createRef())

  let selectedBookmarksCount = 0
  records.forEach(rec => {
    selectedBookmarksCount += rec.folder.children?.reduce<number>((acc, item) => item.checked ? acc + 1 : acc, 0) ?? 0
  })

  const onImport = () => {
    records.forEach(rec => {
      if (rec.folder.checked) {

        const items = rec.folder.children
          ?.filter(item => item.checked && item.url)
          .map(item => createNewFolderItem(item.url, item.title, getFavIconUrl(item.url)))

        const newFolderId = genUniqId()
        wrapIntoTransaction(() => {
          dispatch({ type: Action.CreateFolder, newFolderId, title: rec.folder.title, items })
        })
      }
      selectedBookmarksCount += rec.folder.children?.reduce<number>((acc, item) => item.checked ? acc + 1 : acc, 0) ?? 0
    })

    showMessage("Bookmarks imported", dispatch)
    props.onClose()
  }

  const onQuickImport = () => {
    let mostVisitedNum = 0
    records.forEach(rec => {
      rec.folder.children?.forEach(item => {
        if (item.mostVisited) {
          mostVisitedNum++
          rec.folder.checked = true
          item.checked = true
        }
      })
    })
    if (mostVisitedNum === 0) {
      showMessage("Sorry, \"Recently visited\" bookmarks not found", dispatch)
    } else {
      onImport()
    }
  }

  return <>
    <button className="btn__setting primary" style={{ marginLeft: 0 }} onClick={onQuickImport}>Quick import all "Recently visited"</button>
    <div className="importing-bookmarks-list">
      {records.map((rec, recIndex) => (
        <div key={rec.folder.id}>
          <label className="folder-title" title={rec.folder.url}>
            <input type="checkbox"
                   ref={el => recordsRefs.current[recIndex] = el!}
                   checked={rec.folder.checked}
                   onChange={(e) => handleFolderCheckChange(recIndex, e.target.checked)}/>
            {recordToTitle(rec)}<span>{rec.folder.title} ({rec.folder.children?.length})</span>
          </label>

          <div style={{ marginLeft: "20px" }}>
            {rec.folder.children?.map((item: CustomBookmarkTreeNode, itemIndex) => (
              <label className="imported-bookmark-child" key={item.id} title={item.url}>
                <input type="checkbox"
                       checked={item.checked}
                       onChange={(e) => handleItemCheckChange(recIndex, itemIndex, e.target.checked)}
                />
                <span className="imported-bookmark-child__text">{item.title}</span>
                {item.mostVisited ? <span className="imported-bookmark-fv">Recently visited →</span> : null}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
    <p style={{ paddingBottom: "80px", paddingTop: "40px" }}>
      {
        selectedBookmarksCount > 0
          ? <button className="btn__setting primary" onClick={onImport}>Import {selectedBookmarksCount} selected bookmarks</button>
          : <button className="btn__setting primary" disabled={true}>Select some bookmarks to import</button>
      }
      <button className="btn__setting" onClick={props.onClose}>Cancel</button>
    </p>
  </>
}

function traverseTree(nodes: CustomBookmarkTreeNode[], plainList: BookmarksAsPlainList, breadcrumbs: CustomBookmarkTreeNode[], history: HistoryItem[]) {
  nodes.forEach(node => {
    if (node.children && node.children.length > 0) {
      plainList.push({
        breadcrumbs,
        folder: node
      })
      traverseTree(node.children, plainList, [...breadcrumbs, node], history)
    } else {
      node.mostVisited = history.some(hItem => node.url && hItem.url?.includes(node.url))
    }
  })
}

export function BookmarkImporter(props: {
  appState: IAppState;
}) {

  const dispatch = useContext(DispatchContext)
  const onClose = () => {
    dispatch({ type: Action.UpdateAppState, newState: { page: "default" } })
  }

  return (
    <div className="importing-bookmarks">
      <div onClick={onClose} className="importing-bookmarks__close">⨉</div>
      <h1>Import existing bookmarks</h1>

      <p style={{ fontSize: "18px", lineHeight: "26px" }}>
        Tabme helps to keep your important links, just one-click away. <br/>
        Boost your productivity by creating a central hub for your most-used project links.<br/>
        Import only the bookmarks you use frequently to keep your workspace clean and efficient.<br/>
      </p><br/>
      <BookmarkList historyItems={props.appState.historyItems} onClose={onClose}/>
    </div>
  )
}