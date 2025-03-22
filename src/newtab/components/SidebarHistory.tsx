import React from "react"
import { extractHostname, hlSearch, isContainsSearch, removeUselessProductName } from "../helpers/utils"
import HistoryItem = chrome.history.HistoryItem
import { trackStat } from "../helpers/stats"

// function uniqHistory(items: HistoryItem[]): HistoryItem[] {
// return items //seems like it useless
// return items.filter(function(item, pos, self) {
//   return self.findIndex(i => i.url === item.url) === pos
// })ø
// }

function applySearchToHistory<T extends { title?: string; url?: string }>(
  list: T[],
  searchValue: string
): T[] {
  const searchValueLC = searchValue.toLowerCase()
  return list.filter((item) => isContainsSearch(item, searchValueLC))
}

function HistoryList(props: { items: HistoryItem[]; search: string }) {
  const onClick = (url: string | undefined) => {
    chrome.tabs.create({ url })
    trackStat("tabOpened", { inNewTab: true, source: "old-history" })
  }

  const historyList = applySearchToHistory(props.items, props.search)

  //500 is MAX number of items to display
  if (historyList.length > 500) {
    historyList.length = 500
  }

  function formatDate(d: Date): string {
    return ("0" + d.getDate()).slice(-2) + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + d.getFullYear()
  }

  const items = historyList
    // .sort((a, b) =>  (b.visitCount || 0)  -(a.visitCount || 0))
    .map(
      (item) => {
        const domainAndDate = extractHostname(item.url) + " on " + formatDate(new Date(item.lastVisitTime || 0))
        return (
          <div
            key={item.id}
            className="history-item"
            onClick={() => onClick(item.url)}
          >
            <div className="history-item__title"
                 title={item.url}
                 dangerouslySetInnerHTML={hlSearch(removeUselessProductName(item.title), props.search)}>
            </div>
            <div className="history-item__url" title={item.url} dangerouslySetInnerHTML={hlSearch(domainAndDate, props.search)}></div>
          </div>
        )
      }
    )

  return <div>{items}</div>
}

export function SidebarHistory(p: {
  historyItems: HistoryItem[];
  search: string;
}) {
  if (p.search.length >= 2) {
    return <div>
      <div className="app-sidebar__header">
        <span className="app-sidebar__header__text">Recent</span>
      </div>
      <HistoryList
        items={p.historyItems}
        search={p.search}
      ></HistoryList>
    </div>
  } else {
    return null
  }
}