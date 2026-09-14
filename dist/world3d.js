import * as THREE from './assets/three.module.js';
import { GLTFLoader } from './assets/GLTFLoader.js';
import { Water } from './assets/Water.js';

// All landscape forms are closed, world-space meshes. Only light glows use sprites.
export function createWorld(scene, mobile) {
  let seed=92741;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const colliders=[],landMeshes=[];
  const textureLoader=new THREE.TextureLoader();
  function texture(name,color=false){const t=textureLoader.load('./assets/pbr/'+name+'.jpg');t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;if(color)t.colorSpace=THREE.SRGBColorSpace;return t;}
  const rockColor=texture('mossy_rock_diff',true),rockNormal=texture('mossy_rock_nor_gl'),rockRough=texture('mossy_rock_rough');
  const grassColor=texture('forest_ground_04_diff',true);
  const root=new THREE.Group();root.name='three-dimensional-landscape';scene.add(root);
  const rockMat=new THREE.MeshStandardMaterial({color:0xd5d6c5,map:rockColor,normalMap:rockNormal,roughnessMap:rockRough,roughness:1,normalScale:new THREE.Vector2(.75,.75)});
  rockMat.onBeforeCompile=shader=>{
    shader.uniforms.uRock={value:rockColor};shader.uniforms.uGrass={value:grassColor};
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vStone;varying vec3 vStoneNormal;');
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvStone=(modelMatrix*vec4(position,1.)).xyz;vStoneNormal=normal;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vStone;varying vec3 vStoneNormal;uniform sampler2D uRock;uniform sampler2D uGrass;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`vec3 w=pow(abs(normalize(vStoneNormal)),vec3(5.));w/=w.x+w.y+w.z;vec3 r=texture2D(uRock,vStone.yz*.16).rgb*w.x+texture2D(uRock,vStone.xz*.16).rgb*w.y+texture2D(uRock,vStone.xy*.16).rgb*w.z;vec3 grass=texture2D(uGrass,vStone.xz*.2).rgb*vec3(.75,1.15,.65);float slope=smoothstep(.48,.82,normalize(vStoneNormal).y);diffuseColor.rgb*=mix(r,grass,slope*.85);`);
  };
  function mountain(x,z,r,h,stretch=1){
    const n=mobile?40:64,positions=[],uvs=[],indices=[];const phase=random()*6.28;
    for(let j=0;j<=n;j++)for(let i=0;i<=n;i++){
      const u=i/n*2-1,v=j/n*2-1;
      const d=u*u+v*v;
      const base=Math.exp(-d*2.7);
      const shoulder=.38*Math.exp(-((u-.2-Math.sin(phase)*.15)**2+(v+.14)**2)*10)+.28*Math.exp(-((u+.28)**2+(v-.15-Math.cos(phase)*.15)**2)*15);
      const noise=Math.sin(u*11+phase)*Math.cos(v*9-phase)*.06+Math.sin(u*23+v*17+phase)*.026+Math.cos(u*41-v*29)*.012;
      const edge=Math.pow(Math.max(0,1-Math.pow(Math.max(Math.abs(u),Math.abs(v)),3)),1.3);
      const shape=h<15?Math.pow(Math.max(0,1-d),.8)*.62:(base*.67+shoulder+noise)*edge;
      positions.push(u*r*1.25,-1.8+h*shape,v*r*stretch*1.25);uvs.push(i/n*r*.4,j/n*r*.4);
      if(i<n&&j<n){const k=j*(n+1)+i;indices.push(k,k+n+1,k+1,k+1,k+n+1,k+n+2);}
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();const m=new THREE.Mesh(g,rockMat);m.position.set(x,0,z);m.castShadow=true;m.receiveShadow=true;root.add(m);landMeshes.push(m);colliders.push({x,z,rx:r*1.3,rz:r*stretch*1.3});return m;
  }
  // Foreground landing, village islands, river corridor, and 360-degree distant peaks.
  const islands=[[-27,22,13,8,1.2],[27,-16,15,11,1.55],[-31,-49,16,10,1.3],[28,-87,12,8,1.2],[-34,-107,17,13,1.1]];
  for(const i of islands)mountain(...i);
  for(const m of [[42,-25,14,46,1.1],[57,-48,20,69,1.05],[76,-63,19,52,1.4],[-56,-38,20,65,1.1],[-72,-63,22,82,1.05],[-50,-96,17,54,1.2],[40,-112,22,70,1.1],[9,-151,25,92,1],[-26,-155,19,65,1.4],[75,20,20,63,1],[-69,48,23,62,1.3],[39,77,24,78,1],[-24,99,23,60,1.1]])mountain(...m);
  for(let i=0;i<21;i++){const a=i/21*Math.PI*2;mountain(Math.cos(a)*185,-40+Math.sin(a)*177,21+random()*19,40+random()*57,.9+random()*.6);}

  function batch(geo,mat){const matrices=[],colors=[];return {add(p,s,q,color){const o=new THREE.Object3D();o.position.copy(p);o.scale.copy(s);if(q)o.quaternion.copy(q);o.updateMatrix();matrices.push(o.matrix.clone());colors.push(new THREE.Color(color));},flush(){const mesh=new THREE.InstancedMesh(geo,mat,matrices.length);matrices.forEach((m,i)=>{mesh.setMatrixAt(i,m);mesh.setColorAt(i,colors[i]);});mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;root.add(mesh);return mesh;}};}
  const bark=batch(new THREE.CylinderGeometry(1,1,1,7),new THREE.MeshStandardMaterial({color:0xffffff,roughness:1}));
  const foliage=batch(new THREE.IcosahedronGeometry(1,1),new THREE.MeshStandardMaterial({color:0xffffff,roughness:1}));
  const stones=batch(new THREE.IcosahedronGeometry(1,2),new THREE.MeshStandardMaterial({color:0xffffff,map:rockColor,normalMap:rockNormal,roughness:1}));
  const up=new THREE.Vector3(0,1,0);
  function branch(a,b,r){const delta=b.clone().sub(a);bark.add(a.clone().add(b).multiplyScalar(.5),new THREE.Vector3(r,delta.length(),r),new THREE.Quaternion().setFromUnitVectors(up,delta.normalize()),'#594e35');}
  const treePlacements=[];
  function pine(x,y,z,size=1){treePlacements.push({x,z,size});}
  // Trees and stones cluster on low islands without becoming transparent cards.
  for(const [x,z,r,h,stretch] of islands){
    for(let i=0;i<4;i++){const a=i/4*6.28,d=r*(.6+random()*.12);pine(x+Math.cos(a)*d,2.1,z+Math.sin(a)*d*stretch,.65+random()*.5);}
    for(let i=0;i<18;i++){const a=random()*6.28;stones.add(new THREE.Vector3(x+Math.cos(a)*r,random()*.3,z+Math.sin(a)*r*stretch),new THREE.Vector3(1.2+random()*2,.8+random(),1+random()*2),null,'#a2aaa0');}
  }
  pine(-18,1,34,1.8);pine(-25,3,27,1.4);pine(18,2,-1,1.35);
  // Load real botanical geometry, optimized from the source model.
  root.updateMatrixWorld(true);
  const downRay=new THREE.Raycaster();
  function ground(x,z){downRay.set(new THREE.Vector3(x,130,z),new THREE.Vector3(0,-1,0));return downRay.intersectObjects(landMeshes,false)[0]?.point.y??0;}
  const assetsReady=Promise.all([
    new GLTFLoader().loadAsync(mobile?'./assets/tree_small_02/tree-mobile.gltf':'./assets/tree_small_02/tree-optimized.gltf').then(gltf=>{
      const source=gltf.scene;source.updateMatrixWorld(true);
      source.traverse(part=>{if(!part.isMesh)return;const material=part.material.clone();material.roughness=.9;material.envMapIntensity=.6;material.side=THREE.DoubleSide;material.transparent=false;material.alphaTest=.1;material.color.multiply(new THREE.Color('#b7da8d'));const mesh=new THREE.InstancedMesh(part.geometry,material,treePlacements.length);const o=new THREE.Object3D();treePlacements.forEach((p,i)=>{o.position.set(p.x,ground(p.x,p.z)-.15,p.z);o.rotation.y=i*2.39;o.scale.setScalar(p.size*1.8);o.updateMatrix();mesh.setMatrixAt(i,o.matrix.clone().multiply(part.matrixWorld));});mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);});
    }),
    new GLTFLoader().loadAsync('./assets/rock_face_01/model.gltf').then(gltf=>{gltf.scene.updateMatrixWorld(true);gltf.scene.traverse(part=>{if(!part.isMesh)return;const placements=[];for(const [x,z,r,h,stretch]of islands)for(let i=0;i<6;i++){const a=i/6*6.28;placements.push({x:x+Math.cos(a)*r*.92,z:z+Math.sin(a)*r*stretch*.92,a});}const mesh=new THREE.InstancedMesh(part.geometry,part.material,placements.length);const o=new THREE.Object3D();placements.forEach((p,i)=>{o.position.set(p.x,-.4,p.z);o.rotation.set(0,-p.a+Math.PI/2,0);o.scale.setScalar(1.1+(i%3)*.3);o.updateMatrix();mesh.setMatrixAt(i,o.matrix.clone().multiply(part.matrixWorld));});mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);});})
  ]);
  stones.flush();

  const bladeGeo=new THREE.BufferGeometry();bladeGeo.setAttribute('position',new THREE.Float32BufferAttribute([-.045,0,0,.045,0,0,-.035,.33,.025,.035,.33,.025,-.015,.65,.10,.015,.65,.10,0,.88,.19],3));bladeGeo.setIndex([0,1,2,1,3,2,2,3,4,3,5,4,4,5,6]);bladeGeo.computeVertexNormals();
  const grassMat=new THREE.MeshStandardMaterial({color:0xffffff,side:THREE.DoubleSide,roughness:1});const wind={value:0};
  grassMat.onBeforeCompile=shader=>{shader.uniforms.uWind=wind;shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float uWind;');shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x+=sin(uWind*1.4+instanceMatrix[3].x*.45+instanceMatrix[3].z*.3)*position.y*position.y*.12;');};
  const grassPositions=[];for(const[x,z,r,h,stretch]of islands){for(let i=0;i<(mobile?1900:4400);i++){const a=random()*6.28,d=Math.sqrt(random())*r*.9,gx=x+Math.cos(a)*d,gz=z+Math.sin(a)*d*stretch;const y=ground(gx,gz);if(y>.4&&y<11)grassPositions.push([gx,y-.02,gz]);}}
  const grasses=new THREE.InstancedMesh(bladeGeo,grassMat,grassPositions.length),grassObj=new THREE.Object3D(),grassColorShade=new THREE.Color();grassPositions.forEach((p,i)=>{grassObj.position.set(...p);grassObj.rotation.y=random()*6.28;grassObj.scale.set(.5+random()*.5,.25+random()*.45,.5+random()*.5);grassObj.updateMatrix();grasses.setMatrixAt(i,grassObj.matrix);grassColorShade.setHSL(.20+random()*.07,.35+random()*.25,.18+random()*.16);grasses.setColorAt(i,grassColorShade);});grasses.receiveShadow=true;root.add(grasses);
  const plaster=new THREE.MeshStandardMaterial({color:0xd1c39a,roughness:1});
  const timber=new THREE.MeshStandardMaterial({color:0xc3a77f,map:texture('wood_planks_diff',true),normalMap:texture('wood_planks_nor_gl'),roughnessMap:texture('wood_planks_rough'),roughness:1});
  const roofMat=new THREE.MeshStandardMaterial({color:0x87918b,map:texture('grey_roof_tiles_diff',true),normalMap:texture('grey_roof_tiles_nor_gl'),roughness:.95});
  const rimMat=new THREE.MeshStandardMaterial({color:0x8e8060,roughness:.8});
  const windowMat=new THREE.MeshBasicMaterial({color:0xffce75});
  function box(w,h,d,mat,x,y,z,parent=root){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.castShadow=true;m.receiveShadow=true;m.position.set(x,y,z);parent.add(m);return m;}
  function roof(w,d,h,parent,y){
    const v=[-w/2,0,-d/2,w/2,0,-d/2,-w/2,h,0,w/2,h,0,-w/2,0,d/2,w/2,0,d/2];
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,2,0,0,1,2,1,0,2,2,2],2));g.setIndex([0,2,1,1,2,3,2,4,3,3,4,5,0,1,4,4,1,5,0,4,2,1,3,5]);g.computeVertexNormals();const m=new THREE.Mesh(g,roofMat);m.position.y=y;parent.add(m);
    for(const z of [-d/2,d/2])box(w+.15,.1,.12,rimMat,0,y+.04,z,parent);box(w+.3,.16,.16,rimMat,0,y+h+.03,0,parent);
    // Upturned ends of each tiled ridge.
    for(const side of [-1,1]){const tip=box(.7,.12,.17,rimMat,side*(w/2+.13),y+h+.12,0,parent);tip.rotation.z=side*.22;}
  }
  function house(x,y,z,rotation=0,scale=1){
    const g=new THREE.Group();g.position.set(x,ground(x,z)-.1,z);g.rotation.y=rotation;g.scale.setScalar(scale);root.add(g);
    box(3,1.9,2.2,plaster,0,.95,0,g);roof(3.9,3.05,1.05,g,1.85);
    for(const s of [-1,1])for(const wx of [-.82,.82]){box(.48,.67,.04,windowMat,wx,1.02,s*1.12,g);box(.06,.68,.07,timber,wx,1.02,s*1.15,g);box(.49,.06,.07,timber,wx,1.03,s*1.15,g);}
    for(const wx of [-1.46,1.46])box(.12,1.96,2.25,timber,wx,.95,0,g);
    box(.56,1.2,.07,timber,0,.6,1.14,g);return g;
  }
  house(17.7,1.7,-12,.45,1.2);house(20.5,2.5,-20,-.22,.9);house(25,3.3,-29,.8,1.1);house(-22,1.6,-43,-.8,1.1);house(-28,2.9,-51,.3,1.25);house(21,1.5,-87,.2,1);
  function pavilion(x,y,z){const g=new THREE.Group();g.position.set(x,ground(x,z),z);root.add(g);box(4,.4,4,rimMat,0,.2,0,g);for(const a of [-1.5,1.5])for(const b of [-1.5,1.5])box(.16,2.9,.16,timber,a,1.75,b,g);roof(4.8,4.8,1.4,g,3.1);roof(3.2,3.2,1,g,4.25);const globe=new THREE.Mesh(new THREE.SphereGeometry(.3,10,8),windowMat);globe.position.set(0,2.35,0);g.add(globe);}
  pavilion(31,9,-15);pavilion(-33,8,-47);
  // Arched bridge has an open passage, deck thickness and rail posts on both sides.
  const bridge=new THREE.Group();bridge.position.set(21,.25,-58);bridge.rotation.y=.28;root.add(bridge);
  const shape=new THREE.Shape();shape.moveTo(-8,0);for(let i=0;i<=24;i++){let x=-8+i*16/24;shape.lineTo(x,1.05+2.8*Math.sin((x+8)/16*Math.PI));}shape.lineTo(8,0);shape.lineTo(6,0);for(let i=0;i<=24;i++){let x=6-i*12/24;shape.lineTo(x,Math.max(0,2.6*Math.sin((x+6)/12*Math.PI)));}shape.lineTo(-8,0);
  const arch=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:2.3,bevelEnabled:false,curveSegments:24}),rimMat);arch.position.z=-1.15;bridge.add(arch);
  for(const side of [-1.2,1.2])for(let i=0;i<=16;i++){const x=-8+i;const y=1.05+2.8*Math.sin(i/16*Math.PI);box(.14,.7,.14,rimMat,x,y+.3,side,bridge);if(i<16){const next=1.05+2.8*Math.sin((i+1)/16*Math.PI),rail=box(1.04,.13,.14,rimMat,x+.5,(y+next)/2+.65,side,bridge);rail.rotation.z=Math.atan2(next-y,1);}}
  colliders.push({x:21,z:-58,rx:9,rz:2.8});

  // A small dock grounds the start point in the landscape.
  for(let i=0;i<13;i++)box(3.2,.16,.48,timber,-12,.4,31-i*.5);
  for(const x of [-13.4,-10.6])for(const z of [25,30])box(.18,1.6,.18,timber,x,-.08,z);

  const sky=new THREE.Mesh(new THREE.SphereGeometry(480,36,20),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{uRain:{value:0}},vertexShader:`varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec3 vP;uniform float uRain;void main(){float h=clamp(normalize(vP).y,0.,1.);vec3 col=mix(vec3(.46,.62,.62),vec3(.075,.22,.34),pow(h,.45));col=mix(col,vec3(.08,.14,.15),uRain*.5);gl_FragColor=vec4(col,1.);
      #include <colorspace_fragment>
    }`}));scene.add(sky);
  const moon=new THREE.Mesh(new THREE.SphereGeometry(6,24,18),new THREE.MeshBasicMaterial({color:0xffe2a4}));moon.position.set(80,100,-240);scene.add(moon);
  const starsGeo=new THREE.BufferGeometry(),starPoints=[];for(let i=0;i<220;i++){const a=random()*6.28,y=.2+random()*.75,r=400;starPoints.push(Math.cos(a)*r*Math.sqrt(1-y*y),r*y,Math.sin(a)*r*Math.sqrt(1-y*y));}starsGeo.setAttribute('position',new THREE.Float32BufferAttribute(starPoints,3));const stars=new THREE.Points(starsGeo,new THREE.PointsMaterial({color:0xf9e9c0,size:.5,transparent:true,opacity:.5,depthWrite:false}));scene.add(stars);

  const waterNormals=textureLoader.load('./assets/waternormals.jpg');waterNormals.wrapS=waterNormals.wrapT=THREE.RepeatWrapping;
  const water=new Water(new THREE.PlaneGeometry(1500,1500),{textureWidth:mobile?512:1024,textureHeight:mobile?512:1024,waterNormals,sunDirection:new THREE.Vector3(-.65,.65,-.35).normalize(),sunColor:0xffdfaa,waterColor:0x0c595a,distortionScale:1.2,alpha:1,fog:true});water.rotation.x=-Math.PI/2;water.position.y=-.12;water.material.uniforms.size.value=5;water.material.fragmentShader=water.material.fragmentShader.replace('float rf0 = 0.3;','float rf0 = 0.12;').replace('vec3( 0.1 ) + reflectionSample * 0.9 + reflectionSample * specularLight','vec3( 0.02 ) + reflectionSample * 0.72 + reflectionSample * specularLight * 0.3');scene.add(water);
  const boat=new THREE.Group();boat.name='visitor-boat';scene.add(boat);
  const hullShape=new THREE.Shape();hullShape.moveTo(0,-2.2);hullShape.quadraticCurveTo(1.05,-1.2,.85,1.4);hullShape.quadraticCurveTo(0,2.0,-.85,1.4);hullShape.quadraticCurveTo(-1.05,-1.2,0,-2.2);
  const hull=new THREE.Mesh(new THREE.ExtrudeGeometry(hullShape,{depth:.32,bevelEnabled:true,bevelSegments:1,bevelSize:.13,bevelThickness:.12,steps:1}),timber);hull.rotation.x=Math.PI/2;hull.position.y=.25;boat.add(hull);
  for(let i=0;i<9;i++)box(1.48,.05,.03,rimMat,0,.29,-1.4+i*.35,boat);
  const seat=box(1.7,.12,.34,timber,0,.54,.8,boat);
  const oar=box(.07,.08,3.7,rimMat,1.35,.46,.15,boat);oar.rotation.y=.35;
  const oarBlade=box(.32,.07,.72,rimMat,1.91,.42,1.66,boat);oarBlade.rotation.y=.35;

  function canMove(x,z,padding=2.15){
    if(x*x+(z+35)*(z+35)>122*122)return false;
    return !colliders.some(c=>((x-c.x)/(c.rx+padding))**2+((z-c.z)/(c.rz+padding))**2<1);
  }
  function update(t,rain){water.material.uniforms.time.value=t*.35;wind.value=t;sky.material.uniforms.uRain.value=rain;stars.material.opacity=.5*(1-rain*.8);boat.position.y=Math.sin(t*1.1)*.045;boat.rotation.z=Math.sin(t*.7)*.012;}
  return {boat,water,root,canMove,update,colliders,landMeshes,assetsReady};
}
