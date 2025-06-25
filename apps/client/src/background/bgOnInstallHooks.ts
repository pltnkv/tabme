export function initBgOnInstallHooks(bc:BroadcastChannel) {

  ////////////////////////////////////////////////////////
  // clicking on extension icon
  ////////////////////////////////////////////////////////
  // chrome.runtime.onInstalled.addListener(() => {
  //   chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  // });


  ////////////////////////////////////////////////////////
  // opening tabme when extension was installed
  ////////////////////////////////////////////////////////
  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
      chrome.tabs.create({ url: chrome.runtime.getURL("newtab.html") }, (tab) => {
        if (!__OVERRIDE_NEWTAB) {
          chrome.tabs.update(tab.id!, { pinned: true })
        }
      })
    }
  })

  ////////////////////////////////////////////////////////
  // opening feedback when uninstall extension
  ////////////////////////////////////////////////////////
  let uninstallURL = __OVERRIDE_NEWTAB
    ? "https://docs.google.com/forms/d/e/1FAIpQLSevGfJekcHfb0WjnnuE9XMFYhPIRwtxGFFZH6WV0ve3aBbgwQ/viewform"
    : "https://docs.google.com/forms/d/e/1FAIpQLSc4f_Qfgd9jvL3kTk1puG_zAiobYPBYdKPEj7ug9YWsHU515Q/viewform?usp=header"

  chrome.runtime.setUninstallURL(uninstallURL, () => {
    if (chrome.runtime.lastError) {
      console.error("Error setting uninstall URL:", chrome.runtime.lastError.message)
    }
  })

  ////////////////////////////////////////////////////////
  // last active tab
  ////////////////////////////////////////////////////////
  const MAX_LAST_ACTIVE_TABS_COUNT = 3
  let lastActiveTabIds: number[] = []

  function addLastActiveTabId(tabId: number) {
    const newLastActiveTabs = [tabId, ...lastActiveTabIds]
    if (newLastActiveTabs.length > 3) {
      newLastActiveTabs.length = MAX_LAST_ACTIVE_TABS_COUNT
    }
    lastActiveTabIds = newLastActiveTabs
  }

  chrome.tabs.onActivated.addListener(((activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, (t) => {
      if (t.id !== undefined) {
        addLastActiveTabId(t.id)
        bc.postMessage({ type: "last-active-tabs-updated", tabs: lastActiveTabIds })
      }
    })
  }))

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === "get-last-active-tabs") {
        sendResponse({ type: "send-last-active-tabs", tabs: lastActiveTabIds })
      }
    }
  )
}

