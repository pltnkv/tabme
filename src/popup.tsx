//disabled
import React, {useEffect, useState} from 'react'
import ReactDOM from 'react-dom'
import Tab = chrome.tabs.Tab

const important_urls = [
	'miro.com',
	'miro.atlassian.net',
	'code.devrtb.com',
	'docs.google.com',
	'app2.greenhouse.io',
	'miro.latticehq.com',
	'notion.so',
]

function filterNonImportant(tab: Tab): boolean {
	return important_urls.some(importantUrl => tab.url && tab.url.includes(importantUrl))
}

function Popup() {
	const [count, setCount] = useState(0)
	const [currentURL, setCurrentURL] = useState<string>()
	const [sitesList, setSitesList] = useState<Tab[]>([])

	useEffect(() => {
		console.log('useEffect1')
		chrome.browserAction.setBadgeText({text: count.toString()})
	}, [count])

	useEffect(() => {
		console.log('useEffect2')
		chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
			setCurrentURL(tabs[0].url)
		})
	}, [])

	useEffect(() => {
		chrome.tabs.query({}, (tabs) => {
			setSitesList(tabs)
		})
	})

	const changeBackground = () => {
		chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
			const tab = tabs[0]
			if (tab.id) {
				chrome.tabs.sendMessage(
					tab.id,
					{
						color: '#555555',
					},
					(msg) => {
						console.log('result message:', msg)
					},
				)
			}
		})
	}

	const getHistory = () => {
		chrome.tabs.query({}, (tabs) => {
			setSitesList(tabs)
		})

		// chrome.history.search({text: '', maxResults: 100}, function(data) {
		// 	data.forEach(function(page) {
		// 		console.log(page.url)
		// 	})
		// })
	}

	return (
		<>
			<ul style={{minWidth: '700px'}}>
				<li>Current URL: {currentURL}</li>
				<li>Current Time: {new Date().toLocaleTimeString()}</li>
			</ul>
			<button
				onClick={() => setCount(count + 1)}
				style={{marginRight: '5px'}}
			>
				count up
			</button>
			<button onClick={getHistory}>Get history</button>
			<button onClick={changeBackground}>change background</button>
		</>
	)
}

ReactDOM.render(
	<React.StrictMode>
		<Popup/>
	</React.StrictMode>,
	document.getElementById('root'),
)
