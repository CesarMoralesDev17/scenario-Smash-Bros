const wrap = document.getElementById('wrap');
const canvas = document.getElementById('c');
const W = wrap.clientWidth, H = wrap.clientHeight;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(W, H);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080818);
scene.fog = new THREE.Fog(0x080818, 25, 55);

const camera = new THREE.PerspectiveCamera(58, W / H, 0.1, 100);
camera.position.set(0, 9, 18);
camera.lookAt(0, 1, 0);

// -- LIGHTS --
scene.add(new THREE.AmbientLight(0x223355, 2));

const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(8, 16, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left   = -20;
sun.shadow.camera.right  =  20;
sun.shadow.camera.top    =  20;
sun.shadow.camera.bottom = -20;
scene.add(sun);

const blueL = new THREE.PointLight(0x4466ff, 3, 14);
blueL.position.set(-6, 4, 2);
scene.add(blueL);

const redL = new THREE.PointLight(0xff3333, 3, 14);
redL.position.set(6, 4, 2);
scene.add(redL);

// -- PLATFORMS --
function makePlatform(x, y, w, d) {
    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(w, 0.5, d),
        new THREE.MeshPhongMaterial({ color: 0x1a2244, specular: 0x4466aa, shininess: 80 })
    );
    mesh.position.set(x, y, 0);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    scene.add(mesh);

    const edge = new THREE.Mesh(
        new THREE.BoxGeometry(w, 0.07, d + 0.1),
        new THREE.MeshPhongMaterial({ color: 0x88aaff, emissive: 0x2244aa, emissiveIntensity: 0.8 })
    );
    edge.position.set(x, y + 0.28, 0);
    scene.add(edge);

    return { x, y: y + 0.25, hw: w / 2 };
}

const pMain  = makePlatform(0,  0, 16, 5);
const pLeft  = makePlatform(-6, 3,  4, 3);
const pRight = makePlatform( 6, 3,  4, 3);
const allPlatforms = [pMain, pLeft, pRight];

// -- PILLARS --
[-10, -6, -2, 2, 6, 10].forEach(x => {
    const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.3, 10, 8),
        new THREE.MeshPhongMaterial({ color: 0x111133 })
    );
    pillar.position.set(x, 4, -5);
    scene.add(pillar);
});

// -- STARS --
const starGeo = new THREE.BufferGeometry();
const starPos = [];
for (let i = 0; i < 400; i++) {
    starPos.push(
        (Math.random() - 0.5) * 80,
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 30 - 10
    );
}
starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.1 })));

// -- FIGHTER --
function makeFighter(x, bodyCol, emCol) {
    const group = new THREE.Group();

    const bodyM = new THREE.MeshPhongMaterial({ color: bodyCol, emissive: emCol, emissiveIntensity: 0.25, shininess: 100 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.8), bodyM);
    body.castShadow = true;
    group.add(body);

    const headM = new THREE.MeshPhongMaterial({ color: bodyCol, emissive: emCol, emissiveIntensity: 0.25, shininess: 120 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 14), headM);
    head.position.y = 0.88;
    head.castShadow = true;
    group.add(head);

    const eyeM = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.6 });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), eyeM);
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), eyeM);
    eyeL.position.set(-0.13, 0.92, 0.26);
    eyeR.position.set( 0.13, 0.92, 0.26);
    group.add(eyeL);
    group.add(eyeR);

    const legM = new THREE.MeshPhongMaterial({ color: 0x111133 });
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.5, 0.25), legM);
    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.5, 0.25), legM);
    legL.position.set(-0.22, -0.72, 0);
    legR.position.set( 0.22, -0.72, 0);
    legL.castShadow = true;
    legR.castShadow = true;
    group.add(legL);
    group.add(legR);

    group.position.set(x, pMain.y + 0.5, 0);
    scene.add(group);

    return {
        group, body, head, legL, legR, bodyM, headM,
        baseColor: bodyCol,
        vx: 0, vy: 0,
        onGround: true, jumps: 2,
        facing: x > 0 ? -1 : 1
    };
}

let p1 = makeFighter(-3.5, 0x2255ee, 0x0022aa);
let p2 = makeFighter( 3.5, 0xee2222, 0xaa0000);

// -- INPUT --
const keys = {};
document.addEventListener('keydown', e => { keys[e.code] = true; });
document.addEventListener('keyup',   e => { keys[e.code] = false; });

const GRAVITY = -0.018;
const JUMP    =  0.27;

function getLandY(fighter) {
    const fx = fighter.group.position.x;
    const fy = fighter.group.position.y;
    for (const pl of allPlatforms) {
        if (
            fx > pl.x - pl.hw && fx < pl.x + pl.hw &&
            fy - 0.5 <= pl.y + 0.1 &&
            fy - 0.5 >= pl.y - 0.35 &&
            fighter.vy <= 0
        ) return pl.y + 0.5;
    }
    return null;
}

function updateFighter(f, left, right, up) {
    if (keys[left])        { f.vx = -0.09; f.facing = -1; }
    else if (keys[right])  { f.vx =  0.09; f.facing =  1; }
    else                   { f.vx *= 0.65; }

    if (keys[up] && f.jumps > 0) {
        f.vy = JUMP;
        f.jumps--;
        f.onGround = false;
        keys[up] = false;
    }

    f.vy += GRAVITY;
    f.group.position.x += f.vx;
    f.group.position.y += f.vy;

    const ly = getLandY(f);
    if (ly !== null) {
        f.group.position.y = ly;
        f.vy = 0;
        f.onGround = true;
        f.jumps = 2;
    } else {
        f.onGround = false;
    }

    if (f.group.position.y < -6) {
        f.group.position.set(f === p1 ? -3.5 : 3.5, pMain.y + 0.5, 0);
        f.vx = 0; f.vy = 0; f.onGround = true; f.jumps = 2;
    }

    f.group.position.x = Math.max(-10, Math.min(10, f.group.position.x));

    const t = Date.now() * 0.006;
    const walking = Math.abs(f.vx) > 0.02;
    f.legL.position.z =  (walking ? Math.sin(t * 1.8) * 0.2 : 0);
    f.legR.position.z = -(walking ? Math.sin(t * 1.8) * 0.2 : 0);

    const bob = f.onGround ? Math.sin(t * 0.9) * 0.03 : 0;
    f.body.position.y = bob;
    f.head.position.y = 0.88 + bob;
    f.body.scale.y = f.onGround ? 1.0 : 1.1;
    f.body.scale.x = f.onGround ? 1.0 : 0.92;

    f.group.rotation.y = f.facing === -1 ? Math.PI : 0;
}

// -- LOOP --
function animate() {
    requestAnimationFrame(animate);

    const t = Date.now() * 0.001;

    updateFighter(p1, 'KeyA', 'KeyD', 'KeyW');
    updateFighter(p2, 'ArrowLeft', 'ArrowRight', 'ArrowUp');

    blueL.intensity = 2.5 + Math.sin(t * 1.3) * 0.8;
    redL.intensity  = 2.5 + Math.cos(t * 1.3) * 0.8;

    camera.position.x = (p1.group.position.x + p2.group.position.x) * 0.08;
    camera.lookAt(camera.position.x, 1, 0);

    renderer.render(scene, camera);
}

animate();