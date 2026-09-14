import * as THREE from './assets/three.module.js';
import { Reflector } from './assets/Reflector.js';

// All landscape forms are closed, world-space meshes. Only light glows use sprites.
export function createWorld(scene, mobile) {
  let seed=92741;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const colliders=[],landMeshes=[];
  const inkTexture=new THREE.TextureLoader().load('./assets/painting.png');inkTexture.colorSpace=THREE.SRGBColorSpace;inkTexture.wrapS=inkTexture.wrapT=THREE.RepeatWrapping;
  const root=new THREE.Group();root.name='three-dimensional-landscape';scene.add(root);
  const rockMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.96,metalness:.02});
  rockMat.onBeforeCompile=shader=>{
    shader.uniforms.uInk={value:inkTexture};
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vStone;');
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvStone=position;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      varying vec3 vStone;uniform sampler2D uInk;
      float grain(vec3 p){return fract(sin(dot(p,vec3(12.98,78.23,31.17)))*43758.54);}`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float n=grain(floor(vStone*32.));
      float veins=sin(vStone.y*1.3+sin(vStone.x*1.8+vStone.z*.7)*2.4);
      float fine=pow(max(0.,sin(vStone.x*8.+vStone.z*5.+sin(vStone.y*.6)*3.)),18.);
      vec3 ink=texture2D(uInk,vec2(vStone.x*.033+vStone.z*.019,vStone.y*.028)).rgb;
      float brush=dot(ink,vec3(.3,.5,.2));
      diffuseColor.rgb*=.57+n*.2+veins*.065+brush*2.2;
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.31,.25,.12),fine*.12);`);
  };
  function mountain(x,z,r,h,stretch=1){
    const seg=mobile?28:38,rings=mobile?21:29,positions=[],colors=[],indices=[];
    const phase=random()*6.28,c1=new THREE.Color('#0c353a'),c2=new THREE.Color('#397b7b'),color=new THREE.Color();
    for(let j=0;j<=rings;j++){
      const v=j/rings;
      for(let i=0;i<=seg;i++){
        const a=i/seg*Math.PI*2;
        const ridge=1+.17*Math.sin(a*3+v*5+phase)+.07*Math.sin(a*9-v*10);
        const rr=Math.pow(1-v,.64)*r*ridge;
        const px=Math.cos(a)*rr+Math.sin(v*2.6+phase)*r*.20*v;
        const pz=Math.sin(a)*rr*stretch+Math.cos(v*3+phase)*r*.12*v;
        const py=-1.6+v*h+Math.sin(a*5+v*12+phase)*Math.sin(v*Math.PI)*h*.025;
        positions.push(px,py,pz);
        color.copy(c1).lerp(c2,THREE.MathUtils.clamp(v*.48+(Math.cos(a-1)*.5+.5)*.32+random()*.1,0,1));
        colors.push(color.r,color.g,color.b);
        if(j<rings&&i<seg){const n=j*(seg+1)+i;indices.push(n,n+seg+1,n+1,n+1,n+seg+1,n+seg+2);}
      }
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();
    const m=new THREE.Mesh(g,rockMat);m.position.set(x,0,z);root.add(m);landMeshes.push(m);colliders.push({x,z,rx:r*1.28,rz:r*stretch*1.28});return m;
  }
  // Foreground landing, village islands, river corridor, and 360-degree distant peaks.
  const islands=[[-27,22,13,8,1.2],[27,-16,15,11,1.55],[-31,-49,16,10,1.3],[28,-87,12,8,1.2],[-34,-107,17,13,1.1]];
  for(const i of islands)mountain(...i);
  for(const m of [[42,-25,14,46,1.1],[57,-48,20,69,1.05],[76,-63,19,52,1.4],[-56,-38,20,65,1.1],[-72,-63,22,82,1.05],[-50,-96,17,54,1.2],[40,-112,22,70,1.1],[9,-151,25,92,1],[-26,-155,19,65,1.4],[75,20,20,63,1],[-69,48,23,62,1.3],[39,77,24,78,1],[-24,99,23,60,1.1]])mountain(...m);
  for(let i=0;i<21;i++){const a=i/21*Math.PI*2;mountain(Math.cos(a)*185,-40+Math.sin(a)*177,21+random()*19,40+random()*57,.9+random()*.6);}

  function batch(geo,mat){const matrices=[],colors=[];return {add(p,s,q,color){const o=new THREE.Object3D();o.position.copy(p);o.scale.copy(s);if(q)o.quaternion.copy(q);o.updateMatrix();matrices.push(o.matrix.clone());colors.push(new THREE.Color(color));},flush(){const mesh=new THREE.InstancedMesh(geo,mat,matrices.length);matrices.forEach((m,i)=>{mesh.setMatrixAt(i,m);mesh.setColorAt(i,colors[i]);});mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;root.add(mesh);return mesh;}};}
  const bark=batch(new THREE.CylinderGeometry(1,1,1,7),new THREE.MeshStandardMaterial({color:0xffffff,roughness:1}));
  const foliage=batch(new THREE.IcosahedronGeometry(1,1),new THREE.MeshStandardMaterial({color:0xffffff,roughness:1}));
  const stones=batch(new THREE.IcosahedronGeometry(1,1),new THREE.MeshStandardMaterial({color:0xffffff,roughness:1}));
  const up=new THREE.Vector3(0,1,0);
  function branch(a,b,r){const delta=b.clone().sub(a);bark.add(a.clone().add(b).multiplyScalar(.5),new THREE.Vector3(r,delta.length(),r),new THREE.Quaternion().setFromUnitVectors(up,delta.normalize()),'#594e35');}
  function pine(x,y,z,size=1){
    const h=(4+random()*1.2)*size,a=new THREE.Vector3(x,y,z),b=new THREE.Vector3(x+.32*size,y+h,z+.22*size);
    branch(a,b,.17*size);
    for(let j=0;j<5;j++){
      const az=j*2.4+random()*.8,level=.45+j*.115,length=(1.6-j*.15)*size;
      const start=a.clone().lerp(b,level),end=start.clone().add(new THREE.Vector3(Math.cos(az)*length,.3*size,Math.sin(az)*length));
      branch(start,end,.07*size);
      for(let k=0;k<3;k++){const p=end.clone().add(new THREE.Vector3((random()-.5)*size,.13*k*size,(random()-.5)*size));foliage.add(p,new THREE.Vector3((1.1+random()*.35)*size,.24*size,(.7+random()*.3)*size),null,k%2?'#163c31':'#31573b');}
    }
  }
  // Trees and stones cluster on low islands without becoming transparent cards.
  for(const [x,z,r,h,stretch] of islands){
    for(let i=0;i<11;i++){const a=i/11*6.28,d=r*(.6+random()*.12);pine(x+Math.cos(a)*d,2.1,z+Math.sin(a)*d*stretch,.65+random()*.5);}
    for(let i=0;i<18;i++){const a=random()*6.28;stones.add(new THREE.Vector3(x+Math.cos(a)*r,random()*.3,z+Math.sin(a)*r*stretch),new THREE.Vector3(1.2+random()*2,.8+random(),1+random()*2),null,'#3d6252');}
  }
  pine(-18,1,34,1.8);pine(-25,3,27,1.4);pine(18,2,-1,1.35);
  bark.flush();foliage.flush();stones.flush();

  const plaster=new THREE.MeshStandardMaterial({color:0xd1c39a,roughness:1});
  const timber=new THREE.MeshStandardMaterial({color:0x4a3321,roughness:1});
  const roofMat=new THREE.MeshStandardMaterial({color:0x223b37,roughness:.88});
  const rimMat=new THREE.MeshStandardMaterial({color:0x8e8060,roughness:.8});
  const windowMat=new THREE.MeshBasicMaterial({color:0xffce75});
  function box(w,h,d,mat,x,y,z,parent=root){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);parent.add(m);return m;}
  function roof(w,d,h,parent,y){
    const v=[-w/2,0,-d/2,w/2,0,-d/2,-w/2,h,0,w/2,h,0,-w/2,0,d/2,w/2,0,d/2];
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setIndex([0,2,1,1,2,3,2,4,3,3,4,5,0,1,4,4,1,5,0,4,2,1,3,5]);g.computeVertexNormals();const m=new THREE.Mesh(g,roofMat);m.position.y=y;parent.add(m);
    for(const z of [-d/2,d/2])box(w+.15,.1,.12,rimMat,0,y+.04,z,parent);box(w+.3,.16,.16,rimMat,0,y+h+.03,0,parent);
    // Upturned ends of each tiled ridge.
    for(const side of [-1,1]){const tip=box(.7,.12,.17,rimMat,side*(w/2+.13),y+h+.12,0,parent);tip.rotation.z=side*.22;}
  }
  function house(x,y,z,rotation=0,scale=1){
    const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=rotation;g.scale.setScalar(scale);root.add(g);
    box(3,1.9,2.2,plaster,0,.95,0,g);roof(3.9,3.05,1.05,g,1.85);
    for(const s of [-1,1])for(const wx of [-.82,.82]){box(.48,.67,.04,windowMat,wx,1.02,s*1.12,g);box(.06,.68,.07,timber,wx,1.02,s*1.15,g);box(.49,.06,.07,timber,wx,1.03,s*1.15,g);}
    for(const wx of [-1.46,1.46])box(.12,1.96,2.25,timber,wx,.95,0,g);
    box(.56,1.2,.07,timber,0,.6,1.14,g);return g;
  }
  house(17.7,1.7,-12,.45,1.2);house(20.5,2.5,-20,-.22,.9);house(25,3.3,-29,.8,1.1);house(-22,1.6,-43,-.8,1.1);house(-28,2.9,-51,.3,1.25);house(21,1.5,-87,.2,1);
  function pavilion(x,y,z){const g=new THREE.Group();g.position.set(x,y,z);root.add(g);box(4,.4,4,rimMat,0,.2,0,g);for(const a of [-1.5,1.5])for(const b of [-1.5,1.5])box(.16,2.9,.16,timber,a,1.75,b,g);roof(4.8,4.8,1.4,g,3.1);roof(3.2,3.2,1,g,4.25);const globe=new THREE.Mesh(new THREE.SphereGeometry(.3,10,8),windowMat);globe.position.set(0,2.35,0);g.add(globe);}
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

  const sky=new THREE.Mesh(new THREE.SphereGeometry(480,36,20),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{uRain:{value:0}},vertexShader:`varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec3 vP;uniform float uRain;void main(){float h=clamp(normalize(vP).y,0.,1.);vec3 col=mix(vec3(.12,.23,.23),vec3(.012,.046,.060),pow(h,.45));col=mix(col,vec3(.08,.14,.15),uRain*.5);gl_FragColor=vec4(col,1.);
      #include <colorspace_fragment>
    }`}));scene.add(sky);
  const moon=new THREE.Mesh(new THREE.SphereGeometry(6,24,18),new THREE.MeshBasicMaterial({color:0xffe2a4}));moon.position.set(80,100,-240);scene.add(moon);
  const starsGeo=new THREE.BufferGeometry(),starPoints=[];for(let i=0;i<220;i++){const a=random()*6.28,y=.2+random()*.75,r=400;starPoints.push(Math.cos(a)*r*Math.sqrt(1-y*y),r*y,Math.sin(a)*r*Math.sqrt(1-y*y));}starsGeo.setAttribute('position',new THREE.Float32BufferAttribute(starPoints,3));const stars=new THREE.Points(starsGeo,new THREE.PointsMaterial({color:0xf9e9c0,size:.5,transparent:true,opacity:.5,depthWrite:false}));scene.add(stars);

  const waterShader={name:'InkRiverReflection',uniforms:{color:{value:new THREE.Color('#153f40')},tDiffuse:{value:null},textureMatrix:{value:new THREE.Matrix4()},uTime:{value:0},uRain:{value:0}},vertexShader:`uniform mat4 textureMatrix;varying vec4 vMirror;varying vec3 vWorld;void main(){vMirror=textureMatrix*vec4(position,1.);vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform sampler2D tDiffuse;uniform float uTime;uniform float uRain;varying vec4 vMirror;varying vec3 vWorld;void main(){vec2 p=vWorld.xz;vec2 uv=vMirror.xy/vMirror.w;float w=sin(p.y*1.8+uTime*.65+sin(p.x*.5))*sin(p.x*.4-uTime*.3);uv+=vec2(w*.0015,sin(p.y*2.8+uTime)*.001);vec3 r=texture2D(tDiffuse,uv).rgb;float line=pow(max(0.,sin(p.y*4.5+sin(p.x*.7+uTime*.4)*1.8)),24.);float fresnel=pow(1.-clamp(dot(normalize(cameraPosition-vWorld),vec3(0.,1.,0.)),0.,1.),2.);vec3 base=mix(vec3(.018,.071,.068),r,.32+fresnel*.4);base+=vec3(.11,.13,.085)*line*.12;float dist=length(vWorld.xz-cameraPosition.xz);base=mix(base,vec3(.064,.13,.127),1.-exp(-dist*.002));gl_FragColor=vec4(base,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`};
  const water=new Reflector(new THREE.PlaneGeometry(1500,1500),{textureWidth:mobile?512:1024,textureHeight:mobile?512:1024,clipBias:.005,multisample:0,shader:waterShader});water.rotation.x=-Math.PI/2;water.position.y=-.12;scene.add(water);

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
  function update(t,rain){water.material.uniforms.uTime.value=t;water.material.uniforms.uRain.value=rain;sky.material.uniforms.uRain.value=rain;stars.material.opacity=.5*(1-rain*.8);boat.position.y=Math.sin(t*1.1)*.045;boat.rotation.z=Math.sin(t*.7)*.012;}
  return {boat,water,root,canMove,update,colliders,landMeshes};
}
