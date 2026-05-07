export function colorFromName(name: string): string {
  let hash = 0
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash << 5) - hash + name.charCodeAt(index)
    hash |= 0
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue} 62% 44%)`
}
