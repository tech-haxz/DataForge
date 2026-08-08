import { Canvas } from '@react-three/fiber'
import { Float, Icosahedron, MeshDistortMaterial } from '@react-three/drei'
export default function ProjectOrb({ color = '#1689ea' }) { return <div className="project-orb"><Canvas camera={{position:[0,0,3.5]}}><ambientLight intensity={2}/><Float speed={2} rotationIntensity={2} floatIntensity={1}><Icosahedron args={[.95,1]}><MeshDistortMaterial color={color} distort={.35} speed={2} roughness={.25} metalness={.4}/></Icosahedron></Float></Canvas></div> }
