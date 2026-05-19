import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './RequirementsSpecPopup.css'

/**
 * Requirements Specification Popup Component
 * 
 * Interactive Q&A session to build a complete requirements specification.
 * Presents clarification questions with numbered suggestions and tracks progress.
 */
function RequirementsSpecPopup({ socket, reportContent, onComplete, onClose }) {
    const [sessionStarted, setSessionStarted] = useState(false)
    const [currentQuestion, setCurrentQuestion] = useState(null)
    const [progress, setProgress] = useState({ current: 0, total: 0 })
    const [customAnswer, setCustomAnswer] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(null)
    const [answers, setAnswers] = useState({})

    useEffect(() => {
        if (!socket) return

        // Start the session
        socket.emit('start_requirements_spec', { report_content: reportContent })

        // Listen for session started
        socket.on('spec_session_started', (data) => {
            console.log('Spec session started:', data)
            setSessionStarted(true)
            setProgress({ current: 0, total: data.total_questions })
            setIsLoading(true)
        })

        // Listen for questions
        socket.on('spec_question', (data) => {
            console.log('Received question:', data)
            setCurrentQuestion(data)
            setProgress(data.progress)
            setCustomAnswer('')
            setIsLoading(false)
        })

        // Listen for answer recorded
        socket.on('spec_answer_recorded', (data) => {
            console.log('Answer recorded:', data)
            setAnswers(prev => ({ ...prev, [data.question_id]: data.answer }))
            setIsLoading(true)
        })

        // Listen for completion
        socket.on('spec_completed', (data) => {
            console.log('Spec completed:', data)
            setIsLoading(false)
            onComplete(data)
        })

        // Listen for errors
        socket.on('spec_error', (data) => {
            console.error('Spec error:', data)
            setError(data.message)
            setIsLoading(false)
        })

        return () => {
            socket.off('spec_session_started')
            socket.off('spec_question')
            socket.off('spec_answer_recorded')
            socket.off('spec_completed')
            socket.off('spec_error')
        }
    }, [socket, reportContent, onComplete])

    const handleSuggestionClick = (suggestion) => {
        if (isLoading) return

        // Extract the number from the suggestion (e.g., "1. Option" -> "1")
        const match = suggestion.match(/^(\d+)\./)
        const answer = match ? match[1] : suggestion

        socket.emit('send_spec_answer', {
            answer,
            suggestions: currentQuestion.suggestions
        })
        setIsLoading(true)
    }

    const handleCustomSubmit = () => {
        if (!customAnswer.trim() || isLoading) return

        socket.emit('send_spec_answer', {
            answer: customAnswer.trim(),
            suggestions: currentQuestion.suggestions
        })
        setIsLoading(true)
    }

    const handleSkip = () => {
        if (isLoading) return
        socket.emit('skip_spec_question', {})
        setIsLoading(true)
    }

    const getCategoryIcon = (category) => {
        const icons = {
            functional: '⚙️',
            non_functional: '🛡️',
            technical: '💻',
            timeline: '📅',
            general: '📋'
        }
        return icons[category] || '📋'
    }

    const getPriorityColor = (priority) => {
        const colors = {
            must_ask: '#ef4444',
            should_ask: '#f59e0b',
            nice_to_ask: '#10b981'
        }
        return colors[priority] || '#6b7280'
    }

    return (
        <div className="spec-popup-overlay" onClick={onClose}>
            <motion.div
                className="spec-popup"
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
                {/* Header */}
                <div className="spec-header">
                    <div className="spec-header-left">
                        <h2 className="spec-title">📋 Requirements Specification</h2>
                        <p className="spec-subtitle">Let's clarify your project requirements</p>
                    </div>
                    <button className="spec-close-btn" onClick={onClose}>×</button>
                </div>

                {/* Progress Bar */}
                {progress.total > 0 && (
                    <div className="spec-progress-container">
                        <div className="spec-progress-info">
                            <span className="spec-progress-text">
                                Question {progress.current} of {progress.total}
                            </span>
                            <span className="spec-progress-percent">
                                {Math.round((progress.current / progress.total) * 100)}%
                            </span>
                        </div>
                        <div className="spec-progress-bar">
                            <motion.div
                                className="spec-progress-fill"
                                initial={{ width: 0 }}
                                animate={{ width: `${(progress.current / progress.total) * 100}%` }}
                                transition={{ duration: 0.5, ease: 'easeOut' }}
                            />
                        </div>
                    </div>
                )}

                {/* Error Display */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            className="spec-error"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                        >
                            <span className="spec-error-icon">⚠️</span>
                            <span className="spec-error-text">{error}</span>
                            <button className="spec-error-close" onClick={() => setError(null)}>×</button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Question Display */}
                <AnimatePresence mode="wait">
                    {currentQuestion && (
                        <motion.div
                            key={currentQuestion.question_id}
                            className="spec-question-container"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            {/* Question Header */}
                            <div className="spec-question-header">
                                <div className="spec-question-meta">
                                    <span className="spec-question-category">
                                        {getCategoryIcon(currentQuestion.category)}
                                        {currentQuestion.category.replace(/_/g, ' ')}
                                    </span>
                                    <span
                                        className="spec-question-priority"
                                        style={{ backgroundColor: getPriorityColor(currentQuestion.priority) }}
                                    >
                                        {currentQuestion.priority.replace(/_/g, ' ')}
                                    </span>
                                </div>
                                <span className="spec-question-id">{currentQuestion.question_id}</span>
                            </div>

                            {/* Question Text */}
                            <div className="spec-question-text">
                                {currentQuestion.question}
                            </div>

                            {/* Context */}
                            {currentQuestion.context && (
                                <div className="spec-question-context">
                                    <span className="spec-context-icon">💡</span>
                                    <span className="spec-context-text">{currentQuestion.context}</span>
                                </div>
                            )}

                            {/* Suggestions */}
                            <div className="spec-suggestions">
                                <h4 className="spec-suggestions-title">Select an option:</h4>
                                <div className="spec-suggestions-grid">
                                    {currentQuestion.suggestions.map((suggestion, index) => {
                                        const isOther = suggestion.toLowerCase().includes('other')
                                        return (
                                            <motion.button
                                                key={index}
                                                className={`spec-suggestion-btn ${isOther ? 'spec-suggestion-other' : ''}`}
                                                onClick={() => handleSuggestionClick(suggestion)}
                                                disabled={isLoading}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                {suggestion}
                                            </motion.button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Custom Answer Input */}
                            <div className="spec-custom-answer">
                                <label className="spec-custom-label">Or enter your own answer:</label>
                                <div className="spec-custom-input-group">
                                    <input
                                        type="text"
                                        className="spec-custom-input"
                                        value={customAnswer}
                                        onChange={(e) => setCustomAnswer(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleCustomSubmit()}
                                        placeholder="Type your answer here..."
                                        disabled={isLoading}
                                    />
                                    <button
                                        className="spec-custom-submit"
                                        onClick={handleCustomSubmit}
                                        disabled={!customAnswer.trim() || isLoading}
                                    >
                                        Submit
                                    </button>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="spec-actions">
                                <button
                                    className="spec-skip-btn"
                                    onClick={handleSkip}
                                    disabled={isLoading}
                                >
                                    Skip Question
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Loading State */}
                {isLoading && !currentQuestion && (
                    <div className="spec-loading">
                        <motion.div
                            className="spec-loading-spinner"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        />
                        <p className="spec-loading-text">
                            {sessionStarted ? 'Generating next question...' : 'Starting session...'}
                        </p>
                    </div>
                )}
            </motion.div>
        </div>
    )
}

export default RequirementsSpecPopup
