import mixpanel from "mixpanel-browser"

function generateUUID(): string {
  return crypto.randomUUID()
}

function getUserStatId(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.sync.get("userStatId", (data) => {
      if (!data.userStatId) {
        const userStatId = generateUUID()
        chrome.storage.sync.set({ userStatId }, () => {
          console.log("Generated new userStatID:", userStatId)
          resolve(userStatId)
        })
      } else {
        console.log("Existing userStatID:", data.userStatId)
        resolve(data.userStatId)
      }
    })
  })
}

export function initStats(): Promise<void> {
  return new Promise((resolve) => {
    try {
      mixpanel.init(process.env.MIXPANEL_TOKEN, {
        autocapture: false,
        debug: process.env.NODE_ENV === "development"
      })

      getUserStatId().then(id => {
        mixpanel.identify(id)
        resolve()
      })
    } catch (e) {
      console.error(e)
      resolve()
    }
  })

}

//Key flows

// Open saved tab
// savedTabOpened
// Save new tab
// tabSaved
//
//
// bookmark
// bookmarkDragged
// selectedBookmarksCount
// bookmarkDeleted
// bookmarkRenamed
// bookmarksSelected
// selectedBookmarksCount
// section
// sectionCreated
// sectionDeleted
// folder
// folderCreated
// folderColorChanged
// color
// folderDragged
// folderDeleted
//

// Search
// ???
//
//
// Configure settings
// ???
//
// Error tracking

export type CommonStatProps = {
  zTotalOpenTabsCount: number
  zTotalBookmarksCount: number
  zTotalFoldersCount: number
  zTotalSpacesCount: number
  zTotalWindowsCount: number
  zTabmeType: string
  zColorTheme: string
  zSidebarCollapsed: boolean
}

type EventOptionsMap = {
  appLoaded: {}

  // WELCOME
  welcomeStep: { welcomeStepName: string };
  welcomeCompleted: {};

  // IMPORT / EXPORT
  importedBrowserBookmarks: { count: number };
  importedTobyBookmarks: { count: number };
  importedTabmeBookmarks: { version: string };

  // TABS
  tabOpened: { inNewTab: boolean }; // it means bookmark clicked
  tabFocused: { source: string }
  tabClosed: { source: string }
  tabsDeduplicated: { count: number };
  tabsStashed: { stashedTabsClosed: boolean };

  // SPACES
  // todo later

  // BOOKMARKS
  bookmarksHidden: {}

  // FOLDER
  folderCreated: { source: string }
  // todo add more later

  // BOOKMARKS EDITING

  // UI SETTINGS
  "toggleSidebar": { sidebarCollapsed: boolean };
  "settingsClicked": { settingName: string },

  // BETA
  "betaModalShown": {},
  "betaModalClosed": {},
  "betaModalJoined": { email: string },
  "betaLeaveModalShown": {},
  "betaStopped": {},
};

let commonProps: Partial<CommonStatProps> = {
  zTabmeType: __OVERRIDE_NEWTAB ? "newtab" : "overrideless"
}

export function setCommonStatProps(props: Partial<CommonStatProps>) {
  commonProps = {
    ...commonProps,
    ...props
  }
}

export function trackStat<T extends keyof EventOptionsMap>(
  eventName: T,
  opt: EventOptionsMap[T]
): void {
  try {
    console.log("TRACK", eventName, opt, commonProps)
    if (process.env.NODE_ENV !== "development") {
      mixpanel.track(eventName, { ...commonProps, ...opt })
    }
  } catch (e) {
    console.error(e)
  }
}

