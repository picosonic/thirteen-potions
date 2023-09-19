// Global constants
const TILESIZE=16;
const TILESPERROW=12;
const XMAX=180;
const YMAX=120;
const ANIMOFFSET=132;

// Game state
var gs={
  // animation frame of reference
  step:(1/60), // target step time @ 60 fps
  acc:0, // accumulated time since last frame
  lasttime:0, // time of last frame
  fps:0, // current FPS
  frametimes:[], // array of frame times

  // Canvas
  canvas:null,
  ctx:null,
  scale:1, // Changes when resizing window

  // Tilemap image
  tilemap:null,
  tilemapflip:null,

  // Main character
  x:0, // x position
  y:0, // y position
  vs:0, // vertical speed
  hs:0, // horizontal speed
  htime:0, // hurt timer following enemy collision
  dir:0, //direction (-1=left, 0=none, 1=right)
  speed:2, // walking speed
  flip:false, // if player is horizontally flipped
  alpha:1, // level of transparency
  anim:0, // time until next animation frame change
  tileoffs:0, // animation frame
  animgroup:0, // animation group

  // Level attributes
  xoffset:0, // current view offset from left (horizontal scroll)
  yoffset:0, // current view offset from top (vertical scroll)

  // Input
  keystate:KEYNONE,
  padstate:KEYNONE,
  gamepadbuttons:[], // Button mapping
  gamepadaxes:[], // Axes mapping
  gamepadaxesval:[], // Axes values
  mousestate:KEYNONE,

  // Other vars
  finalTime:-1, // time when game completed
  startTime:null, // time when game started
  playerStartedMoving:false, // flag used to start timer
  potionScore:0, // number of potions collected
};

// Draw text, expanded with color, background etc.
function drawTextBG(ctx, txt, font, x, y, fg, bg)
{
  const padding=2;

  /// lets save current state as we make a lot of changes        
  ctx.save();

  /// set font
  ctx.font=font;

  // draw text from top - makes life easier at the moment
  ctx.textBaseline='top';

  // color for background
  ctx.fillStyle=bg;
  
  // get width of text
  var width=Math.ceil(ctx.measureText(txt).width);

  // draw background rect assuming height of font
  ctx.fillRect(x, y, width+(padding*2), 6+(padding*2));
  
  // text color
  ctx.fillStyle=fg;

  // draw text on top
  ctx.fillText(txt, x+padding, y+padding);
  
  // restore original state
  ctx.restore();
}

// Player has hit an ememy, so make transparent, tint red and halve speed for 2 seconds
function zappy(obj)
{
  // Set to be hurt for 2 seconds
  gs.htime=(2*60);

  gs.speed=1;
  gs.alpha=0.6;
}

// Handle resize events
function playfieldsize()
{
  var height=window.innerHeight;
  var ratio=XMAX/YMAX;
  var width=Math.floor(height*ratio);
  var top=0;
  var left=Math.floor((window.innerWidth/2)-(width/2));

  if (width>window.innerWidth)
  {
    width=window.innerWidth;
    ratio=YMAX/XMAX;
    height=Math.floor(width*ratio);

    left=0;
    top=Math.floor((window.innerHeight/2)-(height/2));
  }
  
  gs.scale=(height/YMAX);

  // Reset canvas position/size
  gs.canvas.style.top=top+"px";
  gs.canvas.style.left=left+"px";
  gs.canvas.style.transformOrigin='0 0';
  gs.canvas.style.transform='scale('+gs.scale+')';
}

// Scroll level to player
function scrolltoplayer()
{
  var xmiddle=Math.floor((XMAX-TILESIZE)/2);
  var ymiddle=Math.floor((YMAX-TILESIZE)/2);
  var maxxoffs=((level.width*TILESIZE)-XMAX);
  var maxyoffs=((level.height*TILESIZE)-YMAX);

  // Work out where x and y offsets should be
  var newxoffs=gs.x-xmiddle;
  var newyoffs=gs.y-ymiddle;

  if (newxoffs>maxxoffs) newxoffs=maxxoffs;
  if (newyoffs>maxyoffs) newyoffs=maxyoffs;

  if (newxoffs<0) newxoffs=0;
  if (newyoffs<0) newyoffs=0;

  // Determine if xoffset should be changed
  if (newxoffs!=gs.xoffset)
      gs.xoffset=newxoffs;

  // Determine if xoffset should be changed
  if (newyoffs!=gs.yoffset)
      gs.yoffset=newyoffs;
}

function drawrotatedtile(tilemap, x1, y1, w1, h1, x2, y2, w2, h2, angleInRadians)
{
  gs.ctx.translate(x2+(TILESIZE/2), y2+(TILESIZE/2));
  gs.ctx.rotate(angleInRadians);
  gs.ctx.drawImage(tilemap, x1, y1, w1, h1, -(TILESIZE/2), -(TILESIZE/2), w2, h2);
  gs.ctx.rotate(-angleInRadians);
  gs.ctx.translate(-(x2+(TILESIZE/2)), -(y2+(TILESIZE/2)));
}

// Draw tile
function drawtile(tileid, x, y)
{
  // Don't draw empty tiles
  if (tileid<0) return;

  var angle=0;
  var flip=false;
  var tbits=(tileid&0xE0000000)>>(7*4);

  // Handle rotate/flip bits
  switch (tbits)
  {
    case 0x00: // normal
      break;

    case 0x04: // flip y
      flip=true;
      angle=180;
      break;      

    case 0x06: // 270 rotated
      angle=270;
      break;

    case 0x08: // flip x
    case -8:
      flip=true;
      break;

    case 0x0a: // 90 rotated
    case -6:
      angle=90;
      break;

    case 0x0c: // 180 rotated
    case -4:
      angle=180;
      break;

    default: // unsupported
      break;
  }

  // Mask off rotate/flip bits
  tileid=tileid&0xffff;

  // Clip to what's visible
  if (((x-gs.xoffset)<-TILESIZE) && // clip left
      ((x-gs.xoffset)>XMAX) && // clip right
      ((y-gs.yoffset)<-TILESIZE) && // clip top
      ((y-gs.yoffset)>YMAX))   // clip bottom
    return;

  var tilemap=gs.tilemap;
  var x1=(tileid*TILESIZE) % (TILESPERROW*TILESIZE);
  var y1=Math.floor((tileid*TILESIZE) / (TILESPERROW*TILESIZE))*TILESIZE;
  var w=TILESIZE;
  var h=TILESIZE;
  var x2=x-gs.xoffset;
  var y2=y-gs.yoffset;

  if (flip)
  {
    tilemap=gs.tilemapflip;
    x1=((TILESPERROW*TILESIZE)-((tileid*TILESIZE) % (TILESPERROW*TILESIZE)))-TILESIZE;
  }

  if (angle!=0)
    drawrotatedtile(tilemap, x1, y1, w, h, x2, y2, w, h, angle*(Math.PI/180));
  else
    gs.ctx.drawImage(tilemap, x1, y1, w, h, x2, y2, w, h);
}

// Draw level
function drawlevel(tiles)
{
  for (var y=0; y<level.height; y++)
  {
    for (var x=0; x<level.width; x++)
    {
      var tile=parseInt(tiles[(y*level.width)+x]||0, 10);
      drawtile(tile-1, x*TILESIZE, y*TILESIZE);
    }
  }
}

// Draw objects
function drawobjects(objs)
{
  objs.forEach((obj) => drawtile(obj.id-1, Math.floor(obj.x), Math.floor(obj.y)-TILESIZE));
}

function redraw()
{
  // Scroll to keep player in view
  scrolltoplayer();

  // Clear the canvas
  gs.ctx.clearRect(0, 0, gs.canvas.width, gs.canvas.height);

  // Draw ground
  drawlevel(level.ground);

  // Draw walls
  drawlevel(level.walls);

  // Draw potions
  drawobjects(level.things);

  // Draw enemies
  drawobjects(level.enemies);

  // Draw player
  gs.ctx.globalAlpha=gs.alpha;
  if (gs.htime>0)
    gs.ctx.filter="invert(23%) sepia(91%) saturate(5953%) hue-rotate(355deg) brightness(91%) contrast(125%)";
  drawtile(ANIMOFFSET+gs.animgroup+gs.tileoffs, Math.floor(gs.x), Math.floor(gs.y));
  if (gs.htime>0)
    gs.ctx.filter="invert(0%) sepia(0%) saturate(100%) hue-rotate(0deg) brightness(100%) contrast(100%)";
  gs.ctx.globalAlpha=1;

  // Draw current score
  drawTextBG(gs.ctx, `Potions left: ${13 - gs.potionScore}`, "normal 8px Courier New", 0, 0, "white", "#3B2731");

  // Draw current time
  var seconds=0;
  if (gs.startTime!=null)
    seconds=Math.ceil((Date.now() - gs.startTime.getTime()) / 1000);


  if (gs.finalTime!=-1)
  {
    drawTextBG(gs.ctx, `Final Time: ${gs.finalTime} seconds!`, "normal 9px Courier New", 0, YMAX-10, "white", "#3B2731");
  }
  else
  {
    // Check for game just completed
    if (gs.potionScore==13)
      gs.finalTime=seconds;

    drawTextBG(gs.ctx, `Time: ${seconds}`, "normal 9px Courier New", 0, YMAX-10, "white", "#3B2731");
  }
}

// Check if player has tried to leave the map
function offmapcheck()
{
  // Horizontally
  if (gs.x<0)
    gs.x=0;
  else
    if ((gs.x+TILESIZE+1)>level.width*TILESIZE)
      gs.x=(level.width-1)*TILESIZE;

  // Vertically
  if (gs.y<0)
      gs.y=0;
    else
      if ((gs.y+TILESIZE+1)>level.height*TILESIZE)
        gs.y=(level.height-1)*TILESIZE;
}

// Check if area a overlaps with area b
function overlap(ax, ay, aw, ah, bx, by, bw, bh)
{
  // Check horizontally
  if ((ax<bx) && ((ax+aw))<=bx) return false; // a too far left of b
  if ((ax>bx) && ((bx+bw))<=ax) return false; // a too far right of b

  // Check vertically
  if ((ay<by) && ((ay+ah))<=by) return false; // a too far above b
  if ((ay>by) && ((by+bh))<=ay) return false; // a too far below b

  return true;
}

function collide(px, py, pw, ph)
{
  // Check for screen edge collision
  if (px<=(0-(TILESIZE/5))) return true;
  if ((px+(TILESIZE/3))>=(level.width*TILESIZE)) return true;

  // Look through all the tiles for a collision
  for (var y=0; y<level.height; y++)
  {
    for (var x=0; x<level.width; x++)
    {
      var tile=parseInt(level.walls[(y*level.width)+x]||0, 10);

      if ((tile)!=0)
      {
        if (overlap(px, py, pw, ph, x*TILESIZE, y*TILESIZE, TILESIZE, TILESIZE))
          return true;
      }
    }
  }

  return false;
}

// Collision check with player hitbox
function playercollide(x, y)
{
  return collide(x+(TILESIZE/3), y+((TILESIZE/5)*2), TILESIZE/3, (TILESIZE/5)*3);
}

// Move the player by the appropriate amount, up to a collision
function collisioncheck()
{
  var loop;

  // Check for horizontal collisions
  if ((gs.hs!=0) && (playercollide(gs.x+gs.hs, gs.y)))
  {
    loop=TILESIZE;
    // A collision occured, so move the character until it hits
    while ((!playercollide(gs.x+(gs.hs>0?1:-1), gs.y)) && (loop>0))
    {
      gs.x+=(gs.hs>0?1:-1);
      loop--;
    }

    // Stop horizontal movement
    gs.hs=0;
  }
  gs.x+=Math.floor(gs.hs);

  // Check for vertical collisions
  if ((gs.vs!=0) && (playercollide(gs.x, gs.y+gs.vs)))
  {
    loop=TILESIZE;
    // A collision occured, so move the character until it hits
    while ((!playercollide(gs.x, gs.y+(gs.vs>0?1:-1))) && (loop>0))
    {
      gs.y+=(gs.vs>0?1:-1);
      loop--;
    }

    // Stop vertical movement
    gs.vs=0;
  }
  gs.y+=Math.floor(gs.vs);
}


// If no input detected, stop the player moving
function standcheck()
{
  // When no horizontal movement
  if (((!ispressed(KEYLEFT)) && (!ispressed(KEYRIGHT))) ||
      ((ispressed(KEYLEFT)) && (ispressed(KEYRIGHT))))
  {
    // Going left
    if (gs.dir==-1)
    {
      if (gs.hs<=0)
      {
        gs.hs=0;
      }
      else
      {
        gs.hs=0;
        gs.dir=0;
      }
    }

    // Going right
    if (gs.dir==1)
    {
      if (gs.hs>=0)
      {
        gs.hs=0;
      }
      else
      {
        gs.hs=0;
        gs.dir=0;
      }
    }
  }

  // When no horizontal movement
  if (((!ispressed(KEYUP)) && (!ispressed(KEYDOWN))) ||
  ((ispressed(KEYUP)) && (ispressed(KEYDOWN))))
  {
    gs.vs=0;
  }
}

// Move animation frame onwards
function updateanimation()
{
  // Do nothing, if not ready to change frame
  if (gs.anim==0)
  {
    if ((gs.hs!=0) || (gs.vs!=0))
    {
      gs.tileoffs++;
      if (gs.tileoffs>1) gs.tileoffs=0;
    }

    gs.anim=8; // Set time until next frame is shown
  }
  else
    gs.anim--;
}

// Update player movements
function updatemovements()
{
  var newgroup=0;

  // Check if player has tried to leave the map
  offmapcheck();

  // Move the player by the appropriate amount, up to a collision
  collisioncheck();

  // If no input detected, slow the player using friction
  standcheck(); 

  // When a movement key is pressed, adjust players speed and direction
  if ((gs.keystate!=KEYNONE) || (gs.padstate!=KEYNONE) || (gs.mousestate!=KEYNONE))
  {
    // Up key
    if ((ispressed(KEYUP)) && (!ispressed(KEYDOWN)))
    {
      gs.vs=-gs.speed;
      newgroup+=4;
    }

    // Down key
    if ((ispressed(KEYDOWN)) && (!ispressed(KEYUP)))
    {
      gs.vs=gs.speed;
    }

    // Left key
    if ((ispressed(KEYLEFT)) && (!ispressed(KEYRIGHT)))
    {
      gs.hs=-gs.speed;
      gs.dir=-1;
      gs.flip=true;
      newgroup+=2;
    }

    // Right key
    if ((ispressed(KEYRIGHT)) && (!ispressed(KEYLEFT)))
    {
      gs.hs=gs.speed;
      gs.dir=1;
      gs.flip=false;
    }

    gs.animgroup=newgroup;
  }

  // Decrease hurt timer
  if (gs.htime>0)
  {
    gs.htime--;

    if (gs.htime==0)
    {
      gs.speed=2;
      gs.alpha=1;
    }
  }

  // Update any animation frames
  updateanimation();

  // Detect initial movement to start timer
  if ((!gs.playerStartedMoving) &&
      ((gs.hs!=0) ||
      (gs.vs!=0)))
  {
    gs.playerStartedMoving=true;
    gs.startTime=new Date();
  }
}

// Called when potion collected
function collectPotion(obj)
{
  obj.del=true; // remove the tile

  gs.potionScore++;
//  text.setText(`Potions left: ${13 - potionScore}`);
}

// Check for collision between player and object
function checkcollide(obj, callback)
{
  if (overlap(gs.x+(TILESIZE/3), gs.y+((TILESIZE/5)*2), TILESIZE/3, (TILESIZE/5)*3, obj.x, obj.y-TILESIZE, TILESIZE, TILESIZE))
    callback(obj);
}

function moveenemy(obj)
{
  var deltax=Math.floor(Math.random()*3)-1;
  var deltay=Math.floor(Math.random()*3)-1;

  if (Math.random()<0.7) return;

  obj.x+=deltax;
  obj.y+=deltay;

  // Keep in bounds
  if (obj.x<0) obj.x=0;
  if ((obj.x+TILESIZE+1)>level.width*TILESIZE)
    obj.x=(level.width-1)*TILESIZE;
  
  if (obj.y<0) obj.y=0;
  if ((obj.y+TILESIZE+1)>level.width*TILESIZE)
    obj.y=(level.width-1)*TILESIZE;
}

// Update function called once per frame
function update()
{
  // Apply keystate to player
  updatemovements();

  // Check for collision with "things"
  level.things.forEach((obj) => checkcollide(obj, collectPotion));

  // Check for collision with "enemies"
  level.enemies.forEach((obj) => checkcollide(obj, zappy));

  // Remove anything marked for deletion
  var id=level.things.length;
  while (id--)
  {
    if (level.things[id].del!=undefined)
      level.things.splice(id, 1);
  }

  // Move the enemy around randomly each update
  level.enemies.forEach((obj) => moveenemy(obj));
}

function rafcallback(timestamp)
{
  // First time round, just save epoch
  if (gs.lasttime>0)
  {
    // Determine accumulated time since last call
    gs.acc+=((timestamp-gs.lasttime) / 1000);

    // If it's more than 15 seconds since last call, reset
    if ((gs.acc>gs.step) && ((gs.acc/gs.step)>(60*15)))
      gs.acc=gs.step*2;

    // Gamepad support
    try
    {
      if (!!(navigator.getGamepads))
        gamepadscan();
    }
    catch(e){}

    // Process "steps" since last call
    while (gs.acc>gs.step)
    {
      update();
      gs.acc-=gs.step;
    }

    redraw();
  }

  // Remember when we were last called
  gs.lasttime=timestamp;

  window.requestAnimationFrame(rafcallback);
}

function startgame()
{
  // Set player to spawn point
  gs.x=Math.floor(level.spawn.x-(TILESIZE/2));
  gs.y=Math.floor(level.spawn.y-(TILESIZE/2));

  // Scroll to keep player in view
  scrolltoplayer();

  // Start frame callbacks
  window.requestAnimationFrame(rafcallback);
}

// Entry point
function init()
{
  // Initialise stuff
  document.onkeydown=function(e)
  {
    e = e || window.event;
    updatekeystate(e, 1);
  };

  document.onkeyup=function(e)
  {
    e = e || window.event;
    updatekeystate(e, 0);
  };

  // Stop things from being dragged around
  window.ondragstart=function(e)
  {
    e = e || window.event;
    e.preventDefault();
  };

  // Set up canvas
  gs.canvas=document.getElementById("canvas");
  gs.ctx=gs.canvas.getContext("2d");

  gs.canvas.onmousedown=function(e)
  {
    e = e || window.event;
    updatemousestate(e);
  };

  gs.canvas.onmouseup=function(e)
  {
    gs.mousestate=KEYNONE;
  };

  window.addEventListener("mouseout", function() { gs.mousestate=KEYNONE; });

  window.addEventListener("resize", function() { playfieldsize(); });

  playfieldsize();

  // Load tilemap
  gs.tilemap=new Image;
  gs.tilemap.onload=function()
  {
    // Create a horizontally flipped version of the spritesheet
    // https://stackoverflow.com/questions/21610321/javascript-horizontally-flip-an-image-object-and-save-it-into-a-new-image-objec
    var c=document.createElement('canvas');
    var ctx=c.getContext('2d');
    c.width=gs.tilemap.width;
    c.height=gs.tilemap.height;
    ctx.scale(-1, 1);
    ctx.drawImage(gs.tilemap, -gs.tilemap.width, 0);

    gs.tilemapflip=new Image;
    gs.tilemapflip.onload=function()
    {
      startgame();
    };
    gs.tilemapflip.src=c.toDataURL();
  };
  gs.tilemap.src=tilemap;
}

// Run the init() once page has loaded
window.onload=function() { init(); };
