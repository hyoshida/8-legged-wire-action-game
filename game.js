const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

var player;
var cursors;
var graphics;
var anchorPoints = [];
var stars;
var score = 0;
var mobileButtons = {
    left: false,
    right: false,
    jump: false,
    release: false
};
var scoreText;


function preload ()
{
    // Create a texture for the player character (8-tentacled creature)
    let playerGraphics = this.add.graphics();
    playerGraphics.fillStyle(0xffffff, 1); // White fill for the body
    playerGraphics.lineStyle(2, 0xffffff, 1); // White lines for tentacles

    const bodyRadius = 8;
    const tentacleLength = 16;
    const textureSize = 64;
    const centerX = textureSize / 2;
    const centerY = textureSize / 2;

    // Draw body
    playerGraphics.fillCircle(centerX, centerY, bodyRadius);

    // Draw 8 tentacles
    for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 / 8) * i;
        const startX = centerX + Math.cos(angle) * bodyRadius;
        const startY = centerY + Math.sin(angle) * bodyRadius;
        const endX = centerX + Math.cos(angle) * (bodyRadius + tentacleLength);
        const endY = centerY + Math.sin(angle) * (bodyRadius + tentacleLength);
        playerGraphics.lineBetween(startX, startY, endX, endY);
    }
    playerGraphics.generateTexture('player', textureSize, textureSize);
    playerGraphics.destroy();

    // Create a texture for platforms (a white rectangle)
    let platformGraphics = this.add.graphics();
    platformGraphics.fillStyle(0xffffff, 1);
    platformGraphics.fillRect(0, 0, 1, 1);
    platformGraphics.generateTexture('platform', 1, 1);
    platformGraphics.destroy();

    // Create a texture for stars
    let starGraphics = this.add.graphics();
    starGraphics.fillStyle(0xffff00, 1);
    starGraphics.fillCircle(16, 16, 16); // Using fillCircle instead of fillStar
    starGraphics.generateTexture('star', 32, 32);
    starGraphics.destroy();

    // Create textures for UI buttons
    let buttonGraphics = this.add.graphics();
    buttonGraphics.fillStyle(0xffffff, 0.5); // Semi-transparent white
    buttonGraphics.fillTriangle(0, 50, 50, 0, 50, 100);
    buttonGraphics.generateTexture('leftButton', 50, 100);
    buttonGraphics.clear();

    buttonGraphics.fillStyle(0xffffff, 0.5);
    buttonGraphics.fillTriangle(0, 0, 0, 100, 50, 50);
    buttonGraphics.generateTexture('rightButton', 50, 100);
    buttonGraphics.clear();

    buttonGraphics.fillStyle(0xffffff, 0.5);
    buttonGraphics.fillTriangle(0, 50, 50, 0, 100, 50);
    buttonGraphics.generateTexture('jumpButton', 100, 50);
    buttonGraphics.clear();

    buttonGraphics.fillStyle(0xff0000, 0.5); // Semi-transparent red
    buttonGraphics.fillRect(0, 0, 80, 80);
    buttonGraphics.generateTexture('releaseButton', 80, 80);
    buttonGraphics.destroy();
}

function create ()
{
    this.cameras.main.setBackgroundColor('#000000');

    // Set world bounds
    this.physics.world.setBounds(0, 0, 3200, 600);

    // Add platforms
    let platforms = this.physics.add.staticGroup();
    platforms.create(400, 568, 'platform').setScale(800, 32).refreshBody();
    platforms.create(1200, 400, 'platform').setScale(400, 32).refreshBody();
    platforms.create(1800, 250, 'platform').setScale(300, 32).refreshBody();
    platforms.create(2500, 500, 'platform').setScale(500, 32).refreshBody();


    // Add the player character to the center of the screen
    player = this.physics.add.sprite(400, 300, 'player');
    player.setDragX(100); // Add horizontal drag

    // Make the player collide with the world bounds
    player.setCollideWorldBounds(true);

    // Player collides with platforms
    this.physics.add.collider(player, platforms);

    // Create cursor keys for input
    cursors = this.input.keyboard.createCursorKeys();

    // Graphics object for drawing the line
    graphics = this.add.graphics({ lineStyle: { width: 2, color: 0xffffff } });

    // Camera follows player
    this.cameras.main.startFollow(player);

    // Mouse input handling
    this.input.on('pointerdown', function (pointer) {
        if (pointer.leftButtonDown()) {
            if (anchorPoints.length < 8) {
                anchorPoints.push(new Phaser.Math.Vector2(pointer.worldX, pointer.worldY));
            }
        }
    });

    this.input.on('pointerup', function (pointer) {
        if (pointer.rightButtonReleased()) {
            anchorPoints = [];
        }
    });

    // Add stars
    stars = this.physics.add.group({
        key: 'star',
        repeat: 30,
        setXY: { x: 12, y: 0, stepX: 100 }
    });

    stars.children.iterate(function (child) {
        child.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
    });

    this.physics.add.collider(stars, platforms);
    this.physics.add.overlap(player, stars, collectStar, null, this);

    // Score text
    scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '32px', fill: '#FFF' });
    scoreText.setScrollFactor(0);

    // Add mobile buttons
    const leftButton = this.add.image(75, 500, 'leftButton').setInteractive().setScrollFactor(0);
    const rightButton = this.add.image(200, 500, 'rightButton').setInteractive().setScrollFactor(0);
    const jumpButton = this.add.image(650, 525, 'jumpButton').setInteractive().setScrollFactor(0);
    const releaseButton = this.add.image(650, 425, 'releaseButton').setInteractive().setScrollFactor(0);

    leftButton.on('pointerdown', () => mobileButtons.left = true);
    leftButton.on('pointerup', () => mobileButtons.left = false);
    leftButton.on('pointerout', () => mobileButtons.left = false);

    rightButton.on('pointerdown', () => mobileButtons.right = true);
    rightButton.on('pointerup', () => mobileButtons.right = false);
    rightButton.on('pointerout', () => mobileButtons.right = false);

    jumpButton.on('pointerdown', () => mobileButtons.jump = true);
    jumpButton.on('pointerup', () => mobileButtons.jump = false);
    jumpButton.on('pointerout', () => mobileButtons.jump = false);
    
    releaseButton.on('pointerdown', () => mobileButtons.release = true);
    releaseButton.on('pointerup', () => mobileButtons.release = false);
    releaseButton.on('pointerout', () => mobileButtons.release = false);
}

function update ()
{
    graphics.clear();
    let totalPullVelocity = new Phaser.Math.Vector2(0, 0);

    if (anchorPoints.length > 0) {
        
        anchorPoints.forEach(anchorPoint => {
            // Create a curve from player to anchor
            const startPoint = new Phaser.Math.Vector2(player.x, player.y);
            const endPoint = new Phaser.Math.Vector2(anchorPoint.x, anchorPoint.y);
            
            const midPoint = new Phaser.Math.Vector2((startPoint.x + endPoint.x) / 2, (startPoint.y + endPoint.y) / 2);
            
            // Add some slack based on player velocity
            const slackFactor = 0.2;
            const controlPoint1 = new Phaser.Math.Vector2(midPoint.x - player.body.velocity.x * slackFactor, midPoint.y - player.body.velocity.y * slackFactor);

            const curve = new Phaser.Curves.CubicBezier(startPoint, controlPoint1, endPoint, endPoint);
            
            curve.draw(graphics);


            // Calculate the angle and apply a force to create a swing
            let angle = Phaser.Math.Angle.Between(player.x, player.y, anchorPoint.x, anchorPoint.y);
            const pullStrength = 400 / anchorPoints.length; // Distribute strength among tentacles
            let pullVelocity = this.physics.velocityFromRotation(angle, pullStrength);
            totalPullVelocity.add(pullVelocity);
        });

        player.setAcceleration(totalPullVelocity.x, totalPullVelocity.y);

        // Allow some air control while swinging
        if (cursors.left.isDown || mobileButtons.left) {
            player.body.velocity.x -= 10;
        } else if (cursors.right.isDown || mobileButtons.right) {
            player.body.velocity.x += 10;
        }
        
    } else {
        // No tentacles, standard movement
        player.setAcceleration(0, 0);

        if (cursors.left.isDown || mobileButtons.left) {
            player.setVelocityX(-160);
        } else if (cursors.right.isDown || mobileButtons.right) {
            player.setVelocityX(160);
        }

        if ((cursors.up.isDown || mobileButtons.jump) && player.body.onFloor()) {
            player.setVelocityY(-330);
        }
    }

    // Release tentacles with button
    if (mobileButtons.release) {
        anchorPoints = [];
    }
}

function collectStar (player, star)
{
    star.disableBody(true, true);

    score += 10;
    scoreText.setText('Score: ' + score);
}
