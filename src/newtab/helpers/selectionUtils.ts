import { IFolderItem } from "./types"
import { getGlobalAppState } from "../components/App"
import { findItemById } from "./utils"

let selectedItemsElements: HTMLElement[] = []

export function selectItem(el: HTMLElement) {
  el.classList.add("folder-item__inner--selected")
  selectedItemsElements.push(el)
}

export function unselectItemForced(el: HTMLElement) {
  el.classList.remove("folder-item__inner--selected")
}

export function unselectAll() {
  selectedItemsElements.forEach(item => unselectItemForced(item))
  selectedItemsElements.length = 0
}

export function getSelectedItemsElements(): HTMLElement[] {
  return selectedItemsElements
}

export function getSelectedItemsIds(): number[] {
  return selectedItemsElements.map(el => getId(el))
}

export function getSelectedItems(): IFolderItem[] {
  const state = getGlobalAppState()
  return selectedItemsElements.map(el => findItemById(state, getId(el))!)
}

function getId(el: HTMLElement): number {
  return parseInt(el.dataset.id || "", 10)
}

