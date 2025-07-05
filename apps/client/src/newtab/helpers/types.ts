export interface IObject {
  id: number // local id
  remoteId?: string
  position: string
}

export interface ISpace extends IObject {
  title: string
  folders: IFolder[]
  widgets?: IWidget[]
}

export interface IFolder extends IObject {
  title: string
  items: IFolderItem[]
  color?: string
  collapsed?: boolean

  /** @deprecated */
  twoColumn?: boolean
  /** @deprecated */
  archived?: boolean
}

export interface IBookmarkItem extends IObject {
  type: "bookmark"
  favIconUrl: string
  title: string
  url: string

  /** @deprecated */
  isSection?: boolean

  /** @deprecated */
  archived?: true
}

export interface IGroupItem extends IObject {
  type: "group"
  title: string
  collapsed?: boolean

  groupItems: IBookmarkItem[]
}

export type IFolderItem = IBookmarkItem | IGroupItem

export type IAllFolderItemProps = {
  favIconUrl: string
  title: string
  url: string
  collapsed?: boolean
  remoteId: string
}

export type WidgetType = "Sticker"

export type IWidgetPos = {
  point: {
    x: number,
    y: number
  }
}

export type IWidgetContent = {
  contentType: "Sticker"
  text: string
  color: string
  fontSize: number
  strikethrough?: boolean
}

export interface IWidget extends IObject {
  widgetType: WidgetType
  pos: IWidgetPos // this is actual {x,y} position for widgets
  content: IWidgetContent
}

// Data for not yet created FolderItem
export type IFolderItemToCreate = IFolderBookmarkToCreate | IFolderGroupToCreate
export type IFolderBookmarkToCreate = Pick<IBookmarkItem, "id" | "type" | "favIconUrl" | "url" | "title">
export type IFolderGroupToCreate = Pick<IGroupItem, "id"| "type" | "title" | "collapsed" | "groupItems">

// undefined === 'system'
export type ColorTheme = "light" | "dark" | undefined
