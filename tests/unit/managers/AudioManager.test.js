import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AudioManager } from '../../../src/managers/AudioManager.js'

describe('AudioManager', () => {
  let audioManager

  beforeEach(() => {
    audioManager = new AudioManager()

    // Mock AudioContext
    global.AudioContext = vi.fn(() => ({
      createGain: vi.fn(() => ({
        connect: vi.fn(),
        gain: {
          value: 0,
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn()
        }
      })),
      createOscillator: vi.fn(() => ({
        type: 'sine',
        frequency: {
          value: 0,
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn()
        },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn()
      })),
      destination: {},
      currentTime: 0
    }))
  })

  describe('initialization', () => {
    it('should initialize with default values', () => {
      expect(audioManager.musicVolume).toBe(0.3)
      expect(audioManager.sfxVolume).toBe(0.5)
      expect(audioManager.muted).toBe(false)
      expect(audioManager.audioContext).toBeNull()
    })

    it('should create audio context on init', () => {
      audioManager.init()
      expect(audioManager.audioContext).not.toBeNull()
      expect(audioManager.musicGainNode).not.toBeNull()
      expect(audioManager.sfxGainNode).not.toBeNull()
    })

    it('should only initialize once', () => {
      audioManager.init()
      const firstContext = audioManager.audioContext
      audioManager.init()
      expect(audioManager.audioContext).toBe(firstContext)
    })
  })

  describe('music control', () => {
    beforeEach(() => {
      audioManager.init()
      vi.useFakeTimers()
    })

    it('should start music interval', () => {
      audioManager.startMusic()
      expect(audioManager.musicInterval).not.toBeNull()
    })

    it('should not start music twice', () => {
      audioManager.startMusic()
      const firstInterval = audioManager.musicInterval
      audioManager.startMusic()
      expect(audioManager.musicInterval).toBe(firstInterval)
    })

    it('should stop music and clear interval', () => {
      audioManager.startMusic()
      audioManager.stopMusic()
      expect(audioManager.musicInterval).toBeNull()
    })

    it('should clear music oscillators on stop', () => {
      audioManager.musicOscillators = [{ stop: vi.fn() }, { stop: vi.fn() }]
      audioManager.stopMusic()
      expect(audioManager.musicOscillators).toEqual([])
    })
  })

  describe('sound effects', () => {
    beforeEach(() => {
      audioManager.init()
    })

    it('should play click sound without errors', () => {
      expect(() => audioManager.playClickSound()).not.toThrow()
    })

    it('should play success sound without errors', () => {
      expect(() => audioManager.playSuccessSound()).not.toThrow()
    })

    it('should play level up sound without errors', () => {
      expect(() => audioManager.playLevelUpSound()).not.toThrow()
    })

    it('should play error sound without errors', () => {
      expect(() => audioManager.playErrorSound()).not.toThrow()
    })

    it('should play collect sound without errors', () => {
      expect(() => audioManager.playCollectSound()).not.toThrow()
    })

    it('should not play sounds when muted', () => {
      audioManager.muted = true
      const createOscillatorSpy = vi.spyOn(audioManager.audioContext, 'createOscillator')
      audioManager.playClickSound()
      expect(createOscillatorSpy).not.toHaveBeenCalled()
    })

    it('should not play sounds without audio context', () => {
      audioManager.audioContext = null
      expect(() => audioManager.playClickSound()).not.toThrow()
    })
  })

  describe('mute control', () => {
    beforeEach(() => {
      audioManager.init()
    })

    it('should toggle mute state', () => {
      expect(audioManager.muted).toBe(false)
      audioManager.toggleMute()
      expect(audioManager.muted).toBe(true)
      audioManager.toggleMute()
      expect(audioManager.muted).toBe(false)
    })

    it('should return mute state', () => {
      const result = audioManager.toggleMute()
      expect(result).toBe(true)
    })

    it('should update gain nodes when muting', () => {
      audioManager.toggleMute()
      expect(audioManager.musicGainNode.gain.value).toBe(0)
      expect(audioManager.sfxGainNode.gain.value).toBe(0)
    })

    it('should restore volumes when unmuting', () => {
      audioManager.toggleMute() // Mute
      audioManager.toggleMute() // Unmute
      expect(audioManager.musicGainNode.gain.value).toBe(0.3)
      expect(audioManager.sfxGainNode.gain.value).toBe(0.5)
    })
  })

  describe('volume control', () => {
    beforeEach(() => {
      audioManager.init()
    })

    it('should set music volume', () => {
      audioManager.setMusicVolume(0.7)
      expect(audioManager.musicVolume).toBe(0.7)
      expect(audioManager.musicGainNode.gain.value).toBe(0.7)
    })

    it('should clamp music volume to 0-1 range', () => {
      audioManager.setMusicVolume(1.5)
      expect(audioManager.musicVolume).toBe(1)

      audioManager.setMusicVolume(-0.5)
      expect(audioManager.musicVolume).toBe(0)
    })

    it('should not update gain node when muted', () => {
      audioManager.toggleMute() // Mute it (will set gain to 0)
      const initialGain = audioManager.musicGainNode.gain.value
      audioManager.setMusicVolume(0.8)
      // Gain node should remain unchanged when muted
      expect(audioManager.musicGainNode.gain.value).toBe(initialGain)
      // But the music volume property should be updated
      expect(audioManager.musicVolume).toBe(0.8)
    })

    it('should set SFX volume', () => {
      audioManager.setSfxVolume(0.6)
      expect(audioManager.sfxVolume).toBe(0.6)
      expect(audioManager.sfxGainNode.gain.value).toBe(0.6)
    })

    it('should clamp SFX volume to 0-1 range', () => {
      audioManager.setSfxVolume(2.0)
      expect(audioManager.sfxVolume).toBe(1)

      audioManager.setSfxVolume(-1.0)
      expect(audioManager.sfxVolume).toBe(0)
    })
  })

  describe('edge cases', () => {
    it('should handle missing audio context gracefully', () => {
      expect(() => audioManager.playClickSound()).not.toThrow()
      expect(() => audioManager.startMusic()).not.toThrow()
    })

    it('should handle oscillator errors gracefully', () => {
      audioManager.init()
      audioManager.musicOscillators = [
        { stop: vi.fn(() => { throw new Error('Already stopped') }) }
      ]
      expect(() => audioManager.stopMusic()).not.toThrow()
    })

    it('should play music note with current scale note', () => {
      audioManager.init()
      audioManager.currentNote = 3
      expect(() => audioManager.playMusicNote()).not.toThrow()
      expect(audioManager.currentNote).toBe(3) // Should not increment
    })
  })
})
