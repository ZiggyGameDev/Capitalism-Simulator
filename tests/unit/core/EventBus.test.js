import { describe, it, expect, beforeEach, vi } from 'vitest'
import { EventBus } from '../../../src/core/EventBus.js'

describe('EventBus', () => {
  let eventBus

  beforeEach(() => {
    eventBus = new EventBus()
  })

  describe('on() and emit()', () => {
    it('should call listener when event is emitted', () => {
      const listener = vi.fn()
      eventBus.on('test-event', listener)
      eventBus.emit('test-event', { data: 'test' })

      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener).toHaveBeenCalledWith({ data: 'test' })
    })

    it('should call multiple listeners for same event', () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()

      eventBus.on('test-event', listener1)
      eventBus.on('test-event', listener2)
      eventBus.emit('test-event', 'data')

      expect(listener1).toHaveBeenCalledWith('data')
      expect(listener2).toHaveBeenCalledWith('data')
    })

    it('should not call listeners for different events', () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()

      eventBus.on('event1', listener1)
      eventBus.on('event2', listener2)
      eventBus.emit('event1')

      expect(listener1).toHaveBeenCalled()
      expect(listener2).not.toHaveBeenCalled()
    })

    it('should handle emitting event with no listeners', () => {
      expect(() => {
        eventBus.emit('no-listeners')
      }).not.toThrow()
    })
  })

  describe('off()', () => {
    it('should remove listener', () => {
      const listener = vi.fn()
      eventBus.on('test-event', listener)
      eventBus.off('test-event', listener)
      eventBus.emit('test-event')

      expect(listener).not.toHaveBeenCalled()
    })

    it('should only remove specified listener', () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()

      eventBus.on('test-event', listener1)
      eventBus.on('test-event', listener2)
      eventBus.off('test-event', listener1)
      eventBus.emit('test-event')

      expect(listener1).not.toHaveBeenCalled()
      expect(listener2).toHaveBeenCalled()
    })

    it('should handle removing non-existent listener', () => {
      const listener = vi.fn()
      expect(() => {
        eventBus.off('test-event', listener)
      }).not.toThrow()
    })
  })

  describe('once()', () => {
    it('should call listener only once', () => {
      const listener = vi.fn()
      eventBus.once('test-event', listener)

      eventBus.emit('test-event', 'first')
      eventBus.emit('test-event', 'second')

      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener).toHaveBeenCalledWith('first')
    })
  })

  describe('clear()', () => {
    it('should remove all listeners for event', () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()

      eventBus.on('test-event', listener1)
      eventBus.on('test-event', listener2)
      eventBus.clear('test-event')
      eventBus.emit('test-event')

      expect(listener1).not.toHaveBeenCalled()
      expect(listener2).not.toHaveBeenCalled()
    })

    it('should only clear specified event', () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()

      eventBus.on('event1', listener1)
      eventBus.on('event2', listener2)
      eventBus.clear('event1')

      eventBus.emit('event1')
      eventBus.emit('event2')

      expect(listener1).not.toHaveBeenCalled()
      expect(listener2).toHaveBeenCalled()
    })
  })
})
