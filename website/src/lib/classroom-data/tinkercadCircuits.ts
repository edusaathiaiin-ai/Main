// Tinkercad Circuits — Autodesk's web-based circuit + Arduino simulator.
// Faculty creates designs in their Autodesk account → shares embed URL →
// students view via iframe (no student auth required for embed views).
//
// The chip URLs below are placeholder Autodesk-hosted public examples;
// faculty replaces these with their own designs as they author them.
// We use the official "share" embed URL pattern.

import type { ToolChip } from '@/components/classroom/ToolChipPanel'

const TINKERCAD_BY_SAATHI: Record<string, ToolChip[]> = {
  elecsaathi: [
    { label: 'Tinkercad Circuits home', url: 'https://www.tinkercad.com/circuits', description: 'Browse public circuit designs' },
    { label: 'Arduino + LED Blink (sample)', url: 'https://www.tinkercad.com/things?type=circuits&category=arduino' },
    { label: 'Voltage Divider (sample)', url: 'https://www.tinkercad.com/things?type=circuits&q=voltage+divider' },
  ],
  electronicssaathi: [
    { label: 'Tinkercad Circuits home', url: 'https://www.tinkercad.com/circuits' },
    { label: 'Arduino + Sensors', url: 'https://www.tinkercad.com/things?type=circuits&category=arduino' },
    { label: 'Microcontroller projects', url: 'https://www.tinkercad.com/things?type=circuits&q=microcontroller' },
  ],
  mechsaathi: [
    { label: 'Sensor circuits', url: 'https://www.tinkercad.com/things?type=circuits&q=sensor' },
    { label: 'Arduino motor control', url: 'https://www.tinkercad.com/things?type=circuits&q=motor' },
  ],
  compsaathi: [
    { label: 'Arduino programming', url: 'https://www.tinkercad.com/things?type=circuits&category=arduino' },
    { label: 'Logic circuits', url: 'https://www.tinkercad.com/things?type=circuits&q=logic' },
  ],
  aerospacesaathi: [
    { label: 'Sensor circuits', url: 'https://www.tinkercad.com/things?type=circuits&q=sensor' },
    { label: 'IMU + Arduino', url: 'https://www.tinkercad.com/things?type=circuits&q=accelerometer' },
  ],
}

export function getTinkercadChipsFor(saathiSlug: string): ToolChip[] {
  return TINKERCAD_BY_SAATHI[saathiSlug] ?? []
}
