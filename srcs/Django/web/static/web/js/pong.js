/*------------Canvas and background setup---------*/
let aitrigger = 0;//trigger for ai game mode
let	friendtrigger = 0;//trigger for online game mode
let localtrigger = 0;
let clienttrigger = 0;
let trigger = 0;
let p1_username;
let p2_username;
let user_id;
let p1, p2;
let ball;
let hostname = "      ";
let width = 10;
let height = width * 3;
let maxBounceAngle = Math.PI / 3;
let speed = 2;
let refresh_rate = 10
let blood_mode = 0;
let color = "black"
let skin = "black"
/*------------CLIENT-PLAYER-MOVEMENT----------------------------------------*/
function move_remote_ball(data)
{
	trigger = data.trigger;
	ball.dx = -data.ball.dx;
	ball.dy = data.ball.dy;
	ball.x = (data.width / 2 )+ ((data.width / 2 )- data.ball.x) ;
	ball.y = data.ball.y;
	clienttrigger = 0;
	console.log("p2_username : ", p2_username, " hostname ", hostname, "trigger: ", trigger, "clienttrigger: ", clienttrigger, "friendtrigger: ", friendtrigger);
	if (p2.points != data.points.p1)// les cotés sont inversés car de son point de vue le user est tjrs le p1
		p2.points = data.points.p1;
	if (p1.points != data.points.p2)// les cotés sont inversés car de son point de vue le user est tjrs le p1
		p1.points = data.points.p2;

}
/*----------END-CLIENT-PLAYER-MOVEMENT-------------------------------------*/

document.addEventListener('DOMContentLoaded', () => {
	const canvas =  document.getElementById("TheGame");
	const ctx = canvas.getContext("2d");
	p1_username = document.getElementById('username').innerText.replace("Votre Username : ", '');
/*----------------------END-SETUP--------------------------------------------------*/
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


	class Ball {
		constructor(x, y, radius) {
			this.x = x;
			this.y = y;
			this.radius = radius;
			this.diameter = radius * 2;
			this.dx = 1;
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
			ctx.fillStyle = skin;
			ctx.arc(this.x, this.y, this.radius + 1, 0, Math.PI * 2);
			ctx.fill();
			ctx.closePath();
			if (this.isPlayerHit(p1)) {
					this.dx = speed * Math.cos(this.calculate_bounceAngle(p1));
					if (this.dx < 0)
						this.dx *= -1;
					this.dy = speed * Math.sin(this.calculate_bounceAngle(p1));
				/*if (friendtrigger === 1 && hostname != p2_username)
					sendBallUpdate();*/

			}
				else if (this.isPlayerHit(p2)) {
					this.dx = -speed * Math.cos(this.calculate_bounceAngle(p2));
					this.dy = speed * Math.sin(this.calculate_bounceAngle(p2));
					/*if (friendtrigger === 1 && hostname != p2_username)
						sendBallUpdate();*/

			}
			else if (this.y - this.radius <= 0 || this.y + this.radius >= canvas.height)
				{
					this.dy *= -1;
				}
			else if ((this.x <= width / 2 || this.x >= canvas.width - width / 2) && (!this.isPlayerHit(p2) || !this.isPlayerHit(p1))) {
					if (this.x <= width / 2 )
					{
						if (p2.points < 10)
							p2.points++;
						this.dx = -1; // Reset speed
					}
					else
					{
						if (p1.points < 10)
							p1.points++;
						this.dx = 1;
					}

					this.x = canvas.width / 2; // Reset ball to center
					this.y = canvas.height / 2;
					this.dy = 0;
					trigger = 0;
				/*	if (friendtrigger === 1 && hostname != p2_username)
						sendBallUpdate();		*/
				}
				
			this.x += this.dx;
			this.y += this.dy;
			if (friendtrigger === 1)
				sendBallUpdate();
			this.drawBall();
		}
	}

	p1 = new Player(width, canvas.height/2);
	p2 = new Player(canvas.width - (width * 2), canvas.height/2);
	ball = new Ball(canvas.width / 2, canvas.height / 2, 5);

	/*------------------------------KEY-TRACKING---------------*/
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
			p1.movePlayer(-(speed));
			if (friendtrigger === 1) 
				sendPlayerUpdate();
		}
		if (keys["s"]) {
			p1.movePlayer(speed);
			if (friendtrigger === 1)
				sendPlayerUpdate();
		}
		if (keys["ArrowDown"] && localtrigger === 1)
			p2.movePlayer(speed);
		if (keys["ArrowUp"] && localtrigger === 1)
			p2.movePlayer(-(speed));
		if (keys[" "] && (aitrigger === 1 || (friendtrigger === 1 && p2_username != hostname) || localtrigger === 1) && trigger === 0)
		{
			trigger = 1;
			if (friendtrigger === 1 && p2_username != hostname)
				sendBallUpdate();
		}
		if (aitrigger === 1 && ball.x >= canvas.width / 2 && ball.dx > 0 && trigger === 1)
			aiBot();
	}
	/*----------------------------END-KEY-TRACKING---------------*/

	function aiBot() {
		if (ball.y <= (p2.y + height / 2))
			p2.movePlayer(-(speed));
		else if (ball.y > (p2.y + height / 2))
			p2.movePlayer(speed);
	}
	
	function reInitialize()
	{
		let TheGame = document.getElementById('TheGame');
		let scoreboard = document.getElementById('scoreboard');
		let winText = document.getElementById('winText');
		let winner = document.getElementById('winner');

		
		TheGame.classList.remove('active');
		scoreboard.classList.remove('active');
		winText.innerText = "";
		if (p1.points === 10)
			winText.innerText += "Player one won !";
		else
			winText.innerText += "Player two won !";
		winner.classList.add('active');
		ball.x = canvas.width / 2;
		ball.y = canvas.height / 2;
		p1.y = canvas.height / 2;
		p2.y = canvas.height / 2;
		p2.points = 0;
		p1.points = 0;
		trigger = 0;
		aitrigger = 0;
		friendtrigger = 0;
		hostname = "       ";
		user_id = "";
	}

	function drawFrame() {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.fillStyle = color;
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		ball.drawBall();
		p1.drawPlayer();
		p2.drawPlayer();

		if (is_in_bottom === 0)
			movement();
		if (trigger === 1 && (aitrigger === 1 || (friendtrigger === 1 && hostname != p2_username) || localtrigger === 1))// to change on setup
				ball.moveBall(p1, p2);
		if (p1.points === 10 || p2.points == 10)
		{
			let result;
			if (p1.points === 10 && friendtrigger === 1)
			{
				result = "win";
				fetch('/increment_victory/', {
					method: "POST",
					headers: {
						"X-CSRFToken": getCSRFToken(),
						"Content-Type": "application/json"
					}
				})
			}
			if (p2.points === 10 && friendtrigger === 1)
			{
				result = "lose"
				fetch('/increment_losses/', {
					method: "POST",
					headers: {
						"X-CSRFToken": getCSRFToken(),
						"Content-Type": "application/json"
					}
				})
			}
			if (friendtrigger === 1)
			{
				fetch('/add_match_history/', {
					method: "POST",
					headers: {
						"X-CSRFToken": getCSRFToken(),
						"Content-Type": "application/json"
					},
					body: JSON.stringify({
						opponent_username: p2_username,
						result: result,
						score_player: p1.points,
						score_opponent: p2.points,
					})
				})
				.then(reponse => reponse.json())
				.then(data => {
					if (data.success) {
						showMatchHistory(); // Now correctly waits for the fetch response before updating the UI
					}
				})
				.catch(error => console.error("Error updating match history:", error));
			}

			reInitialize();
		}
		document.getElementById("p1-points").innerText = p1.points;
		document.getElementById("p2-points").innerText = p2.points;

		requestAnimationFrame(drawFrame);
	}
	drawFrame();
/*---------------------HOST-MOVEMENT-------------------------------------------------------------------------*/
	function sendPlayerUpdate() {
		if (window.mySocket.readyState === WebSocket.OPEN) {
			const sending_data = {
				type: "movement",
				player_id: p1_username,
				position: {y: p1.y },
				target_group: "user_" + user_id,
			};
			window.mySocket.send(JSON.stringify(sending_data));
		} else
			console.warn("WebSocket not ready. State:", window.mySocket.readyState);
	}

	function sendBallUpdate()
	{
		if (window.mySocket.readyState === WebSocket.OPEN) {
			const sending_data = {
				type: "ball_movement",
				player_id: p1_username,
				ball: {x: ball.x, y: ball.y, dx: ball.dx, dy: ball.dy},
				points: {p1: p1.points, p2: p2.points},
				target_group: "user_" + user_id,
				width: canvas.width,
				trigger: trigger,
			};
	
			//console.log("Sending WebSocket message:", JSON.stringify(data));
			window.mySocket.send(JSON.stringify(sending_data));
		}
		else
			console.warn("WebSocket not ready. State:", window.mySocket.readyState);
	}
/*----------------END-HOST-MOVEMENT-------------------------------------------------------------------------*/

})


function bloodMode() {
    const bloodButton = document.querySelector("#BloodButton"); // Sélectionne le bouton
    if (!bloodButton) return; // Empêche une erreur si le bouton n'existe pas

    blood_mode = blood_mode === 0 ? 1 : 0; // Bascule entre 0 et 1



    color = blood_mode ? "#8B0000" : color;
    skin = blood_mode ? "orange" : skin;
	speed = blood_mode ? 3 : 2;




    bloodButton.textContent = blood_mode ? "BLOOD MODE ON" : "BLOOD MODE OFF";
	console.log("color = ", color);
	console.log("TIME FOR A BLOODY MOON");
}

let base_mode = 0;

function basicMode() {
    const basicButton = document.querySelector("#basicButton"); // Sélectionne le bouton
    if (!basicButton) return; // Empêche une erreur si le bouton n'existe pas

    base_mode = base_mode === 0 ? 1 : 0; // Bascule entre 0 et 1

    basicButton.textContent = base_mode ? "BASE MODE ON" : "BASE MODE OFF";
}
/*-----color_picker-----*/
document.addEventListener("DOMContentLoaded", function () {
    // Sélectionne les color pickers
    const colorPickerA = document.getElementById("colorPickerA");
    const colorPickerB = document.getElementById("colorPickerB");
    const imageContainer = document.getElementById("imageContainer");


    function updateGradient() {


        let colorA = colorPickerA.value;
        let colorB = colorPickerB.value;

		if (base_mode === 1)
			color = colorA;
			skin = colorB;
		if (base_mode != 1)
			color = "black";
			skin = "black";



        console.log("Couleur A =", colorA);
        console.log("Couleur B =", colorB);

        // Appliquer le gradient
        imageContainer.style.background = `linear-gradient(45deg, ${colorA} 0%, ${colorB} 100%)`;
    }

    // Écouteurs pour détecter le changement de couleur
    colorPickerA.addEventListener("input", updateGradient);
    colorPickerB.addEventListener("input", updateGradient);
});