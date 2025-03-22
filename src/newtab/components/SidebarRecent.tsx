import React, { useCallback, useEffect, useState } from "react"
import { extractHostname, filterHistoryItemsBySearch, hlSearch, removeUselessProductName } from "../helpers/utils"
import { CL } from "../helpers/classNameHelper"
import {
  confluenceHashRegExp, figmaBoardRegExp, figmaDesignHashRegExp,
  figmaSlidesRegExp,
  FilteredHistoryItem,
  getBaseFilteredHistoryItems,
  getCleanMiroTitle,
  getCleanTitle,
  getFilteredHistoryItems,
  githubPRHashRegExp,
  googleDocHashRegExp, googleFormsHashRegExp, googlePresentationHashRegExp, googleSpreadsheetsHashRegExp,
  hashGetterFactory, IFilter, jiraHashRegExp,
  loomHashRegExp,
  miroHashRegExp,
  youtubeHashRegExp
} from "../helpers/recentHistoryUtils"
import IconFilter from "../icons/filter.svg"
import IconNonFilter from "../icons/no-filter-thin.svg"
import HistoryItem = chrome.history.HistoryItem
import { getTempFavIconUrl } from "../state/actionHelpers"

function formatDate(d: Date): string {
  const today = new Date()
  // Strip out the time part by creating new dates at midnight.
  const inputDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const yesterdayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)

  if (inputDate.getTime() === todayDate.getTime()) {
    return "Today"
  } else if (inputDate.getTime() === yesterdayDate.getTime()) {
    return "Yesterday"
  } else {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    let formatted = d.getDate() + " " + months[d.getMonth()]
    // Optionally, include the year if it is not the current year:
    if (d.getFullYear() !== today.getFullYear()) {
      formatted += " " + d.getFullYear()
    }
    return formatted
  }
}

const RecentItem = (p: { item: FilteredHistoryItem, search: string }) => {
  let shortenedTitle = removeUselessProductName(p.item.title)
  let domain = extractHostname(p.item.url)

  const domainAndDate = extractHostname(p.item.url) + ", " + formatDate(new Date(p.item.lastVisitTime || 0))

  const onClick = (url: string | undefined) => {
    chrome.tabs.create({ url })
  }

  return <div
    onClick={() => onClick(p.item.url)}
    // style={{ backgroundColor: getBgColor(p.tab.id) }}
    className={CL("inbox-item draggable-item")}
    // data-id={p.tab.id}
    // onContextMenu={onTabContextMenu}
  >
    <img src={p.item.favIconUrl} alt=""/>
    <div className="inbox-item__text">
      <div className="inbox-item__title"
           title={p.item.title}
           dangerouslySetInnerHTML={hlSearch(shortenedTitle, p.search)}/>
      <div className="inbox-item__url"
           title={p.item.url}>{domainAndDate}</div>
    </div>
  </div>
}

const PAGE_SIZE = 100

const RecentList = (p: { items: FilteredHistoryItem[]; search: string }) => {

  const [displayedItems, setDisplayedItems] = useState<FilteredHistoryItem[]>([])
  const [page, setPage] = useState<number>(1)

  // Load initial page whenever the filteredHistoryItems change.
  useEffect(() => {
    setDisplayedItems(p.items.slice(0, PAGE_SIZE))
    setPage(1)
  }, [p.items])

  // Function to load more items when scrolling near the bottom.
  const loadMore = useCallback(() => {
    const nextPage = page + 1
    const nextItems = p.items.slice(0, nextPage * PAGE_SIZE)
    if (nextItems.length > displayedItems.length) {
      setDisplayedItems(nextItems)
      setPage(nextPage)
    }
  }, [page, p.items, displayedItems])

  const handleScroll = useCallback(() => {
    const sidebar = document.querySelector(".app-sidebar")!
    if (sidebar) {
      const { scrollTop, scrollHeight, clientHeight } = sidebar
      // Trigger loadMore when scrolled within 100px of the bottom.
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        loadMore()
      }
    }
  }, [loadMore])

  useEffect(() => {
    const sidebar = document.querySelector(".app-sidebar")!
    if (sidebar) {
      sidebar.addEventListener("scroll", handleScroll)
    }
    return () => {
      if (sidebar) {
        sidebar.removeEventListener("scroll", handleScroll)
      }
    }
  }, [handleScroll])

  return <div>
    {
      displayedItems.map((item) => {
          return <RecentItem
            key={item.id}
            item={item}
            search={p.search}/>
        }
      )
    }
  </div>
}

export const SidebarRecent = React.memo((p: {
  historyItems: HistoryItem[];
  search: string;
}) => {
  const [filterByDomainEnabled, setFilterByDomainEnabled] = React.useState(true)
  const [enabledFilers, setEnabledFilters] = useState<IFilter[]>(historyFilters)
  const enabledFiltersCount = enabledFilers.reduce((prevVal, filter) => prevVal + (filter.enabled ? 1 : 0), 0)

  const itemsFilteredBySearch = filterHistoryItemsBySearch(p.historyItems, p.search)

  const itemsFilteredBySearchAndFilter = filterByDomainEnabled && enabledFiltersCount
    ? getFilteredHistoryItems(itemsFilteredBySearch, enabledFilers)
    : getBaseFilteredHistoryItems(itemsFilteredBySearch)

  const moreSearchResultsCount = p.search !== "" && enabledFiltersCount > 0 ? itemsFilteredBySearch.length - itemsFilteredBySearchAndFilter.length : 0

  const onFiltersPanelClick = () => {
    setFilterByDomainEnabled(!filterByDomainEnabled)
  }

  const onFilterClick = (filter: IFilter) => {
    setEnabledFilters(enabledFilers.map(f => {
      if (f.pattern === filter.pattern) {
        return {
          ...f,
          enabled: !f.enabled
        }
      } else {
        return {
          ...f,
          enabled: false
        }
      }
    }))
  }

  const onClearFilters = () => {
    setEnabledFilters(enabledFilers.map(f => {
      return {
        ...f,
        enabled: false //enabledFiltersCount === 0
      }
    }))
  }

  return <div className="recent-list">
    <div className={CL("app-sidebar__header app-sidebar__header--recent", {
      "filters-opened": filterByDomainEnabled
    })}>
      <div className="inner-header">
        <span className="app-sidebar__header__text">Recent</span>
        <button className={CL("btn__icon", { "active": filterByDomainEnabled })}
                style={{ position: "relative" }}
                title="Filter recent by domain"
                onClick={onFiltersPanelClick}>
          <IconFilter/>
        </button>
      </div>

      {
        filterByDomainEnabled && <div className="recent-filter-panel">
          <button className={CL("recent-list-panel__btn", { "active": enabledFiltersCount === 0 })}
                  title="Toggle filters"
                  onClick={onClearFilters}>
            <IconNonFilter/>
          </button>
          {
            enabledFilers.map((filter) => {
              return <button
                key={filter.pattern}
                className={CL("recent-list-panel__btn", { "active": filter.enabled })}
                title={filter.title}
                onClick={() => onFilterClick(filter)}>
                <img src={filter.icon ?? getTempFavIconUrl(filter.pattern)} alt=""/>
              </button>
            })
          }
        </div>
      }
    </div>


    <RecentList
      items={itemsFilteredBySearchAndFilter}
      search={p.search}
    ></RecentList>
    {
      Boolean(moreSearchResultsCount)
        ? <div className="sidebar-message">
          <span><span className="sidebar-message__btn" onClick={onClearFilters}>Remove</span> filtering to see {moreSearchResultsCount} more results</span>
        </div>
        : <div className="sidebar-message"><span>History is limited by 2 month</span></div>
    }


  </div>
})

const historyFilters: IFilter[] = [
  {
    title: "Miro",
    icon: "https://miro.com/static/favicons/favicon.ico?cbh=29b45061748a5faabb42beed5d529ef9",
    pattern: "https://miro.com/",
    getHash: hashGetterFactory([miroHashRegExp]),
    cleanTitle: getCleanMiroTitle,
    enabled: true
  },
  {
    title: "Figma",
    icon: "https://static.figma.com/app/icon/1/favicon.svg",
    pattern: "https://www.figma.com/",
    getHash: hashGetterFactory([figmaDesignHashRegExp, figmaSlidesRegExp, figmaBoardRegExp]),
    cleanTitle: getCleanTitle
  },
  {
    title: "Google Docs",
    icon: "https://ssl.gstatic.com/docs/doclist/images/drive_2022q3_32dp.png",
    pattern: "https://docs.google.com/",
    getHash: hashGetterFactory([googleDocHashRegExp, googlePresentationHashRegExp, googleFormsHashRegExp, googleSpreadsheetsHashRegExp]),
    cleanTitle: getCleanTitle
  },
  {
    title: "Miro Jira & Confluence",
    icon: "https://miro.atlassian.net/favicon.ico",
    pattern: "https://miro.atlassian.net/",
    getHash: hashGetterFactory([jiraHashRegExp, confluenceHashRegExp]),
    cleanTitle: getCleanTitle
  },
  {
    title: "Github",
    icon: "https://github.com/favicon.ico",
    pattern: "https://github.com/",
    getHash: hashGetterFactory([githubPRHashRegExp]),
    cleanTitle: getCleanTitle
  },
  {
    title: "Youtube",
    icon: "https://www.gstatic.com/youtube/img/creator/favicon/favicon_32_v2.png",
    pattern: "https://www.youtube.com/",
    getHash: hashGetterFactory([youtubeHashRegExp]),
    cleanTitle: getCleanTitle
  },
  {
    title: "Loom",
    icon: "https://cdn.loom.com/assets/favicons-loom/favicon.ico",
    pattern: "https://www.loom.com/",
    getHash: hashGetterFactory([loomHashRegExp]),
    cleanTitle: getCleanTitle
  }
]