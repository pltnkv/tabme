import { Color } from "./Color"

export const DEFAULT_FOLDER_COLOR = "#f0f0f0"

export function getFolderGradientColor(folderColor: string | undefined): string {
  const color = new Color()
  const color2 = new Color()
  color.setColor(folderColor ?? DEFAULT_FOLDER_COLOR)
  color.setAlpha(1)
  color2.value = { ...color.value }
  color2.setSaturation(color2.value.s + 0.1)
  color2.value.h = color2.value.h + 0.05
  return `linear-gradient(45deg, ${color.getRGBA()}, ${color2.getRGBA()})`
}