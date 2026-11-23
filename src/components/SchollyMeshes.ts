import * as T from "three";
import { wardrobeItem, type SchollyOutfit } from "@/lib/scholly-wardrobe";

type XYZ = [number, number, number];

export function mountSchollyDetails(head: T.Group, body: T.Group, outfit: SchollyOutfit) {
  const geometries = new Set<T.BufferGeometry>();
  const materials = new Map<string, T.MeshPhysicalMaterial>();
  const sphere = new T.SphereGeometry(1, 28, 18);

  function mesh(group: T.Group, geometry: T.BufferGeometry, color: string, position: XYZ, scale: XYZ = [1, 1, 1]) {
    geometries.add(geometry);
    let material = materials.get(color);
    if (!material) {
      material = new T.MeshPhysicalMaterial({ color, roughness: .32, metalness: .09, clearcoat: .65 });
      materials.set(color, material);
    }
    const shape = new T.Mesh(geometry, material);
    shape.position.set(...position);
    shape.scale.set(...scale);
    group.add(shape);
    return shape;
  }

  const orb = (group: T.Group, color: string, position: XYZ, scale: XYZ) => mesh(group, sphere, color, position, scale);
  const box = (group: T.Group, color: string, position: XYZ, size: XYZ) =>
    mesh(group, new T.BoxGeometry(...size), color, position);
  const cylinder = (group: T.Group, color: string, position: XYZ, top: number, bottom: number, height: number, segments = 32) =>
    mesh(group, new T.CylinderGeometry(top, bottom, height, segments), color, position);
  const ring = (group: T.Group, color: string, position: XYZ, radius: number, thickness = .022) =>
    mesh(group, new T.TorusGeometry(radius, thickness, 10, 32), color, position);
  function path(group: T.Group, color: string, points: XYZ[], radius: number) {
    return mesh(group, new T.TubeGeometry(new T.CatmullRomCurve3(points.map(point => new T.Vector3(...point))), 18, radius, 8), color, [0, 0, 0]);
  }
  function emblem(group: T.Group, color: string, position: XYZ, points: [number, number][]) {
    const outline = new T.Shape(points.map(point => new T.Vector2(...point)));
    return mesh(group, new T.ExtrudeGeometry(outline, {
      depth: .065, bevelEnabled: true, bevelSegments: 2, bevelSize: .014, bevelThickness: .02,
    }), color, position);
  }

  const gold = "#e9bd63";
  const snow = "#f0e8d9";
  const navy = "#253354";
  const id = outfit.companion ?? "scholly";

  function glasses(color: string) {
    for (const side of [-1, 1]) ring(head, color, [side * .30, -.10, .79], .17);
    path(head, color, [[-.13, -.10, .80], [0, -.055, .81], [.13, -.10, .80]], .019);
  }

  if (id === "bars" || id === "karvon") {
    for (const side of [-1, 1]) {
      const x = side * .66;
      const ear = orb(head, id === "bars" ? "#d9e3ee" : "#d5a35e", [x, .60, .02], [.23, .24, .135]);
      ear.rotation.z = -side * .26;
      orb(head, id === "bars" ? "#546f91" : "#a87048", [x, .62, .114], [.133, .145, .062]);
    }
  }
  if (id === "bars") {
    for (const [x, y, z] of [[-.46, .46, .40], [.19, .55, .40], [.52, .32, .47], [-.12, .51, -.43], [.61, -.03, -.46]]) {
      const spot = orb(head, "#617a9b", [x, y, z], [.105, .065, .025]);
      spot.rotation.z = x * 2;
    }
    orb(body, "#3659a8", [0, -.42, .04], [.55, .105, .37]);
    path(body, "#3659a8", [[.36, -.42, -.1], [.56, -.62, -.20], [.89, -.61, -.30]], .088);
    path(body, "#d9e3ee", [[-.32, -.79, -.25], [-.78, -.83, -.4], [-1.03, -.58, -.28], [-.96, -.38, -.20]], .105);
  }
  if (id === "chaqmoq") {
    for (const side of [-1, 1]) {
      const ear = cylinder(head, "#e86e34", [side * .66, .62, .02], .04, .275, .47, 20);
      ear.rotation.z = -side * .30;
      const inset = orb(head, snow, [side * .67, .64, .16], [.104, .159, .065]);
      inset.rotation.z = -side * .33;
      orb(head, snow, [side * .68, -.33, .53], [.19, .085, .096]).rotation.z = side * .30;
    }
    emblem(body, gold, [.62, -.62, -.28], [[0, -.12], [.42, .40], [.36, .10], [.64, .17], [.28, -.32], [.33, -.04]]);
  }
  if (id === "boyqush") {
    if (outfit.hat !== "glasses") glasses(gold);
    for (const side of [-1, 1]) {
      path(head, "#aa85e9", [[side * .15, .26, .66], [side * .42, .35, .55], [side * .69, .54, .35]], .081);
      for (let i = 0; i < 3; i++) {
        orb(body, i % 2 ? "#7c68c6" : "#a084db", [side * (.60 + i * .09), -.69 + i * .04, -.12], [.10, .29, .10]).rotation.z = -side * (.44 + .14 * i);
      }
    }
  }
  if (id === "karvon") {
    orb(head, "#d5a35e", [.18, .65, -.03], [.40, .17, .35]);
    orb(head, "#874d36", [-.1, .69, .07], [.20, .10, .22]);
    orb(body, "#ac584c", [0, -.43, .06], [.55, .095, .39]);
    for (const x of [-.19, 0, .19]) box(body, snow, [x, -.44, .41], [.07, .07, .023]).rotation.z = Math.PI / 4;
    if (!outfit.back) orb(body, "#874d36", [0, -.67, -.4], [.50, .37, .27]);
  }

  const hatColor = wardrobeItem("hat", outfit.hat)?.color ?? navy;
  if (outfit.hat === "glasses") glasses(gold);
  if (outfit.hat === "headphones") {
    path(head, navy, [[-1.03, .02, .01], [-.75, .64, .02], [0, .83, .02], [.75, .64, .02], [1.03, .02, .01]], .043);
    for (const side of [-1, 1]) {
      orb(head, hatColor, [side * 1.08, -.105, .055], [.13, .23, .20]);
      ring(head, "#ffafd0", [side * 1.09, -.11, .237], .112);
    }
  }
  if (outfit.hat === "beanie" || outfit.hat === "winter") {
    const band = outfit.hat === "winter" ? snow : "#5948a4";
    orb(head, hatColor, [0, .64, 0], [.69, .29, .51]);
    cylinder(head, band, [0, .65, .02], .66, .69, .103).scale.z = .77;
    orb(head, snow, [.12, .94, 0], [.114, .114, .114]);
  }
  if (outfit.hat === "graduation") {
    cylinder(head, navy, [0, .72, 0], .40, .47, .16).scale.z = .79;
    box(head, hatColor, [0, .84, 0], [.91, .078, .91]).rotation.y = Math.PI / 4;
    path(head, gold, [[0, .89, 0], [.42, .89, .25], [.57, .81, .31], [.57, .61, .31]], .016);
    orb(head, gold, [.57, .58, .31], [.032, .075, .032]);
  }
  if (outfit.hat === "pilot" || outfit.hat === "explorer" || outfit.hat === "doppi") {
    const doppi = outfit.hat === "doppi";
    cylinder(head, hatColor, [0, .76, 0], .49, .58, .25, doppi ? 4 : 32).scale.z = .82;
    if (!doppi) orb(head, outfit.hat === "explorer" ? "#916635" : navy, [0, .65, .15], [.72, .057, .55]);
    for (const x of doppi ? [-.22, 0, .22] : [0]) {
      box(head, doppi ? snow : gold, [x, .76, .39], [.087, .075, .025]).rotation.z = Math.PI / 4;
    }
  }
  if (outfit.hat === "crown") {
    cylinder(head, gold, [0, .78, 0], .58, .51, .18);
    for (let i = 0; i < 7; i++) {
      const angle = i * Math.PI * 2 / 7;
      const x = Math.sin(angle) * .49, z = Math.cos(angle) * .49;
      cylinder(head, hatColor, [x, .925, z], .02, .094, .22, 12);
      orb(head, i % 2 ? "#d992cf" : "#9bd8fa", [x, 1.04, z], [.043, .043, .043]);
    }
  }

  if (outfit.antenna && (!outfit.hat || ["glasses", "headphones"].includes(outfit.hat))) {
    const color = wardrobeItem("antenna", outfit.antenna)?.color ?? gold;
    path(head, "#879bbb", [[0, .70, 0], [.02, .84, 0], [.12, .99, 0]], .028);
    if (outfit.antenna === "star") {
      const points: [number, number][] = Array.from({ length: 10 }, (_, i) => {
        const angle = i * Math.PI / 5;
        const radius = i % 2 === 0 ? .14 : .071;
        return [Math.sin(angle) * radius, Math.cos(angle) * radius];
      });
      emblem(head, color, [.12, 1.06, 0], points);
    } else if (outfit.antenna === "flower") {
      for (let i = 0; i < 5; i++) {
        const angle = i * Math.PI * 2 / 5;
        orb(head, "#fbe596", [.12 + Math.cos(angle) * .078, 1.06 + Math.sin(angle) * .078, 0], [.063, .063, .037]);
      }
      orb(head, "#ed914f", [.12, 1.06, .039], [.054, .054, .037]);
    } else if (outfit.antenna === "heart") {
      emblem(head, color, [.12, 1.07, 0], [[0, -.12], [-.12, .015], [-.11, .08], [-.055, .12], [0, .068], [.055, .12], [.11, .08], [.12, .015]]);
    } else orb(head, color, [.12, 1.06, 0], [.108, .108, .108]);
  }

  const backColor = wardrobeItem("back", outfit.back)?.color ?? navy;
  if (outfit.back === "backpack") {
    orb(body, backColor, [0, -.66, -.51], [.49, .36, .24]);
    box(body, gold, [0, -.66, -.72], [.14, .10, .025]);
    for (const x of [-.34, .34]) path(body, navy, [[x, -.42, -.35], [x, -.45, .18], [x, -.73, .30]], .024);
  }
  if (outfit.back === "jetpack") {
    for (const side of [-1, 1]) {
      const x = side * .52;
      orb(body, backColor, [x, -.63, -.45], [.172, .38, .19]);
      cylinder(body, navy, [x, -.95, -.45], .10, .13, .15);
      orb(body, "#68d5ff", [x, -1.07, -.45], [.068, .16, .067]);
    }
  }
  if (outfit.back === "cape") {
    emblem(body, backColor, [0, -.39, -.53], [[-.30, 0], [.30, 0], [.77, -.77], [.28, -.84], [-.10, -.76], [-.73, -.87]]);
  }
  if (outfit.back === "wings") {
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        orb(body, i === 0 ? snow : backColor, [side * (.70 + i * .10), -.66 + i * .15, -.39], [.14, .33, .081]).rotation.z = -side * (1.04 - i * .16);
      }
    }
  }
  if (outfit.back === "satellite") {
    orb(body, backColor, [.11, -.57, -.54], [.29, .21, .20]);
    for (const side of [-1, 1]) {
      box(body, "#364f94", [side * .74, -.55, -.58], [.48, .26, .045]);
      for (const j of [-1, 0, 1]) box(body, backColor, [side * .74 + j * .13, -.55, -.552], [.09, .18, .013]);
    }
  }

  const hand = (outfit.hand || (id === "boyqush" ? "book" : null));
  const handColor = wardrobeItem("hand", hand)?.color ?? gold;
  if (hand === "book" || hand === "passport") {
    const cover = box(body, handColor, [.81, -.79, .28], [.23, .30, .07]);
    cover.rotation.z = -.27;
    box(body, snow, [.81, -.78, .313], [.19, .27, .024]).rotation.z = -.27;
    if (hand === "book") box(body, handColor, [.87, -.77, .337], [.19, .26, .021]).rotation.z = -.27;
    box(body, gold, [.83, -.77, .358], [.052, .055, .012]).rotation.z = -.27;
  } else if (hand === "globe") {
    orb(body, handColor, [.84, -.76, .29], [.145, .145, .145]);
    orb(body, "#62c59d", [.81, -.73, .411], [.066, .055, .030]);
    orb(body, "#62c59d", [.90, -.80, .411], [.042, .055, .027]);
    ring(body, gold, [.84, -.76, .29], .164, .015).rotation.y = -.43;
  } else if (hand === "trophy") {
    cylinder(body, gold, [.84, -.71, .28], .127, .072, .15);
    cylinder(body, gold, [.84, -.82, .28], .029, .046, .10);
    cylinder(body, navy, [.84, -.88, .28], .091, .097, .046);
    for (const side of [-1, 1]) ring(body, gold, [.84 + side * .113, -.72, .28], .053, .018);
  }

  return () => {
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
  };
}
