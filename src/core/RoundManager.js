/**
 * RoundManager - Manages round-based gameplay with collection and building phases
 */
export class RoundManager {
  constructor(eventBus) {
    this.eventBus = eventBus

    // Game configuration
    this.TOTAL_ROUNDS = 5
    this.COLLECTION_PHASE_DURATION = 90 // seconds

    // Game state
    this.currentRound = 1
    this.currentPhase = 'collection' // 'collection' or 'building'
    this.phaseTimeRemaining = this.COLLECTION_PHASE_DURATION
    this.gameEnded = false

    // Score tracking
    this.finalScore = 0
  }

  /**
   * Update timer during collection phase
   */
  update(deltaTime) {
    if (this.gameEnded || this.currentPhase !== 'collection') return

    this.phaseTimeRemaining -= deltaTime / 1000 // Convert to seconds

    if (this.phaseTimeRemaining <= 0) {
      this.endCollectionPhase()
    }
  }

  /**
   * End collection phase and switch to building phase
   */
  endCollectionPhase() {
    this.currentPhase = 'building'
    this.phaseTimeRemaining = 0

    if (this.eventBus) {
      this.eventBus.emit('round:phase_changed', {
        phase: 'building',
        round: this.currentRound
      })
    }
  }

  /**
   * Fast-forward to end of collection phase
   * Returns remaining time in milliseconds
   */
  fastForward() {
    if (this.currentPhase !== 'collection' || this.gameEnded) {
      return 0
    }

    const remainingTime = this.phaseTimeRemaining * 1000 // Convert to ms
    this.endCollectionPhase()
    return remainingTime
  }

  /**
   * End building phase and start next round or end game
   */
  endBuildingPhase() {
    if (this.currentRound >= this.TOTAL_ROUNDS) {
      // Game over
      this.endGame()
      return
    }

    // Start next round
    this.currentRound++
    this.currentPhase = 'collection'
    this.phaseTimeRemaining = this.COLLECTION_PHASE_DURATION

    if (this.eventBus) {
      this.eventBus.emit('round:phase_changed', {
        phase: 'collection',
        round: this.currentRound
      })
    }
  }

  /**
   * End the game and calculate final score
   */
  endGame() {
    this.gameEnded = true
    this.currentPhase = 'ended'

    if (this.eventBus) {
      this.eventBus.emit('round:game_ended', {
        finalScore: this.finalScore,
        round: this.currentRound
      })
    }
  }

  /**
   * Calculate final score
   * Score = (Total Workers) + (Buildings Unlocked × 10)
   */
  calculateScore(workerCount, buildingCount) {
    this.finalScore = workerCount + (buildingCount * 10)
    return this.finalScore
  }

  /**
   * Get current phase info
   */
  getPhaseInfo() {
    return {
      round: this.currentRound,
      phase: this.currentPhase,
      timeRemaining: Math.max(0, Math.ceil(this.phaseTimeRemaining)),
      totalRounds: this.TOTAL_ROUNDS,
      gameEnded: this.gameEnded
    }
  }

  /**
   * Get formatted time remaining
   */
  getFormattedTime() {
    const seconds = Math.max(0, Math.ceil(this.phaseTimeRemaining))
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  /**
   * Check if currently in collection phase
   */
  isCollectionPhase() {
    return this.currentPhase === 'collection' && !this.gameEnded
  }

  /**
   * Check if currently in building phase
   */
  isBuildingPhase() {
    return this.currentPhase === 'building' && !this.gameEnded
  }

  /**
   * Reset for new game
   */
  reset() {
    this.currentRound = 1
    this.currentPhase = 'collection'
    this.phaseTimeRemaining = this.COLLECTION_PHASE_DURATION
    this.gameEnded = false
    this.finalScore = 0

    if (this.eventBus) {
      this.eventBus.emit('round:reset')
    }
  }

  /**
   * Get state for saving (if needed for debugging)
   */
  getState() {
    return {
      currentRound: this.currentRound,
      currentPhase: this.currentPhase,
      phaseTimeRemaining: this.phaseTimeRemaining,
      gameEnded: this.gameEnded,
      finalScore: this.finalScore
    }
  }

  /**
   * Load state
   */
  loadState(state) {
    if (!state) return

    this.currentRound = state.currentRound || 1
    this.currentPhase = state.currentPhase || 'collection'
    this.phaseTimeRemaining = state.phaseTimeRemaining || this.COLLECTION_PHASE_DURATION
    this.gameEnded = state.gameEnded || false
    this.finalScore = state.finalScore || 0
  }
}
