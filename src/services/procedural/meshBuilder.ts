import * as THREE from 'three'
import type { ModelRecipe, Shape } from './types'

export class MeshBuilder {
  buildFromRecipe(recipe: ModelRecipe): THREE.Group {
    const group = new THREE.Group()
    group.name = recipe.name

    // Build each shape
    for (const shape of recipe.shapes) {
      const mesh = this.buildShape(shape)
      if (mesh) {
        group.add(mesh)
      }
    }

    // Center at origin if requested
    if (recipe.centerAtOrigin) {
      const box = new THREE.Box3().setFromObject(group)
      const center = box.getCenter(new THREE.Vector3())
      group.position.sub(center)
    }

    // Apply uniform scale
    if (recipe.uniformScale && recipe.uniformScale !== 1) {
      group.scale.multiplyScalar(recipe.uniformScale)
    }

    return group
  }

  private buildShape(shape: Shape): THREE.Mesh | null {
    let geometry: THREE.BufferGeometry

    switch (shape.type) {
      case 'box':
        geometry = new THREE.BoxGeometry(1, 1, 1)
        break

      case 'sphere':
        geometry = new THREE.SphereGeometry(0.5, 32, 32)
        break

      case 'cylinder':
        const radiusTop = shape.params?.radiusTop ?? 0.5
        const radiusBottom = shape.params?.radiusBottom ?? 0.5
        geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, 1, 32)
        break

      case 'cone':
        geometry = new THREE.ConeGeometry(0.5, 1, 32)
        break

      case 'torus':
        const radius = shape.params?.radius ?? 0.5
        const tube = shape.params?.tube ?? 0.2
        geometry = new THREE.TorusGeometry(radius, tube, 16, 48)
        break

      case 'capsule':
        geometry = new THREE.CapsuleGeometry(0.5, 1, 8, 16)
        break

      default:
        console.warn(`Unknown shape type: ${shape.type}`)
        return null
    }

    // Create material
    const material = new THREE.MeshStandardMaterial({
      color: shape.color || '#00d9ff',
      metalness: 0.1,
      roughness: 0.6,
    })

    // Create mesh
    const mesh = new THREE.Mesh(geometry, material)

    // Apply transforms
    mesh.position.set(...shape.position)
    mesh.rotation.set(
      THREE.MathUtils.degToRad(shape.rotation[0]),
      THREE.MathUtils.degToRad(shape.rotation[1]),
      THREE.MathUtils.degToRad(shape.rotation[2])
    )
    mesh.scale.set(...shape.scale)

    // Enable shadows
    mesh.castShadow = true
    mesh.receiveShadow = true

    return mesh
  }
}

// STL Export utility
export function exportToSTL(group: THREE.Group): ArrayBuffer {
  // Merge all geometries into one
  const geometries: THREE.BufferGeometry[] = []
  
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const geo = child.geometry.clone()
      // Apply mesh transforms to geometry
      geo.applyMatrix4(child.matrixWorld)
      geometries.push(geo)
    }
  })

  if (geometries.length === 0) {
    throw new Error('No meshes to export')
  }

  // Merge geometries
  const mergedGeometry = mergeGeometries(geometries)
  
  // Generate binary STL
  return generateBinarySTL(mergedGeometry)
}

function mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const positions: number[] = []
  const normals: number[] = []

  for (const geo of geometries) {
    const posAttr = geo.getAttribute('position')
    const normAttr = geo.getAttribute('normal')
    
    if (geo.index) {
      // Indexed geometry - expand indices
      const indices = geo.index.array
      for (let i = 0; i < indices.length; i++) {
        const idx = indices[i]
        positions.push(
          posAttr.getX(idx),
          posAttr.getY(idx),
          posAttr.getZ(idx)
        )
        if (normAttr) {
          normals.push(
            normAttr.getX(idx),
            normAttr.getY(idx),
            normAttr.getZ(idx)
          )
        }
      }
    } else {
      // Non-indexed geometry
      for (let i = 0; i < posAttr.count; i++) {
        positions.push(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i))
        if (normAttr) {
          normals.push(normAttr.getX(i), normAttr.getY(i), normAttr.getZ(i))
        }
      }
    }
  }

  const merged = new THREE.BufferGeometry()
  merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  if (normals.length > 0) {
    merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  } else {
    merged.computeVertexNormals()
  }

  return merged
}

function generateBinarySTL(geometry: THREE.BufferGeometry): ArrayBuffer {
  const positions = geometry.getAttribute('position')
  const normals = geometry.getAttribute('normal') || geometry.computeVertexNormals()
  
  const triangleCount = positions.count / 3
  
  // Binary STL format:
  // 80 bytes header
  // 4 bytes triangle count
  // For each triangle: 12 bytes normal + 36 bytes vertices + 2 bytes attribute
  const bufferLength = 80 + 4 + triangleCount * 50
  const buffer = new ArrayBuffer(bufferLength)
  const dataView = new DataView(buffer)
  
  // Header (80 bytes) - can be anything
  const header = 'Binary STL generated by Modeler'
  for (let i = 0; i < 80; i++) {
    dataView.setUint8(i, i < header.length ? header.charCodeAt(i) : 0)
  }
  
  // Triangle count
  dataView.setUint32(80, triangleCount, true)
  
  let offset = 84
  const normAttr = geometry.getAttribute('normal')
  
  for (let i = 0; i < triangleCount; i++) {
    const i3 = i * 3
    
    // Calculate face normal from vertices if needed
    let nx = 0, ny = 0, nz = 0
    if (normAttr) {
      nx = (normAttr.getX(i3) + normAttr.getX(i3 + 1) + normAttr.getX(i3 + 2)) / 3
      ny = (normAttr.getY(i3) + normAttr.getY(i3 + 1) + normAttr.getY(i3 + 2)) / 3
      nz = (normAttr.getZ(i3) + normAttr.getZ(i3 + 1) + normAttr.getZ(i3 + 2)) / 3
    }
    
    // Normal
    dataView.setFloat32(offset, nx, true); offset += 4
    dataView.setFloat32(offset, ny, true); offset += 4
    dataView.setFloat32(offset, nz, true); offset += 4
    
    // Vertices
    for (let j = 0; j < 3; j++) {
      dataView.setFloat32(offset, positions.getX(i3 + j), true); offset += 4
      dataView.setFloat32(offset, positions.getY(i3 + j), true); offset += 4
      dataView.setFloat32(offset, positions.getZ(i3 + j), true); offset += 4
    }
    
    // Attribute byte count
    dataView.setUint16(offset, 0, true); offset += 2
  }
  
  return buffer
}

