import {
    DataTexture,
    LinearFilter,
    LinearMipmapLinearFilter,
    RGBAFormat,
    RepeatWrapping,
} from 'three'

const size = 128
const pixels = new Uint8Array(size * size * 4)
let seed = 0x5eed1234

for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
        const grain = ((seed >>> 16) & 255) / 255
        const weave = Math.sin(x * 0.48) * Math.sin(y * 0.55)
        const shade = Math.round(232 + (grain - 0.5) * 34 + weave * 6)
        const offset = (y * size + x) * 4
        pixels[offset] = shade
        pixels[offset + 1] = shade
        pixels[offset + 2] = shade
        pixels[offset + 3] = 255
    }
}

export const tactileTexture = new DataTexture(pixels, size, size, RGBAFormat)
tactileTexture.wrapS = RepeatWrapping
tactileTexture.wrapT = RepeatWrapping
tactileTexture.repeat.set(3, 3)
tactileTexture.magFilter = LinearFilter
tactileTexture.minFilter = LinearMipmapLinearFilter
tactileTexture.generateMipmaps = true
tactileTexture.anisotropy = 4
tactileTexture.needsUpdate = true
