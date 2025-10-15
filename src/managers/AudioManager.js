/**
 * AudioManager - Handles background music and sound effects
 */
export class AudioManager {
  constructor() {
    // Audio context for generating sounds
    this.audioContext = null
    this.musicGainNode = null
    this.sfxGainNode = null

    // Volume settings
    this.musicVolume = 0.3
    this.sfxVolume = 0.5
    this.muted = false

    // Background music oscillator
    this.musicOscillators = []
    this.musicInterval = null
    this.currentNote = 0

    // Pentatonic scale for pleasant background music (C major pentatonic)
    this.musicScale = [
      261.63, // C4
      293.66, // D4
      329.63, // E4
      392.00, // G4
      440.00, // A4
      523.25, // C5
      587.33, // D5
      659.25, // E5
    ]

    console.log('🎵 [AudioManager] Initialized')
  }

  /**
   * Initialize audio context (must be called after user interaction)
   */
  init() {
    if (this.audioContext) return

    this.audioContext = new (window.AudioContext || window.webkitAudioContext)()

    // Create gain nodes for volume control
    this.musicGainNode = this.audioContext.createGain()
    this.musicGainNode.connect(this.audioContext.destination)
    this.musicGainNode.gain.value = this.muted ? 0 : this.musicVolume

    this.sfxGainNode = this.audioContext.createGain()
    this.sfxGainNode.connect(this.audioContext.destination)
    this.sfxGainNode.gain.value = this.muted ? 0 : this.sfxVolume

    console.log('🎵 [AudioManager] Audio context initialized')
  }

  /**
   * Start background music
   */
  startMusic() {
    if (!this.audioContext) this.init()
    if (this.musicInterval) return // Already playing

    // Play ambient background notes
    this.musicInterval = setInterval(() => {
      this.playMusicNote()
      this.currentNote = (this.currentNote + 1) % this.musicScale.length
    }, 800) // Play a note every 800ms

    console.log('🎵 [AudioManager] Music started')
  }

  /**
   * Stop background music
   */
  stopMusic() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval)
      this.musicInterval = null
    }

    // Stop all music oscillators
    this.musicOscillators.forEach(osc => {
      try {
        osc.stop()
      } catch (e) {
        // Already stopped
      }
    })
    this.musicOscillators = []

    console.log('🎵 [AudioManager] Music stopped')
  }

  /**
   * Play a single music note
   */
  playMusicNote() {
    if (!this.audioContext || this.muted) return

    const now = this.audioContext.currentTime
    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()

    // Use a warm sine wave for pleasant ambient sound
    oscillator.type = 'sine'
    oscillator.frequency.value = this.musicScale[this.currentNote]

    // Envelope: fade in and fade out
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(0.1, now + 0.1)
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.7)

    // Connect nodes
    oscillator.connect(gainNode)
    gainNode.connect(this.musicGainNode)

    // Play
    oscillator.start(now)
    oscillator.stop(now + 0.8)

    this.musicOscillators.push(oscillator)

    // Clean up after it stops
    setTimeout(() => {
      const index = this.musicOscillators.indexOf(oscillator)
      if (index > -1) {
        this.musicOscillators.splice(index, 1)
      }
    }, 1000)
  }

  /**
   * Play button click sound effect (neutral buttons)
   */
  playClickSound() {
    if (!this.audioContext || this.muted) return

    const now = this.audioContext.currentTime
    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(800, now)
    oscillator.frequency.exponentialRampToValueAtTime(400, now + 0.1)

    gainNode.gain.setValueAtTime(0.3, now)
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1)

    oscillator.connect(gainNode)
    gainNode.connect(this.sfxGainNode)

    oscillator.start(now)
    oscillator.stop(now + 0.1)
  }

  /**
   * Play plus/add button sound (construction hammer tap)
   */
  playPlusButtonSound() {
    if (!this.audioContext || this.muted) return

    const now = this.audioContext.currentTime

    // Hammer tap sound: sharp percussive hit with wood/metal resonance
    // Base impact
    const noise = this.audioContext.createOscillator()
    const noiseGain = this.audioContext.createGain()
    const noiseFilter = this.audioContext.createBiquadFilter()

    noise.type = 'square'
    noise.frequency.setValueAtTime(150, now)
    noise.frequency.exponentialRampToValueAtTime(80, now + 0.05)

    noiseFilter.type = 'bandpass'
    noiseFilter.frequency.value = 400
    noiseFilter.Q.value = 2

    noiseGain.gain.setValueAtTime(0.4, now)
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08)

    noise.connect(noiseFilter)
    noiseFilter.connect(noiseGain)
    noiseGain.connect(this.sfxGainNode)

    noise.start(now)
    noise.stop(now + 0.08)

    // Resonant tone (wood/metal ring)
    const tone = this.audioContext.createOscillator()
    const toneGain = this.audioContext.createGain()

    tone.type = 'triangle'
    tone.frequency.setValueAtTime(600, now + 0.01)
    tone.frequency.exponentialRampToValueAtTime(550, now + 0.15)

    toneGain.gain.setValueAtTime(0.15, now + 0.01)
    toneGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15)

    tone.connect(toneGain)
    toneGain.connect(this.sfxGainNode)

    tone.start(now + 0.01)
    tone.stop(now + 0.15)
  }

  /**
   * Play minus/remove button sound (removal/demolish)
   */
  playMinusButtonSound() {
    if (!this.audioContext || this.muted) return

    const now = this.audioContext.currentTime

    // Removal sound: descending tone with softer attack
    // First tone (higher)
    const tone1 = this.audioContext.createOscillator()
    const gain1 = this.audioContext.createGain()

    tone1.type = 'triangle'
    tone1.frequency.setValueAtTime(500, now)
    tone1.frequency.exponentialRampToValueAtTime(300, now + 0.12)

    gain1.gain.setValueAtTime(0.2, now)
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.12)

    tone1.connect(gain1)
    gain1.connect(this.sfxGainNode)

    tone1.start(now)
    tone1.stop(now + 0.12)

    // Second tone (lower) - slight delay for texture
    const tone2 = this.audioContext.createOscillator()
    const gain2 = this.audioContext.createGain()

    tone2.type = 'sine'
    tone2.frequency.setValueAtTime(350, now + 0.02)
    tone2.frequency.exponentialRampToValueAtTime(200, now + 0.14)

    gain2.gain.setValueAtTime(0.15, now + 0.02)
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.14)

    tone2.connect(gain2)
    gain2.connect(this.sfxGainNode)

    tone2.start(now + 0.02)
    tone2.stop(now + 0.14)
  }

  /**
   * Play success/complete sound effect
   */
  playSuccessSound() {
    if (!this.audioContext || this.muted) return

    const now = this.audioContext.currentTime

    // Play a nice ascending arpeggio
    const notes = [523.25, 659.25, 783.99] // C5, E5, G5
    notes.forEach((freq, i) => {
      const oscillator = this.audioContext.createOscillator()
      const gainNode = this.audioContext.createGain()

      oscillator.type = 'sine'
      oscillator.frequency.value = freq

      const startTime = now + i * 0.08
      gainNode.gain.setValueAtTime(0.2, startTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2)

      oscillator.connect(gainNode)
      gainNode.connect(this.sfxGainNode)

      oscillator.start(startTime)
      oscillator.stop(startTime + 0.2)
    })
  }

  /**
   * Play level up sound effect
   */
  playLevelUpSound() {
    if (!this.audioContext || this.muted) return

    const now = this.audioContext.currentTime

    // Ascending notes for level up
    const notes = [392, 523.25, 659.25, 783.99, 1046.50] // G4, C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const oscillator = this.audioContext.createOscillator()
      const gainNode = this.audioContext.createGain()

      oscillator.type = 'triangle'
      oscillator.frequency.value = freq

      const startTime = now + i * 0.1
      gainNode.gain.setValueAtTime(0.15, startTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3)

      oscillator.connect(gainNode)
      gainNode.connect(this.sfxGainNode)

      oscillator.start(startTime)
      oscillator.stop(startTime + 0.3)
    })
  }

  /**
   * Play error/fail sound effect
   */
  playErrorSound() {
    if (!this.audioContext || this.muted) return

    const now = this.audioContext.currentTime
    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()

    oscillator.type = 'sawtooth'
    oscillator.frequency.setValueAtTime(200, now)
    oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.2)

    gainNode.gain.setValueAtTime(0.2, now)
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2)

    oscillator.connect(gainNode)
    gainNode.connect(this.sfxGainNode)

    oscillator.start(now)
    oscillator.stop(now + 0.2)
  }

  /**
   * Play resource collect sound
   */
  playCollectSound() {
    if (!this.audioContext || this.muted) return

    const now = this.audioContext.currentTime
    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(1200, now)
    oscillator.frequency.exponentialRampToValueAtTime(1600, now + 0.05)

    gainNode.gain.setValueAtTime(0.2, now)
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1)

    oscillator.connect(gainNode)
    gainNode.connect(this.sfxGainNode)

    oscillator.start(now)
    oscillator.stop(now + 0.1)
  }

  /**
   * Toggle mute
   */
  toggleMute() {
    this.muted = !this.muted

    if (this.musicGainNode) {
      this.musicGainNode.gain.value = this.muted ? 0 : this.musicVolume
    }
    if (this.sfxGainNode) {
      this.sfxGainNode.gain.value = this.muted ? 0 : this.sfxVolume
    }

    console.log(`🎵 [AudioManager] ${this.muted ? 'Muted' : 'Unmuted'}`)
    return this.muted
  }

  /**
   * Set music volume (0-1)
   */
  setMusicVolume(volume) {
    this.musicVolume = Math.max(0, Math.min(1, volume))
    if (this.musicGainNode && !this.muted) {
      this.musicGainNode.gain.value = this.musicVolume
    }
  }

  /**
   * Set SFX volume (0-1)
   */
  setSfxVolume(volume) {
    this.sfxVolume = Math.max(0, Math.min(1, volume))
    if (this.sfxGainNode && !this.muted) {
      this.sfxGainNode.gain.value = this.sfxVolume
    }
  }
}
