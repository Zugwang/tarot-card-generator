import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import { applyTheme } from './lib/editor/theme.svelte'

applyTheme()

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
