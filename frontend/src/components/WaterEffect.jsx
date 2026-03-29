import { useEffect, useRef } from 'react'

export default function WaterEffect() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let animId

    const SCALE = 4
    let cols, rows
    let curr, prev, velX, velY, prevVelX, prevVelY

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      cols = Math.floor(canvas.width / SCALE) + 2
      rows = Math.floor(canvas.height / SCALE) + 2
      const size = cols * rows
      curr     = new Float32Array(size)
      prev     = new Float32Array(size)
      velX     = new Float32Array(size)
      velY     = new Float32Array(size)
      prevVelX = new Float32Array(size)
      prevVelY = new Float32Array(size)
    }
    resize()
    window.addEventListener('resize', resize)

    const idx = (x, y) => {
      x = Math.max(1, Math.min(cols - 2, x))
      y = Math.max(1, Math.min(rows - 2, y))
      return y * cols + x
    }

    const diffuse = (b, x, x0, diff) => {
      const a = 0.016 * diff * (cols - 2) * (rows - 2)
      for (let k = 0; k < 16; k++) {
        for (let j = 1; j < rows - 1; j++) {
          for (let i = 1; i < cols - 1; i++) {
            const id = j * cols + i
            x[id] = (x0[id] + a * (
              x[id - 1] + x[id + 1] +
              x[id - cols] + x[id + cols]
            )) / (1 + 4 * a)
          }
        }
        setBnd(b, x)
      }
    }

    const advect = (b, d, d0, u, v) => {
      const dt0x = 0.016 * (cols - 2)
      const dt0y = 0.016 * (rows - 2)
      for (let j = 1; j < rows - 1; j++) {
        for (let i = 1; i < cols - 1; i++) {
          let x = i - dt0x * u[j * cols + i]
          let y = j - dt0y * v[j * cols + i]
          x = Math.max(0.5, Math.min(cols - 1.5, x))
          y = Math.max(0.5, Math.min(rows - 1.5, y))
          const i0 = Math.floor(x), i1 = i0 + 1
          const j0 = Math.floor(y), j1 = j0 + 1
          const s1 = x - i0, s0 = 1 - s1
          const t1 = y - j0, t0 = 1 - t1
          d[j * cols + i] =
            s0 * (t0 * d0[j0 * cols + i0] + t1 * d0[j1 * cols + i0]) +
            s1 * (t0 * d0[j0 * cols + i1] + t1 * d0[j1 * cols + i1])
        }
      }
      setBnd(b, d)
    }

    const project = (u, v, p, div) => {
      const hx = 1.0 / (cols - 2)
      const hy = 1.0 / (rows - 2)
      for (let j = 1; j < rows - 1; j++) {
        for (let i = 1; i < cols - 1; i++) {
          const id = j * cols + i
          div[id] = -0.5 * (
            hx * (u[id + 1] - u[id - 1]) +
            hy * (v[id + cols] - v[id - cols])
          )
          p[id] = 0
        }
      }
      setBnd(0, div); setBnd(0, p)
      for (let k = 0; k < 16; k++) {
        for (let j = 1; j < rows - 1; j++) {
          for (let i = 1; i < cols - 1; i++) {
            const id = j * cols + i
            p[id] = (div[id] + p[id-1] + p[id+1] + p[id-cols] + p[id+cols]) / 4
          }
        }
        setBnd(0, p)
      }
      for (let j = 1; j < rows - 1; j++) {
        for (let i = 1; i < cols - 1; i++) {
          const id = j * cols + i
          u[id] -= 0.5 * (p[id + 1] - p[id - 1]) / hx
          v[id] -= 0.5 * (p[id + cols] - p[id - cols]) / hy
        }
      }
      setBnd(1, u); setBnd(2, v)
    }

    const setBnd = (b, x) => {
      for (let i = 1; i < cols - 1; i++) {
        x[i] = b === 2 ? -x[cols + i] : x[cols + i]
        x[(rows-1)*cols + i] = b === 2 ? -x[(rows-2)*cols + i] : x[(rows-2)*cols + i]
      }
      for (let j = 1; j < rows - 1; j++) {
        x[j*cols] = b === 1 ? -x[j*cols + 1] : x[j*cols + 1]
        x[j*cols + cols-1] = b === 1 ? -x[j*cols + cols-2] : x[j*cols + cols-2]
      }
      x[0] = 0.5*(x[1]+x[cols])
      x[cols-1] = 0.5*(x[cols-2]+x[2*cols-1])
      x[(rows-1)*cols] = 0.5*(x[(rows-2)*cols]+x[(rows-1)*cols+1])
      x[rows*cols-1] = 0.5*(x[(rows-1)*cols-1]+x[rows*cols-2])
    }

    const velStep = () => {
      diffuse(1, prevVelX, velX, 0.00001)
      diffuse(2, prevVelY, velY, 0.00001)
      project(prevVelX, prevVelY, velX, velY)
      advect(1, velX, prevVelX, prevVelX, prevVelY)
      advect(2, velY, prevVelY, prevVelX, prevVelY)
      project(velX, velY, prevVelX, prevVelY)
    }

    const densStep = () => {
      diffuse(0, prev, curr, 0.0001)
      advect(0, curr, prev, velX, velY)
    }

    let mx = 0, my = 0, pmx = 0, pmy = 0
    const onMove = (e) => {
      pmx = mx; pmy = my
      mx = e.clientX; my = e.clientY
      const cx = Math.floor(mx / SCALE)
      const cy = Math.floor(my / SCALE)
      const force = 120
      const dx = (mx - pmx) * force
      const dy = (my - pmy) * force
      for (let di = -3; di <= 3; di++) {
        for (let dj = -3; dj <= 3; dj++) {
          const dist = Math.sqrt(di*di + dj*dj)
          if (dist > 3) continue
          const w = 1 - dist / 3
          const id = idx(cx + di, cy + dj)
          curr[id] += 180 * w
          velX[id] += dx * w
          velY[id] += dy * w
        }
      }
    }
    window.addEventListener('mousemove', onMove)

    const draw = () => {
      velStep()
      densStep()

      const imgData = ctx.createImageData(canvas.width, canvas.height)
      const data = imgData.data

      for (let j = 0; j < rows - 2; j++) {
        for (let i = 0; i < cols - 2; i++) {
          const d = Math.min(255, curr[(j+1)*cols + (i+1)] * 2.5)
          if (d < 1) continue
          const vx = velX[(j+1)*cols + (i+1)]
          const vy = velY[(j+1)*cols + (i+1)]
          const speed = Math.min(1, Math.sqrt(vx*vx + vy*vy) / 300)

          // Cor base: #4C70DA com shift para ciano em alta velocidade
          const r = Math.round(76  + speed * 20)
          const g = Math.round(112 + speed * 60)
          const b = Math.round(218 - speed * 30)

          for (let py = 0; py < SCALE; py++) {
            for (let px = 0; px < SCALE; px++) {
              const x = i * SCALE + px
              const y = j * SCALE + py
              if (x >= canvas.width || y >= canvas.height) continue
              const pid = (y * canvas.width + x) * 4
              data[pid]     = r
              data[pid + 1] = g
              data[pid + 2] = b
              data[pid + 3] = Math.round(d * 0.85)
            }
          }
        }
      }

      ctx.putImageData(imgData, 0, 0)

      for (let i = 0; i < curr.length; i++) {
        curr[i] *= 0.977
        velX[i] *= 0.96
        velY[i] *= 0.96
      }

      animId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(animId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0, left: 0,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  )
}
