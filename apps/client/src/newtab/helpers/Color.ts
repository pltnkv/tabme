const MAX_INT_COLOR = 16777215
let stringParsers = [
  {
    re: /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(\d+(?:\.\d+)?)\s*)?\)/,
    parse: function (execResult: any) {
      return [execResult[1], execResult[2], execResult[3], execResult[4]]
    },
  },
  {
    re: /rgba?\(\s*(\d+(?:\.\d+)?)\%\s*,\s*(\d+(?:\.\d+)?)\%\s*,\s*(\d+(?:\.\d+)?)\%\s*(?:,\s*(\d+(?:\.\d+)?)\s*)?\)/,
    parse: function (execResult: any) {
      return [
        2.55 * execResult[1],
        2.55 * execResult[2],
        2.55 * execResult[3],
        execResult[4],
      ]
    },
  },
  {
    re: /#([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})/,
    parse: function (execResult: any) {
      return [
        parseInt(execResult[1], 16),
        parseInt(execResult[2], 16),
        parseInt(execResult[3], 16),
      ]
    },
  },
  {
    re: /#([a-fA-F0-9])([a-fA-F0-9])([a-fA-F0-9])/,
    parse: function (execResult: any) {
      return [
        parseInt(execResult[1] + execResult[1], 16),
        parseInt(execResult[2] + execResult[2], 16),
        parseInt(execResult[3] + execResult[3], 16),
      ]
    },
  },
]

let defaultAverageRGB = 0xaaaaaa

interface HSBa {
  h: number
  s: number
  b: number
  a?: number
}

interface RGBa {
  r: number
  b: number
  g: number
  a?: number
}

interface LAB {
  l: number
  a: number
  b: number
}

export class Color {
  value: HSBa = { h: 1, s: 1, b: 1, a: 1 }

  getRGB(): string {
    let rgb = this.toRGB(this.value.h, this.value.s, this.value.b)
    return "rgb(" + rgb.r + "," + rgb.g + "," + rgb.b + ")"
  }

  getRGBA(): string {
    let rgb = this.toRGB(this.value.h, this.value.s, this.value.b, this.value.a)
    return "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + "," + rgb.a + ")"
  }

  getHEX(): string {
    return this.toHex(this.value.h, this.value.s, this.value.b, this.value.a)
  }

  getNumber(): number {
    return this.toNumber(this.value.h, this.value.s, this.value.b, this.value.a)
  }

  // HSBtoRGB from RaphaelJS
  static RGBtoHSB(r: any, g: any, b: any, a: any) {
    r /= 255
    g /= 255
    b /= 255

    let H: any, S: any, V: any, C: any
    V = Math.max(r, g, b)
    C = V - Math.min(r, g, b)
    H =
      C === 0
        ? null
        : V === r
          ? (g - b) / C
          : V === g
            ? (b - r) / C + 2
            : (r - g) / C + 4
    H = (((H + 360) % 6) * 60) / 360
    S = C === 0 ? 0 : C / V
    return { h: H || 1, s: S, b: V, a: a || 1 }
  }

  // RGB -> XYZ -> L*a*b*
  static RGBtoLAB(R: any, G: any, B: any): LAB {
    let fx = 0
    let fy = 0
    let fz = 0
    let Ls, as, bs
    let eps = 216.0 / 24389
    let k = 24389.0 / 27

    let Xr = 0.964221 // reference white D50
    let Yr = 1.0
    let Zr = 0.825211

    // RGB to XYZ
    let r = R / 255.0 //R 0..1
    let g = G / 255.0 //G 0..1
    let b = B / 255.0 //B 0..1

    // assuming sRGB (D65)
    if (r <= 0.04045) {
      r = r / 12
    } else {
      r = Math.pow((r + 0.055) / 1.055, 2.4)
    }

    if (g <= 0.04045) {
      g = g / 12
    } else {
      g = Math.pow((g + 0.055) / 1.055, 2.4)
    }

    if (b <= 0.04045) {
      b = b / 12
    } else {
      b = Math.pow((b + 0.055) / 1.055, 2.4)
    }

    let X = 0.436052025 * r + 0.385081593 * g + 0.143087414 * b
    let Y = 0.222491598 * r + 0.71688606 * g + 0.060621486 * b
    let Z = 0.013929122 * r + 0.097097002 * g + 0.71418547 * b

    // XYZ to Lab
    let xr = X / Xr
    let yr = Y / Yr
    let zr = Z / Zr

    if (xr > eps) {
      fx = Math.pow(xr, 1 / 3.0)
    } else {
      fx = (k * xr + 16.0) / 116.0
    }

    if (yr > eps) {
      fy = Math.pow(yr, 1 / 3.0)
    } else {
      fy = (k * yr + 16) / 116.0
    }

    if (zr > eps) {
      fz = Math.pow(zr, 1 / 3.0)
    } else {
      fz = (k * zr + 16.0) / 116
    }

    Ls = 116 * fy - 16
    as = 500 * (fx - fy)
    bs = 200 * (fy - fz)

    return {
      l: 2.55 * Ls + 0.5,
      a: as + 0.5,
      b: bs + 0.5,
    }
  }

  /**
   * Ишет ближайший цвет из colors относительно r,g,b
   * Критерий похожести — евклидово расстояние между двумя L*a*b* точками.
   *
   * @param r - r in rgb
   * @param g - g in rgb
   * @param b - b in rgb
   * @param colors - массив цветов в цифровом формате 0x000000
   * @param defaultColor - цвет по умолчанию, если похожий цвет найден не будет
   * @param maxDiff - максимальная допустимая разница между двумя L*a*b* точками,
   * если она превышена - "похожесть" цвета не учитывается: уж лучше взять дефолтный, чем совсем не похожий.
   * @returns {any} ближайший цвет или default
   */
  static findSimilarColorLab(
    r: number,
    g: number,
    b: number,
    colors: number[],
    defaultColor: number,
    maxDiff = Infinity,
  ): number {
    let currentMinDiff = Infinity
    let best = defaultColor

    let lab = Color.RGBtoLAB(r, g, b)
    colors.forEach((current) => {
      let rgb = Color.intColorToRGB(current)
      let currentLab = Color.RGBtoLAB(rgb.r, rgb.g, rgb.b)

      let dl = lab.l - currentLab.l
      let da = lab.a - currentLab.a
      let db = lab.b - currentLab.b
      let diff = Math.sqrt(dl * dl + da * da + db * db)
      if (diff < maxDiff && diff < currentMinDiff) {
        best = current
        currentMinDiff = diff
      }
    })

    return best
  }

  static getAverageRGB(imageData: any): number {
    if (!imageData) {
      return defaultAverageRGB
    }

    let blockSize = 10 * 4 // only visit every 10 pixels
    let i = -4 + blockSize
    let length
    let count = 0
    let r = 0
    let g = 0
    let b = 0

    let data = imageData.data
    length = data.length

    while (i < length) {
      ++count
      r += data[i]
      g += data[i + 1]
      b += data[i + 2]
      i += blockSize
    }

    r = ~~(r / count)
    g = ~~(g / count)
    b = ~~(b / count)

    return Color.RGBtoNumber(r, g, b)
  }

  /**
   * Parse a string to HSB
   * return true if color has been applied
   */

  setColor(stringColor: string): boolean {
    stringColor = stringColor.toLowerCase()
    for (let key in stringParsers) {
      if (stringParsers.hasOwnProperty(key)) {
        let parser = stringParsers[key]
        let match: any = parser.re.exec(stringColor),
          values: any = match && parser.parse(match)
        if (values) {
          this.value = Color.RGBtoHSB.apply(null, values)
          return true
        }
      }
    }
    return false
  }

  setColorByRGB(r: number, g: number, b: number) {
    this.value = Color.RGBtoHSB(r, g, b, 1)
  }

  setIntColor(intColor: number): boolean {
    if (intColor >= 0 && intColor <= MAX_INT_COLOR) {
      let rgb = Color.intColorToRGB(intColor)
      this.value = Color.RGBtoHSB(rgb.r, rgb.g, rgb.b, rgb.a)
      return true
    }
    return false
  }

  setHue(h: number) {
    this.value.h = 1 - h
  }

  setSaturation(s: number): void {
    this.value.s = s
  }

  setBrightness(b: number): void {
    this.value.b = b
  }

  setAlpha(a: number): void {
    this.value.a = a
  }

  /**
   * Ишет ближайший цвет относительно this.value
   * Критерий похожести — расстояние между двумя RGB точками.
   * Коэффициенты при квадратах оценивают чувствительность глаза к восприятию чистого цвета.
   *
   * Коэффициенты:
   * 30 - красный
   * 59 - зеленый
   * 11 - синий
   *
   * @param colors - массив цветов в цифровом формате 0x000000
   * @returns {any} ближайший цвет или null
   */
  findSimilarColor(colors: number[]): number {
    let rgb = this.toRGB(this.value.h, this.value.s, this.value.b)
    return Color.findSimilarColor(rgb.r, rgb.g, rgb.b, colors, null!)
  }

  /**
   * Ишет ближайший цвет относительно this.value
   * Критерий похожести — расстояние между двумя RGB точками.
   * Коэффициенты при квадратах оценивают чувствительность глаза к восприятию чистого цвета.
   *
   * Коэффициенты:
   * 30 - красный
   * 59 - зеленый
   * 11 - синий
   *
   * @param colors - массив цветов в цифровом формате 0x000000
   * @returns {any} ближайший цвет или null
   */
  static findSimilarColor(
    r: number,
    g: number,
    b: number,
    colors: number[],
    defaultColor: number,
  ): number {
    let sMin = Infinity
    let best = defaultColor

    let kRed = 30
    let kGreen = 59
    let kBlue = 11

    colors.forEach((current) => {
      let rgbCurrent = Color.intColorToRGB(current)

      let sCurrent =
        kRed * Math.pow(rgbCurrent.r - r, 2) +
        kGreen * Math.pow(rgbCurrent.g - g, 2) +
        kBlue * Math.pow(rgbCurrent.b - b, 2)

      if (sCurrent < sMin) {
        best = current
        sMin = sCurrent
      }
    })

    return best
  }

  static findSimilarRGBColorByHSBCompare(
    red: number,
    green: number,
    blue: number,
    colors: number[],
    defaultColor: number,
    hc: number,
    sc: number,
    bc: number,
  ): number {
    const { h, s, b } = Color.RGBtoHSB(red, green, blue, 1)

    let sMin = Infinity
    let best = defaultColor

    colors.forEach((current) => {
      let rgbCurrent = Color.intColorToRGB(current)
      let hsbCurrent = Color.RGBtoHSB(
        rgbCurrent.r,
        rgbCurrent.g,
        rgbCurrent.b,
        rgbCurrent.a,
      )

      let sCurrent =
        hc * Math.pow(hsbCurrent.h - h, 2) +
        sc * Math.pow(hsbCurrent.s - s, 2) + // prettier is awful sometimes
        bc * Math.pow(hsbCurrent.b - b, 2)

      if (sCurrent < sMin) {
        best = current
        sMin = sCurrent
      }
    })

    return best
  }

  // HSBtoRGB from RaphaelJS
  // https://github.com/DmitryBaranovskiy/raphael/
  private toRGB(h: number, s: number, b: number, a?: number): RGBa {
    let R, G, B, X, C

    h *= 360
    h = (h % 360) / 60
    C = b * s
    X = C * (1 - Math.abs((h % 2) - 1))
    R = G = B = b - C

    h = ~~h
    R += [C, X, 0, 0, X, C][h]
    G += [X, C, C, X, 0, 0][h]
    B += [0, 0, X, C, C, X][h]

    return {
      r: Math.round(R * 255),
      g: Math.round(G * 255),
      b: Math.round(B * 255),
      a: a || this.value.a,
    }
  }

  static intColorToRGB(intColor: number): RGBa {
    return {
      r: (intColor >> 16) & 255,
      g: (intColor >> 8) & 255,
      b: intColor & 255,
      a: 1,
    }
  }

  static intColorToHEX(intColor: number | undefined): string | undefined {
    if (intColor === undefined) {
      return undefined
    } else {
      return (
        "#" +
        (
          (1 << 24) |
          (((intColor >> 16) & 255) << 16) |
          (((intColor >> 8) & 255) << 8) |
          (intColor & 255)
        )
          .toString(16)
          .substr(1)
      )
    }
  }

  static RGBtoNumber(r: number, g: number, b: number): number {
    return (r << 16) | (g << 8) | b
  }

  /**
   * NOTE: we are not checking the hex format here.
   * If there will be some invalid characters - smth will be wrong.
   * Check this by urself if you are not sure what string do you have.
   * We are assuming that input format is one of this:
   * 1. #fff
   * 2. #ffffff
   * 3. #ffffff80 - alpha should be in the end
   */
  static HEXToNumberRGBA(hexString: string) {
    hexString = hexString.replace("#", "")

    if (hexString.length === 3) {
      // NOTE: duplicating every character twice, converting #fff to #ffffff to parse properly
      hexString = [
        hexString[0],
        hexString[0],
        hexString[1],
        hexString[1],
        hexString[2],
        hexString[2],
      ].join("")
    }

    if (hexString.length === 6) {
      let color = parseInt(hexString, 16)
      color = (color << 8) | 255 // adding the alpha channel
      return color
    } else if (hexString.length === 8) {
      return parseInt(hexString, 16)
    } else {
      throw new Error(`Invalid hex string format: ${hexString}`)
    }
  }

  static HEXToNumber(hex: string) {
    return parseInt(hex.replace("#", ""), 16)
  }

  static calculateContrastColor(color: number): number {
    let r = (color & 0xff0000) >> 16
    let g = (color & 0x00ff00) >> 8
    let b = color & 0x0000ff

    return r * 0.299 + g * 0.587 + b * 0.114 > 186 ? 0x000000 : 0xffffff
  }

  private toHex(h: any, s: any, b: any, a: any): string {
    let rgb = this.toRGB(h, s, b, a)
    return (
      "#" +
      ((1 << 24) | (rgb.r << 16) | (rgb.g << 8) | rgb.b).toString(16).substr(1)
    )
  }

  private toNumber(h: any, s: any, b: any, a: any): number {
    let rgb = this.toRGB(h, s, b, a)
    return Color.RGBtoNumber(rgb.r, rgb.g, rgb.b)
  }

  static calculateTransparentColor(
    fgHexColor: string,
    bgHexColor: string,
    opacity: number,
  ): string {
    // opacity = opacity * 1.0

    let foregroundRGB = Color.intColorToRGB(Color.HEXToNumber(fgHexColor))
    let backgroundRGB = Color.intColorToRGB(Color.HEXToNumber(bgHexColor))

    let finalRed = Math.round(
      backgroundRGB.r * (1 - opacity) + foregroundRGB.r * opacity,
    )
    let finalGreen = Math.round(
      backgroundRGB.g * (1 - opacity) + foregroundRGB.g * opacity,
    )
    let finalBlue = Math.round(
      backgroundRGB.b * (1 - opacity) + foregroundRGB.b * opacity,
    )

    return (
      Color.intColorToHEX(Color.RGBtoNumber(finalRed, finalGreen, finalBlue)) ||
      ""
    )
  }
}
