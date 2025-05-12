import { IFolder } from "../newtab/helpers/types"

export function isTabAlreadySavedInFolder(folder: IFolder, url: string): boolean {
  return folder.items.some(i => i.url === url)
}