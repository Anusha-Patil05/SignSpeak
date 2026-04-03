/**
 * useHandTracking.js
 * 
 * This hook does 3 things:
 * 1. Starts your webcam
 * 2. Runs MediaPipe on every frame to find hand landmarks
 * 3. Sends those landmarks to the backend every 300ms for classification
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import axios from 'axios'

const API_BASE = 'http://localhost:8000'
const CLASSIFY_INTERVAL_MS = 300  // classify 3 times per second

export function useHandTracking(videoRef, canvasRef, isActive) {
  const [currentGesture, setCurrentGesture] = useState(null)
  const [isHandDetected, setIsHandDetected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const handsRef = useRef(null)
  const cameraRef = useRef(null)
  const latestLandmarks = useRef(null)  // stores the most recent hand landmarks

  // ── Send landmarks to backend ──────────────────────────────────────────────
  const classifyLandmarks = useCallback(async (landmarks) => {
    try {
      const response = await axios.post(`${API_BASE}/classify`, {
        landmarks: landmarks.map(lm => ({
          x: lm.x,
          y: lm.y,
          z: lm.z
        }))
      })
      if (response.data.word) {
        setCurrentGesture(response.data)
      }
    } catch (err) {
      // Don't crash the UI if one classification fails
      console.warn('Classification failed:', err.message)
    }
  }, [])

  // ── Draw hand skeleton on canvas ───────────────────────────────────────────
  const drawHand = useCallback((ctx, landmarks, width, height) => {
    // These pairs define which dots to connect with lines
    const connections = [
      [0,1],[1,2],[2,3],[3,4],          // thumb
      [0,5],[5,6],[6,7],[7,8],          // index finger
      [0,9],[9,10],[10,11],[11,12],     // middle finger
      [0,13],[13,14],[14,15],[15,16],   // ring finger
      [0,17],[17,18],[18,19],[19,20],   // pinky
      [5,9],[9,13],[13,17],             // palm
    ]

    // Draw lines between joints
    ctx.strokeStyle = 'rgba(0, 255, 180, 0.8)'
    ctx.lineWidth = 2.5
    connections.forEach(([a, b]) => {
      ctx.beginPath()
      ctx.moveTo(landmarks[a].x * width, landmarks[a].y * height)
      ctx.lineTo(landmarks[b].x * width, landmarks[b].y * height)
      ctx.stroke()
    })

    // Draw a dot at each landmark
    landmarks.forEach((lm, i) => {
      const x = lm.x * width
      const y = lm.y * height
      const isFingertip = [4, 8, 12, 16, 20].includes(i)

      ctx.beginPath()
      ctx.arc(x, y, isFingertip ? 6 : 4, 0, Math.PI * 2)
      ctx.fillStyle = isFingertip
        ? 'rgba(255, 220, 0, 0.9)'   // yellow dots at fingertips
        : 'rgba(0, 255, 180, 0.9)'   // green dots at other joints
      ctx.fill()
    })
  }, [])

  // ── Handle each MediaPipe result frame ─────────────────────────────────────
  const onResults = useCallback((results) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    canvas.width = results.image.width
    canvas.height = results.image.height
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (results.multiHandLandmarks?.length > 0) {
      setIsHandDetected(true)
      const landmarks = results.multiHandLandmarks[0]   // use first hand only
      drawHand(ctx, landmarks, canvas.width, canvas.height)
      latestLandmarks.current = landmarks               // save for classification
    } else {
      setIsHandDetected(false)
      latestLandmarks.current = null
    }
  }, [canvasRef, drawHand])

  // ── Start MediaPipe when camera turns on ───────────────────────────────────
  useEffect(() => {
    if (!isActive || !videoRef.current) return

    let cancelled = false

    const init = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const Hands = window.Hands
        const Camera = window.Camera

        const hands = new Hands({
            locateFile: (file) =>
             `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
})

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.6,
})

        hands.onResults(onResults)

        const camera = new Camera(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current) {
              await hands.send({ image: videoRef.current })
            }
          },
          width: 640,
          height: 480,
        })

        if (!cancelled) {
          await camera.start()
          handsRef.current = hands
          cameraRef.current = camera
          setIsLoading(false)
        }

      } catch (err) {
        if (!cancelled) {
          setError(`Camera error: ${err.message}`)
          setIsLoading(false)
        }
      }
    }

    init()

    // Cleanup: stop camera when isActive turns false
    return () => {
      cancelled = true
      cameraRef.current?.stop()
      handsRef.current?.close()
      cameraRef.current = null
      handsRef.current = null
    }
  }, [isActive, videoRef, onResults])

  // ── Classify landmarks every 300ms ─────────────────────────────────────────
  useEffect(() => {
    if (!isActive) return

    const timer = setInterval(() => {
      if (latestLandmarks.current) {
        classifyLandmarks(latestLandmarks.current)
      }
    }, CLASSIFY_INTERVAL_MS)

    return () => clearInterval(timer)
  }, [isActive, classifyLandmarks])

  return { currentGesture, isHandDetected, isLoading, error }
}