import { readSceneParticlePalette } from "../../design-system/sceneParticlePalette";
import { SCENE_RIPPLE_IGNORED_TARGETS } from "./sceneRipple";

export type OceanLayout = "home" | "swarm";

export type OceanCreature = Readonly<{
  id: string;
  color: string | null;
  activity: number;
  speaking?: number;
}>;

export type OceanFocus = Readonly<{ x: number; y: number; radius: number }>;

export type OceanFrame = Readonly<{
  creatures: readonly OceanCreature[];
  focus?: OceanFocus | null;
  calling?: boolean;
}>;

export type PhobosOcean = {
  set(frame: OceanFrame): void;
  destroy(): void;
};

type Rgb = readonly [number, number, number];

type Arm = { x: Float32Array; y: Float32Array; px: Float32Array; py: Float32Array };

type Obstacle = { left: number; top: number; right: number; bottom: number };

type Phobos = {
  id: string;
  slot: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  heading: number;
  radius: number;
  scale: number;
  alpha: number;
  fade: number;
  boost: number;
  hidden: boolean;
  leaving: number;
  emerge: number;
  phase: number;
  stroke: number;
  open: number;
  seed: number;
  arms: Arm[];
  targetX: number;
  targetY: number;
  leg: number;
  activity: number;
  speaking: number;
  color: Rgb | null;
  colorSource: string | null;
  wanted: OceanCreature;
};

type Ripple = { x: number; y: number; born: number };

type Atlas = { canvas: HTMLCanvasElement; size: number };

type Glyph = { index: number; x: number; y: number; level: number; tile: number; alpha: number; digit: boolean; knockout: boolean };

const FRAME_MS = 1000 / 30;
const STEP_SECONDS = 1 / 30;
const ARMS = 8;
const ARM_NODES = 18;
const ARM_LENGTH = 3.4;
const ARM_BEND = 13 / (ARM_NODES - 1);
const STROKE_END = 0.2;
const WEB_DEPTH = 0.3;
const ALPHA_LEVELS = 12;
const RIPPLE_LIMIT = 6;
const RIPPLE_SECONDS = 1.15;
const RIPPLE_REACH = 0.42;
const OBSTACLE_REFRESH_SECONDS = 0.5;
const LEG_SECONDS = 30;
const LIGHT_INK_DEPTH = 0.62;
const EXIT_FADE = [0.6, 1.5] as const;
const RETURN_DELAY = 0.7;
const RETURN_STAGGER = 0.35;
const ENTER_SPEED = 7;
const HOME_DEPTHS = [
  { scale: 1, alpha: 0.95 },
  { scale: 0.72, alpha: 0.55 },
  { scale: 0.52, alpha: 0.35 },
];
const LIGHT = { x: -0.42, y: -0.58, z: 0.7 };
const GLYPHS = [".", ":", "+t", "xsS", "%X&", "8@#"];
const DIGITS = "0123456789";
const ATLAS_CHARS = `${GLYPHS.join("")}${DIGITS}`;
const TILE_FROM = 2;
const KNOCKOUT_FROM = 4;

export function createPhobosOcean(
  canvas: HTMLCanvasElement,
  layout: OceanLayout,
  reduceMotion: boolean,
  rippleSurface: HTMLElement | null = null,
): PhobosOcean {
  const context = canvas.getContext("2d");
  const frameElement = canvas.parentElement;
  if (!context || !frameElement) throw new Error("The phobos scene needs a 2D canvas inside a sized frame.");
  const surface = rippleSurface ?? frameElement.parentElement;
  const phoboses = new Map<string, Phobos>();
  const probe = document.createElement("span");
  probe.style.display = "none";
  const tiles = createTileBatch();
  const atlases = new Map<string, Atlas>();
  const cell = layout === "home" ? 7 : 6;
  const gap = Math.max(1, cell * 0.16);
  let frame: OceanFrame = { creatures: [] };
  let calling = false;
  let primed = false;
  let order: Phobos[] = [];
  let ripples: Ripple[] = [];
  let obstacles: Obstacle[] = [];
  let obstaclesReadAt = -Infinity;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let cols = 0;
  let rows = 0;
  let shade = new Float32Array(0);
  let owner = new Int16Array(0);
  let touched = new Int32Array(0);
  let touchedCount = 0;
  let theme = "";
  let time = 0;
  let raf = 0;
  let lastFrame = 0;
  let accumulator = 0;
  let visible = true;
  let stopped = false;

  const shortest = () => Math.min(width, height);

  const baseRadius = () => layout === "home"
    ? Math.max(18, Math.min(34, shortest() * 0.036))
    : Math.max(13, Math.min(22, shortest() * 0.028));

  const readObstacles = () => {
    obstaclesReadAt = time;
    if (!surface) return;
    const base = canvas.getBoundingClientRect();
    obstacles = Array.from(surface.querySelectorAll("[data-ocean-obstacle]"), (element) => element.getBoundingClientRect())
      .filter((rect) => rect.width > 0 && rect.height > 0)
      .map((rect) => ({ left: rect.left - base.left, top: rect.top - base.top, right: rect.right - base.left, bottom: rect.bottom - base.top }));
  };

  const resize = () => {
    const rect = frameElement.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const first = width === 0;
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    cols = Math.ceil(width / cell);
    rows = Math.ceil(height / cell);
    shade = new Float32Array(cols * rows);
    owner = new Int16Array(cols * rows).fill(-1);
    touched = new Int32Array(cols * rows);
    touchedCount = 0;
    readObstacles();
    for (const phobos of phoboses.values()) phobos.radius = baseRadius() * phobos.scale;
    if (first) syncPhoboses();
  };

  const resolveColor = (source: string | null): Rgb | null => {
    if (!source) return null;
    probe.style.color = "";
    probe.style.color = source;
    if (!probe.style.color) return null;
    if (!probe.isConnected) document.body.appendChild(probe);
    const match = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(getComputedStyle(probe).color);
    return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
  };

  const atlasFor = (color: Rgb): Atlas => {
    const size = Math.ceil(cell * dpr);
    const key = `${color.join(",")}|${size}`;
    const cached = atlases.get(key);
    if (cached) return cached;
    const sheet = document.createElement("canvas");
    sheet.width = size * ATLAS_CHARS.length;
    sheet.height = size;
    const ink = sheet.getContext("2d");
    if (!ink) throw new Error("The phobos scene could not prepare its glyphs.");
    ink.font = `600 ${Math.round(cell * 0.92 * dpr)}px ui-monospace, "SF Mono", Menlo, monospace`;
    ink.textAlign = "center";
    ink.textBaseline = "middle";
    ink.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
    for (let index = 0; index < ATLAS_CHARS.length; index += 1) ink.fillText(ATLAS_CHARS[index], index * size + size / 2, size / 2 + dpr * 0.5);
    const atlas = { canvas: sheet, size };
    atlases.set(key, atlas);
    return atlas;
  };

  const drawGlyph = (atlas: Atlas, glyph: string, x: number, y: number) => {
    const index = ATLAS_CHARS.indexOf(glyph);
    context.drawImage(atlas.canvas, index * atlas.size, 0, atlas.size, atlas.size, x - cell / 2, y - cell / 2, cell, cell);
  };

  const shapeGlyph = (index: number, level: number) => {
    const set = GLYPHS[level];
    const roll = reduceMotion ? 0 : Math.floor(time * 5 + hash(index, 3) * 5);
    return set[Math.floor(hash(index, roll) * set.length)];
  };

  const digitGlyph = (index: number, rate: number) => {
    const roll = reduceMotion ? 0 : Math.floor(time * rate + hash(index, 5) * 7);
    return DIGITS[Math.floor(hash(index, roll) * DIGITS.length)];
  };

  const newArms = (x: number, y: number): Arm[] => Array.from({ length: ARMS }, () => {
    const arm = { x: new Float32Array(ARM_NODES), y: new Float32Array(ARM_NODES), px: new Float32Array(ARM_NODES), py: new Float32Array(ARM_NODES) };
    arm.x.fill(x);
    arm.y.fill(y);
    arm.px.fill(x);
    arm.py.fill(y);
    return arm;
  });

  const obstacleDistance = (x: number, y: number) => {
    let nearest = Infinity;
    for (const obstacle of obstacles) {
      const dx = Math.max(obstacle.left - x, 0, x - obstacle.right);
      const dy = Math.max(obstacle.top - y, 0, y - obstacle.bottom);
      nearest = Math.min(nearest, Math.hypot(dx, dy));
    }
    return nearest;
  };

  const roomAt = (phobos: Phobos) => phobos.radius * 3.1;

  const freeSpot = (phobos: Phobos, from: { x: number; y: number } | null, heading: number | null = null) => {
    const margin = baseRadius() * phobos.scale * 3;
    const spanX = Math.max(1, width - margin * 2);
    const spanY = Math.max(1, height - margin * 2);
    let othersX = 0;
    let othersY = 0;
    let others = 0;
    for (const other of order) {
      if (other === phobos || other.hidden) continue;
      othersX += other.targetX;
      othersY += other.targetY;
      others += 1;
    }
    let best: { x: number; y: number } | null = null;
    let bestScore = -Infinity;
    for (let attempt = 0; attempt < 32; attempt += 1) {
      const x = margin + Math.random() * spanX;
      const y = margin + Math.random() * spanY;
      if (obstacleDistance(x, y) < roomAt(phobos)) continue;
      let crowd = shortest();
      for (const other of order) {
        if (other === phobos || other.hidden) continue;
        crowd = Math.min(crowd, Math.hypot(x - other.x, y - other.y), Math.hypot(x - other.targetX, y - other.targetY));
      }
      const balance = Math.hypot((othersX + x) / (others + 1) - width / 2, (othersY + y) / (others + 1) - height / 2);
      let score = crowd - balance * 1.4;
      if (from) {
        const reach = Math.hypot(x - from.x, y - from.y);
        if (reach < shortest() * 0.22) continue;
        if (heading !== null) score += Math.cos(Math.atan2(y - from.y, x - from.x) - heading) * shortest() * 0.3;
      }
      if (score > bestScore) {
        bestScore = score;
        best = { x, y };
      }
    }
    return best ?? { x: margin + Math.random() * spanX, y: margin + Math.random() * spanY };
  };

  const place = (phobos: Phobos) => {
    const start = freeSpot(phobos, null);
    phobos.x = start.x;
    phobos.y = start.y;
    const next = freeSpot(phobos, start, Math.random() * Math.PI * 2);
    phobos.targetX = next.x;
    phobos.targetY = next.y;
    phobos.heading = Math.atan2(next.y - start.y, next.x - start.x);
    phobos.vx = Math.cos(phobos.heading) * phobos.radius * 0.6;
    phobos.vy = Math.sin(phobos.heading) * phobos.radius * 0.6;
    phobos.arms = newArms(phobos.x, phobos.y);
    for (let warm = 0; warm < 40; warm += 1) stepArms(phobos);
  };

  const syncPhoboses = () => {
    if (width === 0) return;
    const wanted = new Set(frame.creatures.map((creature) => creature.id));
    for (const id of phoboses.keys()) if (!wanted.has(id)) phoboses.delete(id);
    frame.creatures.forEach((creature, slot) => {
      let phobos = phoboses.get(creature.id);
      if (!phobos) {
        const depth = layout === "home" ? HOME_DEPTHS[slot % HOME_DEPTHS.length] : { scale: 1, alpha: 1 };
        phobos = {
          id: creature.id,
          slot,
          x: width / 2,
          y: height / 2,
          vx: 0,
          vy: 0,
          heading: 0,
          radius: baseRadius() * depth.scale,
          scale: depth.scale,
          alpha: depth.alpha,
          fade: calling ? 0 : 1,
          boost: 0,
          hidden: calling,
          leaving: Infinity,
          emerge: Infinity,
          phase: Math.random(),
          stroke: 0,
          open: 1,
          seed: Math.random() * 1000,
          arms: [],
          targetX: width / 2,
          targetY: height / 2,
          leg: 0,
          activity: creature.activity,
          speaking: 0,
          color: null,
          colorSource: null,
          wanted: creature,
        };
        order = [...order, phobos];
        place(phobos);
        phoboses.set(creature.id, phobos);
      }
      phobos.slot = slot;
      phobos.wanted = creature;
      if (phobos.colorSource !== creature.color) {
        phobos.colorSource = creature.color;
        phobos.color = resolveColor(creature.color);
      }
    });
    order = frame.creatures
      .map((creature) => phoboses.get(creature.id))
      .filter((phobos): phobos is Phobos => Boolean(phobos))
      .sort((left, right) => left.scale - right.scale);
  };

  const steering = (phobos: Phobos) => {
    const radius = phobos.radius;
    const room = roomAt(phobos);
    let sx = 0;
    let sy = 0;
    const toTargetX = phobos.targetX - phobos.x;
    const toTargetY = phobos.targetY - phobos.y;
    const toTarget = Math.max(1, Math.hypot(toTargetX, toTargetY));
    sx += toTargetX / toTarget;
    sy += toTargetY / toTarget;
    for (const look of [0, radius * 3.5]) {
      const px = phobos.x + Math.cos(phobos.heading) * look;
      const py = phobos.y + Math.sin(phobos.heading) * look;
      for (const obstacle of obstacles) {
        const nearestX = Math.max(obstacle.left, Math.min(px, obstacle.right));
        const nearestY = Math.max(obstacle.top, Math.min(py, obstacle.bottom));
        let ax = px - nearestX;
        let ay = py - nearestY;
        let distance = Math.hypot(ax, ay);
        if (distance === 0) {
          ax = px - (obstacle.left + obstacle.right) / 2;
          ay = py - (obstacle.top + obstacle.bottom) / 2;
          distance = 0.0001;
          const length = Math.hypot(ax, ay) || 1;
          sx += (ax / length) * 3;
          sy += (ay / length) * 3;
          continue;
        }
        if (distance >= room * 1.5) continue;
        const push = (1 - distance / (room * 1.5)) * 2.4;
        const side = (-ay * toTargetX + ax * toTargetY) >= 0 ? 1 : -1;
        sx += ((ax - ay * side * 1.2) / distance) * push;
        sy += ((ay + ax * side * 1.2) / distance) * push;
      }
    }
    for (const other of order) {
      if (other === phobos) continue;
      const ax = phobos.x - other.x;
      const ay = phobos.y - other.y;
      const distance = Math.hypot(ax, ay);
      const reach = (radius + other.radius) * 3.2;
      if (distance === 0 || distance >= reach) continue;
      const push = (1 - distance / reach) * 1.6;
      sx += (ax / distance) * push;
      sy += (ay / distance) * push;
    }
    const margin = radius * 2.6;
    if (phobos.x < margin) sx += (margin - phobos.x) / margin * 2;
    if (phobos.x > width - margin) sx -= (phobos.x - (width - margin)) / margin * 2;
    if (phobos.y < margin) sy += (margin - phobos.y) / margin * 2;
    if (phobos.y > height - margin) sy -= (phobos.y - (height - margin)) / margin * 2;
    return Math.atan2(sy, sx);
  };

  const setStroke = (phobos: Phobos) => {
    const phase = phobos.phase;
    phobos.stroke = phase < STROKE_END ? Math.sin((phase / STROKE_END) * Math.PI) : 0;
    phobos.open = phase < STROKE_END
      ? 1 - 0.65 * smoothstep(0, STROKE_END, phase)
      : 0.35 + 0.65 * smoothstep(STROKE_END, 0.7, phase);
  };

  const stepPhobos = (phobos: Phobos) => {
    const creature = phobos.wanted;
    const ease = 1 - Math.exp(-STEP_SECONDS * 2.4);
    phobos.activity += (creature.activity - phobos.activity) * ease;
    phobos.speaking += ((creature.speaking ?? 0) - phobos.speaking) * ease;
    const leaving = Number.isFinite(phobos.leaving);
    if (leaving) {
      phobos.fade = 1 - smoothstep(EXIT_FADE[0], EXIT_FADE[1], time - phobos.leaving);
      if (phobos.fade <= 0.01) {
        phobos.hidden = true;
        phobos.leaving = Infinity;
        return;
      }
    } else {
      phobos.fade = Math.min(1, phobos.fade + STEP_SECONDS / 0.45);
    }
    phobos.boost = leaving ? 1 : Math.max(0, phobos.boost - STEP_SECONDS / 2.2);
    phobos.radius = baseRadius() * phobos.scale;
    const vigor = Math.max(phobos.activity, phobos.boost);
    phobos.leg += STEP_SECONDS;
    const toTarget = Math.hypot(phobos.targetX - phobos.x, phobos.targetY - phobos.y);
    if (!leaving && (toTarget < phobos.radius * 3 || phobos.leg > LEG_SECONDS || obstacleDistance(phobos.targetX, phobos.targetY) < roomAt(phobos))) {
      const next = freeSpot(phobos, phobos, phobos.heading);
      phobos.targetX = next.x;
      phobos.targetY = next.y;
      phobos.leg = 0;
    }
    const rate = leaving ? 2.6 : (0.36 + vigor * 0.44) / Math.max(0.6, phobos.scale);
    phobos.phase = (phobos.phase + STEP_SECONDS * rate) % 1;
    setStroke(phobos);
    const wander = Math.sin(time * 0.31 + phobos.seed) * 0.18 + Math.sin(time * 0.11 + phobos.seed * 1.7) * 0.14;
    const goal = leaving ? Math.atan2(phobos.targetY - phobos.y, phobos.targetX - phobos.x) + wander * 0.3 : steering(phobos) + wander;
    const turn = Math.atan2(Math.sin(goal - phobos.heading), Math.cos(goal - phobos.heading));
    phobos.heading += turn * Math.min(1, STEP_SECONDS * (leaving ? 3.4 : 1.1 + vigor * 0.9));
    const fx = Math.cos(phobos.heading);
    const fy = Math.sin(phobos.heading);
    const thrust = phobos.stroke * phobos.radius * (leaving ? 66 : 4.5 + vigor * 5.5);
    const along = (phobos.vx * fx + phobos.vy * fy) * Math.exp(-STEP_SECONDS * 0.6) + thrust * STEP_SECONDS;
    const across = (-phobos.vx * fy + phobos.vy * fx) * Math.exp(-STEP_SECONDS * 2.5);
    phobos.vx = fx * along - fy * across;
    phobos.vy = fy * along + fx * across;
    phobos.x += phobos.vx * STEP_SECONDS;
    phobos.y += phobos.vy * STEP_SECONDS;
    stepArms(phobos);
  };

  const fallbackFocus = (): OceanFocus => ({ x: width / 2, y: height * 0.42, radius: shortest() * 0.16 });

  const leave = () => {
    const focus = frame.focus ?? fallbackFocus();
    for (const phobos of order) {
      phobos.emerge = Infinity;
      if (phobos.hidden) continue;
      if (reduceMotion) {
        phobos.hidden = true;
        continue;
      }
      let ax = phobos.x - focus.x;
      let ay = phobos.y - focus.y;
      const length = Math.hypot(ax, ay) || 1;
      ax /= length;
      ay /= length;
      const toEdgeX = ax > 0 ? (width - phobos.x) / ax : ax < 0 ? -phobos.x / ax : Infinity;
      const toEdgeY = ay > 0 ? (height - phobos.y) / ay : ay < 0 ? -phobos.y / ay : Infinity;
      const reach = Math.max(0, Math.min(toEdgeX, toEdgeY)) + phobos.radius * 5;
      phobos.targetX = phobos.x + ax * reach;
      phobos.targetY = phobos.y + ay * reach;
      phobos.leaving = time;
      phobos.phase = 0;
    }
  };

  const welcomeBack = () => {
    let delay = RETURN_DELAY;
    for (const phobos of [...order].reverse()) {
      if (!phobos.hidden && !Number.isFinite(phobos.leaving)) continue;
      if (!phobos.hidden && phobos.fade > 0.3) {
        phobos.leaving = Infinity;
        phobos.leg = LEG_SECONDS;
        continue;
      }
      phobos.hidden = true;
      phobos.leaving = Infinity;
      phobos.emerge = time + (reduceMotion ? 0 : delay);
      delay += RETURN_STAGGER;
    }
  };

  const enter = (phobos: Phobos) => {
    phobos.hidden = false;
    phobos.emerge = Infinity;
    phobos.fade = 0;
    phobos.boost = 1;
    phobos.phase = 0;
    phobos.leg = 0;
    phobos.radius = baseRadius() * phobos.scale;
    const destination = freeSpot(phobos, null);
    const outside = phobos.radius * 3;
    const along = (Math.random() - 0.5) * shortest() * 0.3;
    const gaps = [destination.x, width - destination.x, destination.y, height - destination.y];
    const entries = [0, 1, 2, 3]
      .sort((left, right) => gaps[left] - gaps[right])
      .map((edge) => ({
        x: edge === 0 ? -outside : edge === 1 ? width + outside : Math.max(0, Math.min(width, destination.x + along)),
        y: edge === 2 ? -outside : edge === 3 ? height + outside : Math.max(0, Math.min(height, destination.y + along)),
      }));
    const entry = entries.find((point) => obstacleDistance(
      Math.max(outside, Math.min(width - outside, point.x)),
      Math.max(outside, Math.min(height - outside, point.y)),
    ) >= roomAt(phobos)) ?? entries[0];
    phobos.x = entry.x;
    phobos.y = entry.y;
    phobos.heading = Math.atan2(destination.y - phobos.y, destination.x - phobos.x);
    const speed = phobos.radius * ENTER_SPEED;
    phobos.vx = Math.cos(phobos.heading) * speed;
    phobos.vy = Math.sin(phobos.heading) * speed;
    phobos.targetX = destination.x;
    phobos.targetY = destination.y;
    phobos.arms = newArms(phobos.x, phobos.y);
    for (let warm = 0; warm < 12; warm += 1) stepArms(phobos);
  };

  const stepAll = () => {
    for (const phobos of order) {
      if (phobos.hidden) {
        if (!calling && time >= phobos.emerge) enter(phobos);
        continue;
      }
      stepPhobos(phobos);
    }
  };

  const stepArms = (phobos: Phobos) => {
    const fx = Math.cos(phobos.heading);
    const fy = Math.sin(phobos.heading);
    const radius = phobos.radius;
    const open = phobos.open;
    const crownX = phobos.x - fx * radius * 0.2;
    const crownY = phobos.y - fy * radius * 0.2;
    const segment = (radius * ARM_LENGTH) / (ARM_NODES - 1);
    const back = phobos.heading + Math.PI;
    const vigor = Math.max(phobos.activity, phobos.boost);
    const sway = 1.4 + vigor * 1.8;
    for (let index = 0; index < ARMS; index += 1) {
      const arm = phobos.arms[index];
      const lane = (index - (ARMS - 1) / 2) / ((ARMS - 1) / 2);
      const side = Math.sign(lane);
      const rootAngle = back + lane * 1.25;
      const rootX = crownX + Math.cos(rootAngle) * radius * 0.42;
      const rootY = crownY + Math.sin(rootAngle) * radius * 0.42;
      arm.x[0] = rootX;
      arm.y[0] = rootY;
      arm.px[0] = rootX;
      arm.py[0] = rootY;
      let angle = back + lane * (0.28 + 0.85 * open);
      let targetX = rootX;
      let targetY = rootY;
      for (let node = 1; node < ARM_NODES; node += 1) {
        const s = node / (ARM_NODES - 1);
        const curl = side * (0.02 + 0.09 * open);
        const wave = Math.sin(time * sway + phobos.seed + index * 0.9 - s * 4.6) * (0.05 + vigor * 0.05) * s;
        angle += (curl * s + wave) * ARM_BEND;
        targetX += Math.cos(angle) * segment;
        targetY += Math.sin(angle) * segment;
        const vx = (arm.x[node] - arm.px[node]) * 0.86;
        const vy = (arm.y[node] - arm.py[node]) * 0.86;
        arm.px[node] = arm.x[node];
        arm.py[node] = arm.y[node];
        const stiffness = 0.04 + 0.22 * (1 - s);
        arm.x[node] += vx + (targetX - arm.x[node]) * stiffness;
        arm.y[node] += vy + (targetY - arm.y[node]) * stiffness;
      }
      for (let pass = 0; pass < 2; pass += 1) {
        for (let node = 1; node < ARM_NODES; node += 1) {
          const ddx = arm.x[node] - arm.x[node - 1];
          const ddy = arm.y[node] - arm.y[node - 1];
          const length = Math.hypot(ddx, ddy) || 0.0001;
          const correction = (length - segment) / length;
          arm.x[node] -= ddx * correction;
          arm.y[node] -= ddy * correction;
        }
      }
    }
  };

  const stamp = (index: number, value: number, who: number) => {
    if (owner[index] !== who) {
      if (owner[index] === -1) touched[touchedCount++] = index;
      owner[index] = who;
      shade[index] = value;
    } else if (value > shade[index]) {
      shade[index] = value;
    }
  };

  const cellRange = (minX: number, maxX: number, minY: number, maxY: number) => ({
    col0: Math.max(0, Math.floor(minX / cell)),
    col1: Math.min(cols - 1, Math.floor(maxX / cell)),
    row0: Math.max(0, Math.floor(minY / cell)),
    row1: Math.min(rows - 1, Math.floor(maxY / cell)),
  });

  const rasterize = () => {
    for (let item = 0; item < touchedCount; item += 1) owner[touched[item]] = -1;
    touchedCount = 0;
    order.forEach((phobos, who) => {
      if (phobos.hidden || phobos.fade <= 0.01) return;
      const radius = phobos.radius;
      const fx = Math.cos(phobos.heading);
      const fy = Math.sin(phobos.heading);
      const minimum = cell * 0.72;
      for (let index = 0; index < ARMS - 1; index += 1) {
        const left = phobos.arms[index];
        const right = phobos.arms[index + 1];
        const a1 = armPoint(left, WEB_DEPTH);
        const b1 = armPoint(right, WEB_DEPTH);
        if (Math.hypot(a1.x - b1.x, a1.y - b1.y) > radius * 1.7) continue;
        const crownX = (left.x[0] + right.x[0]) / 2;
        const crownY = (left.y[0] + right.y[0]) / 2;
        const polygon = [
          left.x[0], left.y[0], a1.x, a1.y,
          crownX + ((a1.x + b1.x) / 2 - crownX) * 0.6, crownY + ((a1.y + b1.y) / 2 - crownY) * 0.6,
          b1.x, b1.y, right.x[0], right.y[0],
        ];
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        for (let point = 0; point < polygon.length; point += 2) {
          minX = Math.min(minX, polygon[point]);
          maxX = Math.max(maxX, polygon[point]);
          minY = Math.min(minY, polygon[point + 1]);
          maxY = Math.max(maxY, polygon[point + 1]);
        }
        const range = cellRange(minX, maxX, minY, maxY);
        for (let row = range.row0; row <= range.row1; row += 1) {
          for (let col = range.col0; col <= range.col1; col += 1) {
            if (insidePolygon(polygon, (col + 0.5) * cell, (row + 0.5) * cell)) stamp(row * cols + col, 0.16, who);
          }
        }
      }
      for (const arm of phobos.arms) {
        for (let node = 0; node < ARM_NODES - 1; node += 1) {
          const s0 = node / (ARM_NODES - 1);
          const s1 = (node + 1) / (ARM_NODES - 1);
          const r0 = armWidth(radius, s0);
          const r1 = armWidth(radius, s1);
          const ax = arm.x[node];
          const ay = arm.y[node];
          const bx = arm.x[node + 1];
          const by = arm.y[node + 1];
          const reach = Math.max(r0, r1, minimum);
          const range = cellRange(Math.min(ax, bx) - reach, Math.max(ax, bx) + reach, Math.min(ay, by) - reach, Math.max(ay, by) + reach);
          const segX = bx - ax;
          const segY = by - ay;
          const segLength = segX * segX + segY * segY || 0.0001;
          const length = Math.sqrt(segLength);
          for (let row = range.row0; row <= range.row1; row += 1) {
            for (let col = range.col0; col <= range.col1; col += 1) {
              const px = (col + 0.5) * cell;
              const py = (row + 0.5) * cell;
              const t = Math.max(0, Math.min(1, ((px - ax) * segX + (py - ay) * segY) / segLength));
              const ox = px - (ax + segX * t);
              const oy = py - (ay + segY * t);
              const actual = r0 + (r1 - r0) * t;
              const r = Math.max(actual, minimum);
              if (Math.hypot(ox, oy) >= r) continue;
              const w = ((ox * -segY + oy * segX) / length) / r;
              const lift = Math.sqrt(Math.max(0, 1 - w * w));
              const lambert = Math.max(0, (-segY / length) * w * LIGHT.x + (segX / length) * w * LIGHT.y + lift * LIGHT.z);
              const s = s0 + (s1 - s0) * t;
              stamp(row * cols + col, (0.3 + lambert * 0.55) * (1 - s * 0.35) * Math.sqrt(actual / r), who);
            }
          }
        }
      }
      const breathing = 1 + Math.sin(time * 1.3 + phobos.seed) * 0.03;
      const shapes = [
        { x: phobos.x, y: phobos.y, a: radius * 0.6, b: radius * 0.8, head: true },
        {
          x: phobos.x + fx * radius * 0.95,
          y: phobos.y + fy * radius * 0.95,
          a: radius * 1.32 * (1 - phobos.stroke * 0.08) * breathing,
          b: radius * 0.88 * (1 - phobos.stroke * 0.18) * breathing,
          head: false,
        },
      ];
      for (const shape of shapes) {
        const reach = Math.max(shape.a, shape.b);
        const range = cellRange(shape.x - reach, shape.x + reach, shape.y - reach, shape.y + reach);
        for (let row = range.row0; row <= range.row1; row += 1) {
          for (let col = range.col0; col <= range.col1; col += 1) {
            const dx = (col + 0.5) * cell - shape.x;
            const dy = (row + 0.5) * cell - shape.y;
            const u = (dx * fx + dy * fy) / shape.a;
            const v = (-dx * fy + dy * fx) / shape.b;
            const q = u * u + v * v;
            if (q >= 1) continue;
            const z = Math.sqrt(1 - q);
            const lambert = Math.max(0, u * -0.3 + v * -0.5 + z * 0.8);
            const highlight = shape.head ? 0 : Math.max(0, 1 - Math.hypot(u + 0.05, v + 0.38) / 0.45);
            const localU = (dx * fx + dy * fy) / radius;
            const localV = (-dx * fy + dy * fx) / radius;
            const spots = valueNoise(localU * 2.2 + phobos.seed, localV * 2.2) * 0.6 + valueNoise(localU * 5 + phobos.seed * 2, localV * 5) * 0.4;
            let value = (0.38 + lambert * 0.42 + highlight * 0.3) * (0.8 + (spots - 0.5) * 0.6) * (shape.head ? 0.88 : 1);
            if (phobos.speaking > 0.02) value *= 1 + Math.sin(time * 6.5 - Math.hypot(localU, localV) * 3 + spots * 4) * 0.35 * phobos.speaking;
            stamp(row * cols + col, Math.min(1, value), who);
          }
        }
      }
    });
  };

  const veil = (x: number, y: number) => {
    const floor = layout === "home" ? 0.2 : 0.35;
    return floor + (1 - floor) * smoothstep(0, baseRadius() * 2, obstacleDistance(x, y));
  };

  const waveAt = (ripple: Ripple, x: number, y: number) => {
    const age = time - ripple.born;
    if (age < 0 || age > RIPPLE_SECONDS) return null;
    const side = shortest();
    const travelled = (1 - Math.exp(-age * 2.6)) * RIPPLE_REACH;
    const spread = travelled / RIPPLE_REACH;
    const distance = Math.hypot(x - ripple.x, y - ripple.y) / side;
    const behind = travelled - distance;
    const strength = smoothstep(-0.012, 0, behind) * (1 - smoothstep(0.2, 0.92, spread));
    const crest = Math.exp(-Math.abs(behind) / 0.02) * strength;
    const train = 0.5 + 0.5 * Math.cos((Math.max(0, behind) / 0.045) * Math.PI * 2);
    const wake = Math.exp(-Math.max(0, behind) / 0.08) * strength * train;
    return { crest, wake, travelled, spread };
  };

  const crestAt = (x: number, y: number) => {
    let crest = 0;
    for (const ripple of ripples) {
      const wave = waveAt(ripple, x, y);
      if (wave) crest = Math.max(crest, wave.crest);
    }
    return crest;
  };

  const draw = () => {
    const palette = readSceneParticlePalette();
    const mono: Rgb = palette.darkSurface ? palette.color : [palette.color[0] * LIGHT_INK_DEPTH, palette.color[1] * LIGHT_INK_DEPTH, palette.color[2] * LIGHT_INK_DEPTH];
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    const tile = cell - gap;

    const look = (index: number, x: number, y: number, value: number, strength: number, dissolve: number, crest: number): Glyph => {
      const level = glyphLevel(value);
      const tileShown = level >= TILE_FROM && hash(index, 37) >= dissolve;
      const digit = crest > 0.2 || hash(index, 41) < dissolve * 1.3;
      return {
        index,
        x,
        y,
        level,
        tile: tileShown ? (level >= KNOCKOUT_FROM ? 0.25 + value * 0.6 : value * 0.32) * strength : 0,
        alpha: Math.min(1, (0.3 + value * 0.75) * strength),
        digit,
        knockout: tileShown && level >= KNOCKOUT_FROM && !digit,
      };
    };

    const paint = (glyphs: readonly Glyph[], color: Rgb) => {
      const atlas = atlasFor(color);
      tiles.reset();
      for (const glyph of glyphs) if (glyph.tile > 0) tiles.add(glyph.x - tile / 2, glyph.y - tile / 2, tile, glyph.tile);
      tiles.flush(context, color);
      for (const glyph of glyphs) {
        if (glyph.knockout) {
          context.globalCompositeOperation = "destination-out";
          context.globalAlpha = 0.85;
        } else {
          context.globalCompositeOperation = "source-over";
          context.globalAlpha = glyph.alpha;
        }
        drawGlyph(atlas, glyph.digit ? digitGlyph(glyph.index, 16) : shapeGlyph(glyph.index, glyph.level), glyph.x, glyph.y);
      }
      context.globalCompositeOperation = "source-over";
      context.globalAlpha = 1;
    };

    order.forEach((phobos, who) => {
      if (phobos.hidden || phobos.fade <= 0.01) return;
      const presence = layout === "swarm" ? 0.62 + phobos.activity * 0.38 : 1;
      const strength = phobos.alpha * presence * phobos.fade;
      const dissolve = 1 - phobos.fade;
      const shield = calling ? 1 : phobos.boost;
      const glyphs: Glyph[] = [];
      for (let item = 0; item < touchedCount; item += 1) {
        const index = touched[item];
        if (owner[index] !== who) continue;
        const col = index % cols;
        const x = (col + 0.5) * cell;
        const y = ((index - col) / cols + 0.5) * cell;
        const crest = ripples.length ? crestAt(x, y) : 0;
        const dim = veil(x, y);
        glyphs.push(look(index, x, y, Math.min(1, shade[index] + crest * 0.25), strength * (dim + (1 - dim) * shield), dissolve, crest));
      }
      paint(glyphs, phobos.color ?? mono);
    });

    if (ripples.length && !calling) {
      const atlas = atlasFor(mono);
      const side = shortest();
      for (const [slot, ripple] of ripples.entries()) {
        const front = waveAt(ripple, ripple.x, ripple.y);
        if (!front) continue;
        const outer = (front.travelled + 0.03) * side;
        const inner = Math.max(0, front.travelled - 0.22) * side;
        const range = cellRange(ripple.x - outer, ripple.x + outer, ripple.y - outer, ripple.y + outer);
        for (let row = range.row0; row <= range.row1; row += 1) {
          const y = (row + 0.5) * cell;
          const dy = Math.abs(y - ripple.y);
          if (dy > outer) continue;
          const outerSpan = Math.sqrt(outer * outer - dy * dy);
          const innerSpan = dy < inner ? Math.sqrt(inner * inner - dy * dy) : 0;
          for (const [from, to] of [[ripple.x - outerSpan, ripple.x - innerSpan], [ripple.x + innerSpan, ripple.x + outerSpan]]) {
            const col0 = Math.max(0, Math.floor(from / cell));
            const col1 = Math.min(cols - 1, Math.floor(to / cell));
            for (let col = col0; col <= col1; col += 1) {
              const index = row * cols + col;
              if (owner[index] !== -1) continue;
              const x = (col + 0.5) * cell;
              const wave = waveAt(ripple, x, y);
              if (!wave) continue;
              const crumble = 1 - smoothstep(0.1, 0.85, wave.spread + (hash(index, 23) - 0.5) * 0.3);
              const density = Math.min(1, wave.crest * 0.85 + wave.wake * 0.3) * crumble;
              if (hash(index, 19 + slot) >= density) continue;
              const alpha = (wave.crest * 0.42 + wave.wake * 0.14) * (0.45 + 0.55 * veil(x, y));
              if (alpha < 0.02) continue;
              const scatter = wave.spread * cell * 1.6;
              context.globalAlpha = Math.min(1, alpha);
              drawGlyph(atlas, digitGlyph(index, 3 + wave.crest * 15), x + (hash(index, 29) - 0.5) * scatter, y + (hash(index, 31) - 0.5) * scatter);
            }
          }
        }
      }
      context.globalAlpha = 1;
    }
  };

  const render = () => {
    ripples = ripples.filter((ripple) => time - ripple.born <= RIPPLE_SECONDS);
    rasterize();
    draw();
  };

  const advance = (seconds: number) => {
    accumulator += seconds;
    let steps = 0;
    while (accumulator >= STEP_SECONDS && steps < 4) {
      accumulator -= STEP_SECONDS;
      steps += 1;
      time += STEP_SECONDS;
      if (time - obstaclesReadAt >= OBSTACLE_REFRESH_SECONDS) readObstacles();
      const nextTheme = document.documentElement.dataset.theme ?? "";
      if (nextTheme !== theme) {
        theme = nextTheme;
        for (const phobos of phoboses.values()) phobos.color = resolveColor(phobos.colorSource);
      }
      stepAll();
    }
    if (steps === 4) accumulator = 0;
  };

  const tick = (now: number) => {
    raf = 0;
    if (stopped || !visible || document.hidden) return;
    if (now - lastFrame >= FRAME_MS - 4) {
      advance(lastFrame ? Math.min(0.12, (now - lastFrame) / 1000) : STEP_SECONDS);
      lastFrame = now;
      render();
    }
    raf = requestAnimationFrame(tick);
  };

  const schedule = () => {
    if (stopped || raf || !visible || document.hidden || width === 0) return;
    if (reduceMotion) {
      for (let warm = 0; warm < 90; warm += 1) {
        time += STEP_SECONDS;
        stepAll();
      }
      render();
      return;
    }
    lastFrame = 0;
    raf = requestAnimationFrame(tick);
  };

  const onPointerDown = (event: PointerEvent) => {
    if (reduceMotion || event.button !== 0 || !visible || document.hidden || calling) return;
    if (event.target instanceof Element && event.target.closest(SCENE_RIPPLE_IGNORED_TARGETS)) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;
    ripples = [...ripples, { x, y, born: time }].slice(-RIPPLE_LIMIT);
    schedule();
  };
  surface?.addEventListener("pointerdown", onPointerDown, { passive: true });

  const resizeObserver = new ResizeObserver(() => {
    resize();
    schedule();
  });
  resizeObserver.observe(frameElement);
  const intersection = new IntersectionObserver(([entry]) => {
    visible = Boolean(entry?.isIntersecting);
    schedule();
  });
  intersection.observe(canvas);
  const onVisibility = () => schedule();
  document.addEventListener("visibilitychange", onVisibility);
  resize();

  return {
    set(next) {
      const nextCalling = Boolean(next.calling);
      frame = next;
      syncPhoboses();
      if (!primed) {
        primed = true;
        if (nextCalling) for (const phobos of order) phobos.hidden = true;
      } else if (nextCalling && !calling) {
        leave();
      } else if (!nextCalling && calling) {
        welcomeBack();
      }
      calling = nextCalling;
      schedule();
    },
    destroy() {
      stopped = true;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      surface?.removeEventListener("pointerdown", onPointerDown);
      probe.remove();
    },
  };
}

function glyphLevel(value: number): number {
  if (value < 0.2) return 0;
  if (value < 0.3) return 1;
  if (value < 0.42) return 2;
  if (value < 0.56) return 3;
  if (value < 0.72) return 4;
  return 5;
}

function armPoint(arm: Arm, s: number) {
  const position = Math.min(ARM_NODES - 1.0001, s * (ARM_NODES - 1));
  const node = Math.floor(position);
  const t = position - node;
  return {
    x: arm.x[node] + (arm.x[node + 1] - arm.x[node]) * t,
    y: arm.y[node] + (arm.y[node + 1] - arm.y[node]) * t,
  };
}

function armWidth(radius: number, s: number): number {
  return radius * 0.26 * (1 - s * 0.88);
}

function insidePolygon(points: readonly number[], x: number, y: number): boolean {
  let inside = false;
  for (let index = 0, previous = points.length - 2; index < points.length; previous = index, index += 2) {
    const xi = points[index];
    const yi = points[index + 1];
    const xj = points[previous];
    const yj = points[previous + 1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function createTileBatch() {
  const xs: Float32Array[] = [];
  const ys: Float32Array[] = [];
  const sizes: Float32Array[] = [];
  const counts = new Int32Array(ALPHA_LEVELS);
  for (let level = 0; level < ALPHA_LEVELS; level += 1) {
    xs.push(new Float32Array(512));
    ys.push(new Float32Array(512));
    sizes.push(new Float32Array(512));
  }
  const grow = (array: Float32Array) => {
    const next = new Float32Array(array.length * 2);
    next.set(array);
    return next;
  };
  return {
    reset() {
      counts.fill(0);
    },
    add(x: number, y: number, size: number, alpha: number) {
      const level = Math.min(ALPHA_LEVELS - 1, Math.round(alpha * (ALPHA_LEVELS - 1)));
      if (level <= 0) return;
      const count = counts[level];
      if (count >= xs[level].length) {
        xs[level] = grow(xs[level]);
        ys[level] = grow(ys[level]);
        sizes[level] = grow(sizes[level]);
      }
      xs[level][count] = x;
      ys[level][count] = y;
      sizes[level][count] = size;
      counts[level] = count + 1;
    },
    flush(context: CanvasRenderingContext2D, color: Rgb) {
      context.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
      for (let level = 1; level < ALPHA_LEVELS; level += 1) {
        const count = counts[level];
        if (!count) continue;
        context.globalAlpha = level / (ALPHA_LEVELS - 1);
        context.beginPath();
        for (let index = 0; index < count; index += 1) context.rect(xs[level][index], ys[level][index], sizes[level][index], sizes[level][index]);
        context.fill();
      }
      context.globalAlpha = 1;
    },
  };
}

function hash(index: number, salt: number): number {
  let value = Math.imul(index ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(salt + 0x27d4eb2f, 0xc2b2ae35);
  value = Math.imul(value ^ (value >>> 15), 0x2c1b3c6d);
  value ^= value >>> 12;
  return (value >>> 0) / 4294967296;
}

function valueNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix * 374761 + iy * 668265, 17);
  const b = hash((ix + 1) * 374761 + iy * 668265, 17);
  const c = hash(ix * 374761 + (iy + 1) * 668265, 17);
  const d = hash((ix + 1) * 374761 + (iy + 1) * 668265, 17);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
