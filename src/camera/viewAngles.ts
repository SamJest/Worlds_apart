/** Normalize a heading without clamping it, so a touch drag can travel 360°. */
export const wrapYaw = (angle: number): number => Math.atan2(Math.sin(angle), Math.cos(angle))
