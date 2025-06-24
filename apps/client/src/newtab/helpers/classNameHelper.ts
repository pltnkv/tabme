export function CL(always: string): string
export function CL(computed: { [i: string]: any }): string
export function CL(always: string, computed: { [i: string]: any }): string
export function CL(
  alwaysOrComputed?: string | { [i: string]: any },
  computed?: { [i: string]: any },
): string {
  if (typeof alwaysOrComputed === "string") {
    let className = alwaysOrComputed
    if (computed) {
      className += computedToString(computed)
    }
    return className
  } else if (typeof alwaysOrComputed === "object") {
    return computedToString(alwaysOrComputed)
  } else {
    throw new Error("CL error")
  }
}

function computedToString(computed: { [i: string]: any }): string {
  let res = ""
  for (const computedKey in computed) {
    if (computed[computedKey]) {
      res += ` ${computedKey}`
    }
  }
  return res
}
