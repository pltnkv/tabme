declare module "*.svg" {
  import * as React from "react"
  const ReactComponent: React.FunctionComponent<
    React.SVGProps<SVGSVGElement> & { title?: string }
  >
  export default ReactComponent
}

declare const __OVERRIDE_NEWTAB: boolean

declare module "mixpanel-browser" {
  const mixpanel: any
  export default mixpanel
}

type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}

declare namespace chrome.tabGroups {
  const TAB_GROUP_ID_NONE: number;

  interface TabGroup {
    id: number;
    collapsed: boolean;
    color: string;
    title?: string;
    windowId: number;
  }

  interface QueryInfo {
    collapsed?: boolean;
    color?: string;
    title?: string;
    windowId?: number;
  }

  interface TabGroupEvent extends chrome.events.Event<(group: TabGroup) => void> {}

  const onCreated: TabGroupEvent;
  const onUpdated: TabGroupEvent;
  const onRemoved: TabGroupEvent;

  function get(groupId: number, callback: (group: TabGroup | undefined) => void): void;
  function update(groupId: number, updateProperties: { collapsed?: boolean; color?: string; title?: string }): void;
  function query(queryInfo: QueryInfo, callback: (groups: TabGroup[]) => void): void;
}

declare namespace chrome.tabs {
  interface Tab {
    groupId: number;
  }
}