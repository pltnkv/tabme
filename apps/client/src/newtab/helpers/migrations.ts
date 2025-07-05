import { IBookmarkItem, IFolder, IFolderItem, IGroupItem, ISpace } from "./types"
import { genUniqLocalId } from "../state/actionHelpers"
import { insertBetween, regeneratePositions } from "./fractionalIndexes"
import { IStoredAppState } from "../state/storage"

// TODO remove in JUNE WHEN EVERYONE has version more than v1.30
////////////////////////////////////////////////
// migration from folders to spaces with string-positions
////////////////////////////////////////////////
export function migrateToSpaces_state(state: IStoredAppState) {
  if (Array.isArray(state.folders)) {
    state.spaces = migrateFromFoldersToSpaces(state.folders)
    state.folders = null! // to prevent the next migrations
    state.version = 2
  }
}

export function migrateFromFoldersToSpaces(oldFolders: IFolder[]): ISpace[] {
  const initSpace: ISpace = {
    id: genUniqLocalId(),
    title: "Bookmarks",
    folders: regeneratePositions(oldFolders.map(f => {
      return {
        ...f,
        items: regeneratePositions(f.items).map(i => {
          i.type = "bookmark"
          return i
        })
      }
    })),
    position: insertBetween("", "")
  }
  return [initSpace]
}

////////////////////////////////////////////////
// migration from sections to groups
////////////////////////////////////////////////

export function migrateSectionsToGroups_state(state: IStoredAppState) {
  if (state.version < 3) {
    migrateSectionsToGroups(state.spaces)
    state.version = 3
  }
}

/**
 * it modifies original spaces array instance
 * @param spaces
 */
export function migrateSectionsToGroups(spaces: ISpace[]): ISpace[] {
  spaces.forEach(s => {
    s.folders.forEach(f => {
      const newFolderItems: IFolderItem[] = []
      let lastGroup: IGroupItem | undefined = undefined
      f.items.forEach(i => {
        if ((i as IBookmarkItem).isSection) {
          lastGroup = {
            id: i.id,
            type: "group",
            position: i.position,
            title: i.title,
            collapsed: (i as IGroupItem).collapsed,
            groupItems: []
          }
          newFolderItems.push(lastGroup)
        } else {
          const newBookmarkItem: IBookmarkItem = {
            id: i.id,
            type: "bookmark",
            position: i.position,
            title: i.title,
            favIconUrl: (i as IBookmarkItem).favIconUrl,
            url: (i as IBookmarkItem).url
          }
          if (lastGroup) {
            lastGroup.groupItems.push(newBookmarkItem)
          } else {
            newFolderItems.push(newBookmarkItem)
          }
        }
        f.items = newFolderItems
      })
    })
  })
  return spaces
}