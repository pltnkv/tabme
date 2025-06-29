import { IFolderItemToCreate } from "./types"
import { Action } from "../state/state"
import { ActionDispatcher } from "../state/actions"
import { createNewFolderItem, createNewSection, createNewStickerForOnboarding, genUniqLocalId } from "../state/actionHelpers"

export function createWelcomeSpace(dispatch: ActionDispatcher): number {
  const defaultSpaceId = genUniqLocalId()
  dispatch({ type: Action.CreateSpace, spaceId: defaultSpaceId, title: "Bookmarks" })
  dispatch({ type: Action.SelectSpace, spaceId: defaultSpaceId })
  return defaultSpaceId
}

export function createWelcomeFolder(dispatch: ActionDispatcher) {
  const defaultSpaceId = createWelcomeSpace(dispatch)
  const items: IFolderItemToCreate[] = []
  const favIconUrl = chrome.runtime.getURL("icon_32.png")
  items.push(createNewFolderItem("https://www.youtube.com/watch?v=ZRZdTgzXexo", "Watch Tabme features", "https://www.gstatic.com/youtube/img/creator/favicon/favicon_32_v2.png"))
  items.push(createNewFolderItem("https://www.youtube.com/watch?v=9jZCsg8lF8o", "How to use Sticky Notes", "https://www.gstatic.com/youtube/img/creator/favicon/favicon_32_v2.png"))
  items.push(createNewFolderItem("https://gettabme.com/guide.html", "Tabme Guide", favIconUrl))

  items.push(createNewSection("Tools"))
  items.push(createNewFolderItem("https://www.atlassian.com/software/jira", "Jira", "https://wac-cdn.atlassian.com/assets/img/favicons/atlassian/favicon.png"))
  items.push(createNewFolderItem("https://miro.com", "Miro", "https://miro.com/favicon.ico"))
  items.push(createNewFolderItem("https://www.figma.com", "Figma", "https://static.figma.com/app/icon/1/favicon.ico"))
  items.push(createNewFolderItem("https://slack.com", "Slack", "https://a.slack-edge.com/80588/marketing/img/meta/favicon-32.png"))
  items.push(createNewFolderItem("https://www.notion.so", "Notion", "https://www.notion.so/images/favicon.ico"))

  createNewStickerForOnboarding(dispatch, defaultSpaceId, "Drag a Tab from the \"Open tabs\" \nto save it", 350, 230)
  createNewStickerForOnboarding(dispatch, defaultSpaceId, "Double-click empty space to add a Sticky Note", 550, 230)

  dispatch({ type: Action.CreateFolder, newFolderId: genUniqLocalId(), title: "Welcome to Tabme", items, color: "#A0F3A2" })
}
