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

  // Level attributes
  xoffset:0, // current view offset from left (horizontal scroll)
  yoffset:0, // current view offset from top (vertical scroll)

  // Other vars
  text:"",
  time:null,
  timerText:"",
  finalTime:-1,
  playerStartedMoving:false,
  speed:100,
  potionScore:0,
};

/*
let game = new Phaser.Game(config);
let controls;
let cursors;
let player;

let PotionLayer;
let potions;

let EnemyLayer;
let enemies;

// Runs once, loads up assets like images and audio
function preload() {
  this.load.image("tiles", "./tilemap_packed.png");
  this.load.image("potion", "./potion.png");
  this.load.image("enemy", "./enemy.png");
  this.load.tilemapTiledJSON("map", "./map/map.json");
  this.load.spritesheet("knight", "./knight/knight_packed.png", {
    frameWidth: 16,
    frameHeight: 16,
  });
}

// Runs once, after all assets in preload
function create() {
  const map = this.make.tilemap({
    key: "map",
    tileWidth: 16,
    tileHeight: 16,
  });
  const tileset = map.addTilesetImage("thirteen-potions", "tiles");

  // Parameters: layer name (or index) from Tiled, tileset, x, y
  const groundLayer = map.createLayer("Ground", tileset, 0, 0);
  const wallLayer = map.createLayer("Walls", tileset, 0, 0);
  wallLayer.setCollisionByExclusion([-1]);
  PotionLayer = map.getObjectLayer("Things")["objects"].slice(1);
  EnemyLayer = map.getObjectLayer("Enemies")["objects"];

  // Adding potions
  potions = this.physics.add.staticGroup();
  PotionLayer.forEach((object) => {
    let obj = potions.create(object.x, object.y - 16, "potion");
    obj.setScale(object.width / 16, object.height / 16);
    obj.setOrigin(0);
    obj.body.width = object.width;
    obj.body.height = object.height;
  });

  // Adding enemies
  enemies = this.physics.add.group();
  EnemyLayer.forEach((object) => {
    let obj = enemies.create(object.x, object.y - 16, "enemy");
    obj.setScale(object.width / 16, object.height / 16);
    obj.setOrigin(0);
    obj.body.width = object.width;
    obj.body.height = object.height;
  });

  // Adding player to the screen
  const spawnPoint = map.findObject(
    "Things",
    (obj) => obj.name === "Spawn"
  );

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

  // Phaser default camera
  let camera = this.cameras.main;
  camera.zoom = 4;
  camera.setBounds(0, 0, 720, 480);
  camera.startFollow(player);

  cursors = this.input.keyboard.createCursorKeys();

  text = this.add.text(270, 180, `Potions left: ${13 - potionScore}`, {
    font: "8px",
    fill: "#ffffff",
    backgroundColor: "#3B2731",
    padding: { x: 2, y: 2 },
  });
  text.setScrollFactor(0);

  // Timer Text
  timerText = this.add.text(270, 287, "Time: 0", {
    font: "9px",
    fill: "#ffffff",
    backgroundColor: "#3B2731",
    padding: { x: 2, y: 2 },
  });
  timerText.setScrollFactor(0);

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

function redraw()
{
  // Clear the canvas
  gs.ctx.clearRect(0, 0, gs.canvas.width, gs.canvas.height);

  // Draw ground
  drawlevel(level.ground);

  // Draw walls
  drawlevel(level.walls);

  // Draw potions
  // Draw enemies
  // Draw player
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

    // Process "steps" since last call
    while (gs.acc>gs.step)
    {
      //update();
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
  // Start frame callbacks
  window.requestAnimationFrame(rafcallback);
}

// Entry point
function init()
{
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
