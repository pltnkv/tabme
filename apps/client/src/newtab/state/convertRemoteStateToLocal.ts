import { IStoredAppState, savingStateDefaultValues } from "./storage"
import { IFolder, IFolderItem, ISpace, IWidget, IWidgetContent, IWidgetPos } from "../helpers/types"
import { genUniqLocalId } from "./actionHelpers"
import { components } from "../../api/schema"
import { sortByPosition } from "../helpers/fractionalIndexes"
import { IBookmarkItem, IGroupItem } from "../helpers/types"

type RemoteUser = components["schemas"]["User"];
type RemoteUserSettings = components["schemas"]["UserSettings"];
type RemoteSpace = components["schemas"]["Space"];
type RemoteFolder = components["schemas"]["Folder"];
type RemoteItem = components["schemas"]["BookmarkItem"] & {
  type?: 'bookmark' | 'group'
  groupItems?: RemoteItem[]
};
// type RemoteSpacePosition = components["schemas"]["SpacePosition"];

// This is not in the schema for /api/sync/full, but seems to be what the server actually sends
// and what the rest of the client code expects.
interface RemoteSpacePosition {
  spaceId: string;
  position: string;
}

// This interface combines schema types with the actual expected response structure.
interface RemoteState {
  user?: RemoteUser;
  spaces?: RemoteSpace[];
  spacePositions?: RemoteSpacePosition[];
}

export function convertRemoteStateToLocal(remoteState: RemoteState): Partial<IStoredAppState> {
  const spacePositionsMap = new Map(remoteState.spacePositions?.map((p) => [p.spaceId, p.position]) ?? [])

  if (!remoteState.spaces) {
    throw new Error("Remote state does not exist")
  }

  const spaces: ISpace[] = sortByPosition(remoteState.spaces.map((remoteSpace): ISpace => {
    const folders: IFolder[] = sortByPosition((remoteSpace.folders ?? []).map((remoteFolder): IFolder => {
      const items: IFolderItem[] = sortByPosition((remoteFolder.items ?? []).map((remoteItem: RemoteItem): IFolderItem => {
        if (remoteItem.type === 'group') {
          return {
            id: genUniqLocalId(),
            type: 'group',
            remoteId: remoteItem.id as any,
            title: remoteItem.title ?? "",
            position: remoteItem.position ?? "a",
            groupItems: [] // !!!!!
            // groupItems: sortByPosition((remoteItem.groupItems ?? []).map((groupItem): IBookmarkItem => ({
            //   id: genUniqLocalId(),
            //   type: 'bookmark',
            //   remoteId: groupItem.id as any,
            //   title: groupItem.title ?? "",
            //   url: groupItem.url ?? "",
            //   favIconUrl: groupItem.favicon || "",
            //   position: groupItem.position ?? "a"
            // })))
          }
        }

        return {
          id: genUniqLocalId(),
          type: 'bookmark',
          remoteId: remoteItem.id as any,
          title: remoteItem.title ?? "",
          url: remoteItem.url ?? "",
          favIconUrl: remoteItem.favicon || "",
          position: remoteItem.position ?? "a"
        }
      }))

      return {
        id: genUniqLocalId(),
        remoteId: remoteFolder.id as any,
        title: remoteFolder.title ?? "",
        color: remoteFolder.color || undefined,
        position: remoteFolder.position ?? "a",
        items: items
      }
    }))

    const widgets: IWidget[] = (remoteSpace.widgets ?? []).map((note): IWidget => {
      const content: IWidgetContent = {
        contentType: "Sticker",
        text: note.content?.text ?? "",
        color: "#fef3c7", // schema has no color, using default
        fontSize: 14 // default value
      }
      const pos: IWidgetPos = {
        point: {
          x: note.pos?.x ?? 0,
          y: note.pos?.y ?? 0
        }
      }
      return {
        id: genUniqLocalId(),
        remoteId: note.id as any,
        widgetType: "Sticker",
        content: content,
        pos: pos,
        position: "a" // position is required by IWidget, but not in schema
      }
    })

    return {
      id: genUniqLocalId(),
      remoteId: remoteSpace.id as any,
      title: remoteSpace.title ?? "",
      position: spacePositionsMap.get(remoteSpace.id ?? "") || "a", // default position
      folders: folders,
      widgets: widgets
    }
  }))

  // const settings = remoteState.user

  const localState: Partial<IStoredAppState> = {
    spaces: spaces,
    // currentSpaceId: spaces.length > 0 ? spaces[0].id : -1,
    // sidebarCollapsed: savingStateDefaultValues.sidebarCollapsed,
    // openBookmarksInNewTab: savingStateDefaultValues.openBookmarksInNewTab,
    // colorTheme: settings?.theme === "dark" ? "dark" : "light"
    // showRecent: savingStateDefaultValues.showRecent,
    // reverseOpenTabs: settings?.reverseTabOrder ?? savingStateDefaultValues.reverseOpenTabs,
    // tooltipsEnabled: settings?.enableTooltips ?? savingStateDefaultValues.tooltipsEnabled,
    // version: 2,
    // folders: [], // legacy
    // hiddenFeatureIsEnabled: false, // default
    // betaMode: false, // default
    // availableWhatsNew: [], // default
  }

  return localState
}