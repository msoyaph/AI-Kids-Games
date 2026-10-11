import {
  AdditiveBlending,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  PointLight,
  ShaderMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
  type Box3,
  type CanvasTexture,
  type Object3D,
  type Points,
  type Raycaster,
  type WebGLRenderer,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { QualityProfile } from '../../systems/quality';
import { disposeObject } from '../dispose';
import { OUTPUT_GLSL } from '../materials';
import { createPlanet, type PlanetView } from '../space/planets';
import { box, cyl, lath, rbox, sph, tor } from '../surface/propKit';
import { atlasTexture, missionUv, radarUv } from './academyAtlas';
import { buildDecor, type DecorBuild } from './academyDecor';
import { HaloList, buildFarHills, buildGrounds, buildPad, buildRoof, buildStructure, skyDome, skyStars } from './academyExterior';
import { AKit, academyMats, type AcademyMats } from './academyKit';
import { ARCH, BACK, CEIL, COLS, F0, F1, ROOM_IDS, crewSpots, decorSpots, overviewPose, roomBoxes, roomPoses, type CameraPose, type CrewSpot, type RoomId } from './academyLayout';
import { buildRooms } from './academyRooms';

export type { CameraPose, CrewSpot, RoomId } from './academyLayout';
export { fitFov, SEAT_H } from './academyLayout';

const H = Math.PI / 2;

const HOLO_VERT = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
varying vec3 vP;
void main() {
  vP = position;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
const HOLO_FRAG = /* glsl */ `
uniform float uTime;
uniform vec3 uColor;
varying vec3 vN;
varying vec3 vV;
varying vec3 vP;
void main() {
  float rim = 1.0 - abs(dot(normalize(vN), normalize(vV)));
  float lat = smoothstep(0.9, 1.0, abs(sin(vP.y * 18.0)));
  float lon = smoothstep(0.92, 1.0, abs(sin(atan(vP.z, vP.x) * 6.0)));
  float scan = 0.6 + 0.4 * sin(vP.y * 40.0 - uTime * 4.0);
  float a = (0.12 + pow(rim, 2.0) * 0.9 + (lat + lon) * 0.35) * scan;
  gl_FragColor = vec4(uColor * a, 1.0);
  ${OUTPUT_GLSL}
}`;

/**
 * The Space Sky Academy: a cut-away "dollhouse" building on a grassy hill at dusk. Upper floor:
 * Mission Control, Library (under the observatory dome), Trophy Hall; ground floor: Crew Lounge,
 * Shop, Lobby; the double-height Hangar on the right with its big door facing the launch pad.
 * The static building, rooms and hill merge into ~9 draw calls; animated bits (screens, blinking
 * lights, holograms, sky) run off a few time uniforms.
 */
export class Academy {
  readonly group = new Group();
  readonly rooms: Record<RoomId, { min: Vector3; max: Vector3 }>;
  readonly overview: CameraPose;
  readonly poses: Record<RoomId, CameraPose>;
  readonly spots: { crew: Record<string, CrewSpot>; turntable: Vector3; holo: Vector3; shopStage: Vector3; decor: Array<{ pos: Vector3; rotY: number }> };
  readonly turntable: Object3D = new Group();

  private readonly boxes: Record<RoomId, Box3>;
  private readonly hit = new Vector3();
  private readonly renderer: WebGLRenderer;
  private readonly profile: QualityProfile;
  private readonly atlas: CanvasTexture;
  private readonly mats: AcademyMats;
  private readonly sky: Mesh;
  private readonly stars: Points;
  private readonly halos: Points;
  private readonly moon: PlanetView;
  private readonly moonSun = new Vector3(-0.55, 0.12, 0.83).normalize();
  private readonly holo: Mesh;
  private readonly holoMat: ShaderMaterial;
  private readonly holoY: number;
  private readonly crane: Group;
  private readonly key: DirectionalLight;
  private decor: DecorBuild | null = null;
  private decorKey = '';
  private readonly v2 = new Vector2();

  constructor(o: { renderer: WebGLRenderer; profile: QualityProfile }) {
    this.renderer = o.renderer;
    this.profile = o.profile;
    const shadows = o.profile.shadows;
    this.boxes = roomBoxes();
    this.rooms = this.boxes;
    this.overview = overviewPose();
    this.poses = roomPoses();
    const lib = (COLS[1][0] + COLS[1][1]) / 2;
    this.spots = {
      crew: crewSpots(),
      turntable: new Vector3(ARCH.x, F0 + 0.5, -4.6),
      holo: new Vector3(lib, F1 + 2.45, BACK + 5.8),
      shopStage: new Vector3(COLS[1][0] + 7.8, F0 + 0.36, BACK + 5.5),
      decor: decorSpots(),
    };

    // The static build: structure, rooms, roof, hill, pad, far hills.
    this.atlas = atlasTexture(o.profile.tier === 'low' ? 0.5 : o.profile.tier === 'medium' ? 0.75 : 1);
    this.mats = academyMats(this.atlas, o.profile.post);
    const su = this.mats.screen.uniforms;
    su.uScan.value.set(...missionUv());
    su.uRadar.value.set(...radarUv());
    const k = new AKit(this.mats);
    const halos = new HaloList();
    buildStructure(k);
    buildRooms(k);
    buildRoof(k, halos);
    buildGrounds(k, halos);
    buildPad(k, halos);
    buildFarHills(k);
    for (const m of k.meshes(shadows)) this.group.add(m);

    // Sky, stars, Moon.
    const sunDir = new Vector3(-0.9, -0.06, -0.42).normalize();
    this.sky = skyDome(sunDir);
    this.stars = skyStars(Math.round(o.profile.stars * 0.35), o.renderer.getPixelRatio());
    this.group.add(this.sky, this.stars);
    this.moon = createPlanet('moon', 26, { renderer: o.renderer, profile: o.profile, detail: 'normal' });
    this.moon.group.position.set(260, 58, -860);
    this.group.add(this.moon.group);
    halos.add(260, 58, -860, '#c9d8ff', 150, 0.35);
    // Glows by the windows and screens.
    halos.add((COLS[0][0] + COLS[0][1]) / 2, F1 + 3.4, BACK + 0.6, '#4d9dff', 9, 0.25);
    this.halos = halos.points(o.profile.post ? 1 : 0.45);
    this.group.add(this.halos);

    // Turntable (the lead turns it; the rocket stands on spots.turntable).
    this.turntable.position.set(this.spots.turntable.x, F0, this.spots.turntable.z);
    const tk = new AKit(this.mats);
    tk.metal(lath([[0, 0], [2.3, 0], [2.35, 0.08], [2.2, 0.3], [2.0, 0.36], [0, 0.36]], 64), '#3a3f72');
    tk.metal(cyl(1.92, 1.98, 0.14, 64), '#a8b0d8', 0, 0.43);
    tk.blink(tor(2.0, 0.045, 6, 72), '#4dd4ff', 0, -0.35, 0, 0.36, 0, H);
    tk.blink(tor(1.5, 0.025, 4, 56), '#ff7ad9', 0.5, -0.35, 0, 0.505, 0, H);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      tk.glow(box(0.34, 0.03, 0.08), '#ffe066', Math.cos(a) * 1.72, 0.51, Math.sin(a) * 1.72, 0, -a, 0);
    }
    for (const m of tk.meshes(shadows)) this.turntable.add(m);
    this.group.add(this.turntable);

    // Hologram planet over the Mission Control holo-table.
    const sg = new SphereGeometry(0.55, 24, 16);
    const ring = new TorusGeometry(0.85, 0.02, 4, 64).rotateX(H - 0.35);
    const hg = mergeGeometries([sg, ring])!;
    sg.dispose();
    ring.dispose();
    this.holoMat = new ShaderMaterial({ uniforms: { uTime: { value: 0 }, uColor: { value: new Color('#5fd8ff').multiplyScalar(o.profile.post ? 1.6 : 1) } }, vertexShader: HOLO_VERT, fragmentShader: HOLO_FRAG, transparent: true, depthWrite: false, blending: AdditiveBlending });
    this.holo = new Mesh(hg, this.holoMat);
    this.holoY = F1 + 2.05;
    this.holo.position.set(COLS[0][0] + 4.2, this.holoY, BACK + 5.9);
    this.holo.renderOrder = 5;
    this.group.add(this.holo);

    // Hangar crane trolley with its hook (slides along the rail).
    this.crane = new Group();
    const ck = new AKit(this.mats);
    const ry = CEIL - 1.6;
    ck.paint(rbox(1.3, 0.6, 0.9, 0.08, 1), '#ff9f43', 0, ry - 0.55, 0);
    ck.metal(cyl(0.025, 0.025, 4.6, 6), '#3a3f66', 0, ry - 3.15, 0);
    ck.paint(rbox(0.6, 0.45, 0.4, 0.08, 1), '#ffc83d', 0, ry - 5.6, 0);
    ck.metal(tor(0.22, 0.05, 6, 16, Math.PI * 1.4), '#dfe5f5', 0, ry - 6.05, 0, 0, 0, 0.6);
    ck.blink(sph(0.08, 0.08, 0.08, 8, 6), '#ff5d73', 0, 1.2, 0, ry - 0.2, 0.42);
    for (const m of ck.meshes(shadows)) this.crane.add(m);
    this.crane.position.set(ARCH.x, 0, BACK + 2.2);
    this.group.add(this.crane);

    // Lights: sky/ground fill, a warm key (shadows on High), a cool rim, and two warm point lights.
    const hemi = new HemisphereLight('#8f9eff', '#7a5060', 1.25);
    this.key = new DirectionalLight('#ffe3c6', 2.5);
    // Low and from the front-left (a dusk sun) so it reaches deep into the open rooms.
    this.key.position.set(-18, 28, 64);
    this.key.target.position.set(4, 6, -4);
    if (shadows) {
      const s = this.key.shadow;
      this.key.castShadow = true;
      s.mapSize.set(2048, 2048);
      s.camera.left = -46;
      s.camera.right = 46;
      s.camera.top = 22;
      s.camera.bottom = -18;
      s.camera.near = 10;
      s.camera.far = 150;
      s.bias = -0.0006;
      s.normalBias = 0.03;
      s.radius = 3;
    }
    const rim = new DirectionalLight('#7f98ff', 0.9);
    rim.position.set(50, 30, -40);
    const hangarLight = new PointLight('#ffe2b8', 42, 26, 1.6);
    hangarLight.position.set(ARCH.x - 1, F0 + 9.5, -1.5);
    const roomLight = new PointLight('#ffc68a', 26, 30, 1.7);
    roomLight.position.set((COLS[0][0] + COLS[2][1]) / 2, F1 - 0.2, 2.5);
    this.group.add(hemi, this.key, this.key.target, rim, hangarLight, roomLight);
  }

  update(_dt: number, time: number): void {
    this.mats.blink.uniforms.uTime.value = time;
    this.mats.screen.uniforms.uTime.value = time;
    this.mats.beam.uniforms.uTime.value = time;
    (this.sky.material as ShaderMaterial).uniforms.uTime.value = time;
    (this.stars.material as ShaderMaterial).uniforms.uTime.value = time;
    const hm = this.halos.material as ShaderMaterial;
    hm.uniforms.uTime.value = time;
    hm.uniforms.uHalfH.value = this.renderer.getDrawingBufferSize(this.v2).y / 2;
    this.holoMat.uniforms.uTime.value = time;
    this.holo.rotation.y = time * 0.6;
    this.holo.position.y = this.holoY + Math.sin(time * 1.3) * 0.06;
    this.crane.position.x = ARCH.x + Math.sin(time * 0.11) * 4.2;
    this.moon.update(time, this.moonSun);
    if (this.decor) for (let i = 0; i < this.decor.rotors.length; i++) this.decor.rotors[i].rotation.y = time * 0.45 + i;
  }

  setDecor(styles: string[]): void {
    const key = styles.join(',');
    if (key === this.decorKey && this.decor) return;
    this.decorKey = key;
    if (this.decor) {
      this.decor.group.removeFromParent();
      disposeObject(this.decor.group);
      this.decor = null;
    }
    if (!styles.length) return;
    this.decor = buildDecor(this.mats, styles, this.spots.decor, this.profile.shadows);
    this.group.add(this.decor.group);
  }

  roomAt(ray: Raycaster): RoomId | null {
    let best: RoomId | null = null;
    let bestD = Infinity;
    for (const id of ROOM_IDS) {
      if (ray.ray.intersectBox(this.boxes[id], this.hit)) {
        const d = this.hit.distanceToSquared(ray.ray.origin);
        if (d < bestD) {
          bestD = d;
          best = id;
        }
      }
    }
    return best;
  }

  dispose(): void {
    this.key.dispose();
    disposeObject(this.group);
    this.group.removeFromParent();
    this.decor = null;
  }
}
