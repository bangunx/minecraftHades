function hash2(x, y, seed) {
  let h = x * 374761393 + y * 668265263 + seed * 69069;
  h = (h ^ (h >> 13)) * 1274126177;
  h ^= h >> 16;
  return (h >>> 0) / 4294967295;
}

function smooth(t) {
  return t * t * (3 - 2 * t);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export class FractalNoise {
  constructor(seed = 1337, octaves = 4, persistence = 0.5, lacunarity = 2.0) {
    this.seed = seed;
    this.octaves = octaves;
    this.persistence = persistence;
    this.lacunarity = lacunarity;
  }

  sample(x, y) {
    let amplitude = 1;
    let frequency = 1;
    let value = 0;
    let amplitudeSum = 0;

    for (let i = 0; i < this.octaves; i++) {
      value += amplitude * this._noise(x * frequency, y * frequency);
      amplitudeSum += amplitude;
      amplitude *= this.persistence;
      frequency *= this.lacunarity;
    }

    return value / amplitudeSum;
  }

  _noise(x, y) {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = x0 + 1;
    const y1 = y0 + 1;

    const sx = smooth(x - x0);
    const sy = smooth(y - y0);

    const n00 = hash2(x0, y0, this.seed);
    const n10 = hash2(x1, y0, this.seed);
    const n01 = hash2(x0, y1, this.seed);
    const n11 = hash2(x1, y1, this.seed);

    const ix0 = lerp(n00, n10, sx);
    const ix1 = lerp(n01, n11, sx);

    return lerp(ix0, ix1, sy);
  }
}
