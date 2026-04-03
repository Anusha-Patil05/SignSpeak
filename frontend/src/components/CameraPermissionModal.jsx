/**
 * CameraPermissionModal.jsx
 * 
 * A friendly popup that explains why we need camera access
 * and walks the user through allowing it.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function CameraPermissionModal({ onGranted, onDismiss }) {
  const [isRequesting, setIsRequesting] = useState(false)
  const [error, setError] = useState(null)

  const requestCamera = async () => {
    setIsRequesting(true)
    setError(null)

    try {
      // This triggers the browser's native camera permission popup
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })

      // Permission granted — stop the test stream immediately
      // (WebcamFeed will start its own stream)
      stream.getTracks().forEach(track => track.stop())

      onGranted()

    } catch (err) {
      setIsRequesting(false)

      if (err.name === 'NotAllowedError') {
        setError('blocked')
      } else if (err.name === 'NotFoundError') {
        setError('nocamera')
      } else {
        setError('unknown')
      }
    }
  }

  return (
    // Dark backdrop
    <motion.div
      style={styles.backdrop}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Modal card */}
      <motion.div
        style={styles.modal}
        initial={{ opacity: 0, scale: 0.85, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >

        {/* Icon */}
        <motion.div
          style={styles.iconRing}
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <span style={{ fontSize: 40 }}>📷</span>
        </motion.div>

        {/* Title */}
        <h2 style={styles.title}>Camera Access Needed</h2>
        <p style={styles.subtitle}>
          SignSpeak uses your camera to detect hand gestures in real time.
          No video is recorded or sent anywhere — everything stays on your device.
        </p>

        {/* How it works steps */}
        <div style={styles.steps}>
          {[
            { icon: '🖐️', text: 'Show your hand to the camera' },
            { icon: '🧠', text: 'AI detects your gesture instantly' },
            { icon: '🔊', text: 'Hear the word spoken aloud' },
          ].map((step, i) => (
            <motion.div
              key={i}
              style={styles.step}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
            >
              <span style={styles.stepIcon}>{step.icon}</span>
              <span style={styles.stepText}>{step.text}</span>
            </motion.div>
          ))}
        </div>

        {/* Error messages */}
        <AnimatePresence>
          {error && (
            <motion.div
              style={styles.errorBox}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {error === 'blocked' && (
                <>
                  <span style={styles.errorIcon}>🚫</span>
                  <div>
                    <p style={styles.errorTitle}>Camera access was blocked</p>
                    <p style={styles.errorDesc}>
                      Click the <strong>🔒 lock icon</strong> in your browser's address bar
                      → set Camera to <strong>"Allow"</strong> → refresh the page.
                    </p>
                  </div>
                </>
              )}
              {error === 'nocamera' && (
                <>
                  <span style={styles.errorIcon}>❌</span>
                  <div>
                    <p style={styles.errorTitle}>No camera found</p>
                    <p style={styles.errorDesc}>
                      Make sure a webcam is connected and not being used by another app.
                    </p>
                  </div>
                </>
              )}
              {error === 'unknown' && (
                <>
                  <span style={styles.errorIcon}>⚠️</span>
                  <div>
                    <p style={styles.errorTitle}>Something went wrong</p>
                    <p style={styles.errorDesc}>
                      Try refreshing the page or using Chrome / Edge.
                    </p>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Buttons */}
        <div style={styles.btnRow}>
          <button
            style={styles.dismissBtn}
            onClick={onDismiss}
          >
            Not now
          </button>

          <motion.button
            style={{
              ...styles.allowBtn,
              opacity: isRequesting ? 0.7 : 1,
            }}
            whileHover={{ scale: isRequesting ? 1 : 1.03 }}
            whileTap={{ scale: isRequesting ? 1 : 0.97 }}
            onClick={requestCamera}
            disabled={isRequesting}
          >
            {isRequesting ? (
              <>
                <motion.span
                  style={styles.btnSpinner}
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                />
                Requesting...
              </>
            ) : (
              <>📷 Allow Camera Access</>
            )}
          </motion.button>
        </div>

        {/* Privacy note */}
        <p style={styles.privacy}>
          🔒 Your camera feed never leaves your device
        </p>

      </motion.div>
    </motion.div>
  )
}

const styles = {
  backdrop: {
    position: 'fixed', inset: 0, zIndex: 100,
    background: 'rgba(0,0,0,0.85)',
    backdropFilter: 'blur(6px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 20,
  },
  modal: {
    background: '#141414',
    border: '1.5px solid rgba(0,255,180,0.2)',
    borderRadius: 20,
    padding: '36px 32px',
    maxWidth: 440, width: '100%',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 20,
    boxShadow: '0 0 60px rgba(0,255,180,0.08)',
  },
  iconRing: {
    width: 88, height: 88, borderRadius: '50%',
    background: 'rgba(0,255,180,0.08)',
    border: '2px solid rgba(0,255,180,0.25)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  title: {
    fontSize: 22, fontWeight: 800, color: '#fff',
    textAlign: 'center', margin: 0,
  },
  subtitle: {
    fontSize: 14, color: '#888', textAlign: 'center',
    lineHeight: 1.6, margin: 0,
  },
  steps: {
    width: '100%', display: 'flex',
    flexDirection: 'column', gap: 10,
  },
  step: {
    display: 'flex', alignItems: 'center', gap: 12,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 10, padding: '10px 14px',
  },
  stepIcon: { fontSize: 20, flexShrink: 0 },
  stepText: { fontSize: 14, color: '#ccc' },

  errorBox: {
    width: '100%',
    background: 'rgba(255,80,80,0.08)',
    border: '1px solid rgba(255,80,80,0.25)',
    borderRadius: 10, padding: '12px 14px',
    display: 'flex', gap: 12, alignItems: 'flex-start',
  },
  errorIcon: { fontSize: 20, flexShrink: 0 },
  errorTitle: {
    color: '#ff6b6b', fontWeight: 700,
    fontSize: 14, margin: 0, marginBottom: 4,
  },
  errorDesc: {
    color: '#999', fontSize: 13,
    lineHeight: 1.5, margin: 0,
  },

  btnRow: {
    display: 'flex', gap: 10, width: '100%',
  },
  dismissBtn: {
    flex: 1, padding: '12px',
    borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.1)',
    background: 'none', color: '#666',
    fontSize: 14, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  allowBtn: {
    flex: 2, padding: '12px 20px',
    borderRadius: 10,
    border: '1.5px solid rgba(0,255,180,0.4)',
    background: 'rgba(0,255,180,0.15)',
    color: '#00ffb4', fontSize: 14, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: 8,
  },
  btnSpinner: {
    width: 16, height: 16, borderRadius: '50%',
    border: '2px solid rgba(0,255,180,0.2)',
    borderTop: '2px solid #00ffb4',
    display: 'inline-block',
  },
  privacy: {
    fontSize: 12, color: '#444',
    textAlign: 'center', margin: 0,
  },
}