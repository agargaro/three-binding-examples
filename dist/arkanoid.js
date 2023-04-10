import { BoxGeometry, DirectionalLight, MathUtils, Mesh, MeshBasicMaterial, MeshLambertMaterial, OrthographicCamera, PlaneGeometry, Raycaster, Scene, SphereGeometry, TextureLoader, Vector3, WebGLRenderer } from "https://unpkg.com/three@0.151.0/build/three.module.js";
import { DetectChangesMode, computeAutoBinding } from "./binding";
class Sphere extends Mesh {
    constructor() {
        super(new SphereGeometry(Sphere.radius, 10, 10), new MeshLambertMaterial({ color: 0xffffff }));
        this.direction = new Vector3(Math.random() * 2 - 1, Math.random()).normalize();
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
class Platform extends Mesh {
    constructor() {
        super(new BoxGeometry(20, 2.5, 0.1), new MeshBasicMaterial({ color: 0xffffff }));
        this.position.set(0, -40, 0);
        document.addEventListener("mousemove", (e) => {
            const xAxis = (e.clientX / window.innerWidth - 0.5) / window.innerHeight * window.innerWidth * 100;
            this.position.setX(MathUtils.clamp(xAxis, -50 + (10 * this.scale.x), 50 - (10 * this.scale.x)));
            this.updateWorldMatrix(false, false);
        });
        this.bindCallback("scaleX", () => this.scale.setX(1 - this.parent.bricksRemoved * 0.015));
    }
}
class Brick extends Mesh {
    constructor(rowIndex, colIndex, durability) {
        super(Brick.geometry);
        this.durability = durability;
        this.detectChangesMode = DetectChangesMode.manual;
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
Brick.geometry = new BoxGeometry(9.5, 2);
Brick.materials = [
    new MeshBasicMaterial({ color: 0xffffff }),
    new MeshBasicMaterial({ color: 0x00ff00 }),
    new MeshBasicMaterial({ color: 0xffff00 }),
    new MeshBasicMaterial({ color: 0xff0000 }),
];
class Wall extends Mesh {
    constructor(position, width, height) {
        super(new BoxGeometry(width, height, 0.1), new MeshBasicMaterial({ color: 0xffffff }));
        this.position.copy(position);
    }
}
class CustomScene extends Scene {
    constructor() {
        super();
        this.camera = new OrthographicCamera(-50 / window.innerHeight * window.innerWidth, 50 / window.innerHeight * window.innerWidth, 50, -50).translateZ(10);
        this.raycaster = new Raycaster();
        this.light = new DirectionalLight(0xffffff, 0.9).translateZ(10);
        this.sphere = new Sphere();
        this.platform = new Platform();
        this.deathLine = new Wall(new Vector3(0, -50), 100, 0.1);
        this.walls = [new Wall(new Vector3(50), 0.1, 100), new Wall(new Vector3(-50), 0.1, 100), new Wall(new Vector3(0, 50), 100, 0.1)];
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
        new TextureLoader().load(imgPath, (texture) => {
            this.add(new Mesh(new PlaneGeometry(50, 50), new MeshBasicMaterial({ map: texture })));
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
        this.renderer = new WebGLRenderer({ antialias: true });
        this.scene = new CustomScene();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setAnimationLoop(this.animate.bind(this));
        document.body.appendChild(this.renderer.domElement);
        window.addEventListener("resize", this.onWindowResize.bind(this));
    }
    animate(time) {
        this.scene.setTime(time);
        computeAutoBinding(this.scene);
        this.renderer.render(this.scene, this.scene.camera);
    }
    onWindowResize() {
        this.scene.camera.left = -50 / window.innerHeight * window.innerWidth;
        this.scene.camera.right = 50 / window.innerHeight * window.innerWidth;
        this.scene.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}
window.main = new Main();
