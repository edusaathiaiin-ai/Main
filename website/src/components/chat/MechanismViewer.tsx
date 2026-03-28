'use client'
import { useEffect, useRef } from 'react'
import type * as THREE_TYPES from 'three'

export type MechanismType =
  | 'gear-pair'
  | 'piston'
  | 'cam-follower'
  | 'belt-pulley'
  | 'flywheel'
  | 'rack-pinion'

const MECHANISM_LABELS: Record<MechanismType, string> = {
  'gear-pair': '⚙️ Gear Pair — Gear Ratio Visualised',
  'piston': '🔧 Crank-Piston Mechanism',
  'cam-follower': '📐 Cam-Follower Motion',
  'belt-pulley': '⭕ Belt & Pulley System',
  'flywheel': '🔄 Flywheel — Rotational Inertia',
  'rack-pinion': '↔️ Rack & Pinion',
}

export function MechanismViewer({
  mechanism,
  saathiColor = '#C9993A',
}: {
  mechanism: MechanismType
  saathiColor?: string
}) {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mountRef.current) return
    const container = mountRef.current
    const w = container.clientWidth || 600
    const h = 300

    let animationId: number
    let renderer: import('three').WebGLRenderer | null = null

    async function setup() {
      const THREE = await import('three')
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js')

      const scene = new THREE.Scene()
      scene.background = new THREE.Color(0x060F1D)

      const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100)
      camera.position.set(0, 3, 8)

      renderer = new THREE.WebGLRenderer({ antialias: true })
      renderer.setSize(w, h)
      renderer.shadowMap.enabled = true
      container.appendChild(renderer.domElement)

      const controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true

      const ambient = new THREE.AmbientLight(0xffffff, 0.4)
      scene.add(ambient)
      const directional = new THREE.DirectionalLight(0xffffff, 0.8)
      directional.position.set(5, 10, 5)
      directional.castShadow = true
      scene.add(directional)

      const accent = new THREE.Color(saathiColor)

      if (mechanism === 'gear-pair') {
        const createGear = (teeth: number, color: THREE_TYPES.Color, x: number) => {
          const group = new THREE.Group()
          const radius = teeth * 0.15
          const hub = new THREE.Mesh(
            new THREE.CylinderGeometry(radius * 0.3, radius * 0.3, 0.3, 32),
            new THREE.MeshPhongMaterial({ color })
          )
          group.add(hub)
          for (let i = 0; i < teeth; i++) {
            const angle = (i / teeth) * Math.PI * 2
            const tooth = new THREE.Mesh(
              new THREE.BoxGeometry(0.15, 0.25, 0.3),
              new THREE.MeshPhongMaterial({ color })
            )
            tooth.position.x = Math.cos(angle) * (radius + 0.1)
            tooth.position.z = Math.sin(angle) * (radius + 0.1)
            tooth.rotation.y = -angle
            group.add(tooth)
          }
          const rim = new THREE.Mesh(
            new THREE.TorusGeometry(radius, 0.08, 8, teeth * 2),
            new THREE.MeshPhongMaterial({ color })
          )
          rim.rotation.x = Math.PI / 2
          group.add(rim)
          group.position.x = x
          return group
        }
        const gear1 = createGear(16, accent, -1.5)
        const gear2 = createGear(8, new THREE.Color(0x4ADE80), 1.8)
        scene.add(gear1)
        scene.add(gear2)
        let t = 0
        const animate = () => {
          animationId = requestAnimationFrame(animate)
          t += 0.01
          gear1.rotation.y = t
          gear2.rotation.y = -t * 2
          controls.update()
          renderer!.render(scene, camera)
        }
        animate()
      } else if (mechanism === 'piston') {
        const crank = new THREE.Mesh(
          new THREE.CylinderGeometry(0.1, 0.1, 2, 16),
          new THREE.MeshPhongMaterial({ color: accent })
        )
        scene.add(crank)
        const crankPin = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.08, 2.2, 16),
          new THREE.MeshPhongMaterial({ color: new THREE.Color(0xC9993A) })
        )
        crankPin.position.x = 1
        scene.add(crankPin)
        const piston = new THREE.Mesh(
          new THREE.CylinderGeometry(0.5, 0.5, 0.8, 32),
          new THREE.MeshPhongMaterial({ color: new THREE.Color(0x888888) })
        )
        scene.add(piston)
        let t = 0
        const animate = () => {
          animationId = requestAnimationFrame(animate)
          t += 0.02
          crankPin.position.x = Math.cos(t)
          crankPin.position.y = Math.sin(t)
          piston.position.y = Math.sin(t) + 2
          controls.update()
          renderer!.render(scene, camera)
        }
        animate()
      } else if (mechanism === 'flywheel') {
        const flywheel = new THREE.Mesh(
          new THREE.TorusGeometry(2, 0.5, 16, 64),
          new THREE.MeshPhongMaterial({ color: accent, shininess: 100 })
        )
        const hub = new THREE.Mesh(
          new THREE.CylinderGeometry(0.3, 0.3, 1.2, 16),
          new THREE.MeshPhongMaterial({ color: new THREE.Color(0x888888) })
        )
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2
          const spoke = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.06, 2, 8),
            new THREE.MeshPhongMaterial({ color: accent })
          )
          spoke.rotation.z = Math.PI / 2
          spoke.rotation.y = angle
          spoke.position.x = Math.cos(angle)
          spoke.position.z = Math.sin(angle)
          flywheel.add(spoke)
        }
        scene.add(flywheel)
        scene.add(hub)
        let t = 0
        const animate = () => {
          animationId = requestAnimationFrame(animate)
          t += 0.008
          flywheel.rotation.z = t
          hub.rotation.y = t
          controls.update()
          renderer!.render(scene, camera)
        }
        animate()
      } else {
        // Default: rotating wireframe cube placeholder for unimplemented mechanisms
        const cube = new THREE.Mesh(
          new THREE.BoxGeometry(2, 2, 2),
          new THREE.MeshPhongMaterial({ color: accent, wireframe: true })
        )
        scene.add(cube)
        let t = 0
        const animate = () => {
          animationId = requestAnimationFrame(animate)
          t += 0.01
          cube.rotation.x = t * 0.5
          cube.rotation.y = t
          controls.update()
          renderer!.render(scene, camera)
        }
        animate()
      }

      const handleResize = () => {
        if (!container) return
        const nw = container.clientWidth
        camera.aspect = nw / h
        camera.updateProjectionMatrix()
        renderer!.setSize(nw, h)
      }
      window.addEventListener('resize', handleResize)

      return () => {
        window.removeEventListener('resize', handleResize)
      }
    }

    let cleanup: (() => void) | undefined

    setup().then((fn) => { cleanup = fn })

    return () => {
      cancelAnimationFrame(animationId)
      cleanup?.()
      renderer?.dispose()
      const domEl = renderer?.domElement
      if (domEl && container.contains(domEl)) {
        container.removeChild(domEl)
      }
    }
  }, [mechanism, saathiColor])

  return (
    <div style={{
      margin: '12px 0',
      borderRadius: '14px',
      overflow: 'hidden',
      border: `0.5px solid ${saathiColor}30`,
    }}>
      <div style={{
        padding: '8px 14px',
        background: 'rgba(255,255,255,0.03)',
        borderBottom: `0.5px solid ${saathiColor}20`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: '11px', fontWeight: '600', color: saathiColor }}>
          {MECHANISM_LABELS[mechanism] ?? `⚙️ ${mechanism}`}
        </span>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>
          Drag to rotate · Scroll to zoom
        </span>
      </div>
      <div ref={mountRef} style={{ width: '100%' }} />
    </div>
  )
}
