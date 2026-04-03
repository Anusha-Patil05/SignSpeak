import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import WebcamFeed from './components/WebcamFeed'
import CameraPermissionModal from './components/CameraPermissionModal'
import { speak } from './utils/speechUtils'

const DEBOUNCE_MS = 1500

export default function App() {
  const [isActive, setIsActive] = useState(false)
  const [autoSpeak, setAutoSpeak] = useState(false)
  const [showCameraModal, setShowCameraModal] = useState(false)
  const [currentGesture, setCurrentGesture] = useState(null)
  const [history, setHistory] = useState([])
  const [backendOnline, setBackendOnline] = useState(true)
  const [sentence, setSentence] = useState([])

  const lastAddedRef = useRef({ word: null, time: 0 })

  useEffect(() => {
    fetch('https://signspeak-backend-x9ub.onrender.com/health')
      .then(() => setBackendOnline(true))
      .catch(() => setBackendOnline(false))
  }, [])

  const handleGestureDetected = useCallback((gesture) => {
    if (!gesture?.word) return
    setCurrentGesture(gesture)

    const now = Date.now()
    const isSameWord = lastAddedRef.current.word === gesture.word
    const tooSoon = now - lastAddedRef.current.time < DEBOUNCE_MS
    if (isSameWord && tooSoon) return

    setHistory(prev => [...prev.slice(-99), {
      id: `${Date.now()}-${Math.random()}`,
      ...gesture,
      timestamp: new Date().toISOString()
    }])

    lastAddedRef.current = { word: gesture.word, time: now }
    if (autoSpeak) speak(gesture.word)
  }, [autoSpeak])

  const total = history.length
  const uniqueWords = new Set(history.map(h => h.word)).size
  const avgConf = total > 0
    ? Math.round(history.reduce((s, h) => s + h.confidence, 0) / total * 100)
    : 0
  const topWord = total > 0
    ? Object.entries(history.reduce((acc, h) => {
        acc[h.word] = (acc[h.word] || 0) + 1
        return acc
      }, {})).sort((a, b) => b[1] - a[1])[0][0]
    : '—'

  const confColor = currentGesture
    ? currentGesture.confidence > 0.85 ? '#00ffb4'
    : currentGesture.confidence > 0.65 ? '#ffcc00' : '#ff6b6b'
    : '#555'

  return (
    <div style={S.root}>
      <div style={S.bgGrid} />
      <div style={S.app}>

        {/* Warning */}
        {!backendOnline && (
          <div style={S.warning}>
            ⚠️ Backend not running — open a terminal in backend folder and run: python main.py
          </div>
        )}

        {/* Header */}
        <header style={S.header}>
          <div style={S.brand}>
            <motion.span
              style={S.logo}
              animate={{ rotate: isActive ? [0, 10, -10, 0] : 0 }}
              transition={{ repeat: Infinity, duration: 3 }}
            >🤟</motion.span>
            <div>
              <h1 style={S.title}>SignSpeak</h1>
              <p style={S.subtitle}>Real-time Sign Language Recognition</p>
            </div>
          </div>
          <div style={S.controls}>
            <button
              style={{
                ...S.toggleBtn,
                background: autoSpeak ? 'rgba(0,255,180,0.15)' : 'rgba(255,255,255,0.05)',
                borderColor: autoSpeak ? 'rgba(0,255,180,0.4)' : 'rgba(255,255,255,0.1)',
                color: autoSpeak ? '#00ffb4' : '#666',
              }}
              onClick={() => setAutoSpeak(o => !o)}
            >
              🔊 Auto-Speak
            </button>
            <motion.button
              style={{
                ...S.cameraBtn,
                background: isActive ? 'rgba(255,80,80,0.15)' : 'rgba(0,255,180,0.15)',
                borderColor: isActive ? 'rgba(255,80,80,0.4)' : 'rgba(0,255,180,0.4)',
                color: isActive ? '#ff6b6b' : '#00ffb4',
              }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                if (!isActive) setShowCameraModal(true)
                else { setIsActive(false); setCurrentGesture(null) }
              }}
            >
              {isActive ? '⏹ Stop Camera' : '▶ Start Camera'}
            </motion.button>
          </div>
        </header>

        {/* Stats */}
        <div style={S.statsGrid}>
          {[
            { icon: '🖐️', value: total, label: 'Detections' },
            { icon: '📖', value: uniqueWords, label: 'Unique Signs' },
            { icon: '🎯', value: `${avgConf}%`, label: 'Avg Confidence' },
            { icon: '🏆', value: topWord, label: 'Top Sign' },
          ].map(stat => (
            <div key={stat.label} style={S.statCard}>
              <span style={{ fontSize: 20 }}>{stat.icon}</span>
              <motion.span
                key={String(stat.value)}
                style={S.statValue}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                {stat.value || '—'}
              </motion.span>
              <span style={S.statLabel}>{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Main */}
        <div style={S.main}>

          {/* Left */}
          <div style={S.leftCol}>
            <WebcamFeed
              isActive={isActive}
              onGestureDetected={handleGestureDetected}
            />

            {/* Detection */}
            <div style={S.detectionPanel}>
              <span style={S.sectionLabel}>DETECTED SIGN</span>
              <div style={S.wordArea}>
                <AnimatePresence mode="wait">
                  {currentGesture?.word ? (
                    <motion.div
                      key={currentGesture.word}
                      initial={{ opacity: 0, y: 20, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      style={{ textAlign: 'center' }}
                    >
                      <h2 style={S.detectedWord}>{currentGesture.word}</h2>
                      <p style={S.detectedDesc}>{currentGesture.description}</p>
                    </motion.div>
                  ) : (
                    <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center' }}>
                      <p style={{ color: '#444', fontSize: 18 }}>Show your hand to the camera</p>
                      <p style={{ color: '#333', fontSize: 13, marginTop: 8 }}>Try 👋 👍 ✌️ ☝️ ✊</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {currentGesture && (
                <div>
                  <div style={S.confRow}>
                    <span style={{ color: '#555', fontSize: 12 }}>Confidence</span>
                    <span style={{ color: confColor, fontSize: 13, fontWeight: 700 }}>
                      {Math.round(currentGesture.confidence * 100)}%
                    </span>
                  </div>
                  <div style={S.confTrack}>
                    <motion.div
                      style={{ ...S.confFill, background: confColor }}
                      initial={{ width: 0 }}
                      animate={{ width: `${currentGesture.confidence * 100}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <motion.button
                  style={{
                    ...S.speakBtn,
                    flex: 1,
                    opacity: currentGesture?.word ? 1 : 0.4,
                    cursor: currentGesture?.word ? 'pointer' : 'not-allowed',
                  }}
                  whileHover={currentGesture?.word ? { scale: 1.03 } : {}}
                  whileTap={currentGesture?.word ? { scale: 0.97 } : {}}
                  onClick={() => currentGesture?.word && speak(currentGesture.word)}
                >
                  🔈 Speak
                </motion.button>

                <motion.button
                  style={{
                    ...S.speakBtn,
                    flex: 1,
                    opacity: currentGesture?.word ? 1 : 0.4,
                    cursor: currentGesture?.word ? 'pointer' : 'not-allowed',
                    borderColor: 'rgba(255,100,180,0.4)',
                    color: '#ff6eb4',
                    background: 'rgba(255,100,180,0.08)',
                  }}
                  whileHover={currentGesture?.word ? { scale: 1.03 } : {}}
                  whileTap={currentGesture?.word ? { scale: 0.97 } : {}}
                  onClick={() => currentGesture?.word && setSentence(p => [...p, currentGesture.word])}
                >
                  + Sentence
                </motion.button>
              </div>
            </div>

            {/* Sentence Builder */}
            <div style={S.sentencePanel}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={S.sectionLabel}>SENTENCE BUILDER</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    style={{ ...S.miniBtn, color: '#00ffb4', borderColor: 'rgba(0,255,180,0.3)' }}
                    onClick={() => sentence.length > 0 && speak(sentence.join(' '))}
                  >
                    🔊 Speak All
                  </button>
                  <button
                    style={{ ...S.miniBtn, color: '#ff6b6b', borderColor: 'rgba(255,100,100,0.3)' }}
                    onClick={() => setSentence([])}
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div style={S.sentenceArea}>
                {sentence.length === 0 ? (
                  <span style={{ color: '#333', fontSize: 12, fontStyle: 'italic' }}>
                    Detect a gesture then click "+ Sentence" to build a phrase...
                  </span>
                ) : (
                  <AnimatePresence>
                    {sentence.map((word, i) => (
                      <motion.span
                        key={`${word}-${i}`}
                        style={S.sentenceChip}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 400 }}
                      >
                        {word}
                      </motion.span>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </div>
          </div>

          {/* Right */}
          <div style={S.rightCol}>
            <div style={S.historyPanel}>
              <div style={S.historyHeader}>
                <span style={S.sectionLabel}>
                  HISTORY <span style={S.badge}>{history.length}</span>
                </span>
                <button
                  style={S.clearBtn}
                  onClick={() => { setHistory([]); setCurrentGesture(null) }}
                >
                  Clear
                </button>
              </div>

              {history.length === 0 ? (
                <div style={S.emptyHistory}>
                  <span style={{ fontSize: 28 }}>📋</span>
                  <p style={{ color: '#555', fontSize: 14, marginTop: 8 }}>No detections yet</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <AnimatePresence initial={false}>
                    {[...history].reverse().map((item) => (
                      <motion.div
                        key={item.id}
                        style={S.historyItem}
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        layout
                      >
                        <div style={{
                          ...S.historyDot,
                          background: item.confidence > 0.85 ? '#00ffb4'
                                    : item.confidence > 0.65 ? '#ffcc00' : '#ff6b6b'
                        }} />
                        <div style={{ flex: 1 }}>
                          <div style={S.historyTopRow}>
                            <span style={S.historyWord}>{item.word}</span>
                            <span style={{ color: '#00ffb4', fontSize: 12, fontFamily: 'monospace' }}>
                              {Math.round(item.confidence * 100)}%
                            </span>
                          </div>
                          <span style={S.historyGesture}>{item.gesture}</span>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <footer style={S.footer}>
          Built with React + MediaPipe + FastAPI •{' '}
          <span style={{ color: '#00ffb4' }}>{history.length} signs recognized</span>
        </footer>

      </div>

      <AnimatePresence>
        {showCameraModal && (
          <CameraPermissionModal
            onGranted={() => { setShowCameraModal(false); setIsActive(true) }}
            onDismiss={() => setShowCameraModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

const S = {
  root: {
    minHeight: '100vh', background: '#0a0a0a',
    color: '#fff', fontFamily: "'Inter', system-ui, sans-serif",
    position: 'relative',
  },
  bgGrid: {
    position: 'fixed', inset: 0,
    backgroundImage: `
      linear-gradient(rgba(0,255,180,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,255,180,0.03) 1px, transparent 1px)
    `,
    backgroundSize: '40px 40px',
    pointerEvents: 'none', zIndex: 0,
  },
  app: {
    position: 'relative', zIndex: 1,
    maxWidth: 1200, margin: '0 auto',
    padding: '20px', display: 'flex',
    flexDirection: 'column', gap: 16,
  },
  warning: {
    background: 'rgba(255,180,0,0.08)',
    border: '1px solid rgba(255,180,0,0.3)',
    borderRadius: 10, padding: '10px 16px',
    color: '#ffcc00', fontSize: 13, textAlign: 'center',
  },
  header: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', flexWrap: 'wrap', gap: 16,
    paddingBottom: 16,
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  brand: { display: 'flex', alignItems: 'center', gap: 12 },
  logo: { fontSize: 38, display: 'block', lineHeight: 1 },
  title: {
    fontSize: 26, fontWeight: 900, margin: 0,
    background: 'linear-gradient(135deg, #fff 0%, #00ffb4 100%)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    letterSpacing: '-0.02em',
  },
  subtitle: { fontSize: 12, color: '#555', margin: 0, marginTop: 2 },
  controls: { display: 'flex', gap: 8 },
  toggleBtn: {
    padding: '9px 14px', borderRadius: 10, border: '1.5px solid',
    fontSize: 12, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'inherit', transition: 'all 0.2s',
  },
  cameraBtn: {
    padding: '9px 18px', borderRadius: 10, border: '1.5px solid',
    fontSize: 13, fontWeight: 700, cursor: 'pointer',
    fontFamily: 'inherit', transition: 'all 0.2s',
  },
  statsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10,
  },
  statCard: {
    background: 'rgba(255,255,255,0.03)',
    border: '1.5px solid rgba(255,255,255,0.07)',
    borderRadius: 12, padding: '12px 10px',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 4, textAlign: 'center',
  },
  statValue: {
    fontSize: 20, fontWeight: 800, color: '#fff',
    fontFamily: 'monospace', lineHeight: 1,
  },
  statLabel: {
    fontSize: 9, color: '#555', fontWeight: 600,
    letterSpacing: '0.08em', textTransform: 'uppercase',
  },
  main: {
    display: 'grid', gridTemplateColumns: '1fr 320px',
    gap: 16, alignItems: 'start',
  },
  leftCol: { display: 'flex', flexDirection: 'column', gap: 14 },
  rightCol: { display: 'flex', flexDirection: 'column', gap: 14 },
  detectionPanel: {
    background: 'rgba(255,255,255,0.03)',
    border: '1.5px solid rgba(255,255,255,0.08)',
    borderRadius: 16, padding: '20px',
    display: 'flex', flexDirection: 'column', gap: 14,
  },
  sectionLabel: {
    fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
    color: '#555', fontFamily: 'monospace',
    display: 'flex', alignItems: 'center', gap: 8,
  },
  wordArea: {
    minHeight: 90,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  detectedWord: {
    fontSize: 46, fontWeight: 800, color: '#fff',
    fontFamily: "'Georgia', serif",
    textShadow: '0 0 40px rgba(0,255,180,0.3)', margin: 0,
  },
  detectedDesc: { color: '#666', fontSize: 12, marginTop: 6, fontStyle: 'italic' },
  confRow: { display: 'flex', justifyContent: 'space-between', marginBottom: 6 },
  confTrack: {
    height: 5, background: 'rgba(255,255,255,0.06)',
    borderRadius: 3, overflow: 'hidden',
  },
  confFill: { height: '100%', borderRadius: 3 },
  speakBtn: {
    padding: '10px 16px', borderRadius: 10,
    border: '1.5px solid rgba(0,255,180,0.3)',
    background: 'rgba(0,255,180,0.08)',
    color: '#00ffb4', fontSize: 13, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: 8, transition: 'all 0.2s',
  },
  sentencePanel: {
    background: 'rgba(255,255,255,0.03)',
    border: '1.5px solid rgba(255,255,255,0.08)',
    borderRadius: 16, padding: '16px 20px',
    display: 'flex', flexDirection: 'column', gap: 12,
  },
  sentenceArea: {
    minHeight: 44, display: 'flex',
    flexWrap: 'wrap', gap: 6, alignItems: 'center',
  },
  sentenceChip: {
    background: 'rgba(0,255,180,0.1)',
    border: '1px solid rgba(0,255,180,0.3)',
    borderRadius: 8, padding: '5px 12px',
    color: '#00ffb4', fontSize: 14, fontWeight: 700,
  },
  miniBtn: {
    background: 'none', border: '1px solid',
    borderRadius: 6, padding: '4px 10px',
    fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
  },
  historyPanel: {
    background: 'rgba(255,255,255,0.03)',
    border: '1.5px solid rgba(255,255,255,0.08)',
    borderRadius: 16, padding: 18,
    display: 'flex', flexDirection: 'column', gap: 14,
    maxHeight: 540, overflowY: 'auto',
  },
  historyHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  badge: {
    background: 'rgba(255,255,255,0.1)', color: '#888',
    fontSize: 10, padding: '2px 6px', borderRadius: 8,
    fontFamily: 'monospace', marginLeft: 6,
  },
  clearBtn: {
    background: 'none', border: '1px solid rgba(255,100,100,0.3)',
    color: '#ff6b6b', fontSize: 11, padding: '3px 8px',
    borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
  },
  emptyHistory: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', padding: '24px 0',
  },
  historyItem: {
    display: 'flex', gap: 10,
    alignItems: 'flex-start', paddingBottom: 12,
  },
  historyDot: {
    width: 9, height: 9, borderRadius: '50%',
    flexShrink: 0, marginTop: 5,
  },
  historyTopRow: { display: 'flex', justifyContent: 'space-between' },
  historyWord: { fontSize: 15, fontWeight: 700, color: '#e0e0e0' },
  historyGesture: { fontSize: 10, color: '#555', fontFamily: 'monospace' },
  footer: {
    textAlign: 'center', color: '#333', fontSize: 12,
    paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.04)',
  },
}