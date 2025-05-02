export interface IObject {
  id: number // local id
  remoteId?: number // server id
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
  twoColumn?: boolean
  collapsed?: boolean
}

export interface IFolderItem extends IObject {
  favIconUrl: string
  title: string
  url: string
  isSection?: boolean // todo - replace on "type later". not store bool on server
  collapsed?: boolean
  inEdit?: boolean
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
export type IFolderItemToCreate = Pick<IFolderItem, "id" | "favIconUrl" | "url" | "title" | "isSection"> & { position?: string }

// undefined === 'system'
export type ColorTheme = "light" | "dark" | undefined
