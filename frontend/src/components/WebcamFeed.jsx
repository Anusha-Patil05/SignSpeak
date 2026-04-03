/**
 * WebcamFeed.jsx
 * 
 * Shows the webcam video with the hand skeleton drawn on top.
 * The video and canvas are stacked — canvas is transparent
 * so the skeleton appears over the live camera image.
 */

import { useRef } from 'react'
import { motion } from 'framer-motion'
import { useHandTracking } from '../hooks/useHandTracking'

export default function WebcamFeed({ isActive, onGestureDetected }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  const { currentGesture, isHandDetected, isLoading, error } =
    useHandTracking(videoRef, canvasRef, isActive)

  // Pass gesture up to App.jsx whenever it changes
  if (currentGesture) {
    onGestureDetected?.(currentGesture)
  }

  return (
    <div style={styles.wrapper}>

      {/* Status indicator */}
      <div style={styles.statusBar}>
        <motion.div
          style={{
            ...styles.dot,
            background: isHandDetected ? '#00ffb4'
                      : isActive       ? '#ffaa00'
                      :                  '#444',
          }}
          animate={{ scale: isHandDetected ? [1, 1.4, 1] : 1 }}
          transition={{ repeat: Infinity, duration: 1 }}
        />
        <span style={styles.statusText}>
          {!isActive      ? 'Camera off'
         : isLoading      ? 'Loading MediaPipe...'
         : error          ? 'Error'
         : isHandDetected ? 'Hand detected'
         :                  'No hand detected — show your hand'}
        </span>
      </div>

      {/* Video + canvas stack */}
      <div style={styles.videoBox}>

        <video
          ref={videoRef}
          style={styles.video}
          playsInline
          muted
        />

        {/* Canvas draws on top of video, perfectly aligned */}
        <canvas
          ref={canvasRef}
          style={styles.canvas}
        />

        {/* Overlays for different states */}
        {isLoading && (
          <div style={styles.overlay}>
            <motion.div
              style={styles.spinner}
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            />
            <p style={{ color: '#00ffb4', fontSize: 14, marginTop: 16 }}>
              Initializing hand tracking...
            </p>
            <p style={{ color: '#555', fontSize: 12, marginTop: 6 }}>
              This takes ~5 seconds the first time
            </p>
          </div>
        )}

        {error && (
          <div style={styles.overlay}>
            <span style={{ fontSize: 36 }}>⚠️</span>
            <p style={{ color: '#ff6b6b', marginTop: 12 }}>{error}</p>
            <p style={{ color: '#555', fontSize: 13, marginTop: 6 }}>
              Allow camera access and refresh the page.
            </p>
          </div>
        )}

        {!isActive && (
          <div style={styles.overlay}>
            <span style={{ fontSize: 48 }}>📷</span>
            <p style={{ color: '#555', marginTop: 12 }}>
              Click Start Camera to begin
            </p>
          </div>
        )}

      </div>
    </div>
  )
}

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  statusBar: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '6px 12px',
    background: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.07)',
  },
  dot: {
    width: 10, height: 10,
    borderRadius: '50%', flexShrink: 0,
  },
  statusText: {
    color: '#888', fontSize: 13, fontFamily: 'monospace',
  },
  videoBox: {
    position: 'relative',
    borderRadius: 16, overflow: 'hidden',
    background: '#0a0a0a',
    border: '1.5px solid rgba(0,255,180,0.2)',
    aspectRatio: '16/9',
    width: '100%',
  },
  video: {
    width: '100%', height: '100%',
    objectFit: 'cover',
    transform: 'scaleX(-1)',   // mirror so it feels like a selfie camera
    display: 'block',
  },
  canvas: {
    position: 'absolute', top: 0, left: 0,
    width: '100%', height: '100%',
    transform: 'scaleX(-1)',   // must mirror the canvas too
    pointerEvents: 'none',
  },
  overlay: {
    position: 'absolute', inset: 0,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.8)',
  },
  spinner: {
    width: 40, height: 40,
    border: '3px solid rgba(0,255,180,0.15)',
    borderTop: '3px solid #00ffb4',
    borderRadius: '50%',
  },
}