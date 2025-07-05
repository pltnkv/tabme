import { IFolder } from "../newtab/helpers/types"
import { isBookmarkItem } from "../newtab/helpers/utils"

export function isTabAlreadySavedInFolder(folder: IFolder, url: string): boolean {
  return folder.items.some(i => isBookmarkItem(i) && i.url === url)
}