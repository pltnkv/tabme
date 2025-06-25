import { initBgContextMenu } from "./bgContextMenu"
import { initBgOnInstallHooks } from "./bgOnInstallHooks"

const bc = new BroadcastChannel("sync-state-channel")

initBgOnInstallHooks(bc)
initBgContextMenu()