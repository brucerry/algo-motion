import { OrbitControls as StandardOrbitControls } from 'three-stdlib'

export class OrbitControls extends StandardOrbitControls {
    enableFullRotation: boolean
    screenRelativeRotation: boolean
}
