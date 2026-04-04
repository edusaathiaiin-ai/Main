'use client'

/**
 * ChatWatermark.tsx
 *
 * Renders subject-specific SVG watermark patterns in the chat background.
 * Very subtle — controlled by --watermark-opacity CSS variable.
 */

import React from 'react'

type WatermarkProps = { opacity: number }

const WATERMARKS: Record<string, React.FC<WatermarkProps>> = {
  kanoonsaathi: ({ opacity }) => (
    <svg
      viewBox="0 0 400 600"
      width="100%"
      height="100%"
      style={{ opacity, pointerEvents: 'none', position: 'absolute', inset: 0 }}
    >
      <text x="30" y="80" fontSize="34" fill="currentColor" opacity="0.6">
        ⚖️
      </text>
      <text x="320" y="220" fontSize="24" fill="currentColor" opacity="0.4">
        📜
      </text>
      <text x="340" y="60" fontSize="20" fill="currentColor" opacity="0.3">
        🔨
      </text>
      <text
        x="150"
        y="500"
        fontSize="22"
        fill="currentColor"
        opacity="0.25"
        fontFamily="serif"
      >
        §
      </text>
      <text
        x="80"
        y="300"
        fontSize="18"
        fill="currentColor"
        opacity="0.2"
        fontFamily="serif"
      >
        §
      </text>
      <text x="260" y="420" fontSize="14" fill="currentColor" opacity="0.2">
        ⚖
      </text>
      <rect
        x="50"
        y="400"
        width="8"
        height="70"
        rx="4"
        fill="currentColor"
        opacity="0.12"
      />
      <rect
        x="60"
        y="396"
        width="24"
        height="4"
        rx="2"
        fill="currentColor"
        opacity="0.12"
      />
    </svg>
  ),

  maathsaathi: ({ opacity }) => (
    <svg
      viewBox="0 0 400 600"
      width="100%"
      height="100%"
      style={{ opacity, pointerEvents: 'none', position: 'absolute', inset: 0 }}
    >
      <text
        x="30"
        y="100"
        fontSize="52"
        fill="currentColor"
        opacity="0.5"
        fontFamily="serif"
      >
        ∫
      </text>
      <text
        x="340"
        y="80"
        fontSize="34"
        fill="currentColor"
        opacity="0.4"
        fontFamily="serif"
      >
        π
      </text>
      <text
        x="180"
        y="200"
        fontSize="30"
        fill="currentColor"
        opacity="0.3"
        fontFamily="serif"
      >
        √
      </text>
      <text
        x="60"
        y="380"
        fontSize="38"
        fill="currentColor"
        opacity="0.35"
        fontFamily="serif"
      >
        Σ
      </text>
      <text
        x="300"
        y="350"
        fontSize="26"
        fill="currentColor"
        opacity="0.3"
        fontFamily="serif"
      >
        ∞
      </text>
      <text
        x="200"
        y="500"
        fontSize="22"
        fill="currentColor"
        opacity="0.25"
        fontFamily="serif"
      >
        ∂
      </text>
      <text
        x="120"
        y="480"
        fontSize="24"
        fill="currentColor"
        opacity="0.2"
        fontFamily="serif"
      >
        ∆
      </text>
      {[0, 1, 2, 3].flatMap((r) =>
        [0, 1, 2, 3, 4].map((c) => (
          <circle
            key={`${r}-${c}`}
            cx={270 + c * 22}
            cy={410 + r * 22}
            r="1.5"
            fill="currentColor"
            opacity="0.12"
          />
        ))
      )}
    </svg>
  ),

  physisaathi: ({ opacity }) => (
    <svg
      viewBox="0 0 400 600"
      width="100%"
      height="100%"
      style={{ opacity, pointerEvents: 'none', position: 'absolute', inset: 0 }}
    >
      <text
        x="30"
        y="90"
        fontSize="38"
        fill="currentColor"
        opacity="0.4"
        fontFamily="serif"
      >
        λ
      </text>
      <text
        x="330"
        y="120"
        fontSize="30"
        fill="currentColor"
        opacity="0.35"
        fontFamily="serif"
      >
        Ψ
      </text>
      <text
        x="170"
        y="210"
        fontSize="26"
        fill="currentColor"
        opacity="0.3"
        fontFamily="serif"
      >
        Φ
      </text>
      <text
        x="60"
        y="360"
        fontSize="32"
        fill="currentColor"
        opacity="0.3"
        fontFamily="serif"
      >
        ħ
      </text>
      <text
        x="290"
        y="370"
        fontSize="24"
        fill="currentColor"
        opacity="0.25"
        fontFamily="serif"
      >
        ∇
      </text>
      <text
        x="200"
        y="510"
        fontSize="20"
        fill="currentColor"
        opacity="0.2"
        fontFamily="serif"
      >
        ⊗
      </text>
      <ellipse
        cx="320"
        cy="200"
        rx="40"
        ry="16"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        opacity="0.12"
        transform="rotate(-30 320 200)"
      />
      <ellipse
        cx="320"
        cy="200"
        rx="40"
        ry="16"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        opacity="0.1"
        transform="rotate(30 320 200)"
      />
    </svg>
  ),

  biosaathi: ({ opacity }) => (
    <svg
      viewBox="0 0 400 600"
      width="100%"
      height="100%"
      style={{ opacity, pointerEvents: 'none', position: 'absolute', inset: 0 }}
    >
      <path
        d="M60 40 Q90 90 60 140 Q30 190 60 240 Q90 290 60 340 Q30 390 60 440"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        opacity="0.2"
      />
      <path
        d="M80 40 Q50 90 80 140 Q110 190 80 240 Q50 290 80 340 Q110 390 80 440"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        opacity="0.2"
      />
      {[90, 140, 190, 240, 290, 340, 390].map((y, i) => (
        <line
          key={i}
          x1="62"
          y1={y}
          x2="78"
          y2={y}
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.15"
        />
      ))}
      <circle
        cx="310"
        cy="150"
        r="44"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        opacity="0.15"
      />
      <circle
        cx="310"
        cy="150"
        r="18"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
        opacity="0.12"
      />
      <text x="270" y="420" fontSize="28" fill="currentColor" opacity="0.15">
        🌿
      </text>
    </svg>
  ),

  medicosaathi: ({ opacity }) => (
    <svg
      viewBox="0 0 400 600"
      width="100%"
      height="100%"
      style={{ opacity, pointerEvents: 'none', position: 'absolute', inset: 0 }}
    >
      <rect
        x="170"
        y="40"
        width="12"
        height="44"
        rx="3"
        fill="currentColor"
        opacity="0.12"
      />
      <rect
        x="156"
        y="54"
        width="40"
        height="12"
        rx="3"
        fill="currentColor"
        opacity="0.12"
      />
      <polyline
        points="40,300 80,300 95,268 110,332 125,300 162,300"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        opacity="0.15"
      />
      <circle
        cx="310"
        cy="200"
        r="28"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        opacity="0.12"
      />
      <line
        x1="310"
        y1="172"
        x2="310"
        y2="125"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.12"
      />
      <text x="275" y="490" fontSize="28" fill="currentColor" opacity="0.12">
        🩺
      </text>
    </svg>
  ),

  nursingsaathi: ({ opacity }) => (
    <svg
      viewBox="0 0 400 600"
      width="100%"
      height="100%"
      style={{ opacity, pointerEvents: 'none', position: 'absolute', inset: 0 }}
    >
      <rect
        x="172"
        y="42"
        width="10"
        height="40"
        rx="3"
        fill="currentColor"
        opacity="0.12"
      />
      <rect
        x="158"
        y="56"
        width="38"
        height="10"
        rx="3"
        fill="currentColor"
        opacity="0.12"
      />
      <text x="40" y="200" fontSize="34" fill="currentColor" opacity="0.1">
        🏥
      </text>
      <circle
        cx="310"
        cy="300"
        r="30"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        opacity="0.12"
      />
      <polyline
        points="40,400 80,400 95,375 110,425 125,400 162,400"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        opacity="0.12"
      />
    </svg>
  ),

  psychsaathi: ({ opacity }) => (
    <svg
      viewBox="0 0 400 600"
      width="100%"
      height="100%"
      style={{ opacity, pointerEvents: 'none', position: 'absolute', inset: 0 }}
    >
      <text
        x="40"
        y="100"
        fontSize="42"
        fill="currentColor"
        opacity="0.18"
        fontFamily="serif"
      >
        Ψ
      </text>
      <text
        x="310"
        y="180"
        fontSize="28"
        fill="currentColor"
        opacity="0.15"
        fontFamily="serif"
      >
        ∞
      </text>
      <path
        d="M80 300 Q120 250 160 300 Q200 350 240 300 Q280 250 320 300"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        opacity="0.14"
      />
      <circle
        cx="200"
        cy="430"
        r="35"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeDasharray="6,4"
        opacity="0.12"
      />
      <text
        x="150"
        y="530"
        fontSize="18"
        fill="currentColor"
        opacity="0.12"
        fontFamily="serif"
      >
        ◯
      </text>
    </svg>
  ),

  pharmasaathi: ({ opacity }) => (
    <svg
      viewBox="0 0 400 600"
      width="100%"
      height="100%"
      style={{ opacity, pointerEvents: 'none', position: 'absolute', inset: 0 }}
    >
      <polygon
        points="200,55 226,73 226,110 200,128 174,110 174,73"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        opacity="0.15"
      />
      <polygon
        points="200,70 218,83 218,108 200,120 182,108 182,83"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
        strokeDasharray="4,3"
        opacity="0.1"
      />
      <circle
        cx="80"
        cy="300"
        r="8"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        opacity="0.15"
      />
      <circle
        cx="120"
        cy="272"
        r="6"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        opacity="0.15"
      />
      <line
        x1="86"
        y1="294"
        x2="114"
        y2="278"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.15"
      />
      <circle
        cx="160"
        cy="300"
        r="6"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        opacity="0.15"
      />
      <line
        x1="126"
        y1="274"
        x2="154"
        y2="294"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.15"
      />
      <rect
        x="285"
        y="350"
        width="52"
        height="22"
        rx="11"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        opacity="0.12"
      />
      <line
        x1="311"
        y1="350"
        x2="311"
        y2="372"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.1"
      />
      <text x="55" y="500" fontSize="24" fill="currentColor" opacity="0.1">
        ⚗️
      </text>
    </svg>
  ),

  compsaathi: ({ opacity }) => (
    <svg
      viewBox="0 0 400 600"
      width="100%"
      height="100%"
      style={{ opacity, pointerEvents: 'none', position: 'absolute', inset: 0 }}
    >
      {(['01001', '10110', '01101', '11010'] as string[]).map((bin, col) =>
        bin.split('').map((bit, row) => (
          <text
            key={`${col}-${row}`}
            x={38 + col * 80}
            y={55 + row * 28}
            fontSize="13"
            fill="currentColor"
            opacity={bit === '1' ? 0.18 : 0.07}
            fontFamily="monospace"
          >
            {bit}
          </text>
        ))
      )}
      <text
        x="48"
        y="360"
        fontSize="64"
        fill="currentColor"
        opacity="0.07"
        fontFamily="monospace"
      >
        {'{'}
      </text>
      <text
        x="322"
        y="360"
        fontSize="64"
        fill="currentColor"
        opacity="0.07"
        fontFamily="monospace"
      >
        {'}'}
      </text>
      <text
        x="178"
        y="470"
        fontSize="44"
        fill="currentColor"
        opacity="0.08"
        fontFamily="monospace"
      >
        λ
      </text>
      {[0, 1, 2].flatMap((r) =>
        [0, 1, 2, 3].map((c) => (
          <circle
            key={`${r}-${c}`}
            cx={248 + c * 26}
            cy={490 + r * 22}
            r="2"
            fill="currentColor"
            opacity="0.12"
          />
        ))
      )}
    </svg>
  ),

  mechsaathi: ({ opacity }) => (
    <svg
      viewBox="0 0 400 600"
      width="100%"
      height="100%"
      style={{ opacity, pointerEvents: 'none', position: 'absolute', inset: 0 }}
    >
      <circle
        cx="100"
        cy="120"
        r="46"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        opacity="0.12"
      />
      <circle
        cx="100"
        cy="120"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        opacity="0.15"
      />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const a = (i * 45 * Math.PI) / 180
        return (
          <line
            key={i}
            x1={100 + 34 * Math.cos(a)}
            y1={120 + 34 * Math.sin(a)}
            x2={100 + 46 * Math.cos(a)}
            y2={120 + 46 * Math.sin(a)}
            stroke="currentColor"
            strokeWidth="3"
            opacity="0.1"
          />
        )
      })}
      <text
        x="40"
        y="380"
        fontSize="24"
        fill="currentColor"
        opacity="0.15"
        fontFamily="serif"
      >
        ⚙️
      </text>
      <text
        x="300"
        y="420"
        fontSize="32"
        fill="currentColor"
        opacity="0.1"
        fontFamily="serif"
      >
        ∑F=ma
      </text>
    </svg>
  ),

  civilsaathi: ({ opacity }) => (
    <svg
      viewBox="0 0 400 600"
      width="100%"
      height="100%"
      style={{ opacity, pointerEvents: 'none', position: 'absolute', inset: 0 }}
    >
      <path
        d="M30 350 Q200 200 370 350"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        opacity="0.12"
      />
      <line
        x1="100"
        y1="350"
        x2="100"
        y2="300"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.1"
      />
      <line
        x1="200"
        y1="350"
        x2="200"
        y2="240"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.1"
      />
      <line
        x1="300"
        y1="350"
        x2="300"
        y2="300"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.1"
      />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect
          key={i}
          x={48 + i * 72}
          y="490"
          width="12"
          height="50"
          rx="3"
          fill="currentColor"
          opacity="0.1"
        />
      ))}
      <rect
        x="36"
        y="487"
        width="330"
        height="5"
        rx="2"
        fill="currentColor"
        opacity="0.08"
      />
    </svg>
  ),

  elecsaathi: ({ opacity }) => (
    <svg
      viewBox="0 0 400 600"
      width="100%"
      height="100%"
      style={{ opacity, pointerEvents: 'none', position: 'absolute', inset: 0 }}
    >
      <polyline
        points="40,150 80,150 90,110 110,190 130,150 170,150 180,130 200,170 220,150 260,150"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        opacity="0.15"
      />
      <circle
        cx="310"
        cy="280"
        r="24"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        opacity="0.12"
      />
      <line
        x1="286"
        y1="280"
        x2="260"
        y2="280"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.12"
      />
      <line
        x1="334"
        y1="280"
        x2="360"
        y2="280"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.12"
      />
      <text
        x="48"
        y="450"
        fontSize="24"
        fill="currentColor"
        opacity="0.12"
        fontFamily="serif"
      >
        ⚡
      </text>
      <text
        x="290"
        y="480"
        fontSize="18"
        fill="currentColor"
        opacity="0.1"
        fontFamily="serif"
      >
        V=IR
      </text>
    </svg>
  ),

  biotechsaathi: ({ opacity }) => (
    <svg
      viewBox="0 0 400 600"
      width="100%"
      height="100%"
      style={{ opacity, pointerEvents: 'none', position: 'absolute', inset: 0 }}
    >
      <path
        d="M60 40 Q90 85 60 130 Q30 175 60 220 Q90 265 60 310"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        opacity="0.18"
      />
      <path
        d="M80 40 Q50 85 80 130 Q110 175 80 220 Q50 265 80 310"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        opacity="0.18"
      />
      {[85, 130, 180, 230, 280].map((y, i) => (
        <line
          key={i}
          x1="63"
          y1={y}
          x2="77"
          y2={y}
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.14"
        />
      ))}
      <text x="55" y="500" fontSize="22" fill="currentColor" opacity="0.12">
        🧬
      </text>
      <circle
        cx="310"
        cy="200"
        r="36"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        opacity="0.12"
      />
      <circle
        cx="310"
        cy="200"
        r="14"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
        opacity="0.1"
      />
    </svg>
  ),

  envirosaathi: ({ opacity }) => (
    <svg
      viewBox="0 0 400 600"
      width="100%"
      height="100%"
      style={{ opacity, pointerEvents: 'none', position: 'absolute', inset: 0 }}
    >
      <text x="40" y="120" fontSize="36" fill="currentColor" opacity="0.15">
        🌍
      </text>
      <text x="300" y="240" fontSize="28" fill="currentColor" opacity="0.12">
        🌿
      </text>
      <path
        d="M60 350 Q130 300 200 350 Q270 400 340 350"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        opacity="0.14"
      />
      <path
        d="M60 380 Q130 330 200 380 Q270 430 340 380"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        opacity="0.1"
      />
      <text x="160" y="520" fontSize="22" fill="currentColor" opacity="0.12">
        ♻️
      </text>
    </svg>
  ),

  aerosaathi: ({ opacity }) => (
    <svg
      viewBox="0 0 400 600"
      width="100%"
      height="100%"
      style={{ opacity, pointerEvents: 'none', position: 'absolute', inset: 0 }}
    >
      <text x="30" y="100" fontSize="36" fill="currentColor" opacity="0.15">
        ✈️
      </text>
      <path
        d="M40 300 Q200 200 360 300"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        opacity="0.12"
      />
      <text
        x="48"
        y="200"
        fontSize="18"
        fill="currentColor"
        opacity="0.1"
        fontFamily="serif"
      >
        p+½ρv²=const
      </text>
      <text
        x="260"
        y="440"
        fontSize="22"
        fill="currentColor"
        opacity="0.12"
        fontFamily="serif"
      >
        ∇·V=0
      </text>
    </svg>
  ),

  aerospacesaathi: ({ opacity }) => (
    <svg
      viewBox="0 0 400 600"
      width="100%"
      height="100%"
      style={{ opacity, pointerEvents: 'none', position: 'absolute', inset: 0 }}
    >
      <text x="40" y="100" fontSize="32" fill="currentColor" opacity="0.15">
        🚀
      </text>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <circle
          key={i}
          cx={80 + i * 45}
          cy={180 + i * 20}
          r="1.5"
          fill="currentColor"
          opacity="0.15"
        />
      ))}
      <circle
        cx="310"
        cy="160"
        r="40"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
        strokeDasharray="4,4"
        opacity="0.12"
      />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <circle
          key={i}
          cx={Math.cos((i * 52 * Math.PI) / 180) * 38 + 310}
          cy={Math.sin((i * 52 * Math.PI) / 180) * 38 + 160}
          r="1.5"
          fill="currentColor"
          opacity="0.2"
        />
      ))}
      <text
        x="50"
        y="500"
        fontSize="18"
        fill="currentColor"
        opacity="0.1"
        fontFamily="serif"
      >
        ★
      </text>
      <text
        x="180"
        y="480"
        fontSize="18"
        fill="currentColor"
        opacity="0.08"
        fontFamily="serif"
      >
        ★
      </text>
      <text
        x="300"
        y="500"
        fontSize="14"
        fill="currentColor"
        opacity="0.1"
        fontFamily="serif"
      >
        ★
      </text>
    </svg>
  ),

  econsaathi: ({ opacity }) => (
    <svg
      viewBox="0 0 400 600"
      width="100%"
      height="100%"
      style={{ opacity, pointerEvents: 'none', position: 'absolute', inset: 0 }}
    >
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect
          key={i}
          x={42 + i * 58}
          y={280 - i * 28}
          width="30"
          height={50 + i * 28}
          rx="3"
          fill="currentColor"
          opacity="0.08"
        />
      ))}
      <path
        d="M42 260 Q120 200 220 220 Q320 240 360 160"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        opacity="0.14"
      />
      <text
        x="60"
        y="480"
        fontSize="32"
        fill="currentColor"
        opacity="0.1"
        fontFamily="serif"
      >
        $
      </text>
      <text
        x="290"
        y="100"
        fontSize="22"
        fill="currentColor"
        opacity="0.12"
        fontFamily="serif"
      >
        ∑
      </text>
    </svg>
  ),

  finsaathi: ({ opacity }) => (
    <svg
      viewBox="0 0 400 600"
      width="100%"
      height="100%"
      style={{ opacity, pointerEvents: 'none', position: 'absolute', inset: 0 }}
    >
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect
          key={i}
          x={42 + i * 58}
          y={300 - i * 35}
          width="30"
          height={60 + i * 35}
          rx="3"
          fill="currentColor"
          opacity="0.08"
        />
      ))}
      <path
        d="M42 260 Q160 180 260 210 Q340 230 365 150"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        opacity="0.14"
      />
      <text
        x="55"
        y="490"
        fontSize="36"
        fill="currentColor"
        opacity="0.1"
        fontFamily="serif"
      >
        ₹
      </text>
      <text x="308" y="110" fontSize="24" fill="currentColor" opacity="0.12">
        %
      </text>
    </svg>
  ),

  archsaathi: ({ opacity }) => (
    <svg
      viewBox="0 0 400 600"
      width="100%"
      height="100%"
      style={{ opacity, pointerEvents: 'none', position: 'absolute', inset: 0 }}
    >
      <path
        d="M80 400 Q200 240 320 400"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        opacity="0.14"
      />
      <line
        x1="80"
        y1="400"
        x2="80"
        y2="500"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.12"
      />
      <line
        x1="320"
        y1="400"
        x2="320"
        y2="500"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.12"
      />
      <line
        x1="40"
        y1="88"
        x2="200"
        y2="160"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.12"
      />
      <line
        x1="360"
        y1="88"
        x2="200"
        y2="160"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.12"
      />
      {[0, 1, 2, 3, 4].map((i) => (
        <line
          key={i}
          x1={60 + i * 72}
          y1="500"
          x2={60 + i * 72}
          y2="460"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
          opacity="0.08"
        />
      ))}
    </svg>
  ),

  chemenggsaathi: ({ opacity }) => (
    <svg
      viewBox="0 0 400 600"
      width="100%"
      height="100%"
      style={{ opacity, pointerEvents: 'none', position: 'absolute', inset: 0 }}
    >
      <polygon
        points="200,55 228,73 228,110 200,128 172,110 172,73"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        opacity="0.15"
      />
      <rect
        x="168"
        y="130"
        width="8"
        height="60"
        fill="currentColor"
        opacity="0.08"
      />
      <rect
        x="224"
        y="130"
        width="8"
        height="60"
        fill="currentColor"
        opacity="0.08"
      />
      <path
        d="M170 195 Q200 230 230 195"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        opacity="0.12"
      />
      <text x="55" y="490" fontSize="24" fill="currentColor" opacity="0.1">
        ⚗️
      </text>
      <circle
        cx="310"
        cy="350"
        r="30"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        opacity="0.12"
      />
    </svg>
  ),

  default: ({ opacity }) => (
    <svg
      viewBox="0 0 400 600"
      width="100%"
      height="100%"
      style={{ opacity, pointerEvents: 'none', position: 'absolute', inset: 0 }}
    >
      {Array.from({ length: 8 }, (_, r) =>
        Array.from({ length: 6 }, (_, c) => (
          <circle
            key={`${r}-${c}`}
            cx={50 + c * 60}
            cy={50 + r * 75}
            r="1.5"
            fill="currentColor"
            opacity="0.08"
          />
        ))
      )}
    </svg>
  ),
}

export function ChatWatermark({ saathiSlug }: { saathiSlug: string }) {
  const WatermarkSvg = WATERMARKS[saathiSlug] ?? WATERMARKS.default

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
        color: 'var(--text-primary)',
        opacity: 'var(--watermark-opacity)' as unknown as number,
      }}
    >
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: `${row * 33.33}%`,
            height: '33.34%',
            display: 'flex',
          }}
        >
          {[0, 1].map((col) => (
            <div
              key={col}
              style={{ flex: 1, position: 'relative', minHeight: '100%' }}
            >
              <WatermarkSvg opacity={1} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
