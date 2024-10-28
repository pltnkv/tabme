import { IFolder } from "./types"
import { genNextRuntimeId } from "./utils"
import { sortByPosition } from "./fractionalIndexes"

export function preprocessSortedFolders(sortedFolder: IFolder[]): IFolder[] {
  sortedFolder.forEach(folder => {
    folder.id = genNextRuntimeId()
    folder.items = sortByPosition(folder.items.map(item => {
      item.id = genNextRuntimeId()
      return item
    }) ?? [])
    // todo items
  })

  return sortByPosition(sortedFolder)
}