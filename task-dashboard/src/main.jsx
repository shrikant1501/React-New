// main.jsx — Phase 7: Providers wrap the entire application.
//
// PROVIDER PLACEMENT:
// Providers must be ABOVE any component that consumes their context.
// We place both providers here (the root) so every component in the
// entire app can access them.
//
// ORDER: ThemeProvider wraps TaskProvider wraps App.
// The order doesn't matter for correctness — both are accessible everywhere.
// Convention: outermost = most global/fundamental (theme, auth)
//
// In larger apps this file might have many more providers:
//   <AuthProvider>
//     <ThemeProvider>
//       <QueryClientProvider>   (React Query — Phase 9)
//         <App />
//       </QueryClientProvider>
//     </ThemeProvider>
//   </AuthProvider>

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from './context/ThemeContext'
import { TaskProvider } from './context/TaskContext'
import App from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <TaskProvider>
        <App />
      </TaskProvider>
    </ThemeProvider>
  </StrictMode>,
)
