/**
 * ParticleSystem - Manages visual particle effects
 */
export class ParticleSystem {
  constructor() {
    this.particles = []
    this.nextId = 1
  }

  /**
   * Create a burst of particles at a position
   */
  createBurst(x, y, count, config = {}) {
    const defaults = {
      color: '#FFD700',
      size: 3,
      lifetime: 1000, // ms
      speedMin: 50,
      speedMax: 150,
      gravity: 200 // pixels/s^2
    }

    const settings = { ...defaults, ...config }

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5
      const speed = settings.speedMin + Math.random() * (settings.speedMax - settings.speedMin)

      this.particles.push({
        id: this.nextId++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50, // Bias upward
        color: settings.color,
        size: settings.size,
        lifetime: settings.lifetime,
        age: 0,
        gravity: settings.gravity
      })
    }
  }

  /**
   * Create floating text particle
   */
  createFloatingText(x, y, text, config = {}) {
    const defaults = {
      color: '#FFD700',
      size: 16,
      lifetime: 1500,
      floatSpeed: -80 // Negative = upward
    }

    const settings = { ...defaults, ...config }

    this.particles.push({
      id: this.nextId++,
      x,
      y,
      vx: 0,
      vy: settings.floatSpeed,
      type: 'text',
      text,
      color: settings.color,
      size: settings.size,
      lifetime: settings.lifetime,
      age: 0,
      gravity: 0
    })
  }

  /**
   * Create sparkle effect
   */
  createSparkle(x, y, config = {}) {
    const defaults = {
      color: '#FFFFFF',
      size: 2,
      lifetime: 500
    }

    const settings = { ...defaults, ...config }

    this.particles.push({
      id: this.nextId++,
      x: x + (Math.random() - 0.5) * 20,
      y: y + (Math.random() - 0.5) * 20,
      vx: 0,
      vy: 0,
      type: 'sparkle',
      color: settings.color,
      size: settings.size,
      lifetime: settings.lifetime,
      age: 0,
      gravity: 0
    })
  }

  /**
   * Update all particles
   */
  update(deltaTime) {
    const dt = deltaTime / 1000 // Convert to seconds

    // Update each particle
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]

      // Age the particle
      p.age += deltaTime

      // Remove dead particles
      if (p.age >= p.lifetime) {
        this.particles.splice(i, 1)
        continue
      }

      // Apply velocity
      p.x += p.vx * dt
      p.y += p.vy * dt

      // Apply gravity
      p.vy += p.gravity * dt
    }
  }

  /**
   * Render all particles
   */
  render(ctx) {
    this.particles.forEach(p => {
      // Calculate opacity based on age (fade out at end)
      const lifePercent = p.age / p.lifetime
      const alpha = lifePercent < 0.7 ? 1.0 : 1.0 - ((lifePercent - 0.7) / 0.3)

      ctx.save()
      ctx.globalAlpha = alpha

      if (p.type === 'text') {
        // Render text particle
        ctx.font = `${p.size}px Arial`
        ctx.fillStyle = p.color
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(p.text, p.x, p.y)
      } else if (p.type === 'sparkle') {
        // Render sparkle (star shape)
        this.renderStar(ctx, p.x, p.y, p.size, p.color)
      } else {
        // Render regular particle (circle)
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.restore()
    })
  }

  /**
   * Render a star shape
   */
  renderStar(ctx, x, y, radius, color) {
    ctx.fillStyle = color
    ctx.beginPath()
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2
      const r = i % 2 === 0 ? radius : radius / 2
      const px = x + Math.cos(angle) * r
      const py = y + Math.sin(angle) * r
      if (i === 0) {
        ctx.moveTo(px, py)
      } else {
        ctx.lineTo(px, py)
      }
    }
    ctx.closePath()
    ctx.fill()
  }

  /**
   * Clear all particles
   */
  clear() {
    this.particles = []
  }

  /**
   * Get particle count
   */
  getCount() {
    return this.particles.length
  }
}
