import { Action, APICommandPayloadFull, IAppState } from "../newtab/state/state"
import { genNextRuntimeId } from "../newtab/helpers/utils"
import { CreateFolderPayload, CreateItemPayload, UpdateFolderPayload, getAuthToken, sdk } from "./client"
import { ActionDispatcher } from "../newtab/state/actions"

function isNetworkAvailable(): boolean {
  return !!getAuthToken()
}

export function validateRemoteId(remoteId: string | undefined): string {
  if (isNetworkAvailable()) {
    if (remoteId) {
      return remoteId
    } else {
      throw new Error("remoteId can not be undefined")
    }
  } else {
    return remoteId!
  }
}

const getCommandsQueue = (state: IAppState, reqWrapper: any): APICommandPayloadFull[] => {
  if (isNetworkAvailable()) {
    const queueCommand: APICommandPayloadFull = {
      req: reqWrapper,
      rollbackState: state,
      commandId: genNextRuntimeId()
    }
    return [...state.apiCommandsQueue, queueCommand]
  } else {
    return state.apiCommandsQueue
  }
}

export async function executeAPIRequest(command: APICommandPayloadFull, dispatch: ActionDispatcher) {
  const dispatchApiResolved = () => dispatch({ type: Action.APICommandResolved, commandId: command.commandId })
  const dispatchApiError = (e: any) => {
    // todo dont allow continue editing if command failed without app reloading
    console.log("e", e)
    alert("API ERROR")
    dispatch({
      type: Action.UpdateAppState, newState: {
        ...command.rollbackState, // revert to state before the command
        apiCommandId: undefined,
        apiLastError: "API ERROR MESSAGE",
        apiCommandsQueue: [] // cancel all the next API calls, to avoid loosing data
      }
    })
  }

  command.req(dispatch)
    .then(() => dispatchApiResolved())
    .catch(dispatchApiError)
}

export function produceCreateFolderCommand(state: IAppState, newFolder: CreateFolderPayload & { id: number }): APICommandPayloadFull[] {
  return getCommandsQueue(state, (dispatch: ActionDispatcher) => {
    return sdk.folders.create(newFolder)
      .then(folder => {
        if (!folder?.id) {
          throw new Error("Server did not return folder ID")
        }
        dispatch({
          type: Action.APIConfirmEntityCreated,
          entityType: "folder",
          localId: newFolder.id,
          remoteId: folder.id
        })
      })
  })
}

export function produceDeleteFolderCommand(state: IAppState, remoteFolderId: string): APICommandPayloadFull[] {
  return getCommandsQueue(state, () => {
    return sdk.folders.delete(remoteFolderId)
  })
}

export function produceUpdateFolderCommand(state: IAppState, remoteFolderId: string, updates: UpdateFolderPayload): APICommandPayloadFull[] {
  return getCommandsQueue(state, () => {
    return sdk.folders.update(remoteFolderId, updates)
  })
}

export function produceMoveFolderItemsCommand(state: IAppState, targetFolderId: string, items: Array<{ remoteFolderItemId: string, position: string }>): APICommandPayloadFull[] {
  return getCommandsQueue(state, () => {
    // todo !!!! , API is not aware about targetFolderId
    return sdk.items.bulkUpdatePositions(items.map(item => ({
      id: item.remoteFolderItemId,
      position: item.position
    })))
  })
}

export function produceCreateFolderItemCommand(state: IAppState, newItem: CreateItemPayload & { id: number }): APICommandPayloadFull[] {
  return getCommandsQueue(state, (dispatch: ActionDispatcher) => {
    return sdk.items.create(newItem)
      .then(item => {
        if (!item?.id) {
          throw new Error("Server did not return item ID")
        }
        dispatch({
          type: Action.APIConfirmEntityCreated,
          entityType: "item",
          localId: newItem.id,
          remoteId: item.id
        })
      })
  })
}

export function produceDeleteFolderItemsCommand(state: IAppState, remoteFolderItemIds: string[]): APICommandPayloadFull[] {
  return getCommandsQueue(state, () => {
    // Assuming we need to delete items one by one since there's no bulk delete endpoint
    return Promise.all(remoteFolderItemIds.map(id => sdk.items.delete(id)))
  })
}

export function produceUpdateFolderItemCommand(state: IAppState, remoteFolderItemId: string, updates: Partial<CreateItemPayload>): APICommandPayloadFull[] {
  return getCommandsQueue(state, () => {
    return sdk.items.update(remoteFolderItemId, updates)
  })
}
