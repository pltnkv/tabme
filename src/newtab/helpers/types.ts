export interface IFolder {
  id: number
  title: string
  items: IFolderItem[]
  color?: string
  twoColumn?: boolean
}

export interface IFolderItem {
  id: number
  favIconUrl: string
  title: string
  url: string
  archived?: boolean
  isSection?: boolean
  inEdit?:boolean
}
