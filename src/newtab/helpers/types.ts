export interface IFolder {
  id: number // local id
  remoteId?: number // server id
  position: string
  title: string
  items: IFolderItem[]
  color?: string
  twoColumn?: boolean
  archived?: boolean
}

export interface IFolderItem {
  id: number // local id
  remoteId?: number // server id
  position: string
  favIconUrl: string
  title: string
  url: string
  archived?: boolean
  isSection?: boolean // todo - replace on "type later". not store bool on server
  inEdit?: boolean
}

// Data for not yet created FolderItem
export type IFolderItemToCreate = Pick<IFolderItem, "id" | "favIconUrl" | "url" | "title" | 'isSection'>

// undefined === 'system'
export type ColorTheme = "light" | "dark" | undefined
