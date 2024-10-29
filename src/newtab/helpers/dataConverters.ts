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

  //todo remove anu later
  return sortByPosition(sortedFolder as any) as any
}