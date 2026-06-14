import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import axios from 'axios'
import Review from './pages/Review'

const API = 'http://localhost:5000'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get(`${API}/api/auth/me`, { withCredentials: true })
      .then(res => setUser(res.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p style={{ padding: '2rem' }}>Loading...</p>

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          user
            ? <Navigate to="/dashboard" />
            : <Login />
        } />
        <Route path="/dashboard" element={
          user
            ? <Review user={user} />
            : <Navigate to="/" />
        } />
      </Routes>
    </BrowserRouter>
  )
}

function Login() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0a' }}>
      <div style={{ textAlign: 'center', color: '#fff' }}>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>AI Code Review</h1>
        <p style={{ color: '#888', marginBottom: 24 }}>Get instant AI-powered feedback on your code</p>
        <button
          onClick={() => window.location.href = `${API}/api/auth/github`}
          style={{ padding: '10px 24px', borderRadius: 8, background: '#238636', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 500 }}
        >
          Login with GitHub
        </button>
      </div>
    </div>
  )
}

export default App