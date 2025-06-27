//
// function postExecuteCommand<T>(cmd: any): Promise<T> {
//   return fetchPOST<T>(`${BASE_URL}/api/execute-command`, cmd)
// }
//
// export function executeAPICall(command: APICommandPayloadFull, dispatch: ActionDispatcher) {
//   const dispatchApiResolved = () => dispatch({ type: Action.APICommandResolved, commandId: command.commandId })
//   const dispatchApiError = (e: any) => {
//     // todo dont allow continue editing if command failed without app reloading
//     console.log("e", e)
//     alert("API ERROR")
//     dispatch({
//       type: Action.UpdateAppState, newState: {
//         ...command.rollbackState, // revert to state before the command
//         apiCommandId: undefined,
//         apiLastError: "API ERROR MESSAGE",
//         apiCommandsQueue: [] // cancel all the next API calls, to avoid loosing data
//       }
//     })
//   }
//
//   switch (command.type) {
//     case Action.CreateFolder:
//     case Action.CreateFolderItem:
//       postExecuteCommand<APIResponseEntityCreated>({
//         command: command.type,
//         ...command.body
//       }).then(value => {
//         if (command.type === Action.CreateFolder) {
//           dispatch({ type: Action.APIConfirmEntityCreated, entityType: "folder", localId: command.body.folder.id!, remoteId: value.id })
//         }
//         if (command.type === Action.CreateFolderItem) {
//           dispatch({ type: Action.APIConfirmEntityCreated, entityType: "bookmark", localId: command.body.item.id!, remoteId: value.id })
//         }
//         dispatchApiResolved()
//       }).catch(dispatchApiError)
//       break
//
//     case Action.DeleteFolder:
//     case Action.MoveFolder:
//     case Action.UpdateFolder:
//     case Action.DeleteFolderItems:
//     case Action.UpdateFolderItem: //NOTE it accepts several folders
//     case Action.MoveFolderItems: //NOTE it accepts several folders
//       postExecuteCommand<APIResponseEntityUpdatedOrDeleted>({
//         command: command.type,
//         ...command.body
//       }).then(value => {
//         dispatchApiResolved()
//       }).catch(dispatchApiError)
//       break
//
//     default: {
//       throw new Error(`Unknown API command ${command["type"]}`)
//     }
//   }
// }