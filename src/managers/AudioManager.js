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
    this.chordInterval = null
    this.melodyInterval = null
    this.currentChord = 0
    this.currentMelodyNote = 0

    // Chord progression: I - V - vi - IV (C - G - Am - F)
    // Very popular and pleasant progression used in many games and songs
    this.chordProgression = [
      // C major (I)
      [261.63, 329.63, 392.00], // C4, E4, G4
      // G major (V)
      [196.00, 246.94, 293.66], // G3, B3, D4
      // A minor (vi)
      [220.00, 261.63, 329.63], // A3, C4, E4
      // F major (IV)
      [174.61, 220.00, 261.63], // F3, A3, C4
    ]

    // Melody line that plays over the chords
    this.melody = [
      523.25, 659.25, 587.33, 523.25, // C5, E5, D5, C5
      392.00, 523.25, 440.00, 392.00, // G4, C5, A4, G4
      440.00, 523.25, 587.33, 659.25, // A4, C5, D5, E5
      523.25, 440.00, 392.00, 329.63, // C5, A4, G4, E4
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
    if (this.chordInterval) return // Already playing

    // Play chords (every 2 seconds)
    this.chordInterval = setInterval(() => {
      this.playChord()
      this.currentChord = (this.currentChord + 1) % this.chordProgression.length
    }, 2000)

    // Play melody notes (every 500ms)
    this.melodyInterval = setInterval(() => {
      this.playMelodyNote()
      this.currentMelodyNote = (this.currentMelodyNote + 1) % this.melody.length
    }, 500)

    // Play initial chord and melody
    this.playChord()
    this.playMelodyNote()

    console.log('🎵 [AudioManager] Music started')
  }

  /**
   * Stop background music
   */
  stopMusic() {
    if (this.chordInterval) {
      clearInterval(this.chordInterval)
      this.chordInterval = null
    }
    if (this.melodyInterval) {
      clearInterval(this.melodyInterval)
      this.melodyInterval = null
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
   * Play a chord (multiple notes together)
   */
  playChord() {
    if (!this.audioContext || this.muted) return

    const now = this.audioContext.currentTime
    const chord = this.chordProgression[this.currentChord]

    // Play each note in the chord
    chord.forEach((frequency, i) => {
      const oscillator = this.audioContext.createOscillator()
      const gainNode = this.audioContext.createGain()

      // Use triangle wave for warm, soft chords
      oscillator.type = 'triangle'
      oscillator.frequency.value = frequency

      // Soft envelope for background chords
      const volume = 0.06 // Quieter than before
      gainNode.gain.setValueAtTime(0, now)
      gainNode.gain.linearRampToValueAtTime(volume, now + 0.3)
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1.8)

      // Connect nodes
      oscillator.connect(gainNode)
      gainNode.connect(this.musicGainNode)

      // Play
      oscillator.start(now)
      oscillator.stop(now + 2.0)

      this.musicOscillators.push(oscillator)

      // Clean up after it stops
      setTimeout(() => {
        const index = this.musicOscillators.indexOf(oscillator)
        if (index > -1) {
          this.musicOscillators.splice(index, 1)
        }
      }, 2100)
    })
  }

  /**
   * Play a melody note
   */
  playMelodyNote() {
    if (!this.audioContext || this.muted) return

    const now = this.audioContext.currentTime
    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()

    // Use sine wave for clear, bell-like melody
    oscillator.type = 'sine'
    oscillator.frequency.value = this.melody[this.currentMelodyNote]

    // Quick attack and decay for melody notes
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(0.08, now + 0.02)
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4)

    // Connect nodes
    oscillator.connect(gainNode)
    gainNode.connect(this.musicGainNode)

    // Play
    oscillator.start(now)
    oscillator.stop(now + 0.5)

    this.musicOscillators.push(oscillator)

    // Clean up after it stops
    setTimeout(() => {
      const index = this.musicOscillators.indexOf(oscillator)
      if (index > -1) {
        this.musicOscillators.splice(index, 1)
      }
    }, 600)
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
