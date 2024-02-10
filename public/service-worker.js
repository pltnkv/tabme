chrome.action.onClicked.addListener(async function () {
  const viewTabUrl = chrome.runtime.getURL('newtab.html')
  chrome.tabs.create({ url: viewTabUrl })
});