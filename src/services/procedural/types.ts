// Primitive shape types
export type PrimitiveType = 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'capsule'

// A single shape in the model
export interface Shape {
  type: PrimitiveType
  position: [number, number, number]
  rotation: [number, number, number] // in degrees
  scale: [number, number, number]
  color: string // hex color
  // Type-specific parameters
  params?: {
    // Box: width, height, depth (use scale)
    // Sphere: radius (use scale[0])
    // Cylinder: radiusTop, radiusBottom, height
    radiusTop?: number
    radiusBottom?: number
    // Torus: radius, tube
    radius?: number
    tube?: number
    // Cone: radius, height (use scale)
  }
}

// Boolean operation to combine shapes
export interface BooleanOp {
  operation: 'union' | 'subtract' | 'intersect'
  target: number // index of shape to modify
  tool: number   // index of shape to use as tool
}

// Complete model recipe
export interface ModelRecipe {
  name: string
  description: string
  shapes: Shape[]
  operations?: BooleanOp[]
  // Overall model settings
  centerAtOrigin?: boolean
  uniformScale?: number
}

// Generation result
export interface GenerationResult {
  success: boolean
  recipe?: ModelRecipe
  error?: string
}

