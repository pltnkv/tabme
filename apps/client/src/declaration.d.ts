declare module "*.svg" {
  import * as React from "react"
  const ReactComponent: React.FunctionComponent<
    React.SVGProps<SVGSVGElement> & { title?: string }
  >
  export default ReactComponent
}

declare const __OVERRIDE_NEWTAB: boolean
declare const MIXPANEL_TOKEN: string

declare module "mixpanel-browser" {
  const mixpanel: any
  export default mixpanel
}