import { IFolderItemToCreate } from "./types"
import { Action } from "../state/state"
import { ActionDispatcher } from "../state/actions"
import { createNewFolderItem, createNewSection, createNewStickerForOnboarding, genUniqLocalId } from "../state/actionHelpers"

export function createWelcomeFolder(dispatch: ActionDispatcher) {
  const defaultSpaceId = genUniqLocalId()
  dispatch({ type: Action.CreateSpace, spaceId: defaultSpaceId, title: "Bookmarks" })
  dispatch({ type: Action.SelectSpace, spaceId: defaultSpaceId })

  const items: IFolderItemToCreate[] = []
  const favIconUrl = chrome.runtime.getURL("icon_32.png")
  items.push(createNewFolderItem("https://www.youtube.com/watch?v=kxb0zG4a5MM", "Watch Tabme features overview", "https://www.gstatic.com/youtube/img/creator/favicon/favicon_32_v2.png"))
  items.push(createNewFolderItem("https://www.youtube.com/watch?v=9jZCsg8lF8o", "How to use Sticky Notes", "https://www.gstatic.com/youtube/img/creator/favicon/favicon_32_v2.png"))
  items.push(createNewFolderItem("https://gettabme.com/faq.html", "Tabme FAQ", favIconUrl))

  items.push(createNewSection("Social media"))
  items.push(createNewFolderItem("https://www.facebook.com", "Facebook", "https://static.xx.fbcdn.net/rsrc.php/yx/r/e9sqr8WnkCf.ico"))
  items.push(createNewFolderItem("https://www.instagram.com", "Instagram", "https://www.instagram.com/static/images/ico/favicon-192.png/68d99ba29cc8.png"))
  items.push(createNewFolderItem("https://twitter.com", "Twitter (X)", "https://abs.twimg.com/favicons/twitter.3.ico"))
  items.push(createNewFolderItem("https://www.linkedin.com", "LinkedIn", "https://static.licdn.com/aero-v1/sc/h/al2o9zrvru7aqj8e1x2rzsrca"))
  items.push(createNewFolderItem("https://www.tiktok.com", "TikTok", "https://www.tiktok.com/favicon.ico"))
  items.push(createNewFolderItem("https://www.reddit.com", "Reddit", "https://www.redditstatic.com/desktop2x/img/favicon/favicon-32x32.png"))
  items.push(createNewFolderItem("https://discord.com", "Discord", "https://cdn.prod.website-files.com/6257adef93867e50d84d30e2/62fddf0fde45a8baedcc7ee5_847541504914fd33810e70a0ea73177e%20(2)-1.png"))

  items.push(createNewSection("Tools"))
  items.push(createNewFolderItem("https://www.atlassian.com/software/jira", "Jira", 'https://wac-cdn.atlassian.com/assets/img/favicons/atlassian/favicon.png'))
  items.push(createNewFolderItem("https://miro.com", "Miro", 'https://miro.com/favicon.ico'))
  items.push(createNewFolderItem("https://www.figma.com", "Figma", 'https://static.figma.com/app/icon/1/favicon.ico'))
  items.push(createNewFolderItem("https://slack.com", "Slack", 'https://a.slack-edge.com/80588/marketing/img/meta/favicon-32.png'))
  items.push(createNewFolderItem("https://www.notion.so", "Notion", 'https://www.notion.so/images/favicon.ico'))

  createNewStickerForOnboarding(dispatch, defaultSpaceId, 'Drag a tab from the sidebar to save it', 470, 230)
  createNewStickerForOnboarding(dispatch, defaultSpaceId, 'Double-click empty space to add a Sticky Note', 670, 250)

  dispatch({ type: Action.CreateFolder, newFolderId: genUniqLocalId(), title: "Welcome to Tabme", items, color: "#A0F3A2" })
}
