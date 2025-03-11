export interface IObject {
  id: number // local id
  remoteId?: number // server id
  position: string
}

export interface ISpace extends IObject {
  title: string
  folders: IFolder[]
  widgets?: IWidgetData[]
}

export interface IFolder extends IObject {
  title: string
  items: IFolderItem[]
  color?: string
  twoColumn?: boolean
  archived?: boolean
}

export interface IFolderItem extends IObject {
  favIconUrl: string
  title: string
  url: string
  archived?: boolean
  isSection?: boolean // todo - replace on "type later". not store bool on server
  inEdit?: boolean
}

export type WidgetType = "Sticker"

export type IWidgetData = {
  id: number
  type: WidgetType
  pos: {
    x: number,
    y: number
  }
  content: {
    type: WidgetType
    text: string
  }
}

// Data for not yet created FolderItem
export type IFolderItemToCreate = Pick<IFolderItem, "id" | "favIconUrl" | "url" | "title" | "isSection"> & { position?: string }

// undefined === 'system'
export type ColorTheme = "light" | "dark" | undefined
