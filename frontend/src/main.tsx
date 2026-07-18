import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles/global.css'
import './styles/layout.css'
import './styles/dashboard.css'
import './styles/forgot-password.css'
import './styles/pages.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  // 开发环境暂时禁用StrictMode，避免重复渲染导致重复API调用
  import.meta.env.DEV ? <App /> : <React.StrictMode><App /></React.StrictMode>
)
