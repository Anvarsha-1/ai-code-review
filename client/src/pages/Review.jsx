import { useState } from 'react'
import Editor from '@monaco-editor/react'

const API = 'http://localhost:5000'
const LANGUAGES = ['javascript', 'python', 'java', 'typescript', 'go', 'cpp', 'rust']

function Review({ user }) {  // 🟢 Accepted user prop cleanly here
    const [code, setCode] = useState('')
    const [language, setLanguage] = useState('javascript')
    const [feedback, setFeedback] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [streaming, setStreaming] = useState('')
    const [upgrading, setUpgrading] = useState(false) // 🟢 Integrated state dependency

    // Real logout — clears session cookie and redirects home
    const handleLogout = async () => {
        try {
            await fetch(`${API}/api/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            })
        } catch (err) {
            console.error('Logout request failed:', err)
        }
        window.location.href = '/'
    }

    // Real upgrade — opens Stripe checkout gateway
    const handleUpgrade = async () => {
        setUpgrading(true)
        try {
            const res = await fetch(`${API}/api/billing/checkout`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            })
            const data = await res.json()
            if (data.url) window.location.href = data.url
            else setError('Failed to open checkout window')
        } catch {
            setError('Failed to contact checkout service')
        } finally {
            setUpgrading(false)
        }
    }

    const handleReview = async () => {
        if (!code || !code.trim() || code.trim() === '// paste your code here') {
            setError('Please paste some code before reviewing.')
            return
        }

        setLoading(true)
        setFeedback(null)
        setError(null)
        setStreaming('')

        try {
            const res = await fetch(`${API}/api/review/stream`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ code, language })
            })

            if (!res.ok) {
                const err = await res.json()
                setError(err.error || 'Something went wrong')
                setLoading(false)
                return
            }

            const reader = res.body.getReader()
            const decoder = new TextDecoder()
            let accumulatedText = ''

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                const chunk = decoder.decode(value, { stream: true })
                const lines = chunk.split('\n')

                for (const line of lines) {
                    const trimmed = line.trim()
                    if (!trimmed.startsWith('data:')) continue

                    const rawValue = trimmed.slice(5).trim()
                    if (!rawValue || rawValue === '[DONE]') continue

                    if (rawValue.startsWith('[ERROR]')) {
                        setError(rawValue.replace('[ERROR]', '').trim())
                        setLoading(false)
                        return
                    }

                    try {
                        const decodedChunk = decodeURIComponent(rawValue)
                        accumulatedText += decodedChunk
                        setStreaming(accumulatedText)
                    } catch {
                        accumulatedText += rawValue
                        setStreaming(accumulatedText)
                    }
                }
            }

            if (!accumulatedText) {
                setError('No response received from server.')
                return
            }

            try {
                const parsed = JSON.parse(accumulatedText)
                setFeedback(parsed)
                setStreaming('')
            } catch (e) {
                console.error('Parse error:', e.message)
                setError('AI returned malformed response structure. Please try again.')
            }

        } catch (err) {
            console.error('Fetch error:', err)
            setError('Network error. Is the server running?')
        } finally {
            setLoading(false)
        }
    }

    return (
        /* 🟢 FIX: Single parent layout wrapper wrapping both sub-sections perfectly */
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#111', fontFamily: 'sans-serif' }}>

            {/* 1. Header Toolbar Panel */}
            <div style={{
                height: 48, background: '#0a0a0a', borderBottom: '1px solid #222',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 16px', zIndex: 100, flexShrink: 0
            }}>
                <span style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>
                    AI Code Review
                </span>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>

                    <span style={{ fontSize: 13, color: '#888' }}>
                        {user?.plan === 'pro' ? '✦ Pro' : `${user?.usageCount || 0} / 5 reviews used`}
                    </span>

                    {user?.plan !== 'pro' && (
                        <button
                            onClick={handleUpgrade}
                            disabled={upgrading}
                            style={{
                                padding: '5px 14px', borderRadius: 6,
                                background: '#7c3aed', color: '#fff',
                                border: 'none', cursor: upgrading ? 'not-allowed' : 'pointer', fontSize: 13
                            }}
                        >
                            {upgrading ? '...' : 'Upgrade ↑'}
                        </button>
                    )}

                    <button
                        onClick={handleLogout}
                        style={{
                            padding: '5px 14px', borderRadius: 6,
                            background: '#1e1e1e', color: '#aaa',
                            border: '1px solid #333', cursor: 'pointer', fontSize: 13
                        }}
                    >
                        Logout
                    </button>

                    <img
                        src={user?.avatar || user?.avathar || 'https://via.placeholder.com/28'}
                        width={28}
                        height={28}
                        style={{ borderRadius: '50%', objectFit: 'cover' }}
                        alt="profile"
                        onError={e => { e.target.src = 'https://via.placeholder.com/28' }}
                    />
                </div>
            </div>

            {/* 2. Workspace Layout Split Screen Grid */}
            <div style={{ display: 'flex', flex: 1, height: 'calc(100vh - 48px)' }}>

                {/* Left Hand: Interactive Monaco Text Workspace */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid #333' }}>
                    <div style={{ padding: '12px 16px', background: '#1e1e1e', display: 'flex', gap: 12, alignItems: 'center' }}>
                        <select
                            value={language}
                            onChange={e => setLanguage(e.target.value)}
                            style={{ padding: '6px 10px', borderRadius: 6, background: '#2d2d2d', color: '#fff', border: '1px solid #444' }}
                        >
                            {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                        <button
                            onClick={handleReview}
                            disabled={loading}
                            style={{ padding: '6px 18px', borderRadius: 6, background: loading ? '#444' : '#0ea5e9', color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 500 }}
                        >
                            {loading ? 'Reviewing...' : 'Review code →'}
                        </button>
                    </div>
                    <Editor
                        height="100%"
                        language={language}
                        value={code}
                        defaultValue="// paste your code here"
                        onChange={val => {
                            setCode(val || '')
                            setError(null)
                        }}
                        theme="vs-dark"
                        options={{ fontSize: 14, minimap: { enabled: false }, wordWrap: 'on' }}
                    />
                </div>

                {/* Right Hand: Structured Metric Response Sidebar */}
                <div style={{ width: 420, overflowY: 'auto', background: '#111', color: '#e5e5e5', padding: '1.25rem' }}>
                    <h2 style={{ margin: '0 0 1rem', fontSize: 16, color: '#fff' }}>Review results</h2>

                    {!feedback && !streaming && !error && (
                        <p style={{ color: '#555', fontSize: 14 }}>Paste your code and click "Review code" to get AI feedback.</p>
                    )}

                    {error && (
                        <div style={{ background: '#3b1a1a', border: '1px solid #7f2c2c', borderRadius: 8, padding: '12px 14px', color: '#f87171', fontSize: 14 }}>
                            {error}
                        </div>
                    )}

                    {streaming && !feedback && (
                        <div style={{ background: '#1a1a2e', border: '1px solid #2d2d5e', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#a5b4fc', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace' }}>
                            {streaming}▌
                        </div>
                    )}

                    {feedback && <FeedbackPanel feedback={feedback} />}
                </div>

            </div>
        </div>
    )
}

function FeedbackPanel({ feedback }) {
    const [tab, setTab] = useState('bugs')

    const tabs = [
        { key: 'bugs', label: 'Bugs', color: '#ef4444', items: feedback.bugs || [] },
        { key: 'smells', label: 'Smells', color: '#f59e0b', items: feedback.smells || [] },
        { key: 'suggestions', label: 'Suggestions', color: '#3b82f6', items: feedback.suggestions || [] },
    ]

    const active = tabs.find(t => t.key === tab)

    return (
        <div>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: 48, fontWeight: 700, color: scoreColor(feedback.score) }}>
                    {feedback.score}<span style={{ fontSize: 20, color: '#555' }}>/10</span>
                </div>
                <p style={{ fontSize: 13, color: '#aaa', margin: '4px 0 0' }}>{feedback.summary}</p>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
                {tabs.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        style={{
                            flex: 1, padding: '6px 0', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500,
                            background: tab === t.key ? t.color : '#1e1e1e',
                            color: tab === t.key ? '#fff' : '#888'
                        }}
                    >
                        {t.label} ({t.items.length})
                    </button>
                ))}
            </div>

            {active.items.length === 0 ? (
                <p style={{ color: '#555', fontSize: 13 }}>No {active.label.toLowerCase()} found ✓</p>
            ) : (
                active.items.map((item, i) => (
                    <div key={i} style={{ background: '#1a1a1a', border: `1px solid ${active.color}33`, borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
                        {item.line && (
                            <span style={{ fontSize: 11, color: active.color, marginBottom: 4, display: 'block' }}>Line {item.line}</span>
                        )}
                        <p style={{ margin: 0, fontSize: 13, color: '#ddd', lineHeight: 1.6 }}>{item.message}</p>
                        {item.severity && (
                            <span style={{ fontSize: 11, color: '#666', marginTop: 4, display: 'block' }}>{item.severity}</span>
                        )}
                    </div>
                ))
            )}
        </div>
    )
}

function scoreColor(score) {
    if (score >= 8) return '#22c55e'
    if (score >= 5) return '#f59e0b'
    return '#ef4444'
}

export default Review