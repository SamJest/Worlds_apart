import { WorldsApartApp } from './app/WorldsApartApp.ts'
import './style.css'

const root = document.querySelector<HTMLElement>('#app')
if (!root) throw new Error('Missing #app root element.')

const app = new WorldsApartApp(root)
window.addEventListener('pagehide', () => app.dispose(), { once: true })
