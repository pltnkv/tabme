import { IFolderItemToCreate } from "./types"
import { Action } from "../state/state"
import { ActionDispatcher } from "../state/actions"
import { createNewFolderItem, createNewSection, genUniqLocalId } from "../state/actionHelpers"

export function createWelcomeFolder(dispatch: ActionDispatcher) {
    const defaultSpaceId = genUniqLocalId()
    dispatch({ type: Action.CreateSpace, spaceId: defaultSpaceId, title: "Bookmarks" })
    dispatch({ type: Action.SelectSpace, spaceId: defaultSpaceId })

    const items: IFolderItemToCreate[] = []
    const favIconUrl = chrome.runtime.getURL("icon_32.png")
    items.push(createNewFolderItem("https://www.youtube.com/watch?v=kxb0zG4a5MM", "Watch key features overview", 'https://www.gstatic.com/youtube/img/creator/favicon/favicon_32_v2.png'))
    items.push(createNewFolderItem("https://www.youtube.com/watch?v=9jZCsg8lF8o", "How to use Sticky Notes", 'https://www.gstatic.com/youtube/img/creator/favicon/favicon_32_v2.png'))
    items.push(createNewFolderItem("https://gettabme.com/faq.html", "Tabme FAQ", favIconUrl))
    items.push(createNewSection("HOW TO USE: \n\n"
      + "— Drag and drop Tabs from the sidebar \n"
      + "into a Folder to save \n\n"
      + "— Drag and drop Folders by title to sort\n\n"
      + "— Multiselect bookmarks by click and drag \nstarting empty space \n\n"
      + "— Use context menu by right mouse click \nto see more options"))
    dispatch({ type: Action.CreateFolder, newFolderId: genUniqLocalId(), title: "Welcome to Tabme", items, color: "#A0F3A2" })
}
