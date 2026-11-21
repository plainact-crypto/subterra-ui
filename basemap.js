/* SUBTERRA v0.6 — optional georeferenced raster backgrounds.
   Sources: OpenStreetMap map tiles and USGS NAIP Plus aerial imagery (USA).
   Images are illustrative map context, never surveyed utility evidence. */
(() => {
  'use strict';
  const R = 6378137;
  const WORLD = 2 * Math.PI * R;
  const MAX_TILES = 32;
  const MAX_CACHE = 180;
  const cache = new Map();
  let updateQueued = false;
  const radians = deg => deg * Math.PI / 180;
  const degrees = rad => rad * 180 / Math.PI;
  const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
  const coordinateToTile = (lon,lat,z) => {
    const n = 2 ** z;
    const x = (lon + 180) / 360 * n;
    const y = (1 - Math.asinh(Math.tan(radians(clamp(lat,-85.05112878,85.05112878)))) / Math.PI) / 2 * n;
    return {x,y};
  };
  const tileToCoordinate = (x,y,z) => {
    const n=2**z;
    return {
      lon:x/n*360-180,
      lat:degrees(Math.atan(Math.sinh(Math.PI*(1-2*y/n))))
    };
  };
  function tileUrl(layer,z,x,y) {
    if(layer==='streets')
      return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
    // Dynamic USGS NAIPPlus ImageServer renders a 256px Web Mercator tile on demand.
    // Unlike the coarse cached USGS ImageryOnly service, this can show high-resolution aerial coverage.
    const left=x/(2**z)*WORLD-WORLD/2;
    const right=(x+1)/(2**z)*WORLD-WORLD/2;
    const top=WORLD/2-y/(2**z)*WORLD;
    const bottom=WORLD/2-(y+1)/(2**z)*WORLD;
    const params=new URLSearchParams({
      bbox:[left,bottom,right,top].join(','),
      bboxSR:'3857',imageSR:'3857',size:'256,256',
      format:'jpgpng',f:'image'
    });
    return 'https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPPlus/ImageServer/exportImage?'+params.toString();
  }
  function getTile(layer,z,x,y,redraw) {
    const key=layer+':'+z+':'+x+':'+y;
    if(cache.has(key))return cache.get(key);
    const img=new Image();
    img.decoding='async';
    const item={image:img,status:'pending'};
    cache.set(key,item);
    img.onload=()=>{item.status='ready';queueRedraw(redraw);};
    img.onerror=()=>{item.status='error';queueRedraw(redraw);};
    img.src=tileUrl(layer,z,x,y);
    while(cache.size>MAX_CACHE)cache.delete(cache.keys().next().value);
    return item;
  }
  function queueRedraw(redraw) {
    if(updateQueued)return;
    updateQueued=true;
    requestAnimationFrame(()=>{updateQueued=false;redraw();});
  }
  function layerAvailable(layer,point) {
    if(layer==='streets')return true;
    if(layer!=='satellite')return false;
    // NAIP coverage applies to the USA, including the present Raleigh test site.
    return point.lat>=24 && point.lat<=50 && point.lon>=-125 && point.lon<=-66;
  }
  function draw({ctx,layer,project,view,width,height,origin,redraw}) {
    if(!origin||project.coordMode!=='geographic'||!['streets','satellite'].includes(layer))
      return {tiles:0,available:false};
    const lat=Number(origin.lat),lon=Number(origin.lon);
    if(!Number.isFinite(lat)||!Number.isFinite(lon)||!layerAvailable(layer,{lat,lon}))
      return {tiles:0,available:false};
    const cosLat=Math.max(0.01,Math.cos(radians(lat)));
    const scale=view.scale;
    if(!(scale>0))return {tiles:0,available:false};
    let zoom=clamp(Math.round(Math.log2(156543.03392804097*cosLat*scale)),2,layer==='satellite'?20:19);
    function tileBounds(z) {
      const x0=(0-width/2-view.panX)/scale;
      const x1=(width-width/2-view.panX)/scale;
      const yTop=-(0-height/2-view.panY)/scale;
      const yBottom=-(height-height/2-view.panY)/scale;
      const lonMin=lon+Math.min(x0,x1)/(111320*cosLat);
      const lonMax=lon+Math.max(x0,x1)/(111320*cosLat);
      const latTop=lat+yTop/111320,latBottom=lat+yBottom/111320;
      const nw=coordinateToTile(lonMin,latTop,z);
      const se=coordinateToTile(lonMax,latBottom,z);
      const n=2**z;
      const left=clamp(Math.floor(Math.min(nw.x,se.x)),0,n-1);
      const right=clamp(Math.floor(Math.max(nw.x,se.x)),0,n-1);
      const top=clamp(Math.floor(Math.min(nw.y,se.y)),0,n-1);
      const bottom=clamp(Math.floor(Math.max(nw.y,se.y)),0,n-1);
      return {left,right,top,bottom,count:(right-left+1)*(bottom-top+1)};
    }
    let bounds=tileBounds(zoom);
    while(bounds.count>MAX_TILES && zoom>2)bounds=tileBounds(--zoom);
    if(bounds.count>MAX_TILES)return {tiles:0,available:false};
    const screen=(coordinate)=>{
      const wx=(coordinate.lon-lon)*111320*cosLat;
      const wy=(coordinate.lat-lat)*111320;
      return {x:width/2+view.panX+wx*scale,y:height/2+view.panY-wy*scale};
    };
    ctx.save();
    ctx.globalAlpha=0.88;
    for(let x=bounds.left;x<=bounds.right;x++){
      for(let y=bounds.top;y<=bounds.bottom;y++){
        const tile=getTile(layer,zoom,x,y,redraw);
        if(tile.status!=='ready')continue;
        const nw=screen(tileToCoordinate(x,y,zoom));
        const se=screen(tileToCoordinate(x+1,y+1,zoom));
        if(se.x<=nw.x || se.y<=nw.y)continue;
        try {ctx.drawImage(tile.image,nw.x,nw.y,se.x-nw.x+0.7,se.y-nw.y+0.7);} catch { /* fail safe; utility overlay remains available */ }
      }
    }
    ctx.restore();
    return {tiles:bounds.count,available:true};
  }
  window.SubterraBasemap={draw,layerAvailable};
})();
