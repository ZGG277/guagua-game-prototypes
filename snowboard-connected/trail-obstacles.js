/**
 * Original low-poly trail props. The rendered surface IS the collision surface.
 *
 * const assets = createTrailObstacleAssets(THREE);
 * const slot = assets.createObstacleSlot(chunkGroup); // three reusable meshes
 * slot.update(records, ground, chunkZ, chunkY);
 * solids.push(...slot.solids); // {mesh,id,type}; feed each mesh to colliderFromMeshes
 *
 * Records: {id,type:'log'|'rock',x,z,width,depth,height,angle}. Width/depth are
 * full local X/Z dimensions, height is the maximum above the sampled ground.
 * Angle is radians, with the same positive-Y convention as THREE.rotation.y.
 * Parent chunkGroup must be translated by (0,chunkY,chunkZ), unscaled/unrotated.
 * Vertex positions are chunk-local; every vertex samples world-space ground.
 * update() must precede chunkGroup.updateMatrixWorld(true) and collider rebuild.
 * No draw-range padding, invisible colliders, extra decorative meshes or textures.
 */
export function createTrailObstacleAssets(THREE) {
  const material = new THREE.MeshStandardMaterial({vertexColors:true,roughness:.96,metalness:0,flatShading:true});
  material.name = 'trail-log-and-stone-vertex-colors';
  const C = hex => new THREE.Color(hex).toArray();
  const palette = {
    bark:[C('#5c4234'),C('#79513b'),C('#694633'),C('#8b6143'),C('#523c31')],
    cut:[C('#d0a56f'),C('#956339'),C('#e0ba84'),C('#b78753'),C('#805535')],
    stone:[C('#586a7c'),C('#6b8090'),C('#718998'),C('#526678'),C('#8398a2')],
    snow:[C('#dee9ee'),C('#f0f3f1'),C('#c5d6df')]
  };
  function template() {
    const positions=[],colors=[];
    return {
      positions, colors,
      tri(a,b,c,color) {positions.push(...a,...b,...c);for(let j=0;j<3;j++)colors.push(...color);},
      quad(a,b,c,d,color) {this.tri(a,b,c,color);this.tri(a,c,d,color);}
    };
  }
  function makeLog() {
    const t=template(),sides=12,axial=6;
    const section=(u,k,r=1)=>{
      const angle=k/sides*Math.PI*2;
      // Broad trunk, subtly irregular bark; lower arc sinks into the snow.
      const taper=.91+.09*Math.sin(Math.PI*u),ridge=1+.025*Math.sin((k%sides)*2.7);
      return [u-.5,.43+.57*Math.sin(angle)*r*taper,.5*Math.cos(angle)*r*taper*ridge];
    };
    for(let j=0;j<axial;j++)for(let k=0;k<sides;k++){
      const upper=Math.sin((k+.5)/sides*Math.PI*2)>.78;
      const snow=upper&&j!==0&&!(j===axial-1&&k===3);
      const color=snow?palette.snow[(j+k)%3]:palette.bark[(k+j%2)%palette.bark.length];
      t.quad(section(j/axial,k),section((j+1)/axial,k),section((j+1)/axial,k+1),section(j/axial,k+1),color);
    }
    // Cut end-grain rings are coplanar faces of the same closed solid, so there
    // is no visual-only end disk sticking out beyond the collision surface.
    const radii=[0,.23,.31,.51,.58,.79,.87,1];
    for(const side of [0,1])for(let ring=0;ring<radii.length-1;ring++)for(let k=0;k<sides;k++){
      const a=section(side,k,radii[ring]),b=section(side,k+1,radii[ring]),c=section(side,k+1,radii[ring+1]),d=section(side,k,radii[ring+1]);
      const color=ring===radii.length-2?palette.bark[(k+1)%5]:palette.cut[ring%2?1:(k===5||k===6?3:2)];
      // End normals face outward on each side of the trunk.
      if(ring===0){if(side===0)t.tri(a,d,c,color);else t.tri(a,c,d,color);}
      else if(side===0)t.quad(a,d,c,b,color);else t.quad(a,b,c,d,color);
    }
    return t;
  }
  function makeRock() {
    const t=template(),sides=10;
    const radial=[.91,1,.92,.96,.88,1,.93,.89,.98,.94];
    const ring=(level,k)=>{
      const i=((k%sides)+sides)%sides,a=k/sides*Math.PI*2,r=radial[i];
      const levels=[{r:.91,y:-.075},{r:1,y:.19},{r:.69,y:.77}];
      const l=levels[level],wobble=level===0?0:(i%3-1)*(level===1?.04:.11);
      return [.5*Math.cos(a)*r*l.r,l.y+wobble,.5*Math.sin(a)*r*l.r];
    };
    for(let level=0;level<2;level++)for(let k=0;k<sides;k++){
      const color=palette.stone[(k+level*2)%5];
      // XZ circumference is counterclockwise from above, reverse for outside.
      t.quad(ring(level,k),ring(level+1,k),ring(level+1,k+1),ring(level,k+1),color);
    }
    const top=[-.06,1,.025],bottom=[0,-.075,0];
    for(let k=0;k<sides;k++){
      // A broken snow cap leaves the dark silhouette clearly readable.
      const color=(k===0||k===1||k===7)?palette.stone[(k+2)%5]:palette.snow[k%3];
      t.tri(ring(2,k),top,ring(2,k+1),color);
      t.tri(ring(0,k+1),bottom,ring(0,k),palette.stone[3]);
    }
    return t;
  }
  const templates={log:makeLog(),rock:makeRock()};
  function geometryFor(t) {
    const g=new THREE.BufferGeometry();
    const p=new THREE.Float32BufferAttribute(t.positions,3);
    p.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position',p);
    g.setAttribute('color',new THREE.Float32BufferAttribute(t.colors,3));
    g.computeVertexNormals();
    return g;
  }
  const ownedSlots=new Set();
  function createObstacleSlot(group,initialCapacity=3) {
    const pool=[],solids=[];
    let disposed=false;
    function addPooledMesh() {
      const geometries={log:geometryFor(templates.log),rock:geometryFor(templates.rock)};
      const mesh=new THREE.Mesh(geometries.log,material);
      mesh.name='trail-obstacle-unused';mesh.visible=false;
      mesh.castShadow=true;mesh.receiveShadow=true;
      mesh.userData.collisionSource='exact-visible-mesh';
      group.add(mesh);
      pool.push({mesh,geometries});
    }
    for(let i=0;i<initialCapacity;i++)addPooledMesh();
    const slot={
      solids,
      get meshes(){return pool.map(p=>p.mesh);},
      update(records,groundFn,z0=0,y0=0) {
        if(disposed)throw new Error('Cannot update a disposed trail obstacle slot');
        while(pool.length<records.length)addPooledMesh();
        solids.length=0;
        for(let i=0;i<pool.length;i++){
          const entry=pool[i],mesh=entry.mesh,o=records[i];
          mesh.visible=!!o;
          if(!o)continue;
          if(o.type!=='log'&&o.type!=='rock')throw new Error('Unknown trail obstacle type: '+o.type);
          if(![o.x,o.z,o.width,o.depth,o.height,o.angle??0,z0,y0].every(Number.isFinite)||o.width<=0||o.depth<=0||o.height<=0)throw new Error('Invalid trail obstacle dimensions: '+o.id);
          const base=templates[o.type].positions,g=entry.geometries[o.type],p=g.attributes.position;
          const ca=Math.cos(o.angle||0),sa=Math.sin(o.angle||0);
          for(let v=0;v<p.count;v++){
            const lx=base[v*3]*o.width,lz=base[v*3+2]*o.depth;
            const wx=o.x+ca*lx+sa*lz,wz=o.z-sa*lx+ca*lz;
            const gy=groundFn(wx,wz);
            if(!Number.isFinite(gy))throw new Error('Invalid ground under trail obstacle: '+o.id);
            p.setXYZ(v,wx,gy+base[v*3+1]*o.height-y0,wz-z0);
          }
          p.needsUpdate=true;g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();
          mesh.geometry=g;mesh.name='trail-'+o.type;mesh.userData.obstacleId=o.id;
          mesh.userData.obstacleType=o.type;
          mesh.userData.triangleCount=p.count/3;
          // Reset transforms on reuse: all deformation and placement is baked.
          mesh.position.set(0,0,0);mesh.rotation.set(0,0,0);mesh.scale.set(1,1,1);
          solids.push({mesh,id:o.id,type:o.type});
        }
        return solids;
      },
      dispose() {
        if(disposed)return;
        disposed=true;solids.length=0;
        for(const {mesh,geometries} of pool){group.remove(mesh);geometries.log.dispose();geometries.rock.dispose();}
        pool.length=0;ownedSlots.delete(slot);
      }
    };
    ownedSlots.add(slot);
    return slot;
  }
  return {
    createObstacleSlot,
    material,
    triangleCounts:{log:templates.log.positions.length/9,rock:templates.rock.positions.length/9},
    dispose(){for(const slot of [...ownedSlots])slot.dispose();material.dispose();}
  };
}
