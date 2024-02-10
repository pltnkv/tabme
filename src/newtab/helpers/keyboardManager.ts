let pressedKeys:any = {}

export function initKeyboardManager() {
  window.document.body.addEventListener('keydown', e => {
    pressedKeys[e.key] = true
  })
  window.document.body.addEventListener('keyup', e => {
    pressedKeys[e.key] = false
  })
}

export function isMetaPressed():boolean {
  // todo add Windows support
  return !!pressedKeys['Meta']
}

// fix of moving to another tab
export function clearPressedKeys() {
  pressedKeys = {}
}