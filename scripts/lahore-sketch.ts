// Draws the faint Badshahi Masjid sketch (domes, minarets, cusped arches, cloisters, courtyard, plus a karahi,
// a biryani platter and doodh patti chai) behind every customer page. Run once after changing it:
//   node scripts/lahore-sketch.ts > src/assets/lahore-sketch.svg
// The site uses the file as a CSS mask, so only the lines' shape matters; colour and opacity live in SkylineBackdrop.

type Pt = [number, number]
type Curve = [Pt, Pt, Pt, Pt]

function buildLahoreSketch(): string {
  let seed = 20261018
  const rnd = () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const out: string[] = []
  const f = (n: number) => Math.round(n * 10) / 10
  const pt = (p: Pt) => `${f(p[0])} ${f(p[1])}`
  const FINE = ' stroke-width="0.7"'
  const HAIR = ' stroke-width="0.45" opacity="0.7"'
  const path = (d: string, a = '') => out.push(`<path d="${d}"${a}/>`)
  const line = (x1: number, y1: number, x2: number, y2: number, a = '') => path(`M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}`, a)
  const rect = (x: number, y: number, w: number, h: number, a = '') => path(`M${f(x)} ${f(y)}h${f(w)}v${f(h)}h${f(-w)}Z`, a)
  const poly = (pts: Pt[], close = false, a = '') => path('M' + pts.map(pt).join('L') + (close ? 'Z' : ''), a)
  const ell = (cx: number, cy: number, rx: number, ry: number, a = '') => out.push(`<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}"${a}/>`)
  const circ = (cx: number, cy: number, r: number, a = '') => out.push(`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}"${a}/>`)
  let clipId = 0
  const clipped = (d: string, draw: () => void) => {
    const id = `lhs${clipId++}`
    out.push(`<clipPath id="${id}"><path d="${d}"/></clipPath><g clip-path="url(#${id})">`)
    draw()
    out.push('</g>')
  }
  const hatch = (x0: number, y0: number, x1: number, y1: number, step: number, slant = 0.35, a = HAIR) => {
    for (let x = x0 - (y1 - y0) * slant; x < x1; x += step) line(x, y1, x + (y1 - y0) * slant, y0, a)
  }
  const bez = ([p0, p1, p2, p3]: Curve, t: number): Pt => {
    const u = 1 - t
    const w0 = u * u * u, w1 = 3 * u * u * t, w2 = 3 * u * t * t, w3 = t * t * t
    return [w0 * p0[0] + w1 * p1[0] + w2 * p2[0] + w3 * p3[0], w0 * p0[1] + w1 * p1[1] + w2 * p2[1] + w3 * p3[1]]
  }

  // ---------- Mughal arch helpers ----------
  const archCurves = (x0: number, x1: number, spring: number, apex: number): [Curve, Curve] => {
    const xm = (x0 + x1) / 2, w = x1 - x0, h = spring - apex
    return [
      [[x0, spring], [x0, spring - h * 0.55], [xm - w * 0.13, apex + h * 0.14], [xm, apex]],
      [[xm, apex], [xm + w * 0.13, apex + h * 0.14], [x1, spring - h * 0.55], [x1, spring]],
    ]
  }
  const archD = (x0: number, x1: number, spring: number, apex: number, base: number) => {
    const [A, B] = archCurves(x0, x1, spring, apex)
    return `M${pt([x0, base])}V${f(spring)}C${pt(A[1])} ${pt(A[2])} ${pt(A[3])}C${pt(B[1])} ${pt(B[2])} ${pt(B[3])}V${f(base)}`
  }
  // Multifoil (cusped) arch: lobes bulge outward, cusps point in
  const cuspedD = (x0: number, x1: number, spring: number, apex: number, base: number, lobes = 4) => {
    const [A, B] = archCurves(x0, x1, spring, apex)
    const pts: Pt[] = []
    for (let i = 1; i <= lobes; i++) pts.push(bez(A, i / lobes))
    for (let i = 1; i <= lobes; i++) pts.push(bez(B, i / lobes))
    const c: Pt = [(x0 + x1) / 2, spring]
    const k = 0.16
    let d = `M${pt([x0, base])}V${f(spring)}`
    let prev: Pt = [x0, spring]
    for (const p of pts) {
      const m: Pt = [(prev[0] + p[0]) / 2, (prev[1] + p[1]) / 2]
      d += `Q${pt([m[0] + (m[0] - c[0]) * k, m[1] + (m[1] - c[1]) * k])} ${pt(p)}`
      prev = p
    }
    return d + `V${f(base)}`
  }

  // ---------- Onion dome ----------
  const dome = (cx: number, baseY: number, baseR: number, maxR: number, maxY: number, apexY: number, detail = 1) => {
    const r = (y: number) =>
      y >= maxY
        ? baseR + (maxR - baseR) * Math.sin(((baseY - y) / (baseY - maxY)) * (Math.PI / 2))
        : maxR * Math.pow(Math.max(0, Math.cos(((maxY - y) / (maxY - apexY)) * (Math.PI / 2))), 1.3)
    const N = 60
    const ys = Array.from({ length: N + 1 }, (_, i) => baseY - ((baseY - apexY) * i) / N)
    const outline: Pt[] = [...ys.map((y): Pt => [cx - r(y), y]), ...ys.slice().reverse().map((y): Pt => [cx + r(y), y])]
    const outlineD = 'M' + outline.map(pt).join('L') + 'Z'
    path(outlineD)
    // ribs
    const step = detail > 0.6 ? 12 : 22
    for (let th = -84; th <= 84; th += step) {
      const s = Math.sin((th * Math.PI) / 180)
      poly(ys.map((y): Pt => [cx + r(y) * s, y]), false, FINE)
    }
    // base band + inverted lotus petals
    path(`M${pt([cx - baseR, baseY - 5])}Q${pt([cx, baseY - 5 + baseR * 0.14])} ${pt([cx + baseR, baseY - 5])}`, FINE)
    for (let th = -78; th <= 78; th += 13) {
      const a = Math.sin(((th - 6) * Math.PI) / 180), b = Math.sin(((th + 6) * Math.PI) / 180)
      const h = baseR * 0.2 * Math.cos((th * Math.PI) / 180)
      const yb = baseY - 5 + baseR * 0.14 * (1 - Math.pow(Math.sin((th * Math.PI) / 180), 2))
      path(`M${pt([cx + baseR * a, yb])}Q${pt([cx + baseR * ((a + b) / 2), yb - h * 2])} ${pt([cx + baseR * b, yb])}`, FINE)
    }
    // crown petals around the finial
    const yc = apexY + (maxY - apexY) * 0.16, rc = r(yc)
    for (let th = -70; th <= 70; th += 20) {
      const a = Math.sin(((th - 9) * Math.PI) / 180), b = Math.sin(((th + 9) * Math.PI) / 180)
      path(`M${pt([cx + rc * a, yc])}Q${pt([cx + rc * ((a + b) / 2), yc + rc * 0.9])} ${pt([cx + rc * b, yc])}`, FINE)
    }
    // shading on the right
    clipped(outlineD, () => {
      for (let x = cx + maxR * 0.1; x < cx + maxR * 1.1;) {
        line(x, baseY + 4, x + (baseY - apexY) * 0.12, apexY - 4, HAIR)
        x += 7 - 4.5 * ((x - cx) / maxR)
      }
    })
    // finial (kalash)
    const s = maxR / 100
    line(cx, apexY, cx, apexY - 10 * s)
    circ(cx, apexY - 16 * s, 7 * s)
    ell(cx, apexY - 27 * s, 9 * s, 4 * s, FINE)
    circ(cx, apexY - 36 * s, 5.5 * s)
    path(`M${pt([cx - 7 * s, apexY - 44 * s])}Q${pt([cx, apexY - 54 * s])} ${pt([cx + 7 * s, apexY - 44 * s])}Z`, FINE)
    line(cx, apexY - 44 * s, cx, apexY - 72 * s)
    path(`M${pt([cx - 4 * s, apexY - 66 * s])}Q${pt([cx, apexY - 82 * s])} ${pt([cx + 4 * s, apexY - 66 * s])}`, FINE)
  }

  const drum = (cx: number, top: number, bottom: number, r: number) => {
    rect(cx - r, top, 2 * r, bottom - top)
    line(cx - r, top + 4, cx + r, top + 4, FINE)
    line(cx - r, bottom - 3, cx + r, bottom - 3, FINE)
    for (let th = -66; th <= 66; th += 16.5) {
      const x = cx + r * Math.sin((th * Math.PI) / 180), w = 15 * Math.cos((th * Math.PI) / 180) * (r / 90)
      path(cuspedD(x - w / 2, x + w / 2, bottom - 8, top + 10, bottom - 4, 3), FINE)
    }
    clipped(`M${cx + r * 0.45} ${top}H${cx + r}V${bottom}H${cx + r * 0.45}Z`, () => hatch(cx + r * 0.45, top, cx + r, bottom, 3.2))
  }

  const merlons = (x0: number, x1: number, y: number, w = 13, h = 10) => {
    for (let x = x0; x + w * 0.7 <= x1 + 0.1; x += w) {
      const a = x, b = x + w * 0.7, m = (a + b) / 2
      path(`M${pt([a, y])}V${f(y - h * 0.5)}Q${pt([a, y - h])} ${pt([m, y - h * 1.15])}Q${pt([b, y - h])} ${pt([b, y - h * 0.5])}V${f(y)}`, FINE)
    }
  }

  const chhatri = (cx: number, baseY: number, w: number) => {
    rect(cx - w / 2 - 3, baseY - 5, w + 6, 5, FINE)
    const ph = w * 0.85, top = baseY - 5 - ph
    for (let i = 0; i < 4; i++) {
      const x = cx - w / 2 + (i * w) / 3
      line(x, baseY - 5, x, top, FINE)
      if (i < 3) path(cuspedD(x + 1.5, x + w / 3 - 1.5, top + ph * 0.4, top + 3, top + ph * 0.4, 3), FINE)
    }
    path(`M${pt([cx - w / 2 - 9, top + 4])}L${pt([cx - w / 2 - 1, top - 3])}H${f(cx + w / 2 + 1)}L${pt([cx + w / 2 + 9, top + 4])}Z`, FINE)
    dome(cx, top - 3, w * 0.4, w * 0.55, top - 3 - w * 0.28, top - 3 - w * 0.95, 0.4)
  }

  const turret = (cx: number, baseY: number, topY: number, w: number) => {
    rect(cx - w / 2, topY, w, baseY - topY)
    line(cx - w * 0.22, topY, cx - w * 0.22, baseY, FINE)
    line(cx + w * 0.22, topY, cx + w * 0.22, baseY, FINE)
    for (let y = topY + 30; y < baseY - 10; y += 46) {
      line(cx - w / 2, y, cx + w / 2, y, FINE)
      line(cx - w / 2, y + 3, cx + w / 2, y + 3, FINE)
    }
    clipped(`M${cx + w * 0.22} ${topY}H${cx + w / 2}V${baseY}H${cx + w * 0.22}Z`, () => hatch(cx + w * 0.22, topY, cx + w / 2, baseY, 3))
    rect(cx - w / 2 - 5, topY - 4, w + 10, 4, FINE)
    chhatri(cx, topY - 4, w * 1.15)
  }

  const minaret = (cx: number) => {
    // plinth
    rect(cx - 52, 836, 104, 64)
    rect(cx - 46, 842, 92, 52, FINE)
    path(cuspedD(cx - 18, cx + 18, 870, 848, 894, 3), FINE)
    let yb = 836, wb = 74
    const stages: Pt[] = [[160, 66], [150, 58], [130, 50]]
    stages.forEach(([h, wt], si) => {
      const yt = yb - h
      poly([[cx - wb / 2, yb], [cx - wt / 2, yt], [cx + wt / 2, yt], [cx + wb / 2, yb]], true)
      line(cx - wb * 0.22, yb, cx - wt * 0.22, yt, FINE)
      line(cx + wb * 0.22, yb, cx + wt * 0.22, yt, FINE)
      for (let y = yb - 11; y > yt + 4; y -= 11) {
        const t = (yb - y) / h, w = wb + (wt - wb) * t
        line(cx - w / 2, y, cx + w / 2, y, HAIR)
      }
      // marble band with zigzag inlay
      const ym = yb - h * 0.5, wm = wb + (wt - wb) * 0.5
      line(cx - wm / 2, ym - 4, cx + wm / 2, ym - 4, FINE)
      line(cx - wm / 2, ym + 4, cx + wm / 2, ym + 4, FINE)
      const zz: Pt[] = []
      for (let x = -wm / 2, i = 0; x <= wm / 2; x += 4, i++) zz.push([cx + x, ym + (i % 2 ? -3 : 3)])
      poly(zz, false, HAIR)
      const rightFace: Pt[] = [[cx + wb * 0.22, yb], [cx + wt * 0.22, yt], [cx + wt / 2, yt], [cx + wb / 2, yb]]
      clipped(
        'M' + rightFace.map(pt).join('L') + 'Z',
        () => hatch(cx + wt * 0.2, yt, cx + wb / 2, yb, 2.8),
      )
      // balcony: brackets, slab, railing
      for (let x = cx - wt / 2 - 12; x <= cx + wt / 2 + 8; x += 8) path(`M${pt([x, yt])}q0 8 4 11`, FINE)
      rect(cx - wt / 2 - 16, yt - 6, wt + 32, 6, FINE)
      rect(cx - wt / 2 - 14, yt - 20, wt + 28, 14, FINE)
      for (let x = cx - wt / 2 - 10; x < cx + wt / 2 + 14; x += 5) line(x, yt - 20, x, yt - 6, HAIR)
      yb = yt - 20
      wb = wt - (si === 2 ? 0 : 2)
    })
    chhatri(cx, yb, 50)
  }

  // ================= Badshahi Masjid =================
  out.push('<g transform="translate(40 65) scale(0.95)">')

  // central and side domes, sitting behind the facade
  drum(800, 488, 540, 94)
  dome(800, 488, 92, 124, 425, 300)
  drum(560, 598, 628, 60)
  dome(560, 598, 58, 80, 556, 478)
  drum(1040, 598, 628, 60)
  dome(1040, 598, 58, 80, 556, 478)

  // prayer hall wall
  rect(380, 640, 840, 240)
  line(380, 628, 1220, 628)
  line(380, 640, 1220, 640, FINE)
  merlons(384, 1216, 628)
  line(380, 666, 720, 666, FINE)
  line(880, 666, 1220, 666, FINE)

  // five bays each side
  const bay = (bx: number) => {
    rect(bx + 4, 670, 52, 210, FINE)
    path(archD(bx + 10, bx + 50, 742, 688, 880))
    path(cuspedD(bx + 15, bx + 45, 748, 700, 880, 4), FINE)
    rect(bx + 22, 800, 16, 80, FINE)
    path(archD(bx + 22, bx + 38, 806, 792, 806), FINE)
    circ(bx + 12, 680, 3, FINE)
    circ(bx + 48, 680, 3, FINE)
    rect(bx + 12, 646, 36, 14, HAIR)
    clipped(cuspedD(bx + 15, bx + 45, 748, 700, 880, 4) + 'Z', () => hatch(bx + 10, 690, bx + 50, 880, 3.5, 0.2))
  }
  for (let i = 0; i < 5; i++) bay(400 + i * 60)
  for (let i = 0; i < 5; i++) bay(900 + i * 60)

  // central pishtaq (great gateway)
  rect(720, 540, 160, 340)
  rect(728, 548, 144, 332, FINE)
  path('M736 880V556H864V880', ' stroke-width="0.6" stroke-dasharray="2 3"')
  merlons(722, 878, 540, 12, 9)
  path(archD(748, 852, 700, 588, 880))
  path(cuspedD(756, 844, 706, 600, 880, 6), FINE)
  path(archD(776, 824, 770, 708, 880), FINE)
  rect(786, 800, 28, 80, FINE)
  // half-dome recess (muqarnas suggestion)
  {
    const [oA, oB] = archCurves(756, 844, 706, 600)
    const [iA, iB] = archCurves(776, 824, 770, 708)
    for (let i = 1; i < 8; i++) {
      const t = i / 8
      const o1 = bez(oA, t), i1 = bez(iA, t), o2 = bez(oB, t), i2 = bez(iB, t)
      line(o1[0], o1[1], i1[0], i1[1], FINE)
      line(o2[0], o2[1], i2[0], i2[1], FINE)
    }
    clipped(archD(756, 844, 706, 600, 880) + 'Z', () => hatch(756, 600, 844, 880, 3, 0.15))
  }
  circ(738, 566, 6, FINE)
  circ(862, 566, 6, FINE)
  turret(720, 880, 520, 22)
  turret(880, 880, 520, 22)
  turret(380, 880, 580, 26)
  turret(1220, 880, 580, 26)

  // plinth and steps
  rect(366, 880, 868, 20)
  line(356, 890, 1244, 890, FINE)

  // side cloisters
  const cloister = (x0: number, x1: number) => {
    rect(x0, 800, x1 - x0, 100)
    line(x0, 790, x1, 790)
    merlons(x0 + 2, x1 - 2, 790, 12, 9)
    for (let x = x0 + 4; x + 34 <= x1; x += 38) {
      path(archD(x + 3, x + 33, 846, 816, 900), FINE)
      path(cuspedD(x + 7, x + 29, 850, 826, 900, 3), HAIR)
      clipped(archD(x + 7, x + 29, 850, 826, 900) + 'Z', () => hatch(x + 7, 826, x + 29, 900, 3, 0.1))
    }
  }
  cloister(202, 366)
  cloister(1234, 1398)
  minaret(150)
  minaret(1450)

  // courtyard paving and ablution tank
  line(-40, 900, 1640, 900)
  for (let xb = -800; xb <= 2400; xb += 110) {
    const t = (900 - 870) / (1040 - 870)
    line(800 + (xb - 800) * t, 900, xb, 1040, HAIR)
  }
  for (const y of [918, 942, 974]) line(-40, y, 1640, y, HAIR)
  ell(800, 962, 140, 20)
  ell(800, 962, 126, 16, FINE)
  ell(800, 960, 22, 4, FINE)
  line(800, 960, 800, 944, FINE)
  out.push('</g>')

  // birds
  const birds: [number, number, number][] = [[640, 300, 1], [672, 284, 0.8], [700, 310, 0.7], [960, 330, 0.9], [990, 318, 0.6]]
  for (const [x, y, s] of birds)
    path(`M${pt([x, y])}q${f(6 * s)} ${f(-6 * s)} ${f(12 * s)} 0q${f(6 * s)} ${f(-6 * s)} ${f(12 * s)} 0`, FINE)

  // ================= Dishes =================
  const steam = (x: number, y: number, h: number) => path(`M${pt([x, y])}c-9 ${f(-h / 6)} 9 ${f(-h / 3)} 0 ${f(-h / 2)}c-9 ${f(-h / 6)} 9 ${f(-h / 3)} 0 ${f(-h / 2)}`, FINE)
  const blob = (x: number, y: number, r: number, n = 9) => {
    const pts = Array.from({ length: n }, (_, i): Pt => {
      const a = (i / n) * Math.PI * 2, rr = r * (0.78 + rnd() * 0.4)
      return [x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.7]
    })
    // each point paired with the next one around the loop, and the midpoint between them
    const mids = pts.map((p, i): Pt => {
      const q = pts[(i + 1) % n] ?? p
      return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]
    })
    let d = `M${pt(mids[n - 1] ?? [x, y])}`
    pts.forEach((p, i) => {
      d += `Q${pt(p)} ${pt(mids[i] ?? p)}`
    })
    return d + 'Z'
  }
  const leaf = (x: number, y: number, len: number, ang: number) => {
    const c = Math.cos(ang), s = Math.sin(ang)
    const tip: Pt = [x + c * len, y + s * len]
    const n: Pt = [-s * len * 0.35, c * len * 0.35]
    const m: Pt = [x + c * len * 0.5, y + s * len * 0.5]
    path(`M${pt([x, y])}Q${pt([m[0] + n[0], m[1] + n[1]])} ${pt(tip)}Q${pt([m[0] - n[0], m[1] - n[1]])} ${pt([x, y])}Z`, FINE)
    line(x, y, tip[0], tip[1], HAIR)
  }

  // --- Chicken karahi (top left) ---
  {
    const cx = 210, cy = 138
    out.push(`<g transform="translate(${cx} ${cy}) scale(1.18) translate(${-cx} ${-cy})">`)
    const bodyD = `M${cx - 136} ${cy}C${cx - 130} ${cy + 72} ${cx - 62} ${cy + 110} ${cx} ${cy + 112}C${cx + 62} ${cy + 110} ${cx + 130} ${cy + 72} ${cx + 136} ${cy}`
    path(bodyD)
    ell(cx, cy, 136, 30)
    ell(cx, cy, 127, 26, FINE)
    for (const side of [-1, 1]) {
      const x = cx + side * 128
      path(`M${x} ${cy + 6}C${x + side * 34} ${cy - 6} ${x + side * 38} ${cy + 32} ${x} ${cy + 26}`)
      path(`M${x} ${cy + 10}C${x + side * 24} ${cy + 2} ${x + side * 27} ${cy + 26} ${x} ${cy + 21}`, FINE)
      circ(x - side * 4, cy + 10, 2, FINE)
      circ(x - side * 4, cy + 21, 2, FINE)
    }
    // hammered dimples
    for (let row = 1; row <= 5; row++) {
      const v = row / 6, y = cy + 14 + v * 86, hw = 128 * (1 - Math.pow(v, 2.2))
      for (let x = -hw + 8; x < hw - 6; x += 15 + rnd() * 6) path(`M${pt([cx + x, y + rnd() * 3])}q3 -3 6 0`, HAIR)
    }
    clipped(bodyD + `C${cx + 60} ${cy + 30} ${cx - 60} ${cy + 30} ${cx - 136} ${cy}Z`, () => hatch(cx + 10, cy, cx + 140, cy + 115, 3.2, 0.3))
    // food: chicken pieces
    for (let i = 0; i < 9; i++) {
      let x: number, y: number
      do { x = cx + (rnd() * 2 - 1) * 100; y = cy + (rnd() * 2 - 1) * 16 } while (((x - cx) / 104) ** 2 + ((y - cy) / 20) ** 2 > 1)
      const r = 18 + rnd() * 9
      path(blob(x, y - 6, r))
      path(`M${pt([x - r * 0.4, y - 8])}q${f(r * 0.3)} -4 ${f(r * 0.7)} 0`, HAIR)
      path(`M${pt([x - r * 0.2, y - 2])}q${f(r * 0.3)} -3 ${f(r * 0.5)} 1`, HAIR)
    }
    // tomato slices
    {
      const x = cx + 52, y = cy - 4
      circ(x, y, 10, FINE)
      circ(x, y, 7, HAIR)
      for (let a = 0; a < 6; a++) line(x, y, x + Math.cos((a * Math.PI) / 3) * 7.5, y + Math.sin((a * Math.PI) / 3) * 7.5, HAIR)
    }
    // green chillies
    const chillies: [number, number, number][] = [[cx - 20, cy - 16, 1], [cx + 70, cy - 18, -1], [cx - 95, cy - 4, 1]]
    for (const [x, y, d] of chillies) {
      path(`M${x} ${y}q${d * 22} -12 ${d * 46} -3q${d * -22} 4 ${d * -46} 9Z`, FINE)
      path(`M${x} ${y + 3}q${d * -6} -2 ${d * -9} -8`, FINE)
    }
    // ginger julienne and coriander
    for (let i = 0; i < 26; i++) {
      const x = cx + (rnd() * 2 - 1) * 95, y = cy - 18 + rnd() * 22, a = rnd() * Math.PI
      line(x, y, x + Math.cos(a) * 8, y + Math.sin(a) * 3, HAIR)
    }
    for (let i = 0; i < 7; i++) {
      const x = cx + (rnd() * 2 - 1) * 90, y = cy - 20 + rnd() * 20
      for (let k = 0; k < 3; k++) leaf(x, y, 6, -Math.PI / 2 + (k - 1) * 0.9)
    }
    steam(cx - 40, cy - 34, 60)
    steam(cx, cy - 40, 74)
    steam(cx + 40, cy - 34, 56)
    ell(cx, cy + 116, 110, 8, HAIR)
    out.push('</g>')
  }

  // --- Biryani platter (top right) ---
  {
    const cx = 1395, cy = 135
    out.push(`<g transform="translate(${cx} ${cy}) scale(1.15) translate(${-cx} ${-cy})">`)
    ell(cx, cy + 36, 158, 36)
    path(`M${cx - 158} ${cy + 36}Q${cx} ${cy + 92} ${cx + 158} ${cy + 36}`, FINE)
    ell(cx, cy + 36, 145, 31, FINE)
    for (let a = 0; a < 360; a += 9) {
      const r = (a * Math.PI) / 180
      circ(cx + Math.cos(r) * 151, cy + 36 + Math.sin(r) * 33.5, 1.2, HAIR)
    }
    const moundD = `M${cx - 118} ${cy + 38}C${cx - 105} ${cy - 44} ${cx + 105} ${cy - 44} ${cx + 118} ${cy + 38}Q${cx} ${cy + 58} ${cx - 118} ${cy + 38}Z`
    path(moundD)
    clipped(moundD, () => {
      for (let i = 0; i < 520; i++) {
        const x = cx - 118 + rnd() * 236, y = cy - 30 + rnd() * 80, a = rnd() * Math.PI
        const tone = rnd() < 0.3 ? ' stroke-width="0.8"' : HAIR
        path(`M${pt([x, y])}q${f(Math.cos(a) * 3)} ${f(Math.sin(a) * 3 - 1)} ${f(Math.cos(a) * 7)} ${f(Math.sin(a) * 7)}`, tone)
      }
      hatch(cx + 30, cy - 40, cx + 125, cy + 60, 3.5, 0.3)
    })
    // boiled egg halves
    const eggs: Pt[] = [[cx - 45, cy + 4], [cx + 38, cy + 10]]
    for (const [x, y] of eggs) {
      ell(x, y, 17, 11)
      circ(x + 2, y, 6.5, FINE)
      circ(x + 2, y, 3.5, HAIR)
    }
    // chicken leg piece
    path(`M${cx - 6} ${cy - 18}C${cx - 30} ${cy - 30} ${cx - 34} ${cy - 2} ${cx - 10} ${cy - 2}C${cx + 6} ${cy - 2} ${cx + 14} ${cy - 8} ${cx + 28} ${cy - 18}`)
    path(`M${cx + 28} ${cy - 18}l14 -10m-14 10l6 -2m8 -8q5 -6 8 -1q5 4 -1 7`, FINE)
    path(`M${cx - 22} ${cy - 16}q8 -4 18 0M${cx - 18} ${cy - 9}q8 -3 16 0`, HAIR)
    // fried onions, mint, lemon wedge
    for (let i = 0; i < 12; i++) {
      const x = cx - 85 + rnd() * 170, y = cy - 18 + rnd() * 40
      path(`M${pt([x, y])}q4 -5 8 0q4 5 8 0`, FINE)
    }
    const mint: [number, number, number][] = [[cx - 70, cy - 2, -2.4], [cx + 70, cy + 2, -0.6], [cx - 10, cy + 22, -1.8], [cx + 15, cy - 26, -1.2]]
    for (const [x, y, a] of mint) leaf(x, y, 16, a)
    path(`M${cx + 120} ${cy + 42}a24 24 0 0 1 48 0Z`)
    for (let a = 1; a < 5; a++) {
      const r = (Math.PI * a) / 5
      line(cx + 144, cy + 42, cx + 144 - Math.cos(r) * 20, cy + 42 - Math.sin(r) * 20, HAIR)
    }
    steam(cx - 30, cy - 40, 60)
    steam(cx + 20, cy - 46, 70)
    ell(cx, cy + 82, 120, 7, HAIR)
    out.push('</g>')
  }

  // --- Doodh patti chai (beside the biryani) ---
  {
    const cx = 1170, cy = 120
    ell(cx, cy + 44, 58, 12)
    ell(cx, cy + 44, 42, 8, FINE)
    const cupD = `M${cx - 34} ${cy}L${cx - 25} ${cy + 38}Q${cx} ${cy + 46} ${cx + 25} ${cy + 38}L${cx + 34} ${cy}Z`
    path(cupD)
    ell(cx, cy, 34, 7)
    ell(cx, cy + 2, 30, 5, FINE)
    path(`M${cx + 31} ${cy + 8}C${cx + 54} ${cy + 6} ${cx + 52} ${cy + 32} ${cx + 28} ${cy + 29}`)
    path(`M${cx + 31} ${cy + 13}C${cx + 45} ${cy + 12} ${cx + 44} ${cy + 27} ${cx + 29} ${cy + 24}`, FINE)
    path(`M${cx - 30} ${cy + 16}Q${cx} ${cy + 22} ${cx + 30} ${cy + 16}`, HAIR)
    clipped(cupD, () => hatch(cx + 6, cy, cx + 36, cy + 46, 2.6, 0.2))
    steam(cx - 10, cy - 10, 48)
    steam(cx + 12, cy - 12, 40)
  }

  return out.join('')
}

console.log(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" fill="none" stroke="#000" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round">${buildLahoreSketch()}</svg>`,
)
