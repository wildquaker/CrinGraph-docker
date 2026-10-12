/**
 * Equalizer & AutoEQ Module for CrinGraph
 * Provides biquad IIR filtering, frequency response interpolation,
 * graphic EQ generation, and automatic parametric EQ curve fitting.
 */
var Equalizer = (function () {
  "use strict";

  const config = {
    DefaultSampleRate: 48000,
    TrebleStartFrom: 7000,
    AutoEQRange: [20, 15000],
    OptimizeQRange: [0.1, 10],
    OptimizeGainRange: [-20, 20],
    OptimizeDeltas: [
      [10, 10, 10, 5, 0.1, 0.5],
      [10, 10, 10, 2, 0.1, 0.2],
      [10, 10, 10, 1, 0.1, 0.1],
    ],
    GraphicEQRawFrequences: Array.from(
      { length: Math.ceil(Math.log(20000 / 20) / Math.log(1.0072)) },
      (_, i) => 20 * 1.0072 ** i,
    ),
    GraphicEQFrequences: Array.from(
      new Set(
        Array.from(
          { length: Math.ceil(Math.log(20000 / 20) / Math.log(1.0563)) },
          (_, i) => Math.floor(20 * 1.0563 ** i),
        ),
      ),
    ).sort((a, b) => a - b),
  };

  /** Helper to clamp a number within [min, max] */
  const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

  /**
   * Linear interpolation for frequency response data.
   * @param {number[]} fv - Array of target frequencies (sorted ascending).
   * @param {Array<[number, number]>} fr - Array of [freq, dB] points (sorted ascending).
   * @returns {Array<[number, number]>} Interpolated [freq, dB] points.
   */
  function interp(fv, fr) {
    if (!fr || fr.length === 0) return [];
    if (fr.length === 1) {
      const [, v0] = fr[0];
      return fv.map((f) => [f, v0]);
    }
    let i = 0;
    const lastIdx = fr.length - 1;
    return fv.map((f) => {
      for (; i < lastIdx; ++i) {
        const [f0, v0] = fr[i];
        const [f1, v1] = fr[i + 1];
        if (i === 0 && f < f0) {
          return [f, v0];
        }
        if (f >= f0 && f < f1) {
          const v = v0 + ((v1 - v0) * (f - f0)) / (f1 - f0);
          return [f, v];
        }
      }
      return [f, fr[lastIdx][1]];
    });
  }

  /**
   * Calculate low shelf biquad filter coefficients [1.0, a1/a0, a2/a0, b0/a0, b1/a0, b2/a0].
   * @param {number} freq - Center frequency in Hz.
   * @param {number} q - Q factor.
   * @param {number} gain - Gain in dB.
   * @param {number} [sampleRate] - Audio sample rate in Hz.
   * @returns {number[]} Normalized biquad coefficients.
   */
  function lowshelf(freq, q, gain, sampleRate = config.DefaultSampleRate) {
    const normFreq = clamp(freq / sampleRate, 1e-6, 1);
    const clampedQ = clamp(q, 1e-4, 1000);
    const clampedGain = clamp(gain, -40, 40);

    const w0 = 2 * Math.PI * normFreq;
    const sin = Math.sin(w0);
    const cos = Math.cos(w0);
    const a = 10 ** (clampedGain / 40);
    const alpha = sin / (2 * clampedQ);
    const alphamod = 2 * Math.sqrt(a) * alpha || 0;

    const a0 = a + 1 + (a - 1) * cos + alphamod;
    const a1 = -2 * (a - 1 + (a + 1) * cos);
    const a2 = a + 1 + (a - 1) * cos - alphamod;
    const b0 = a * (a + 1 - (a - 1) * cos + alphamod);
    const b1 = 2 * a * (a - 1 - (a + 1) * cos);
    const b2 = a * (a + 1 - (a - 1) * cos - alphamod);

    return [1.0, a1 / a0, a2 / a0, b0 / a0, b1 / a0, b2 / a0];
  }

  /**
   * Calculate high shelf biquad filter coefficients [1.0, a1/a0, a2/a0, b0/a0, b1/a0, b2/a0].
   * @param {number} freq - Center frequency in Hz.
   * @param {number} q - Q factor.
   * @param {number} gain - Gain in dB.
   * @param {number} [sampleRate] - Audio sample rate in Hz.
   * @returns {number[]} Normalized biquad coefficients.
   */
  function highshelf(freq, q, gain, sampleRate = config.DefaultSampleRate) {
    const normFreq = clamp(freq / sampleRate, 1e-6, 1);
    const clampedQ = clamp(q, 1e-4, 1000);
    const clampedGain = clamp(gain, -40, 40);

    const w0 = 2 * Math.PI * normFreq;
    const sin = Math.sin(w0);
    const cos = Math.cos(w0);
    const a = 10 ** (clampedGain / 40);
    const alpha = sin / (2 * clampedQ);
    const alphamod = 2 * Math.sqrt(a) * alpha || 0;

    const a0 = a + 1 - (a - 1) * cos + alphamod;
    const a1 = 2 * (a - 1 - (a + 1) * cos);
    const a2 = a + 1 - (a - 1) * cos - alphamod;
    const b0 = a * (a + 1 + (a - 1) * cos + alphamod);
    const b1 = -2 * a * (a - 1 + (a + 1) * cos);
    const b2 = a * (a + 1 + (a - 1) * cos - alphamod);

    return [1.0, a1 / a0, a2 / a0, b0 / a0, b1 / a0, b2 / a0];
  }

  /**
   * Calculate peaking EQ biquad filter coefficients [1.0, a1/a0, a2/a0, b0/a0, b1/a0, b2/a0].
   * @param {number} freq - Center frequency in Hz.
   * @param {number} q - Q factor.
   * @param {number} gain - Gain in dB.
   * @param {number} [sampleRate] - Audio sample rate in Hz.
   * @returns {number[]} Normalized biquad coefficients.
   */
  function peaking(freq, q, gain, sampleRate = config.DefaultSampleRate) {
    const normFreq = clamp(freq / sampleRate, 1e-6, 1);
    const clampedQ = clamp(q, 1e-4, 1000);
    const clampedGain = clamp(gain, -40, 40);

    const w0 = 2 * Math.PI * normFreq;
    const sin = Math.sin(w0);
    const cos = Math.cos(w0);
    const a = 10 ** (clampedGain / 40);
    const alpha = sin / (2 * clampedQ);

    const a0 = 1 + alpha / a;
    const a1 = -2 * cos;
    const a2 = 1 - alpha / a;
    const b0 = 1 + alpha * a;
    const b1 = -2 * cos;
    const b2 = 1 - alpha * a;

    return [1.0, a1 / a0, a2 / a0, b0 / a0, b1 / a0, b2 / a0];
  }

  /**
   * Calculate dB gain response for a set of frequencies and biquad filter coefficients.
   * @param {number[]} freqs - Array of frequencies in Hz.
   * @param {Array<number[]>} coeffs - Array of filter coefficients [1.0, a1, a2, b0, b1, b2].
   * @param {number} [sampleRate] - Audio sample rate in Hz.
   * @returns {number[]} Array of dB gains corresponding to freqs.
   */
  function calc_gains(freqs, coeffs, sampleRate = config.DefaultSampleRate) {
    const gains = new Array(freqs.length).fill(0);

    for (let i = 0; i < coeffs.length; ++i) {
      const [a0, a1, a2, b0, b1, b2] = coeffs[i];
      const bSumSq = (b0 + b1 + b2) ** 2;
      const aSumSq = (a0 + a1 + a2) ** 2;
      const b0b2 = b0 * b2;
      const a0a2 = a0 * a2;
      const bTerm = b1 * (b0 + b2) + 4 * b0b2;
      const aTerm = a1 * (a0 + a2) + 4 * a0a2;

      for (let j = 0; j < freqs.length; ++j) {
        const w = (2 * Math.PI * freqs[j]) / sampleRate;
        const phi = 4 * Math.sin(w / 2) ** 2;
        const c =
          10 * Math.log10(bSumSq + (b0b2 * phi - bTerm) * phi) -
          10 * Math.log10(aSumSq + (a0a2 * phi - aTerm) * phi);
        gains[j] += c;
      }
    }
    return gains;
  }

  /**
   * Calculate preamp required to normalize fr2 relative to fr1.
   * @param {Array<[number, number]>} fr1 - Base frequency response.
   * @param {Array<[number, number]>} fr2 - Target/equalized frequency response.
   * @returns {number} Preamp gain offset in dB.
   */
  function calc_preamp(fr1, fr2) {
    let maxGain = -Infinity;
    for (let i = 0; i < fr1.length; ++i) {
      const diff = fr2[i][1] - fr1[i][1];
      if (diff > maxGain) {
        maxGain = diff;
      }
    }
    return -maxGain;
  }

  /**
   * Calculate average distance in dB between two frequency responses.
   * Ignores differences smaller than 0.1 dB.
   * @param {Array<[number, number]>} fr1
   * @param {Array<[number, number]>} fr2
   * @returns {number} Average error distance.
   */
  function calc_distance(fr1, fr2) {
    if (!fr1.length) return 0;
    let distance = 0;
    for (let i = 0; i < fr1.length; ++i) {
      const d = Math.abs(fr1[i][1] - fr2[i][1]);
      if (d >= 0.1) {
        distance += d;
      }
    }
    return distance / fr1.length;
  }

  /**
   * Convert filter definitions to biquad coefficients.
   * @param {Array<{type: string, freq: number, q: number, gain: number}>} filters
   * @param {number} [sampleRate] - Audio sample rate in Hz.
   * @returns {Array<number[]>} Array of biquad filter coefficients.
   */
  function filters_to_coeffs(filters, sampleRate = config.DefaultSampleRate) {
    const coeffs = [];
    for (const f of filters) {
      if (!f || !f.freq || !f.gain || !f.q) continue;
      switch (f.type) {
        case "LSQ":
          coeffs.push(lowshelf(f.freq, f.q, f.gain, sampleRate));
          break;
        case "HSQ":
          coeffs.push(highshelf(f.freq, f.q, f.gain, sampleRate));
          break;
        case "PK":
          coeffs.push(peaking(f.freq, f.q, f.gain, sampleRate));
          break;
      }
    }
    return coeffs;
  }

  /**
   * Apply filters to a frequency response curve.
   * @param {Array<[number, number]>} fr - Original [freq, dB] points.
   * @param {Array<object>} filters - Array of filter definitions.
   * @param {number} [sampleRate] - Audio sample rate in Hz.
   * @returns {Array<[number, number]>} Filtered [freq, dB] points.
   */
  function apply(fr, filters, sampleRate = config.DefaultSampleRate) {
    const freqs = fr.map(([f]) => f);
    const coeffs = filters_to_coeffs(filters, sampleRate);
    const gains = calc_gains(freqs, coeffs, sampleRate);
    return fr.map(([f, v], i) => [f, v + gains[i]]);
  }

  /**
   * Convert parametric EQ filters into fixed-frequency graphic EQ points.
   * @param {Array<object>} filters - Array of filter definitions.
   * @param {number} [sampleRate] - Audio sample rate in Hz.
   * @returns {Array<[number, number]>} Normalized graphic EQ points [freq, dB].
   */
  function as_graphic_eq(filters, sampleRate = config.DefaultSampleRate) {
    const rawFS = config.GraphicEQRawFrequences;
    const fs = config.GraphicEQFrequences;
    const coeffs = filters_to_coeffs(filters, sampleRate);
    const gains = calc_gains(rawFS, coeffs, sampleRate);

    // Interpolate and smooth with moving average
    let i = 0;
    let resultFR = fs.map((f, j) => {
      const freqTo = j < fs.length - 1 ? Math.sqrt(f * fs[j + 1]) : 20000;
      const points = [];
      for (; i < rawFS.length; ++i) {
        if (rawFS[i] < freqTo) {
          points.push(gains[i]);
        } else {
          break;
        }
      }
      const avg =
        points.length > 0
          ? points.reduce((sum, val) => sum + val, 0) / points.length
          : 0;
      return [f, avg];
    });

    // Normalize (apply preamp)
    const maxGain = resultFR.reduce(
      (max, [, v]) => (v > max ? v : max),
      -Infinity,
    );
    resultFR = resultFR.map(([f, v]) => [f, v - maxGain]);
    return resultFR;
  }

  /**
   * Search peak and dip candidate filters.
   * @param {Array<[number, number]>} fr - Measured curve.
   * @param {Array<[number, number]>} frTarget - Target curve.
   * @param {number} threshold - Threshold for deviation detection.
   * @returns {Array<object>} Candidate peaking filters.
   */
  function search_candidates(fr, frTarget, threshold) {
    let state = 0; // 1: peak, 0: matched, -1: dip
    let startIndex = -1;
    const candidates = [];
    const [minFreq, maxFreq] = config.AutoEQRange;

    for (let i = 0; i < fr.length; ++i) {
      const [f, v0] = fr[i];
      const v1 = frTarget[i][1];
      const delta = v0 - v1;
      const deltaAbs = Math.abs(delta);
      const nextState = deltaAbs < threshold ? 0 : Math.sign(delta);

      if (nextState === state) {
        continue;
      }

      if (startIndex >= 0) {
        if (state !== 0) {
          const start = fr[startIndex][0];
          const end = f;
          const center = Math.sqrt(start * end);
          const gain =
            interp([center], frTarget.slice(startIndex, i))[0][1] -
            interp([center], fr.slice(startIndex, i))[0][1];
          const q = center / (end - start);
          if (center >= minFreq && center <= maxFreq) {
            candidates.push({ type: "PK", freq: center, q, gain });
          }
        }
        startIndex = -1;
      } else {
        startIndex = i;
      }
      state = nextState;
    }
    return candidates;
  }

  /**
   * Frequency rounding unit based on frequency band.
   * @param {number} freq - Frequency in Hz.
   * @returns {number} Rounding step.
   */
  function freq_unit(freq) {
    if (freq < 100) return 1;
    if (freq < 1000) return 10;
    if (freq < 10000) return 100;
    return 1000;
  }

  /**
   * Format filter values for DSP compatibility (round freq, clamp Q and gain).
   * @param {Array<object>} filters - Array of filter definitions.
   * @returns {Array<object>} Clamped and rounded filter definitions.
   */
  function strip(filters) {
    const [minQ, maxQ] = config.OptimizeQRange;
    const [minGain, maxGain] = config.OptimizeGainRange;
    return filters.map((f) => ({
      type: f.type,
      freq: Math.floor(f.freq - (f.freq % freq_unit(f.freq))),
      q: clamp(Math.floor(f.q * 10) / 10, minQ, maxQ),
      gain: clamp(Math.floor(f.gain * 10) / 10, minGain, maxGain),
    }));
  }

  /**
   * Iteratively optimize filter parameters.
   * @param {Array<[number, number]>} fr - Measured curve.
   * @param {Array<[number, number]>} frTarget - Target curve.
   * @param {Array<object>} filters - Filters to optimize.
   * @param {number} iteration - Index into OptimizeDeltas.
   * @param {number} [dir] - Direction (0: forward, 1: reverse).
   * @returns {Array<object>} Optimized filters.
   */
  function optimize(fr, frTarget, filters, iteration, dir) {
    filters = strip(filters);
    const [minFreq, maxFreq] = config.AutoEQRange;
    const [minQ, maxQ] = config.OptimizeQRange;
    const [minGain, maxGain] = config.OptimizeGainRange;
    const [maxDF, maxDQ, maxDG, stepDF, stepDQ, stepDG] =
      config.OptimizeDeltas[iteration];
    const [begin, end, step] = dir
      ? [filters.length - 1, -1, -1]
      : [0, filters.length, 1];

    // Optimize freq, q, gain
    for (let i = begin; i !== end; i += step) {
      const f = filters[i];
      const fr1 = apply(
        fr,
        filters.filter((_, fi) => fi !== i),
      );
      const fr2 = apply(fr1, [f]);
      let bestFilter = f;
      let bestDistance = calc_distance(fr2, frTarget);

      const testNewFilter = (df, dq, dg) => {
        const freq = f.freq + df * freq_unit(f.freq) * stepDF;
        const q = f.q + dq * stepDQ;
        const gain = f.gain + dg * stepDG;
        if (
          freq < minFreq ||
          freq > maxFreq ||
          q < minQ ||
          q > maxQ ||
          gain < minGain ||
          gain > maxGain
        ) {
          return false;
        }
        const newFilter = { type: f.type, freq, q, gain };
        const newFR = apply(fr1, [newFilter]);
        const newDistance = calc_distance(newFR, frTarget);
        if (newDistance < bestDistance) {
          bestFilter = newFilter;
          bestDistance = newDistance;
          return true;
        }
        return false;
      };

      for (let df = -maxDF; df < maxDF; ++df) {
        // Use smaller Q as possible
        for (let dq = maxDQ - 1; dq >= -maxDQ; --dq) {
          for (let dg = 1; dg < maxDG; ++dg) {
            if (!testNewFilter(df, dq, dg)) {
              break;
            }
          }
          for (let dg = -1; dg >= -maxDG; --dg) {
            if (!testNewFilter(df, dq, dg)) {
              break;
            }
          }
        }
      }
      filters[i] = bestFilter;
    }

    if (!dir) {
      return optimize(fr, frTarget, filters, iteration, 1);
    }

    filters.sort((a, b) => a.freq - b.freq);

    // Merge close filters
    for (let i = 0; i < filters.length - 1; ) {
      const f1 = filters[i];
      const f2 = filters[i + 1];
      if (
        Math.abs(f1.freq - f2.freq) <= freq_unit(f1.freq) &&
        Math.abs(f1.q - f2.q) <= 0.1
      ) {
        f1.gain += f2.gain;
        filters.splice(i + 1, 1);
      } else {
        ++i;
      }
    }

    // Remove unnecessary filters
    let bestDistance = calc_distance(apply(fr, filters), frTarget);
    for (let i = 0; i < filters.length; ) {
      if (Math.abs(filters[i].gain) <= 0.1) {
        filters.splice(i, 1);
        continue;
      }
      const newDistance = calc_distance(
        apply(
          fr,
          filters.filter((_, fi) => fi !== i),
        ),
        frTarget,
      );
      if (newDistance < bestDistance) {
        filters.splice(i, 1);
        bestDistance = newDistance;
      } else {
        ++i;
      }
    }
    return filters;
  }

  /**
   * Automatic parametric EQ matching algorithm.
   * @param {Array<[number, number]>} fr - Measured frequency response curve.
   * @param {Array<[number, number]>} frTarget - Target curve.
   * @param {number} maxFilters - Maximum number of filter bands.
   * @returns {Array<object>} Optimized filters.
   */
  function autoeq(fr, frTarget, maxFilters) {
    // 2-step manual optimized algorithm: fr and frTarget should have same resolution and normalization
    const firstBatchSize = Math.max(Math.floor(maxFilters / 2) - 1, 1);
    const firstCandidates = search_candidates(fr, frTarget, 1);
    let firstFilters = firstCandidates
      // Don't adjust treble in the first batch
      .filter((c) => c.freq <= config.TrebleStartFrom)
      // Wider bandwidth (smaller Q) comes first
      .sort((a, b) => a.q - b.q)
      .slice(0, firstBatchSize)
      .sort((a, b) => a.freq - b.freq);

    for (let i = 0; i < config.OptimizeDeltas.length; ++i) {
      firstFilters = optimize(fr, frTarget, firstFilters, i);
    }

    const secondFR = apply(fr, firstFilters);
    const secondBatchSize = maxFilters - firstFilters.length;
    const secondCandidates = search_candidates(secondFR, frTarget, 0.5);
    let secondFilters = secondCandidates
      .sort((a, b) => a.q - b.q)
      .slice(0, secondBatchSize)
      .sort((a, b) => a.freq - b.freq);

    for (let i = 0; i < config.OptimizeDeltas.length; ++i) {
      secondFilters = optimize(secondFR, frTarget, secondFilters, i);
    }

    let allFilters = [...firstFilters, ...secondFilters];
    for (let i = 0; i < config.OptimizeDeltas.length; ++i) {
      allFilters = optimize(fr, frTarget, allFilters, i);
    }
    return strip(allFilters);
  }

  return {
    config,
    interp,
    lowshelf,
    highshelf,
    peaking,
    calc_gains,
    calc_preamp,
    apply,
    as_graphic_eq,
    autoeq,
  };
})();

if (typeof window !== "undefined") {
  window.Equalizer = Equalizer;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = Equalizer;
}
