import * as T from 'three';

type Point = [number, number, number];
type FacePoint = [number, number];
export type Expression = 'neutral' | 'happy' | 'thinking' | 'surprised' | 'proud' | 'concerned' | 'sleepy' | 'celebrating';
const polar = (v: number, exponent: number) => Math.sign(v) * Math.pow(Math.abs(v), exponent);

function shellProfile(vertical: number) {
  const radius = Math.pow(Math.max(0, 1 - vertical * vertical), 0.47);
  const width = 1.16 * radius * (1 - 0.085 * vertical);
  const depth = 0.795 * radius * (1 - 0.032 * vertical);
  return { width, depth };
}

function shellDepth(x: number, y: number) {
  const vertical = (y - 0.39) / 0.80;
  const { width, depth } = shellProfile(vertical);
  return depth * Math.sqrt(Math.max(0, 1 - (x / width) ** 2));
}

function fromGrid(rows: number, columns: number, point: (row: number, column: number) => Point, color?: (p: Point) => T.Color, flip = false) {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  for (let row = 0; row <= rows; row++) {
    for (let column = 0; column <= columns; column++) {
      const p = point(row / rows, column / columns);
      positions.push(...p);
      if (color) colors.push(...color(p).toArray());
      if (column < columns && row < rows) {
        const a = row * (columns + 1) + column;
        const b = a + columns + 1;
        if (flip) indices.push(a, b, a + 1, a + 1, b, b + 1);
        else indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
  }
  const geo = new T.BufferGeometry();
  geo.setIndex(indices);
  geo.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  if (colors.length) geo.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  // Weld the shading across the duplicated seam without merging the mesh's topology.
  const normals = geo.getAttribute('normal');
  for (let row = 0; row <= rows; row++) {
    const first = row * (columns + 1), last = first + columns;
    const normal = new T.Vector3().fromBufferAttribute(normals, first).add(new T.Vector3().fromBufferAttribute(normals, last)).normalize();
    normals.setXYZ(first, ...normal.toArray());
    normals.setXYZ(last, ...normal.toArray());
  }
  return geo;
}

function gradient(p: Point, lower: T.Color, upper: T.Color, low: number, high: number) {
  const fraction = T.MathUtils.smoothstep(p[1], low, high);
  return lower.clone().lerp(upper, fraction);
}

function helmetGeometry() {
  const lower = new T.Color('#02279d');
  const upper = new T.Color('#0655f8');
  return fromGrid(46, 96, (v, u) => {
    const lat = (v - 0.5) * Math.PI;
    const vertical = Math.sin(lat);
    const { width, depth } = shellProfile(vertical);
    const angle = u * Math.PI * 2;
    return [width * Math.cos(angle), 0.39 + 0.80 * vertical, depth * Math.sin(angle)];
  }, p => gradient(p, lower, upper, -0.3, 1.1), true);
}

function screenXY(r: number, t: number): FacePoint {
  const sx = polar(Math.cos(t), 0.84);
  const sy = polar(Math.sin(t), 0.93);
  return [r * 1.031 * sx * (1 - 0.038 * sy), 0.27 + r * 0.53 * sy];
}

const cover = (x: number, y: number) => shellDepth(x, y) + 0.030;
const expressionPoint = ([x, y]: FacePoint) => new T.Vector3(x, y, cover(x, y) + 0.023);

function screenGeometry() {
  const lower = new T.Color('#02091d');
  const upper = new T.Color('#0e193b');
  const geo = fromGrid(24, 96, (r, u) => {
    const [x,y] = screenXY(r, -u * 2 * Math.PI);
    return [x,y,cover(x,y)];
  }, p => gradient(p,lower,upper,-0.23,0.78));
  return geo;
}

function beanGeometry() {
  const dark = new T.Color('#062eaa');
  const light = new T.Color('#0a47ff');
  return fromGrid(30, 56, (v, u) => {
    const t = (v - 0.5) * Math.PI;
    const vertical = Math.sin(t);
    const ring = Math.cos(t);
    const a = u * Math.PI * 2;
    return [0.617 * ring * (1 + 0.24 * vertical) * Math.cos(a),
      0.51 * vertical,
      0.408 * ring * (1 + 0.12 * vertical) * Math.sin(a)];
  }, p => gradient(p, light, dark, -0.39, 0.32), true);
}

export function createScholly(scene: T.Scene) {
  const robot = new T.Group();
  const helmet = new T.Group();
  const torso = new T.Group();
  torso.position.set(0, -0.83, -0.018);
  robot.add(torso, helmet);
  scene.add(robot);
  scene.add(new T.HemisphereLight('#becdff', '#243ba0', 1.3));
  const lights: Array<[string, number, Point]> = [
    ['#d8e8ff', 3.3, [3.4, 5, 4.1]],
    ['#40cfff', 4, [-3, 2, -4]],
    ['#205bff', 2.4, [1.8, 2, -4]],
    ['#9fccff', 0.67, [-2, 1, 5]],
    ['#30afff', 1.7, [0, -4, 1.2]],
  ];
  for (const [color, strength, position] of lights) {
    const light = new T.DirectionalLight(color, strength);
    light.position.set(...position);
    scene.add(light);
  }

  const shell = new T.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.26, metalness: 0.15,
    clearcoat: 0.76, clearcoatRoughness: 0.23 });
  const dark = new T.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.03, specularIntensity: 0.20,
    clearcoat: 0.26, clearcoatRoughness: 0.33, side: T.DoubleSide });
  const ear = new T.MeshPhysicalMaterial({ color: '#0845d6', roughness: 0.25, metalness: 0.19, clearcoat: 0.82 });
  const joints = new T.MeshPhysicalMaterial({ color: '#051d70', roughness: 0.26, metalness: 0.19 });
  const hand = new T.MeshPhysicalMaterial({ color: '#29b7f2', roughness: 0.30, metalness: 0.04, specularIntensity: 0.65,
    clearcoat: 0.70, emissive: '#045078', emissiveIntensity: 0.22 });
  const cap = new T.MeshBasicMaterial({ color: '#080e43' });
  const neon = new T.MeshBasicMaterial({ color: '#72f4ff', toneMapped: false });
  const white = new T.MeshBasicMaterial({ color: '#c6f8ff', toneMapped: false });
  const bloom = new T.MeshBasicMaterial({ color: '#19b9ff', transparent: true, opacity: 0.21, depthWrite: false, toneMapped: false });
  const lensRim = new T.MeshPhysicalMaterial({ color: '#275aea', roughness: 0.30, metalness: 0.22, emissive: '#144ab3', emissiveIntensity: 0.32 });

  function mesh(parent: T.Object3D, geometry: T.BufferGeometry, material: T.Material, position: Point = [0,0,0]) {
    const result = new T.Mesh(geometry, material);
    result.position.set(...position);
    parent.add(result);
    return result;
  }

  const sphere = new T.SphereGeometry(1, 40, 24);
  function oval(parent: T.Object3D, material: T.Material, position: Point, size: Point, tilt = 0) {
    const obj = mesh(parent, sphere, material, position);
    obj.scale.set(...size);
    obj.rotation.z = tilt;
    return obj;
  }

  function stroke(parent: T.Object3D, points: T.Vector3[], radius: number, material: T.Material, closed = false) {
    const curve = new T.CatmullRomCurve3(points, closed, 'centripetal');
    return mesh(parent, new T.TubeGeometry(curve, Math.max(22, points.length * 2), radius, 8, closed), material);
  }

  // A view-dependent edge reflection from the cyan rim light, kept on the geometry.
  shell.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>',
      'float schollyRim = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 4.4);\n' +
      'outgoingLight += vec3(0.017, 0.29, 0.88) * schollyRim;\n#include <opaque_fragment>');
  };
  mesh(helmet, helmetGeometry(), shell);
  mesh(helmet, screenGeometry(), dark);
  const rim = Array.from({ length: 120 }, (_, i) => {
    const angle = i * Math.PI * 2 / 120;
    const [x, y] = screenXY(1, angle);
    return new T.Vector3(x, y, cover(x,y) + 0.003);
  });
  stroke(helmet, rim, 0.011, lensRim, true);

  function reflection(center: FacePoint, radii: FacePoint, tilt: number, surface: (x: number,y: number) => number, tint: string, opacity: number) {
    const geometry = fromGrid(8,42,(r,u) => {
      const a = -u * Math.PI * 2;
      const width = r * radii[0] * Math.cos(a), height = r * radii[1] * Math.sin(a);
      const x = center[0] + width * Math.cos(tilt) - height * Math.sin(tilt);
      const y = center[1] + width * Math.sin(tilt) + height * Math.cos(tilt);
      return [x,y,surface(x,y)+.006];
    });
    mesh(helmet,geometry,new T.MeshBasicMaterial({color:tint,transparent:true,opacity,
      depthWrite:false,toneMapped:false}));
  }
  reflection([.48,.99],[.171,.054],-.27,shellDepth,'#ceebff',.82);
  reflection([.44,.665],[.295,.046],-.28,cover,'#859ce8',.16);

  for (const side of [-1, 1]) {
    const receiver = new T.Group();
    receiver.position.set(side * 1.039, 0.22, -0.008);
    receiver.rotation.y = side * (Math.PI / 2 - 0.16);
    helmet.add(receiver);
    oval(receiver, ear, [0,0,0.043], [0.338,0.348,0.171]);
    oval(receiver, cap, [0,0,0.184], [0.266,0.272,0.029]);
    mesh(receiver,new T.TorusGeometry(0.272,0.046,12,56),bloom,[0,0,0.195]);
    mesh(receiver,new T.TorusGeometry(0.272,0.026,12,56),neon,[0,0,0.208]);
    mesh(receiver,new T.TorusGeometry(0.263,0.010,10,56),white,[0,0,0.23]);
  }

  const body = shell.clone();
  body.onBeforeCompile = shell.onBeforeCompile;
  body.roughness = .38;
  body.clearcoat = .28;
  body.specularIntensity = .48;
  mesh(torso, beanGeometry(), body);
  for (const side of [-1,1]) {
    const strips: Point[] = [
      [side * .536, .073, .232],
      [side * .488, -.045, .252],
      [side * .418, -.187, .268],
      [side * .337, -.297, .264],
    ];
    const points = strips.map(p => new T.Vector3(...p));
    stroke(torso, points, .034, bloom);
    stroke(torso, points, .014, neon);
  }

  function badgeLine(points: Point[]) {
    const path = new T.CurvePath<T.Vector3>();
    for (let i = 1; i < points.length; i++) {
      path.add(new T.LineCurve3(new T.Vector3(...points[i-1]),new T.Vector3(...points[i])));
    }
    mesh(torso,new T.TubeGeometry(path,36,.010,8),white);
  }
  badgeLine([[-.225,.091,.376],[0,.197,.421],[.225,.091,.376],[0,-.007,.434],[-.225,.091,.376]]);
  badgeLine([[-.115,.031,.414],[-.115,-.058,.418],[0,-.106,.425],[.115,-.058,.418],[.115,.038,.414]]);
  badgeLine([[.184,.071,.401],[.184,-.065,.389]]);

  const arms = [-1,1].map(side => {
    const arm = new T.Group();
    arm.position.set(side * .548,.244,0.025);
    torso.add(arm);
    oval(arm,joints,[0,0,0],[.149,.143,.167]);
    oval(arm,ear,[0,-.130,0],[.129,.192,.134]);
    oval(arm,hand,[0,-.296,.047],[.151,.253,.140],side * -.095);
    return arm;
  });

  function faceStroke(parent: T.Object3D, points: FacePoint[], radius: number, closed = false) {
    return stroke(parent, points.map(expressionPoint), radius, neon, closed);
  }

  function capsuleEye(parent: T.Object3D, x: number, y: number, scale = 1, tilt = 0) {
    const spot = expressionPoint([x,y]);
    const shape = new T.CapsuleGeometry(.095 * scale, .201 * scale, 10, 16);
    const eye = mesh(parent, shape, neon, [spot.x,spot.y,spot.z]);
    eye.scale.z = .22;
    eye.rotation.z = tilt;
    eye.rotation.y = x * .35;
    return eye;
  }

  function arch(parent: T.Object3D, x: number, y: number, size: number, sign: number) {
    return faceStroke(parent, [[x-size,y],[x-size*.62,y+sign*size*.64],[x,y+sign*size*.86],[x+size*.62,y+sign*size*.64],[x+size,y]], .023);
  }

  const faces = new Map<Expression, T.Group>();
  const eyes: T.Mesh[] = [];
  let neutralMouth: T.Mesh | undefined;
  for (const key of ['neutral','happy','thinking','surprised','proud','concerned','sleepy','celebrating'] as const) {
    const face = new T.Group();
    helmet.add(face);
    faces.set(key,face);
    if (key === 'neutral' || key === 'thinking' || key === 'surprised' || key === 'concerned') {
      [-.447,.447].forEach((x,i) => {
        const eye = capsuleEye(face, x, key === 'surprised' ? .31 : .247, key === 'thinking' ? .78 : 1, key === 'concerned' ? (i ? .09 : -.09) : 0);
        if (key === 'neutral') eyes.push(eye);
        if (key === 'thinking') faceStroke(face, [[x-.125,.347],[x,.368],[x+.120,.395]], .018);
        if (key === 'concerned') faceStroke(face, [[x-.109,.389+(i ? .045 : 0)],[x,.407],[x+.109,.389+(i ? 0 : .045)]], .018);
      });
    }
    if (key === 'happy' || key === 'proud' || key === 'sleepy') {
      [-.447,.447].forEach(x => arch(face,x,.23,.137,key === 'happy' ? 1 : -1));
    }
    if (key === 'celebrating') {
      [-1,1].forEach(side => faceStroke(face, [[side*.545,.36],[side*.332,.261],[side*.537,.17]],.029));
      const center=expressionPoint([0,-.008]);
      oval(face,neon,[0,-.008,center.z],[.161,.102,.027]);
    } else if (key === 'surprised' || key === 'sleepy') {
      const size = key === 'surprised' ? .079 : .041;
      faceStroke(face, Array.from({length:24}, (_, i) => {
        const u = i / 24 * Math.PI * 2;
        return [size * Math.cos(u), .016 + 1.14 * size * Math.sin(u)] as FacePoint;
      }), .015, true);
    } else if (key === 'concerned' || key === 'thinking') {
      arch(face, 0, -.015, key === 'thinking' ? .091 : .106, 1);
    } else {
      const mouth = arch(face, 0, .056, key === 'happy' ? .170 : .146, -0.45);
      if (key === 'neutral') neutralMouth = mouth;
    }
  }

  const voicePosition = expressionPoint([0, 0.017]);
  const voice = oval(helmet,neon,[0, 0.017, voicePosition.z],[0.093,0.063,0.017]);
  voice.visible = false;

  const shadow = new T.Mesh(
    new T.PlaneGeometry(2.14,.25),
    new T.ShaderMaterial({
      transparent: true, depthWrite: false, blending: T.AdditiveBlending,
      vertexShader: 'varying vec2 pointUV; void main(){pointUV=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader: 'varying vec2 pointUV; void main(){vec2 p=(pointUV-0.5)*2.0; float g=exp(-dot(p,p)*4.7)*(1.0-smoothstep(0.55,1.0,length(p))); gl_FragColor=vec4(0.03,0.55,1.0,g*0.68);}',
    }),
  );
  shadow.position.set(0,-1.493,0);
  scene.add(shadow);

  function dispose() {
    const geometries = new Set<T.BufferGeometry>();
    const materials = new Set<T.Material>();
    for (const object of [robot, shadow]) {
      object.traverse(child => {
        if (!(child instanceof T.Mesh)) return;
        geometries.add(child.geometry);
        if (Array.isArray(child.material)) child.material.forEach(material => materials.add(material));
        else materials.add(child.material);
      });
      object.removeFromParent();
    }
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
  }

  return { robot, helmet, arms, faces, eyes, neutralMouth, shadow, voice, dispose };
}

