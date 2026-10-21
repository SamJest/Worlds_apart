/** Visual-only banking for a fictional space coaster. Limits keep mobile rides comfortable. */
export function coasterBankRadians(lateralTangentChange: number, reducedMotion: boolean): number {
  if (reducedMotion || !Number.isFinite(lateralTangentChange) || lateralTangentChange === 0) return 0
  const turn = Math.max(-1, Math.min(1, lateralTangentChange))
  return Math.max(-0.36, Math.min(0.36, -turn * 3.1))
}
