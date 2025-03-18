/*------------Canvas and background setup---------*/
var aitrigger = 0;
var	friendtrigger = 0;

let p1, p2;
function movep2( data)
{
	if (data.player_id != document.getElementById('username').innerText)
	{
		p2.x = data.data.position.x;
		p2.y = data.data.position.y;
	}
}


//--------------------------------------------------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
	const canvas = document.getElementById("TheGame");
	const ctx = canvas.getContext("2d");
	class Player {
		constructor(x, y) {
			this.x = x;
			this.y = y;
			this.points = 9;
		}

		movePlayer(y) {

			if ((y < 0 && this.y > 0) || (y > 0 && this.y < canvas.height - height))
			this.y += y;
		}

		drawPlayer() {
			ctx.fillStyle = "white";
			ctx.fillRect(this.x, this.y, width, height);
		}
	}



	function sendPlayerUpdate() {
		if (window.mySocket.readyState === WebSocket.OPEN) {

			const data = {
				type: "movement",
				player_id: document.getElementById('username').innerText,
				position: { x: p1.x, y: p1.y },
				target_group: 2,
				timestamp: Date.now()
			};
	
			//console.log("Sending WebSocket message:", JSON.stringify(data));
			window.mySocket.send(JSON.stringify(data));
		} else {
			console.warn("WebSocket not ready. State:", window.mySocket.readyState);
		}
	}


	
	let width = 10;
	let height = 30;
	let maxBounceAngle = Math.PI / 3;
	let speed = width / 4;
    // Le reste du code de ton jeu...
	class Ball {
		constructor(x, y, radius) {
			this.x = x;
			this.y = y;
			this.radius = radius;
			this.diameter = radius * 2;
			this.dx = 5;
			this.dy = 0;
		}
	
		isPlayerHit(p) {
			if (this.x + this.radius >= p.x && this.x - this.radius <= p.x + width &&
				this.y + this.radius >= p.y && this.y - this.radius <= p.y + height)
			return true;
			return false;
		}
	
		drawBall() {
			ctx.beginPath();
			ctx.fillStyle = "white";
			ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
			ctx.fill();
			ctx.closePath();
		}
	
		calculate_bounceAngle(paddle) {
			let intersectionY = this.y; // Point of intersection between the paddle and the ball
			let relativeIntersectY = (paddle.y + (height / 2)) - intersectionY; // Approximation of where the ball hit the paddle
			let normalizedRelativeIntersectionY = relativeIntersectY / (height / 2); // Normalize the relative intersection
			let bounceAngle = normalizedRelativeIntersectionY * maxBounceAngle;
			return bounceAngle;
		}
	
		moveBall(p1, p2) {
			ctx.beginPath();
			ctx.fillStyle = "black";
			ctx.arc(this.x, this.y, this.radius + 1, 0, Math.PI * 2);
			ctx.fill();
			ctx.closePath();
	
			if (this.isPlayerHit(p1)) {
			this.dx = speed * Math.cos(this.calculate_bounceAngle(p1));
			if (this.dx < 0)
				this.dx *= -1;
			this.dy = speed * Math.sin(this.calculate_bounceAngle(p1));
			} else if (this.isPlayerHit(p2)) {
			this.dx = -speed * Math.cos(this.calculate_bounceAngle(p2));
			this.dy = speed * Math.sin(this.calculate_bounceAngle(p2));
			} else if (this.y - this.radius <= 0 || this.y + this.radius >= canvas.height)
			this.dy *= -1;
			else if ((this.x <= width / 2 || this.x >= canvas.width - width / 2) && (!this.isPlayerHit(p2) || !this.isPlayerHit(p1))) {
			if (this.x <= 25)
				this.dx = -5; // Reset speed
			else
				this.dx = 5;
			this.x = canvas.width / 2; // Reset ball to center
			this.y = canvas.height / 2;
			this.dy = 0;
			trigger = 0;
			}
			this.x += this.dx;
			this.y += this.dy;
			this.drawBall();
		}
		}
	


	p1 = new Player(10, canvas.height/2);
	p2 = new Player(canvas.width - (width * 2), canvas.height/2);

	let ball = new Ball(canvas.width / 2, canvas.height / 2, 5);

	/*----------------------------------------------*/

	let trigger = 0;

	// Track key states
	const keys = {};

	// Update key state on keydown
	document.addEventListener('keydown', (event) => {
	keys[event.key] = true;
	});

	// Update key state on keyup
	document.addEventListener('keyup', (event) => {
	keys[event.key] = false;
	});

	function movement() {
	
		if (keys["z"] || keys["w"]) {
			p1.movePlayer(-(speed + 5));
			if (friendtrigger === 1) 
				sendPlayerUpdate();
		}
		if (keys["s"]) {
			p1.movePlayer(speed + 5);
			if (friendtrigger === 1)
				sendPlayerUpdate();
		}
		if (keys[" "] && aitrigger === 1)
			trigger = 1;
		if (aitrigger === 1 && ball.x >= canvas.width / 2 && ball.dx > 0 && trigger === 1)
			aiBot();
	}
	

	function aiBot() {
	if (ball.y <= (p2.y + height / 2))
		p2.movePlayer(-(speed));
	else if (ball.y > (p2.y + height / 2))
		p2.movePlayer(speed);
	}

	function reInitialize()
	{
		ball.x = canvas.width / 2;
		ball.y = canvas.height / 2;
		p1.y = canvas.height / 2;
		p2.y = canvas.height / 2;
		p2.points = 0;
		p1.points = 0;
		trigger = 0;
	}



	function drawFrame() {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.fillStyle = "black";
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		ball.drawBall();
		
		if (is_in_bottom === 0)
			movement();
		if (trigger === 1)
			ball.moveBall(p1, p2);
		p1.drawPlayer();
		p2.drawPlayer();
		if (ball.x <= width/2 && p2.points < 10)
			p2.points++;
		if (ball.x >= canvas.width - width/2 && p1.points < 10)
			p1.points += 1;
		if (p1.points === 10 || p2.points == 10)
		{
			let TheGame = document.getElementById('TheGame');
			let scoreboard = document.getElementById('scoreboard');
			let winText = document.getElementById('winText');
			let winner = document.getElementById('winner');

			TheGame.classList.remove('active');
			scoreboard.classList.remove('active');
			if (p1.points === 10)
				winText.innerText += "Player one won !";
			else
			winText.innerText += "Player two won !";
			winner.classList.add('active');
			reInitialize();
		}
		document.getElementById("p1-points").innerText = p1.points;
		document.getElementById("p2-points").innerText = p2.points;
		requestAnimationFrame(drawFrame);
	}

	p1.drawPlayer();
	p2.drawPlayer();

	drawFrame();
});
