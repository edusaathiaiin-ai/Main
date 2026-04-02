'use client'

import { useEffect, useRef } from 'react'
import type * as THREE_T from 'three'

export type MechanismType =
  | 'gear-pair'
  | 'piston'
  | 'flywheel'
  | 'cam-follower'
  | 'belt-pulley'
  | 'rack-pinion'

const MECHANISM_LABELS: Record<MechanismType, string> = {
  'gear-pair':    '⚙️ Gear Pair — Gear Ratio Visualised',
  'piston':       '🔧 Crank-Piston Mechanism',
  'flywheel':     '🔄 Flywheel — Rotational Inertia',
  'cam-follower': '📐 Cam-Follower Motion',
  'belt-pulley':  '⭕ Belt & Pulley System',
  'rack-pinion':  '↔️ Rack & Pinion Drive',
}

export function MechanismViewer({
  mechanism,
  saathiColor = '#C9993A',
}: {
  mechanism: MechanismType
  saathiColor?: string
}) {
  const mountRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    if (!mountRef.current) return
    const container = mountRef.current
    let cancelled = false

    async function init() {
      const THREE = await import('three')
      const { OrbitControls } = await import(
        'three/examples/jsm/controls/OrbitControls.js'
      )

      if (cancelled) return

      const w = container.clientWidth || 600
      const h = 320

      const scene = new THREE.Scene()
      scene.background = new THREE.Color(0x060F1D)
      scene.fog = new THREE.FogExp2(0x060F1D, 0.04)

      const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100)
      camera.position.set(0, 4, 10)
      camera.lookAt(0, 0, 0)

      const renderer = new THREE.WebGLRenderer({ antialias: true })
      renderer.setSize(w, h)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      container.appendChild(renderer.domElement)

      // Controls
      const controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.dampingFactor = 0.08
      controls.minDistance = 4
      controls.maxDistance = 20

      // Lights
      scene.add(new THREE.AmbientLight(0xffffff, 0.45))
      const sun = new THREE.DirectionalLight(0xffffff, 0.9)
      sun.position.set(5, 10, 5)
      sun.castShadow = true
      scene.add(sun)
      const fill = new THREE.PointLight(new THREE.Color(saathiColor), 0.5, 25)
      fill.position.set(-4, 3, 6)
      scene.add(fill)

      // Floor grid
      const grid = new THREE.GridHelper(16, 16)
      ;(grid.material as THREE_T.LineBasicMaterial).color.set(0x1a2a3a)
      ;(grid.material as THREE_T.LineBasicMaterial).opacity = 0.4
      ;(grid.material as THREE_T.LineBasicMaterial).transparent = true
      grid.position.y = -2.5
      scene.add(grid)

      // Shared materials
      const accentMat = new THREE.MeshPhongMaterial({
        color: new THREE.Color(saathiColor), shininess: 90, specular: new THREE.Color(0xffffff),
      })
      const greyMat = new THREE.MeshPhongMaterial({ color: 0x556677, shininess: 60 })
      const darkMat = new THREE.MeshPhongMaterial({ color: 0x2a3a4a, shininess: 30 })
      const greenMat = new THREE.MeshPhongMaterial({ color: 0x4ADE80, shininess: 80 })

      type UpdateFn = (t: number) => void
      const updates: UpdateFn[] = []

      // ── GEAR PAIR ──────────────────────────────────────────────────────────
      if (mechanism === 'gear-pair') {
        function makeGear(
          teeth: number,
          mat: THREE_T.Material,
          x: number
        ): THREE_T.Group {
          const group = new THREE.Group()
          const r = teeth * 0.16

          // Body disc
          const disc = new THREE.Mesh(
            new THREE.CylinderGeometry(r * 0.85, r * 0.85, 0.3, 32),
            mat
          )
          disc.rotation.x = Math.PI / 2
          group.add(disc)

          // Teeth
          for (let i = 0; i < teeth; i++) {
            const angle = (i / teeth) * Math.PI * 2
            const tooth = new THREE.Mesh(
              new THREE.BoxGeometry(0.16, 0.28, 0.3),
              mat
            )
            tooth.position.x = Math.cos(angle) * (r * 0.85 + 0.1)
            tooth.position.y = Math.sin(angle) * (r * 0.85 + 0.1)
            tooth.rotation.z = angle
            group.add(tooth)
          }

          // Spokes
          for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2
            const spoke = new THREE.Mesh(
              new THREE.CylinderGeometry(0.04, 0.04, r * 0.8, 8),
              greyMat
            )
            spoke.position.x = Math.cos(a) * r * 0.4
            spoke.position.y = Math.sin(a) * r * 0.4
            spoke.rotation.z = a + Math.PI / 2
            group.add(spoke)
          }

          // Hub
          const hub = new THREE.Mesh(
            new THREE.CylinderGeometry(r * 0.22, r * 0.22, 0.5, 16),
            darkMat
          )
          hub.rotation.x = Math.PI / 2
          group.add(hub)

          group.position.x = x
          scene.add(group)
          return group
        }

        const g1 = makeGear(16, accentMat, -2.2)
        const g2 = makeGear(8, greenMat, 2.35)

        updates.push((t) => {
          g1.rotation.z = t * 0.6
          g2.rotation.z = -t * 0.6 * 2  // gear ratio 2:1
        })

        camera.position.set(0, 5, 13)

      // ── PISTON ─────────────────────────────────────────────────────────────
      } else if (mechanism === 'piston') {
        // Cylinder body (transparent)
        const cylBody = new THREE.Mesh(
          new THREE.CylinderGeometry(0.7, 0.7, 5, 32, 1, true),
          new THREE.MeshPhongMaterial({
            color: 0x334455, side: THREE.BackSide,
            transparent: true, opacity: 0.25,
          })
        )
        cylBody.position.y = 2.5
        scene.add(cylBody)

        // Crank group
        const crankGroup = new THREE.Group()
        // Main shaft
        const mainShaft = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.12, 5, 16),
          greyMat
        )
        mainShaft.rotation.z = Math.PI / 2
        crankGroup.add(mainShaft)
        // Crank arm
        const arm = new THREE.Mesh(
          new THREE.BoxGeometry(1.3, 0.18, 0.28),
          accentMat
        )
        arm.position.x = 0.65
        crankGroup.add(arm)
        // Crank pin
        const pin = new THREE.Mesh(
          new THREE.CylinderGeometry(0.1, 0.1, 0.5, 16),
          accentMat
        )
        pin.position.x = 1.3
        pin.rotation.z = Math.PI / 2
        crankGroup.add(pin)
        scene.add(crankGroup)

        // Connecting rod
        const conRod = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.06, 3.6, 8),
          greyMat
        )
        scene.add(conRod)

        // Piston crown
        const piston = new THREE.Mesh(
          new THREE.CylinderGeometry(0.62, 0.62, 0.9, 32),
          new THREE.MeshPhongMaterial({ color: 0xCCCCDD, shininess: 120 })
        )
        scene.add(piston)

        updates.push((t) => {
          crankGroup.rotation.z = t
          const cx = Math.cos(t) * 1.3
          const cy = Math.sin(t) * 1.3
          const pistonY = cy + 3.8

          piston.position.y = pistonY

          const midY = (cy + pistonY) / 2
          conRod.position.x = cx * 0.45
          conRod.position.y = midY
          const rodAngle = Math.atan2(pistonY - cy, 0 - cx * 0.45)
          conRod.rotation.z = rodAngle - Math.PI / 2
        })

        camera.position.set(6, 2, 10)

      // ── FLYWHEEL ───────────────────────────────────────────────────────────
      } else if (mechanism === 'flywheel') {
        // Shaft
        const shaft = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.14, 7, 16),
          greyMat
        )
        shaft.rotation.z = Math.PI / 2
        scene.add(shaft)

        // Bearing blocks
        for (const bx of [-2.5, 2.5]) {
          const block = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 0.4, 0.6),
            darkMat
          )
          block.position.x = bx
          block.position.y = -2.4
          scene.add(block)
        }

        const flyGroup = new THREE.Group()

        // Outer rim — torus
        const rim = new THREE.Mesh(
          new THREE.TorusGeometry(2.4, 0.38, 18, 72),
          accentMat
        )
        flyGroup.add(rim)

        // Hub
        const hub = new THREE.Mesh(
          new THREE.CylinderGeometry(0.38, 0.38, 0.76, 24),
          darkMat
        )
        hub.rotation.x = Math.PI / 2
        flyGroup.add(hub)

        // Spokes
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2
          const spoke = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.08, 2.05, 8),
            greyMat
          )
          spoke.position.x = Math.cos(angle) * 1.025
          spoke.position.y = Math.sin(angle) * 1.025
          spoke.rotation.z = angle + Math.PI / 2
          flyGroup.add(spoke)
        }

        scene.add(flyGroup)

        updates.push((t) => {
          flyGroup.rotation.x = t * 0.55
        })

        camera.position.set(0, 2, 9)

      // ── CAM-FOLLOWER ───────────────────────────────────────────────────────
      } else if (mechanism === 'cam-follower') {
        // Cam (elliptical profile)
        const camGroup = new THREE.Group()
        const camBody = new THREE.Mesh(
          new THREE.CylinderGeometry(1.0, 1.0, 0.4, 48),
          accentMat
        )
        camBody.scale.x = 1.7  // eccentric ellipse
        camBody.rotation.x = Math.PI / 2
        camGroup.add(camBody)

        // Cam shaft
        const camShaft = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.12, 5, 16),
          greyMat
        )
        camShaft.rotation.z = Math.PI / 2
        camGroup.add(camShaft)

        camGroup.position.y = -1
        scene.add(camGroup)

        // Follower rod
        const followerRod = new THREE.Mesh(
          new THREE.CylinderGeometry(0.1, 0.1, 3.5, 16),
          greenMat
        )
        scene.add(followerRod)

        // Follower tip
        const tip = new THREE.Mesh(
          new THREE.SphereGeometry(0.16, 16, 16),
          new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 140 })
        )
        scene.add(tip)

        // Guide sleeve
        const guide = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18, 0.18, 3.8, 16, 1, true),
          new THREE.MeshPhongMaterial({
            color: 0x223344, transparent: true, opacity: 0.3, side: THREE.BackSide,
          })
        )
        guide.position.x = 0
        scene.add(guide)

        updates.push((t) => {
          camGroup.rotation.z = t
          // Follower height: cam ellipse projects onto y-axis
          const followerY = Math.abs(Math.sin(t)) * 1.4 + Math.cos(t * 2) * 0.3 + 1.5
          followerRod.position.y = followerY + 1.6
          tip.position.y = followerY
          guide.position.y = followerY + 1.6
        })

        camera.position.set(5, 2, 10)

      // ── BELT-PULLEY ────────────────────────────────────────────────────────
      } else if (mechanism === 'belt-pulley') {
        const makePulley = (r: number, x: number, mat: THREE_T.Material): THREE_T.Group => {
          const g = new THREE.Group()
          // Rim
          const rim2 = new THREE.Mesh(new THREE.TorusGeometry(r, 0.12, 12, 48), mat)
          g.add(rim2)
          // Disc
          const disc2 = new THREE.Mesh(
            new THREE.CylinderGeometry(r * 0.8, r * 0.8, 0.25, 32),
            darkMat
          )
          disc2.rotation.x = Math.PI / 2
          g.add(disc2)
          // Hub
          const hub2 = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15, 0.15, 0.5, 16),
            greyMat
          )
          hub2.rotation.x = Math.PI / 2
          g.add(hub2)
          g.position.x = x
          return g
        }

        const p1 = makePulley(2.0, -3, accentMat)
        const p2 = makePulley(1.1, 3, greenMat)
        scene.add(p1)
        scene.add(p2)

        // Belt (flat strip represented as thin tube + two caps)
        const beltGeom = new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3([
            new THREE.Vector3(-3, 2, 0),
            new THREE.Vector3(0, 2.15, 0),
            new THREE.Vector3(3, 1.1, 0),
            new THREE.Vector3(0, -0.9, 0),
            new THREE.Vector3(-3, -2, 0),
          ], true),
          64, 0.06, 8, true
        )
        const belt = new THREE.Mesh(beltGeom, darkMat)
        scene.add(belt)

        updates.push((t) => {
          p1.rotation.z = t * 0.5
          p2.rotation.z = -t * 0.5 * (2.0 / 1.1)  // speed ratio
        })

        camera.position.set(0, 3, 12)

      // ── RACK-PINION ────────────────────────────────────────────────────────
      } else if (mechanism === 'rack-pinion') {
        // Pinion gear
        const pinion = new THREE.Group()
        const pR = 1.0
        const pTeeth = 12
        const pDisc = new THREE.Mesh(
          new THREE.CylinderGeometry(pR * 0.88, pR * 0.88, 0.3, 32),
          accentMat
        )
        pDisc.rotation.x = Math.PI / 2
        pinion.add(pDisc)
        for (let i = 0; i < pTeeth; i++) {
          const a = (i / pTeeth) * Math.PI * 2
          const t2 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.24, 0.3), accentMat)
          t2.position.x = Math.cos(a) * (pR * 0.88 + 0.1)
          t2.position.y = Math.sin(a) * (pR * 0.88 + 0.1)
          t2.rotation.z = a
          pinion.add(t2)
        }
        pinion.position.y = 1.1
        scene.add(pinion)

        // Rack base
        const rack = new THREE.Group()
        const rackBody = new THREE.Mesh(
          new THREE.BoxGeometry(12, 0.45, 0.35),
          darkMat
        )
        rack.add(rackBody)
        // Rack teeth
        for (let i = -7; i <= 7; i++) {
          const tooth = new THREE.Mesh(
            new THREE.BoxGeometry(0.16, 0.26, 0.35),
            greyMat
          )
          tooth.position.x = i * 0.524  // pitch = 2πR / teeth
          tooth.position.y = 0.35
          rack.add(tooth)
        }
        rack.position.y = 0
        scene.add(rack)

        // Shaft
        const shaft = new THREE.Mesh(
          new THREE.CylinderGeometry(0.1, 0.1, 1.5, 16),
          greyMat
        )
        shaft.position.y = 1.1
        scene.add(shaft)

        updates.push((t) => {
          pinion.rotation.z = t
          // Linear travel = θ × R
          rack.position.x = ((t % (Math.PI * 2)) / (Math.PI * 2)) * (0.524 * pTeeth) - 3
        })

        camera.position.set(2, 3, 11)
      }

      // ── Animate ────────────────────────────────────────────────────────────
      let time = 0
      function animate() {
        if (cancelled) return
        frameRef.current = requestAnimationFrame(animate)
        time += 0.018
        updates.forEach(fn => fn(time))
        controls.update()
        renderer.render(scene, camera)
      }
      animate()

      // Resize
      const ro = new ResizeObserver(() => {
        if (!container) return
        const nw = container.clientWidth
        camera.aspect = nw / h
        camera.updateProjectionMatrix()
        renderer.setSize(nw, h)
      })
      ro.observe(container)

      return () => {
        cancelled = true
        cancelAnimationFrame(frameRef.current)
        ro.disconnect()
        controls.dispose()
        renderer.dispose()
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement)
        }
      }
    }

    const cleanupPromise = init()
    return () => {
      cancelled = true
      void cleanupPromise.then(fn => fn?.())
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
          Drag to rotate · Scroll to zoom · Interactive
        </span>
      </div>
      <div ref={mountRef} style={{ width: '100%', height: '320px' }} />
      <div style={{
        padding: '5px 14px',
        background: 'rgba(0,0,0,0.2)',
        fontSize: '10px',
        color: 'rgba(255,255,255,0.18)',
      }}>
        Powered by Three.js · Zero API cost
      </div>
    </div>
  )
}
