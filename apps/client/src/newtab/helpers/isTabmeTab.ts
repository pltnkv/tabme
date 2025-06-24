// todo maybe show newtab in tabme mini (or add in advanced setting)
export function isTabmeOrNewTab(tab: { url?: string; pendingUrl?: string; }): boolean {
  return !!(tab.url?.includes("://newtab/") || tab.pendingUrl?.includes("://newtab/"))
    || !!(tab.url?.includes("/newtab.html") || tab.pendingUrl?.includes("/newtab.html"))
}

export function isTabmeOnly(tab: { url?: string; pendingUrl?: string; }): boolean {
  return !!(tab.url?.includes("/newtab.html") || tab.pendingUrl?.includes("/newtab.html"))
}