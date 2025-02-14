import { IFolderItem } from "./types"
import { getGlobalAppState } from "../components/App"
import { findItemById } from "../state/actionHelpers"

let selectedItemsElements: HTMLElement[] = []
const SELECTOR = `folder-item--selected`
const FIRST_SELECTOR = `folder-item--first-selected`

const INNER_SELECTOR = `folder-item__inner--selected`

export function selectItems(elements: HTMLElement[]) {
  unselectAll()

  elements.forEach((el: HTMLElement) => {
    el.classList.add(INNER_SELECTOR)
    el.parentElement?.classList.add(SELECTOR)
  })

  const prevSelectedElement = document.querySelector(`.${FIRST_SELECTOR}`)
  const newFirstSelectedElement = document.querySelector(`.${SELECTOR}`)
  if (newFirstSelectedElement && prevSelectedElement !== newFirstSelectedElement) {
    newFirstSelectedElement.classList.add(FIRST_SELECTOR)
  }
  if (prevSelectedElement) {
    prevSelectedElement.classList.remove(FIRST_SELECTOR)
  }

  selectedItemsElements = elements
}

function unselectItemForced(el: HTMLElement) {
  el.classList.remove(INNER_SELECTOR)
  el.parentElement?.classList.remove(SELECTOR)
  document.querySelector(`.${FIRST_SELECTOR}`)?.classList.remove(FIRST_SELECTOR)
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

