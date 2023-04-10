"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const three_1 = require("three");
const stats_module_1 = require("three/examples/jsm/libs/stats.module");
const binding_1 = require("./binding");
class Sphere extends three_1.Mesh {
    constructor() {
        super(new three_1.SphereGeometry(Sphere.radius, 10, 10), new three_1.MeshLambertMaterial({ color: 0xffffff }));
        this.direction = new three_1.Vector3(Math.random() * 2 - 1, Math.random()).normalize();
        this.velocity = 0;
        this.bindCallback("position", () => this.position.add(this.direction.clone().setLength(this.velocity)));
        this.bindProperty("velocity", () => this.parent.timeAlpha);
    }
    bounce(normal, distance) {
        this.position.add(this.direction.clone().setLength(distance));
        this.velocity -= distance;
        this.direction.reflect(normal);
        this.updateWorldMatrix(false, false);
    }
}
Sphere.radius = 2;
class Platform extends three_1.Mesh {
    constructor() {
        super(new three_1.BoxGeometry(20, 2.5, 0.1), new three_1.MeshBasicMaterial({ color: 0xffffff }));
        this.position.set(0, -40, 0);
        document.addEventListener("mousemove", (e) => {
            const xAxis = (e.clientX / window.innerWidth - 0.5) / window.innerHeight * window.innerWidth * 100;
            this.position.setX(three_1.MathUtils.clamp(xAxis, -50 + (10 * this.scale.x), 50 - (10 * this.scale.x)));
            this.updateWorldMatrix(false, false);
        });
        this.bindCallback("scaleX", () => this.scale.setX(1 - this.parent.bricksRemoved * 0.015));
    }
}
class Brick extends three_1.Mesh {
    constructor(rowIndex, colIndex, durability) {
        super(Brick.geometry);
        this.durability = durability;
        this.detectChangesMode = binding_1.DetectChangesMode.manual;
        this.isBrick = true;
        this.position.setX(colIndex * 10 - 45).setY(45 - rowIndex * 2.5);
        this.bindProperty("material", () => Brick.materials[this.durability]);
        this.bindCallback("dispose", () => {
            if (this.durability == -1) {
                this.parent.bricksRemoved++;
                this.removeFromParent();
            }
        });
    }
}
Brick.geometry = new three_1.BoxGeometry(9.5, 2);
Brick.materials = [
    new three_1.MeshBasicMaterial({ color: 0xffffff }),
    new three_1.MeshBasicMaterial({ color: 0x00ff00 }),
    new three_1.MeshBasicMaterial({ color: 0xffff00 }),
    new three_1.MeshBasicMaterial({ color: 0xff0000 }),
];
class Wall extends three_1.Mesh {
    constructor(position, width, height) {
        super(new three_1.BoxGeometry(width, height, 0.1), new three_1.MeshBasicMaterial({ color: 0xffffff }));
        this.position.copy(position);
    }
}
class CustomScene extends three_1.Scene {
    constructor() {
        super();
        this.camera = new three_1.OrthographicCamera(-50 / window.innerHeight * window.innerWidth, 50 / window.innerHeight * window.innerWidth, 50, -50).translateZ(10);
        this.raycaster = new three_1.Raycaster();
        this.light = new three_1.DirectionalLight(0xffffff, 0.9).translateZ(10);
        this.sphere = new Sphere();
        this.platform = new Platform();
        this.deathLine = new Wall(new three_1.Vector3(0, -50), 100, 0.1);
        this.walls = [new Wall(new three_1.Vector3(50), 0.1, 100), new Wall(new three_1.Vector3(-50), 0.1, 100), new Wall(new three_1.Vector3(0, 50), 100, 0.1)];
        this.bindCallback("collisions", () => {
            let bounced;
            do {
                bounced = false;
                this.raycaster.set(this.sphere.position, this.sphere.direction);
                this.raycaster.far = this.sphere.velocity + Sphere.radius;
                const intersections = this.raycaster.intersectObjects(this.children, false);
                if (intersections.length > 0) {
                    const intersection = intersections[0];
                    const distance = intersection.distance - Sphere.radius;
                    if (distance < this.sphere.velocity) {
                        bounced = true;
                        this.sphere.bounce(intersection.face.normal.clone().transformDirection(intersection.object.matrixWorld), distance);
                        if (intersection.object.isBrick) {
                            intersection.object.durability--;
                            intersection.object.detectChanges();
                            if (this.bricksRemoved === 10 * 4) {
                                this.endGame("./assets/win.png");
                            }
                        }
                        else if (intersection.object === this.deathLine) {
                            this.endGame("./assets/gameover.png");
                        }
                    }
                }
            } while (bounced);
        });
        this.startGame();
    }
    endGame(imgPath) {
        this.remove(...this.children);
        new three_1.TextureLoader().load(imgPath, (texture) => {
            this.add(new three_1.Mesh(new three_1.PlaneGeometry(50, 50), new three_1.MeshBasicMaterial({ map: texture })));
        });
    }
    setTime(time) {
        this.timeAlpha = (time - this.time) * (this.speed + this.bricksRemoved * 0.005);
        this.time = time;
    }
    startGame() {
        this.speed = 0.1;
        this.time = 0;
        this.timeAlpha = 0;
        this.bricksRemoved = 0;
        this.add(this.light, this.platform, this.sphere, ...this.walls, this.deathLine);
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 10; j++) {
                this.add(new Brick(i, j, Math.abs(3 - i)));
            }
        }
    }
}
class Main {
    constructor() {
        this.renderer = new three_1.WebGLRenderer({ antialias: true });
        this.scene = new CustomScene();
        this.stats = (0, stats_module_1.default)();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setAnimationLoop(this.animate.bind(this));
        document.body.appendChild(this.renderer.domElement);
        document.body.appendChild(this.stats.dom);
        window.addEventListener("resize", this.onWindowResize.bind(this));
    }
    animate(time) {
        this.scene.setTime(time);
        (0, binding_1.computeAutoBinding)(this.scene);
        this.renderer.render(this.scene, this.scene.camera);
        this.stats.update();
    }
    onWindowResize() {
        this.scene.camera.left = -50 / window.innerHeight * window.innerWidth;
        this.scene.camera.right = 50 / window.innerHeight * window.innerWidth;
        this.scene.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}
window.main = new Main();
//# sourceMappingURL=arkanoid.js.map