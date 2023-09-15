// Global constants
const TILESIZE=16;
const TILESPERROW=12;
const XMAX=180;
const YMAX=120;

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
  speed:100, // walking speed
  flip:false, // if player is horizontally flipped

  // Level attributes
  xoffset:0, // current view offset from left (horizontal scroll)
  yoffset:0, // current view offset from top (vertical scroll)

  // Input
  keystate:KEYNONE,
  padstate:KEYNONE,
  gamepadbuttons:[], // Button mapping
  gamepadaxes:[], // Axes mapping
  gamepadaxesval:[], // Axes values

  // Other vars
  text:"",
  time:null,
  timerText:"",
  finalTime:-1,
  playerStartedMoving:false,
  potionScore:0,
};

/*
let controls;
let cursors;
let player;

// Runs once, after all assets in preload
function create() {
  // Parameters: layer name (or index) from Tiled, tileset, x, y
  const groundLayer = map.createLayer("Ground", tileset, 0, 0);
  const wallLayer = map.createLayer("Walls", tileset, 0, 0);
  wallLayer.setCollisionByExclusion([-1]);

  player = this.physics.add
    .sprite(spawnPoint.x, spawnPoint.y, "knight")
    .setInteractive(this.input.makePixelPerfect(0));
  this.physics.add.collider(player, wallLayer);
  player.setCollideWorldBounds(true);

  this.anims.create({
    key: "right",
    frames: this.anims.generateFrameNumbers("knight", {
      start: 0,
      end: 1,
    }),
    frameRate: 10,
    repeat: -1,
  });

  this.anims.create({
    key: "left",
    frames: this.anims.generateFrameNumbers("knight", {
      start: 2,
      end: 3,
    }),
    frameRate: 10,
    repeat: -1,
  });

  this.anims.create({
    key: "up-right",
    frames: this.anims.generateFrameNumbers("knight", {
      start: 4,
      end: 5,
    }),
    frameRate: 10,
    repeat: -1,
  });

  this.anims.create({
    key: "up-left",
    frames: this.anims.generateFrameNumbers("knight", {
      start: 6,
      end: 7,
    }),
    frameRate: 10,
    repeat: -1,
  });

  this.physics.add.overlap(player, potions, collectPotion, null, this);
  this.physics.add.overlap(player, enemies, zappy, null, this);

  cursors = this.input.keyboard.createCursorKeys();

  text = this.add.text(270, 180, `Potions left: ${13 - potionScore}`, {
    font: "8px",
    fill: "#ffffff",
    backgroundColor: "#3B2731",
    padding: { x: 2, y: 2 },
  });

  // Timer Text
  timerText = this.add.text(270, 287, "Time: 0", {
    font: "9px",
    fill: "#ffffff",
    backgroundColor: "#3B2731",
    padding: { x: 2, y: 2 },
  });

  this.time.addEvent({
    delay: 1000,
    callback: function () {
      if (playerStartedMoving && finalTime === -1) {
        timerText.setText(
          "Time: " + Math.ceil((this.time.now - this.startTime) / 1000)
        );
      }
    },
    callbackScope: this,
    loop: true,
  });
}

function collectPotion(player, potion) {
  potion.destroy(potion.x, potion.y); // remove the tile
  potionScore++;
  text.setText(`Potions left: ${13 - potionScore}`);
  return false;
}

function zappy() {
  speed = 50;
  player.alpha = 0.6;
  player.tint = 0xff0000;
  setTimeout(() => {
    speed = 100;
    player.alpha = 1;
    player.clearTint();
  }, 2000);

  return false;
}

// Runs once per frame for the duration of the scene
function update(time, delta) {
  const prevVelocity = player.body.velocity.clone();
  player.body.setVelocity(0);

  if (potionScore === 13 && finalTime === -1) {
    finalTime = Math.ceil((this.time.now - this.startTime) / 1000);
    timerText.setText(`Final Time: ${finalTime} seconds!`);
  }

  if (
    !playerStartedMoving &&
    prevVelocity.x !== 0 &&
    prevVelocity.y !== 0
  ) {
    playerStartedMoving = true;
    this.startTime = this.time.now;
  }

  // Move the enemy around randomly each update
  enemies.children.iterate(function (enemy) {
    enemy.body.setVelocity(
      Phaser.Math.Between(-16, 16),
      Phaser.Math.Between(-16, 16)
    );
  });

  // Horizontal movement
  if (cursors.left.isDown) {
    player.body.setVelocityX(speed * -1);
  } else if (cursors.right.isDown) {
    player.body.setVelocityX(speed);
  }

  // Vertical movement
  if (cursors.up.isDown) {
    player.body.setVelocityY(speed * -1);
  } else if (cursors.down.isDown) {
    player.body.setVelocityY(speed);
  }

  // Normalize and scale the velocity so that player can't move faster along a diagonal
  player.body.velocity.normalize().scale(speed);

  if (cursors.up.isDown && cursors.right.isDown) {
    player.anims.play("up-right", true);
  } else if (cursors.up.isDown && cursors.left.isDown) {
    player.anims.play("up-left", true);
  } else if (cursors.left.isDown) {
    player.anims.play("left", true);
  } else if (cursors.right.isDown) {
    player.anims.play("right", true);
  } else if (cursors.up.isDown) {
    player.anims.play("up-right", true);
  } else if (cursors.down.isDown) {
    player.anims.play("right", true);
  } else {
    player.anims.stop();

    // If we were moving, pick and idle frame to use
    if (prevVelocity.x < 0) player.setTexture("knight", 2); // look left
    else if (prevVelocity.x > 0)
      player.setTexture("knight", 0); // look right
    else if (prevVelocity.y < 0)
      player.setTexture("knight", 4); // look up
    else if (prevVelocity.y > 0) player.setTexture("knight", 0); // look down
  }
}
*/

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
function scrolltoplayer(dampened)
{
  var xmiddle=Math.floor((XMAX-TILESIZE)/2);
  var ymiddle=Math.floor((YMAX-TILESIZE)/2);
  var maxxoffs=((gs.width*TILESIZE)-XMAX);
  var maxyoffs=((gs.height*TILESIZE)-YMAX);

  // Work out where x and y offsets should be
  var newxoffs=gs.x-xmiddle;
  var newyoffs=gs.y-ymiddle;

  if (newxoffs>maxxoffs) newxoffs=maxxoffs;
  if (newyoffs>maxyoffs) newyoffs=maxyoffs;

  if (newxoffs<0) newxoffs=0;
  if (newyoffs<0) newyoffs=0;

  // Determine if xoffset should be changed
  if (newxoffs!=gs.xoffset)
  {
    if (dampened)
    {
      var xdelta=1;

      if (Math.abs(gs.xoffset-newxoffs)>(XMAX/5)) xdelta=4;

      gs.xoffset+=newxoffs>gs.xoffset?xdelta:-xdelta;
    }
    else
      gs.xoffset=newxoffs;
  }

  // Determine if xoffset should be changed
  if (newyoffs!=gs.yoffset)
  {
    if (dampened)
    {
      var ydelta=1;

      if (Math.abs(gs.yoffset-newyoffs)>(YMAX/5)) ydelta=4;

      gs.yoffset+=newyoffs>gs.yoffset?ydelta:-ydelta;
    }
    else
      gs.yoffset=newyoffs;
  }
}

// Draw tile
function drawtile(tileid, x, y)
{
  // TODO handle rotate/flip bits

  // Mask off rotate/flip bits
  tileid=tileid&0xffff;

  // Don't draw tile 0 (background) or below
  if (tileid<=0) return;

  // Clip to what's visible
  if (((x-gs.xoffset)<-TILESIZE) && // clip left
      ((x-gs.xoffset)>XMAX) && // clip right
      ((y-gs.yoffset)<-TILESIZE) && // clip top
      ((y-gs.yoffset)>YMAX))   // clip bottom
    return;

  gs.ctx.drawImage(gs.tilemap, (tileid*TILESIZE) % (TILESPERROW*TILESIZE), Math.floor((tileid*TILESIZE) / (TILESPERROW*TILESIZE))*TILESIZE, TILESIZE, TILESIZE, x-gs.xoffset, y-gs.yoffset, TILESIZE, TILESIZE);
}

// Draw level
function drawlevel(tiles)
{
  for (var y=0; y<level.height; y++)
  {
    for (var x=0; x<level.width; x++)
    {
      var tile=parseInt(tiles[(y*level.width)+x]||1, 10);
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
  scrolltoplayer(true);

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
  drawtile(132, Math.floor(gs.x), Math.floor(gs.y));
}

// Update player movements
function updatemovements()
{
  // When a movement key is pressed, adjust players speed and direction
  if ((gs.keystate!=KEYNONE) || (gs.padstate!=KEYNONE))
  {
    // Left key
    if ((ispressed(KEYLEFT)) && (!ispressed(KEYRIGHT)))
    {
      gs.hs=gs.htime==0?-gs.speed:-(gs.speed/2);
      gs.dir=-1;
      gs.flip=true;
    }

    // Right key
    if ((ispressed(KEYRIGHT)) && (!ispressed(KEYLEFT)))
    {
      gs.hs=gs.htime==0?gs.speed:(gs.speed/2);
      gs.dir=1;
      gs.flip=false;
    }

    // Up key
    if ((ispressed(KEYUP)) && (!ispressed(KEYDOWN)))
    {
      gs.vs=gs.htime==0?-gs.speed:-(gs.speed/2);
    }

    // Down key
    if ((ispressed(KEYDOWN)) && (!ispressed(KEYUP)))
    {
      gs.vs=gs.htime==0?gs.speed:(gs.speed/2);
    } 
  }

  gs.x+=(gs.hs/100);
  gs.y+=(gs.vs/100);
}

// Update function called once per frame
function update()
{
  // Apply keystate to player
  updatemovements();
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
  scrolltoplayer(false);

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
