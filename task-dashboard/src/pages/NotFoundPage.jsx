// pages/NotFoundPage.jsx
// 404 — shown when no route matches the current URL.
// The catch-all route: <Route path="*" element={<NotFoundPage />} />
//
// DEMONSTRATES: useNavigate for programmatic navigation back to a known route.

import { useNavigate } from 'react-router-dom'

function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="page not-found-page">
      <div className="not-found-content">
        <h1 className="not-found-code">404</h1>
        <h2>Page Not Found</h2>
        <p>The page you're looking for doesn't exist or has been moved.</p>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/tasks')}
        >
          Go to Tasks
        </button>
      </div>
    </div>
  )
}

export default NotFoundPage
