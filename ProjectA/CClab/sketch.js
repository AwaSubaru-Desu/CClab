let lines = []; // all growing lines
let attractZones = []; // guide zones
let deadZones = []; // reject zones (repel lines)
let story = ""; // on-screen narrative
let storyAlpha = 0; // story fade effect
let lastStoryTime = 0; // last story trigger
let storyInterval = 5000; // story display duration
let lastMilestone = 0; // story milestone counter

let centerX = 250; // for coloring gradient
let centerY = 250;
let groupId = 0; // line group tracker
let currentMode = "guide"; // default mode is guide zone
let buttons = []; 

let scanY = 0; // scanline HUD effect
let scanSpeed = 1; // scanline speed
let lastFlash = 0; // HUD flash timing
let flashInterval = 2000;

let lastAutoSeedTime = 0; // auto line generation
let autoSeedInterval = 3000 + Math.random() * 2000; // random interval

let narrations = [ // story triggers based on line count
    { count: 1, text: "They emerge from below the ground..." },
    { count: 5, text: "Human presence alters their instincts." },
    { count: 10, text: "The web thickens at ten." },
    { count: 20, text: "A city, built not by hand, but by suggestion." },
    { count: 35, text: "Structures emerge beyond thirty-five." },
    { count: 50, text: "The city breathes at fifty." }
];

function setup() {
    let canvas = createCanvas(800, 500); 
    canvas.parent("p5-canvas-container"); 
    canvas.elt.tabIndex = '1';
    canvas.elt.focus(); 

    background(0);
    strokeWeight(1);
    angleMode(RADIANS);
    colorMode(HSB, 360, 100, 100, 255); 

    story = "SYSTEM BOOT >> Neural terrain matrix synced.\nAwaiting operator input...";
    storyAlpha = 255; // initial story visible
    lastStoryTime = millis();

    buttons = [ // button definitions
        { x: 80, y: height - 40, r: 30, label: "New Seed", mode: "seed", hovered: false },
        { x: 180, y: height - 40, r: 30, label: "Guide Zone", mode: "guide", hovered: false },
        { x: 280, y: height - 40, r: 30, label: "Reject Zone", mode: "reject", hovered: false },
        { x: 380, y: height - 40, r: 30, label: "Remove Zone", mode: "eraser", hovered: false }
    ];
}

function draw() {
    background(0, 0, 0, 10); // slight motion blur
    drawScanlines(); // draw HUD line
    drawHUD(); 

    for (let dz of deadZones) { // draw reject zones
        noStroke();
        fill(0, 100, 100, 80);
        rect(dz.x, dz.y, dz.w, dz.h);
        fill(0, 100, 100, 255);
        textAlign(CENTER, CENTER);
        text("R", dz.x + dz.w / 2, dz.y + dz.h / 2); // label as Reject
    }

    for (let i = attractZones.length - 1; i >= 0; i--) {
        let a = attractZones[i];
        noFill();
        stroke(120, 100, 100, 80);
        ellipse(a.x, a.y, 60); // guide zone circle
        fill(120, 100, 100, 180);
        noStroke();
        textAlign(CENTER, CENTER);
        text("A", a.x, a.y); // label as Attract
    }

    for (let l of lines) {
        l.update(); // line grows
        l.display(); // line draws itself
    }

    if (millis() - lastStoryTime < storyInterval && story !== "") {
        fill(120, 20, 100, storyAlpha);
        textSize(14);
        textAlign(LEFT);
        text(story, 20, 30); // show story
    }
    if (millis() - lastStoryTime > storyInterval) {
        storyAlpha = max(0, storyAlpha - 5); // fade story
    }

    drawButtons(); // render mode buttons

    for (let i = narrations.length - 1; i >= 0; i--) {
        if (lines.length >= narrations[i].count && lastMilestone < narrations[i].count) {
            story = narrations[i].text;
            storyAlpha = 255; // trigger narration
            lastStoryTime = millis();
            lastMilestone = narrations[i].count;
            break;
        }
    }

    if (currentMode === "seed" && millis() - lastAutoSeedTime > autoSeedInterval) {
        spawnSeedFromEdge(); // auto-generate line
        lastAutoSeedTime = millis();
        autoSeedInterval = 3000 + random(2000);
    }
}

function spawnSeedFromEdge() {
    let edge = int(random(4)); // pick a screen edge
    let margin = 60;
    let x, y;

    if (edge === 0) x = random(margin, width - margin), y = margin; // top
    else if (edge === 2) x = random(margin, width - margin), y = height - margin - 60; // bottom
    else if (edge === 1) x = width - margin, y = random(margin, height - margin - 60); // right
    else x = margin, y = random(margin, height - margin - 60); // left

    let targetX = width - x;
    let targetY = height - 60 - y; // mirror point
    let dx = targetX - x;
    let dy = targetY - y;
    let mag = sqrt(dx * dx + dy * dy); // normalize
    dx /= mag;
    dy /= mag;

    lines.push(new Line(x, y, dx, dy, groupId++)); // new line
}

class Line {
    constructor(x, y, dx, dy, group) {
        this.points = [{ x, y }];
        this.dx = dx;
        this.dy = dy;
        this.speed = random(0.6, 1.0); // line speed
        this.dead = false;
        this.group = group;
        this.lastTurnTime = millis();
        this.turnInterval = random(1000, 3000); // direction change
    }

    update() {
        if (this.dead) return;
        let last = this.points[this.points.length - 1];
        let tx = last.x + this.dx * this.speed;
        let ty = last.y + this.dy * this.speed;

        if (tx < 10 || tx > width - 10 || ty < 10 || ty > height - 60) {
            this.dead = true; // out of bounds
            return;
        }

        for (let other of lines) {
            if (other === this) continue;
            for (let p of other.points) {
                if (dist(tx, ty, p.x, p.y) < 1) {
                    this.dead = true; // overlap = death
                    return;
                }
            }
        }

        for (let a of attractZones) {
            let d = dist(last.x, last.y, a.x, a.y);
            if (d < 100) {
                let angle = atan2(a.y - last.y, a.x - last.x);
                this.dx = cos(angle);
                this.dy = sin(angle); // guide toward center
            }
        }

        for (let dz of deadZones) {
            let zx = dz.x + dz.w / 2;
            let zy = dz.y + dz.h / 2;
            let d = dist(last.x, last.y, zx, zy);
            if (d < 80) {
                let angle = atan2(last.y - zy, last.x - zx);
                this.dx = cos(angle);
                this.dy = sin(angle); // reject: steer away
            }
        }

        if (millis() - this.lastTurnTime > this.turnInterval) {
            if (random() < 0.5) {
                let angle = PI / 2 * int(random(4));
                let newAngle = atan2(this.dy, this.dx) + angle;
                this.dx = cos(newAngle);
                this.dy = sin(newAngle); // random turn
            }
            this.lastTurnTime = millis();
            this.turnInterval = random(1000, 3000);
        }

        this.points.push({ x: tx, y: ty }); // add new point
    }

    display() {
        strokeWeight(1.2);
        for (let i = 1; i < this.points.length; i++) {
            let p1 = this.points[i - 1];
            let p2 = this.points[i];
            let hueBase = (this.group * 50) % 360; // color by group
            let distFactor = dist(p2.x, p2.y, centerX, centerY);
            let hue = (hueBase + map(distFactor, 0, 250, 0, 60)) % 360;
            let colorChoice = int(this.group) % 3;
            if (colorChoice === 0) stroke(0, 0, 100, 150);
            else if (colorChoice === 1) stroke(0, 0, 80, 150);
            else stroke(200, 30, 100, 150); // visual variation
            line(p1.x, p1.y, p2.x, p2.y);
        }
    }
}

function drawHUD() {
    noFill();
    stroke(100, 0, 80, 150);
    rect(10, 10, width - 20, height - 60); // main frame
    noStroke();
    fill(100, 0, 80, 80);
    rect(0, height - 60, width, 60); // button bar
}

function drawScanlines() {
    stroke(180, 80, 100, 80);
    strokeWeight(2);
    line(10, scanY, width - 10, scanY); // moving line
    scanY += scanSpeed;
    if (scanY > height - 60) scanY = 10; // loop back

    if (millis() - lastFlash > flashInterval) {
        stroke(180, 80, 100, 80);
        noFill();
        rect(10, 10, width - 20, height - 60); // frame flash
        lastFlash = millis();
    }
}

function drawButtons() {
    for (let b of buttons) {
        b.hovered = dist(mouseX, mouseY, b.x, b.y) < b.r;
        fill(b.mode === currentMode ? 180 : (b.hovered ? 130 : 80));
        stroke(255, 50);
        strokeWeight(1);
        ellipse(b.x, b.y, b.r * 2); // button circle
        fill(0);
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(10);
        text(b.label, b.x, b.y); // button label
    }
}

function mousePressed() {
    let canvas = document.querySelector("canvas");
    if (canvas) canvas.focus();

    if (mouseButton === LEFT) {
        for (let b of buttons) {
            if (dist(mouseX, mouseY, b.x, b.y) < b.r) {
                currentMode = b.mode; // switch mode
                return false;
            }
        }

        if (currentMode === "seed") {
            spawnSeedFromEdge();
            return false;
        } else if (currentMode === "guide") {
            attractZones.push({ x: mouseX, y: mouseY, created: millis() });
        } else if (currentMode === "reject") {
            deadZones.push({ x: mouseX - 25, y: mouseY - 25, w: 50, h: 50 });
        } else if (currentMode === "eraser") {
            let threshold = 30;
            for (let i = attractZones.length - 1; i >= 0; i--) {
                if (dist(mouseX, mouseY, attractZones[i].x, attractZones[i].y) < threshold) {
                    attractZones.splice(i, 1); // remove guide
                    return false;
                }
            }
            for (let i = deadZones.length - 1; i >= 0; i--) {
                let dz = deadZones[i];
                if (mouseX > dz.x && mouseX < dz.x + dz.w && mouseY > dz.y && mouseY < dz.y + dz.h) {
                    deadZones.splice(i, 1); // remove reject
                    return false;
                }
            }
        }
    }
    return false;
}

function windowContextMenu(e) {
    e.preventDefault(); // disable right-click
}
window.addEventListener("contextmenu", windowContextMenu);