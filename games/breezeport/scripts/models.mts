// Triangle counts of every model, full and Low detail (CPU only, no WebGL):  npx tsx scripts/models.mts
import { lowDetail } from '../src/render/geo';
import { library } from '../src/render/models/civic';
import { bungalow, cottage, townhouse } from '../src/render/models/homes';
import * as P from '../src/render/models/props';
import { apartments, cafe, cornerStore } from '../src/render/models/shops';
import { bus, car, hatchback, van } from '../src/render/models/vehicles';
import { citizen } from '../src/render/models/people';
const models: Record<string, (low?: boolean) => import('three').BufferGeometry> = {
  cottage, townhouse, bungalow, apartments, cafe, cornerStore, library,
  fountain: P.fountain, playground: P.playground, bench: P.bench, picnic: P.picnicTable, flowerBed: P.flowerBed, lamp: P.streetLamp, busShelter: P.busShelter,
  tree: P.roundTree, pine: P.pineTree, farTree: P.farTree, bush: P.bushClump, car, hatchback, van, bus,
};
const tris = (g: import('three').BufferGeometry) => g.getAttribute('position').count / 3;
for (const [name, make] of Object.entries(models)) console.log(name.padEnd(12), String(tris(make())).padStart(6), String(tris(lowDetail(() => make()))).padStart(6));
console.log('citizen'.padEnd(12), String(tris(citizen(false))).padStart(6), String(tris(citizen(true))).padStart(6));
