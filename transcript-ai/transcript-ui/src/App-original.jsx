import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import './App.css'

const API_URL = 'http://localhost:5001'

function App() {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcription, setTranscription] = useState(null)
  const [error, setError] = useState(null)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    let interval
    if (isRecording) {
      interval = setInterval(() => {
        setDuration(prev => prev + 0.1)
      }, 100)
    } else {
      setDuration(0)
    }
    return () => clearInterval(interval)
  }, [isRecording])

  const startRecording = async () => {
    try {
      setError(null)
      setTranscription(null)
      const response = await axios.post(`${API_URL}/api/start-recording`)
      if (response.data.status === 'recording') {
        setIsRecording(true)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start recording')
      console.error('Error starting recording:', err)
    }
  }

  const stopRecording = async () => {
    try {
      setIsRecording(false)
      setIsProcessing(true)
      const response = await axios.post(`${API_URL}/api/stop-recording`, {
        language: null // Auto-detect
      })
      if (response.data.status === 'completed') {
        setTranscription(response.data)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to process recording')
      console.error('Error stopping recording:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRecordClick = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  return (
    <div className="app">
      <div className="gradient-bg"></div>
      
      <motion.div 
        className="container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <motion.h1 
          className="title"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          Voice Transcription
        </motion.h1>
        
        <motion.p 
          className="subtitle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          Click to record, click again to transcribe • Auto language detection
        </motion.p>

        {/* Recording Bubble */}
        <div className="recording-section">
          <motion.div
            className={`record-button ${isRecording ? 'recording' : ''} ${isProcessing ? 'processing' : ''}`}
            onClick={!isProcessing ? handleRecordClick : undefined}
            whileHover={!isProcessing ? { scale: 1.05 } : {}}
            whileTap={!isProcessing ? { scale: 0.95 } : {}}
            style={{ cursor: isProcessing ? 'not-allowed' : 'pointer' }}
          >
            {/* Animated rings */}
            <AnimatePresence>
              {isRecording && (
                <>
                  <motion.div
                    className="pulse-ring"
                    initial={{ scale: 1, opacity: 0.8 }}
                    animate={{ scale: 2, opacity: 0 }}
                    exit={{ scale: 1, opacity: 0 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                  />
                  <motion.div
                    className="pulse-ring"
                    initial={{ scale: 1, opacity: 0.8 }}
                    animate={{ scale: 2, opacity: 0 }}
                    exit={{ scale: 1, opacity: 0 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut', delay: 0.5 }}
                  />
                </>
              )}
            </AnimatePresence>

            {/* Center icon */}
            <motion.div 
              className="record-icon"
              animate={{
                scale: isRecording ? [1, 1.1, 1] : 1,
              }}
              transition={{
                duration: 1,
                repeat: isRecording ? Infinity : 0,
                ease: 'easeInOut'
              }}
            >
              {isProcessing ? (
                <motion.div
                  className="processing-spinner"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
              ) : isRecording ? (
                <motion.div 
                  className="stop-icon"
                  initial={{ scale: 0, rotate: 180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                />
              ) : (
                <motion.svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                >
                  <path
                    d="M12 14C13.66 14 15 12.66 15 11V5C15 3.34 13.66 2 12 2C10.34 2 9 3.34 9 5V11C9 12.66 10.34 14 12 14Z"
                    fill="currentColor"
                  />
                  <path
                    d="M17 11C17 13.76 14.76 16 12 16C9.24 16 7 13.76 7 11H5C5 14.53 7.61 17.43 11 17.92V21H13V17.92C16.39 17.43 19 14.53 19 11H17Z"
                    fill="currentColor"
                  />
                </motion.svg>
              )}
            </motion.div>
          </motion.div>

          {/* Duration Timer */}
          <AnimatePresence>
            {isRecording && (
              <motion.div
                className="duration"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {duration.toFixed(1)}s
              </motion.div>
            )}
          </AnimatePresence>

          {/* Processing indicator */}
          <AnimatePresence>
            {isProcessing && (
              <motion.div
                className="processing-text"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                Transcribing...
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="error-box"
              initial={{ opacity: 0, scale: 0.9, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              <div className="error-icon">⚠️</div>
              <div className="error-text">{error}</div>
              <button className="error-close" onClick={() => setError(null)}>×</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Transcription Result */}
        <AnimatePresence>
          {transcription && (
            <motion.div
              className="result-box"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            >
              <div className="result-header">
                <h2>Transcription</h2>
                <div className="result-meta">
                  <span className="language-badge">
                    {transcription.language || 'Unknown'}
                    {transcription.language_confidence && (
                      <span className="confidence"> ({transcription.language_confidence}%)</span>
                    )}
                  </span>
                </div>
              </div>
              
              <div className="transcription-text">
                {transcription.transcription}
              </div>
              
              <div className="result-footer">
                <div className="stat">
                  <span className="stat-label">Words:</span>
                  <span className="stat-value">{transcription.word_count || 'N/A'}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Duration:</span>
                  <span className="stat-value">{transcription.duration}s</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Processing:</span>
                  <span className="stat-value">{transcription.processing_time}s</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

export default App
