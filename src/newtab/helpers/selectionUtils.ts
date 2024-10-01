let selectedItems: HTMLElement[] = []

export function selectItem(el: HTMLElement) {
  el.classList.add("folder-item__inner--selected")
  selectedItems.push(el)
}

export function unselectItemForced(el: HTMLElement) {
  el.classList.remove("folder-item__inner--selected")
}

export function unselectAll() {
  selectedItems.forEach(item => unselectItemForced(item))
  selectedItems.length = 0
}

export function getSelectedItemsElements(): HTMLElement[] {
  return selectedItems
}

export function getSelectedItemsIds(): number[] {
  return selectedItems.map(item => parseInt(item.dataset.id || "", 10))
}