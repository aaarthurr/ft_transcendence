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
let width = 5;
let height = width * 6;
let maxBounceAngle = Math.PI / 4;
let speed = 3;
let refresh_rate = 10
let blood_mode = 0;
let color = "black"
let skin = "black"

let in_tournament = 0;
let tournamentRound = 0;


/*------------CLIENT-PLAYER-MOVEMENT----------------------------------------*/
function move_remote_ball(data)
{
	trigger = data.trigger;
	ball.dx = -data.ball.dx;
	ball.dy = data.ball.dy;
	ball.x = (data.width / 2 )+ ((data.width / 2 )- data.ball.x) ;
	ball.y = data.ball.y;
	clienttrigger = 0;
	if (p2.points != data.points.p1)// les cotés sont inversés car de son point de vue le user est tjrs le p1
		p2.points = data.points.p1;
	if (p1.points != data.points.p2)// les cotés sont inversés car de son point de vue le user est tjrs le p1
		p1.points = data.points.p2;

}
/*----------END-CLIENT-PLAYER-MOVEMENT-------------------------------------*/

document.addEventListener('DOMContentLoaded', () => {
	const canvas =  document.getElementById("TheGame");
	const ctx = canvas.getContext("2d");
	p1_username = document.getElementById('username').innerText.replace("username: ", '');
/*----------------------END-SETUP--------------------------------------------------*/
	class Player {
		constructor(x, y) {
			this.x = x;
			this.y = y;
			this.points = 0;
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
						if (p2.points < 5)
							p2.points++;
						this.dx = -1; // Reset speed
					}
					else
					{
						if (p1.points < 5)
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

	let touchArea = { top: false, bottom: false };

	document.addEventListener("touchstart", handleTouch);
	document.addEventListener("touchend", stopTouch);
	
	function handleTouch(event) {
		const touchY = event.touches[0].clientY;
		const screenHeight = window.innerHeight;
	
		// Si l'utilisateur touche la moitié supérieure de l'écran
		if (touchY < screenHeight / 2) {
			touchArea.top = true;
			touchArea.bottom = false;
		} else {
			touchArea.top = false;
			touchArea.bottom = true;
		}
	}
	
	function stopTouch() {
		touchArea.top = false;
		touchArea.bottom = false;
	}
	
	function movement() {
		let cant_play = document.getElementById("cant_play");
		// Mise à jour de keys en fonction du touché
		if (touchArea.top || keys["z"] || keys["w"]) {
			p1.movePlayer(-(speed));
			if (friendtrigger === 1) 
				sendPlayerUpdate();
		}
		if (touchArea.bottom || keys["s"]) {
			p1.movePlayer(speed);
			if (friendtrigger === 1)
				sendPlayerUpdate();
		}
		if (keys["ArrowDown"] && localtrigger === 1)
			p2.movePlayer(speed);
		if (keys["ArrowUp"] && localtrigger === 1)
			p2.movePlayer(-(speed));
		if (keys[" "]) {
			cant_play.classList.remove('active');
		}
		if ((keys[" "] || touchArea.top || touchArea.bottom) && (aitrigger === 1 || (friendtrigger === 1 && p2_username != hostname) || localtrigger === 1) && trigger === 0) {
			trigger = 1;
			if (friendtrigger === 1 && p2_username != hostname)
				sendBallUpdate();
		}
		if (aitrigger === 1 && ball.x >= canvas.width / 2 && ball.dx > 0 && trigger === 1)
			aiBot();
	}
	
	/*----------------------------END-KEY-TRACKING---------------*/

	let lastAITargetUpdate = 0;
	let aiTargetY = null;
	let aiSpeed = 1;
	let refresh_ai = 1000;
	
	const difficultySelector = document.getElementById("ai-difficulty");
	
	difficultySelector.addEventListener("change", function () {
		const difficulty = this.value;
	
		if (difficulty === "easy") {
			aiSpeed = 1;
			refresh_ai = 1000;
		} else if (difficulty === "medium") {
			aiSpeed = 2;
			refresh_ai = 1000;
		} else if (difficulty === "hard") {
			aiSpeed = 2;
			refresh_ai = 600;
		}
	
		console.log("AI difficulty set to:", difficulty, "| Speed:", aiSpeed, "| Refresh:", refresh_ai);
	});
	
	function aiBot() {
		const now = Date.now();
	
		// If it's been more than 1000ms since the last target update
		if (now - lastAITargetUpdate >= refresh_ai || aiTargetY === null) {
			lastAITargetUpdate = now;
	
			// Set new target Y to center the paddle on the ball
			aiTargetY = ball.y - height / 2;
		}
	
		// Move towards targetY by at most aiSpeed pixels
		if (aiTargetY !== null) {
			if (Math.abs(p2.y - aiTargetY) > aiSpeed) {
				if (p2.y < aiTargetY) {
					p2.movePlayer(aiSpeed);
				} else {
					p2.movePlayer(-aiSpeed);
				}
			} else {
				// Close enough, snap to position if desired
				p2.y = aiTargetY;
			}
		}
	}

	
	
	function reInitialize()
	{
		let TheGame = document.getElementById('TheGame');
		let scoreboard = document.getElementById('scoreboard');
		let winText = document.getElementById('winText');
		let winner = document.getElementById('winner');
		let cant_play = document.getElementById("cant_play");
		let mainPageButton = document.getElementById("toMainPageButton");

		mainPageButton.classList.remove("disabled");
		cant_play.classList.remove('active');
		TheGame.classList.remove('active');
		scoreboard.classList.remove('active');
		winText.innerText = "";
		if (p1.points === 5)
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

	let lastFrameTime = 0;
	const desiredFPS = 60;
	const frameDuration = 1000 / desiredFPS;
	
	function drawFrame(currentTime) {
		let cant_play = document.getElementById("cant_play");

		if(trigger === 0 && (friendtrigger === 1 || aitrigger === 1 || localtrigger == 1) && p1.points === 0 && p2.points === 0 && hostname != p2_username)
		{
			cant_play.innerText = "";
			cant_play.innerText = "Press space to play !";
			cant_play.classList.add('active');

		}
		currentTime = currentTime || performance.now();
	
		const timeSinceLastFrame = currentTime - lastFrameTime;
	
		if (timeSinceLastFrame >= frameDuration) {
			lastFrameTime = currentTime;
	
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.fillStyle = color;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			ball.drawBall();
			p1.drawPlayer();
			p2.drawPlayer();
	
			if (is_in_bottom === 0)
				movement();
			if (trigger === 1 && (aitrigger === 1 || (friendtrigger === 1 && hostname != p2_username) || localtrigger === 1))
				ball.moveBall(p1, p2);
	
			if (p1.points === 5 || p2.points === 5) {
				let result;
	
				if (p1.points === 5 && friendtrigger === 1) {
					result = "win";
					fetch('/increment_victory/', {
						method: "POST",
						headers: {
							"X-CSRFToken": getCSRFToken(),
							"Content-Type": "application/json"
						}
					});
				}
				if (p2.points === 5 && friendtrigger === 1) {
					result = "lose";
					fetch('/increment_losses/', {
						method: "POST",
						headers: {
							"X-CSRFToken": getCSRFToken(),
							"Content-Type": "application/json"
						}
					});
				}
				if (friendtrigger === 1) {
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
					.then(response => response.json())
					.then(data => {
						if (data.success) {
							showMatchHistory();
						}
					})
					.catch(error => console.error("Error updating match history:", error));
				}
	
				if (in_tournament === 1) {

					if (tournamentRound === 0) {
						if (p1.points === 5 && friendtrigger === 1) {
							alert("deuxieme manche");
							tournamentRound++;
							secondRound(1);
						} else if (p2.points === 5 && friendtrigger === 1) {
							in_tournament = 0;
							tournamentRound = 0;
							secondRound(0);
						}
					} else if (tournamentRound === 1) {
						alert("troisieme manche");
						if (p1.points === 5 && friendtrigger === 1) {
							tournamentRound++;
							lastRound(1);
						} else if (p2.points === 5 && friendtrigger === 1) {
							in_tournament = 0;
							tournamentRound = 0;
							lastRound(0);
						}
					} else if (tournamentRound === 2) {
						if (p1.points === 5 && friendtrigger === 1) {
							alert("vous avez gagné");
							finishTournament(1);
						} else if (p2.points === 5 && friendtrigger === 1) {
							finishTournament(0);
						}
						in_tournament = 0;
						tournamentRound = 0;
					}
				}
	
				reInitialize();
			}
	
			document.getElementById("p1-points").innerText = p1.points;
			document.getElementById("p2-points").innerText = p2.points;
		}
	
		requestAnimationFrame(drawFrame);
	}
	requestAnimationFrame(drawFrame);

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
	speed = blood_mode ? 4 : 3;
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