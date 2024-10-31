import { APIResponseDashboard, APIResponseGetToken } from "./api-types"

export async function apiGetToken(): Promise<APIResponseGetToken> {
  return fetchPOST(`${BASE_URL}/get-token`, { username: "test", password: "password" }, false)
}

export async function apiGetDashboard(): Promise<APIResponseDashboard> {
  return fetchGET(`${BASE_URL}/api/dashboard`)
}

////////////////////////////////////////////////////////////
// BASE
////////////////////////////////////////////////////////////

export const BASE_URL = localStorage.getItem("BASE_URL") ?? "http://localhost:8080/my-app-name"

export async function fetchPOST<T>(url: string, body: Object, useToken = true): Promise<T> {
  console.log("API_POST:: ", url, body)
  let headers: any = {
    "Content-Type": "application/json"
  }
  if (useToken) {
    addTokenInHeaders(headers)
  }

  const response = await fetch(url, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(body)
  })

  if (response.ok) {
    const res = await response.json()
    return res.data
  } else {
    throw new Error("request failed with status code " + response.status)
  }
}

export async function fetchGET<T>(url: string, useToken = true): Promise<T> {
  console.log("API_GET:: ", url)
  let headers: any = {
    "Content-Type": "application/json"
  }
  if (useToken) {
    addTokenInHeaders(headers)
  }

  const response = await fetch(url, {
    method: "GET",
    headers: headers
  })

  if (response.ok) {
    const res = await response.json()
    return res.data
  } else {
    throw new Error("request failed with status code " + response.status)
  }
}

function addTokenInHeaders(headers: any): void {
  const token = localStorage.getItem("authToken")
  if (!token) {
    alert("No token in LS")   // todo FIX IT LATER
    throw new Error("No token")
  }
  headers["Authorization"] = `Bearer ${token}`
}

let __loadFromNetwork: any

export function loadFromNetwork(): boolean {
  if (__loadFromNetwork === undefined) {
    __loadFromNetwork = !!localStorage.getItem("authToken")
  }
  return __loadFromNetwork
}