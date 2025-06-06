import { convertTabToItem, updateFolder } from "../newtab/state/actionHelpers"
import { addItemsToFolder } from "../newtab/helpers/fractionalIndexes"
import { ISpace } from "../newtab/helpers/types"
import { saveState } from "../newtab/state/storage"
import Tab = chrome.tabs.Tab
import { trackStat } from "../newtab/helpers/stats"

export function saveNewTabToFolder(state: { spaces: ISpace[] }, savedTab: Tab, folderId: number):number {
  const item = convertTabToItem(savedTab)
  const spaces = updateFolder(state.spaces, folderId, (folder) => {
    const items = addItemsToFolder([item], folder.items, undefined)
    return {
      ...folder,
      items
    }
  })

  saveState({ spaces })

  trackStat("tabsSaved", { source: "popup" })

  return item.id
}
