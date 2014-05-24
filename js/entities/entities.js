var RiffleBulletEntity = me.ObjectEntity.extend({
	init: function(playerPosition, aimPosition, shotByBot){
		var settings = {image: "gun_bullet", spritewidth: 4, spriteheight: 4 };
		this.name = "gun_bullet"
		this.parent(playerPosition.x,playerPosition.y,settings);
        this.setVelocity(10, 10);
        this.vel.y = 0;
        this.isBullet = true;
		this.passedDistance = 0;
        this.gravity = 0;
        this.xDirection = playerPosition.x > aimPosition.x ? -1 : 1;
        this.yDirection = playerPosition.y > aimPosition.y ? -1 : 1;
        this.countBulletPositionChange(playerPosition, aimPosition);
        this.shotByBot = shotByBot;
        this.alwaysUpdate = true;
	},
    countBulletPositionChange: function(playerPosition, aimPosition){
          this.dy = (aimPosition.y - playerPosition.y) / (aimPosition.x - playerPosition.x) * this.xDirection;
    },
	update: function(){
        this.vel.x += 5*this.xDirection;
        this.vel.y += this.dy;
        this.updateMovement();
        this.handleCollisions();
		return true;
	},
	handleCollisions: function () {
      	var res = me.game.collide(this);
      	if (this.vel.x == 0 || this.vel.y == 0 || (res && (res.obj.isSolid || res.obj.isDestroyable))) {
        	me.game.remove(this);
      	}
    },

});

var RiffleEntity = me.ObjectEntity.extend({
    init : function(){
        this.shotInterval = 500;
        this.bullets = 20;
        this.lastTimeTick = me.timer.getTime();
    },
    shot: function(playerPosition, aimPosition){
        var actualTimeTick = me.timer.getTime();
        if(actualTimeTick - this.lastTimeTick > this.shotInterval){
            var bullet = new RiffleBulletEntity(playerPosition, aimPosition, false);
            me.game.add(bullet, playerPosition.z);
            me.game.sort.defer();
            this.lastTimeTick = actualTimeTick;
        }  
    },

});

var EnemyRiffleEntity = me.ObjectEntity.extend({
    init : function(){
        this.shotInterval = 500;
        this.bullets = 20;
        this.lastTimeTick = me.timer.getTime();
    },
    shot: function(playerPosition, aimPosition){
        var actualTimeTick = me.timer.getTime();
        if(actualTimeTick - this.lastTimeTick > this.shotInterval){
            var bullet = new RiffleBulletEntity(playerPosition, aimPosition, true);
            me.game.add(bullet, playerPosition.z);
            me.game.sort.defer();
            this.lastTimeTick = actualTimeTick;
        }  
    },

});


game.RespawnManager = me.ObjectEntity.extend({
    init: function(x, y, settings){
        this.parent(x, y, settings);
        this.alwaysUpdate = true;
    },
    enemies: [],
    enemyRespawnPoints: [
    {
        startPosition: {x: 160, y: 811},
        actualStep: 0,
        steps: [
          //  {flipX: false, vel:{x: 0, y: 0}, animation: "soldier_stand"},
            {flipX: false, vel:{x: 3, y: 0}, animation: "soldier_move"},
            {flipX: false, vel:{x: 3, y: 1}, animation: "soldier_fly"},
            {flipX: false, vel:{x: 3, y: 0}, animation: "soldier_move"},
            {flipX: false, vel:{x: 3, y: 0}, animation: "soldier_move"},
            {flipX: false, vel:{x: 3, y: 0}, animation: "soldier_move"},
            {flipX: false, vel:{x: 3, y: 0}, animation: "soldier_move"},
            {flipX: true, vel:{x: -3, y: 0}, animation: "soldier_move"},
            {flipX: true, vel:{x: -3, y: 1}, animation: "soldier_fly"},
            {flipX: true, vel:{x: -3, y: 0}, animation: "soldier_move"},
            {flipX: true, vel:{x: -3, y: 0}, animation: "soldier_move"},
            {flipX: true, vel:{x: -3, y: 0}, animation: "soldier_move"},
            {flipX: true, vel:{x: -3, y: 0}, animation: "soldier_move"},



        ],
    }, 

    /*{x: 1010, y: 811}*/],

    getRandomRespawnPoint: function(){
        var index = Math.floor(Math.random() * this.enemyRespawnPoints.length);
        return this.enemyRespawnPoints[index];
    },

    update: function() {
        if(this.enemies.length == 0)
            this.spawnNewEnemy();
        else
            this.removeDeadEnemies();
        return true;
    },
    spawnNewEnemy: function(){
        var respawnPoint = this.getRandomRespawnPoint();
        respawnPoint.actualStep = 0;
        var newEnemy = new game.EnemyEntity(respawnPoint);
        me.game.add(newEnemy, 2);
        me.game.sort.defer();

        this.enemies.push(newEnemy);
    },
    removeDeadEnemies: function(){
        for(var i = 0 ; i < this.enemies.length; i++){
            if(!this.enemies[i].alive){
                me.game.remove(this.enemies[i]);
                this.enemies.remove(this.enemies[i]);
            }
        }

    }
}) 

game.EnemyEntity = me.ObjectEntity.extend({
    init: function(respawnPoint){
        var settings = {image: "gripe_run_right", height: 50, spritewidth: 40, spriteheight: 50, width: 40  };
        this.parent(respawnPoint.startPosition.x, respawnPoint.startPosition.y, settings);
        this.setVelocity(3, 25);
        this.canFire = true;
        this.onGround = true; 
        this.renderable.addAnimation("soldier_stand", [0]);
        this.renderable.addAnimation("soldier_fly", [8]);
        this.renderable.addAnimation("soldier_jump", [6,7,8]);
        this.renderable.addAnimation("soldier_move", [2,3,4,5,6]);
        this.alwaysUpdate = true;
        this.type = me.game.ENEMY_OBJECT;
        this.renderable.setCurrentAnimation("soldier_stand");
        this.renderable.animationspeed = 2;
        this.isEnemy = true;
        this.respawnData = respawnPoint;
        this.actualTime = 0;
        this.enemyUpdateInterval= 800;
        this.shotDistance = 200;
        this.actualStep= null,
        this.player = me.game.getEntityByName("mainPlayer")[0];
        this.rifle = new EnemyRiffleEntity();
    },
    update: function(){
        var actual = me.timer.getTime();
        var timeDelta = actual - this.actualTime;

        if(timeDelta > this.enemyUpdateInterval){
            this.actualStep = this.getNextStep();
            this.actualTime = actual;
        }

        var distance = this.getPlayerDistance();
        var nextStep = this.actualStep

        this.flipX(nextStep.flipX);

        if(distance < this.shotDistance){
            var mePosition = {x:  this.pos.x + 20, y:  this.pos.y  + 25, z: this.z};
            var playerPosition = {x: this.player.pos.x, y: this.player.pos.y};
            this.rifle.shot(mePosition, playerPosition);     
            var xFlip = mePosition.x > playerPosition.x;
            this.flipX(xFlip);
        }

        this.changeAnimationIfNotActual(nextStep.animation);
        

        if(nextStep.vel.x != 0){
            this.vel.x += nextStep.vel.x * me.timer.tick;
        }

        if(nextStep.vel.y > 0){
            this.flying = true;
            this.falling = false;
            this.vel.y = -(this.maxVel.y - 20) * me.timer.tick;
            this.changeAnimationIfNotActual("soldier_fly");
        }else{
            this.flying = false;
            this.falling = true;
        }

        this.updateMovement();
        this.handleCollisions();

        if (this.vel.x!=0 || this.vel.y!=0) {
            this.parent();
            return true;
        }

        return false;
    },
    handleCollisions: function () {
        var res = me.game.collide(this);
        if (res) {
            if(res.obj.isBullet && !res.obj.shotByBot)
                this.handleCollisionWithBullet()
        }
    },
    handleCollisionWithBullet: function(){
        this.alive = false;
        game.playerFrags++;
    },
    getNextStep: function(){
        if(this.respawnData.actualStep > this.respawnData.steps.length - 1)
            this.respawnData.actualStep = 0;

        var result = this.respawnData.steps[this.respawnData.actualStep];
        this.respawnData.actualStep++;
        return result;
    },
    changeAnimationIfNotActual: function(animationName){
        if(!this.renderable.isCurrentAnimation(animationName)){
            this.renderable.setCurrentAnimation(animationName);
        }
    },
    getPlayerDistance: function(){
        var pp = this.player.pos;
        var ep = this.pos;
        return Math.sqrt(Math.pow(pp.x - ep.x, 2) + Math.pow(pp.y - ep.y, 2));
    }

});


game.PlayerEntity = me.ObjectEntity.extend({
    init: function(x, y, settings) {
        // call the constructor
        this.startX = x;
        this.startY = y;
        this.parent(x, y, settings);
 		this.lastMousePosition = me.input.mouse.pos.x > this.pos.x;
        // set the default horizontal & vertical speed (accel vector)
        this.setVelocity(3, 25);
 
        // set the display to follow our position on both axis
        me.game.viewport.follow(this.pos, me.game.viewport.AXIS.BOTH);
 		this.canFire = true;
        this.onGround = true; 

        this.renderable.addAnimation("soldier_stand", [0]);
        this.renderable.addAnimation("soldier_fly", [8]);
        this.renderable.addAnimation("soldier_jump", [6,7,8]);
        this.renderable.addAnimation("soldier_move", [2,3,4,5,6]);

        this.renderable.setCurrentAnimation("soldier_stand");
        this.renderable.animationspeed = 2;

        this.rifle = new RiffleEntity();
    },
 	jetPackPower: 100,
    
    update: function() {
        var localPos = me.game.viewport.worldToLocal(this.pos.x, this.pos.y);
        var position = me.input.mouse.pos.x > localPos.x;
        var shot = false;
 		if(position)
 			this.flipX(false);
 		else
 			this.flipX(true);

        if (me.input.isKeyPressed('left')) {
            this.vel.x -= this.accel.x * me.timer.tick;
            this.changeAnimationIfNotActual("soldier_move");
        } else if (me.input.isKeyPressed('right')) {
            this.vel.x += this.accel.x * me.timer.tick;
            this.changeAnimationIfNotActual("soldier_move");
        } else {
            this.vel.x = 0;
        }
        if (me.input.isKeyPressed('jump') && this.onGround) {
                this.onGround = false;
                this.renderable.setCurrentAnimation("soldier_fly");
                this.vel.y = -(this.maxVel.y - 10) * me.timer.tick;
        }
        if(me.input.isKeyPressed('shot')){
            var playerPosition = {x:  this.pos.x + 20, y:  this.pos.y  + 25, z: this.z};
            var mousePosition = me.game.viewport.localToWorld(me.input.mouse.pos.x, me.input.mouse.pos.y)//{x:  me.input.mouse.pos.x, y:  me.input.mouse.pos.y };
            this.rifle.shot(playerPosition, mousePosition);        	
        }

        if(me.input.keyStatus('fly')){
        	if(this.jetPackPower > 0){
        		this.flying = true;
        		this.falling = false;
        		this.vel.y = -(this.maxVel.y - 20) * me.timer.tick;
        		this.jetPackPower -= 1;
                this.renderable.setCurrentAnimation("soldier_fly");
        	}else{
        		this.flying = false;
        		this.falling = true;
        	}

        }else{
        	this.flying = false;
        	this.falling = true;

        	if(this.jetPackPower < 100)
        		this.jetPackPower += 0.5;
        }

        // check & update player movement
        var res = this.updateMovement();

        this.handleCollisionsWithCollisionMap(res);
        this.handleCollisions();
 
        // update animation if necessary
        if (this.vel.x!=0 || this.vel.y!=0 || position != this.lastMousePosition || shot) {
            // update object animation
            this.lastMousePosition = position;
            this.parent();
            return true;
        }
         
        // else inform the engine we did not perform
        // any update (e.g. position, animation)
        return false;
    },
    onDestroyEvent: function(){
    	console.log('soldier destroy');
    },

    changeAnimationIfNotActual: function(animationName){
        if(!this.renderable.isCurrentAnimation(animationName))
            this.renderable.setCurrentAnimation(animationName);
    },
    handleCollisionsWithCollisionMap: function (res) {
        if(res.y > 0){
            this.onGround = true;
            if(this.renderable.isCurrentAnimation("soldier_fly"))
                this.changeAnimationIfNotActual("soldier_stand");           
        }
    },
    handleCollisions: function(){
        var res = me.game.collide(this);
        if (res) {
            if(res.obj.isBullet && res.obj.shotByBot){
                game.playerDeaths++;
                this.pos.x = this.startX;
                this.pos.y = this.startY;
                this.vel.x+=1;
            }
        }
    },



});
