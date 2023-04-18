import { BoxGeometry, DirectionalLight, MathUtils, Mesh, MeshBasicMaterial, MeshLambertMaterial, OrthographicCamera, PlaneGeometry, Raycaster, Scene, SphereGeometry, TextureLoader, Vector3 } from "three";
import { DetectChangesMode } from "./binding";
import { Main } from "./main";

class Sphere extends Mesh {
    public static radius = 2;
    public override parent: CustomScene;
    public direction = new Vector3(Math.random() - 0.5, Math.random()).normalize();
    public velocity = 0;

    constructor() {
        super(new SphereGeometry(Sphere.radius, 10, 10), new MeshLambertMaterial({ color: 0xffffff }));
        this.bindCallback("position", () => this.position.add(this.direction.clone().setLength(this.velocity)));
        this.bindProperty("velocity", () => this.parent.timeAlpha);
    }

    public bounce(normal: Vector3, distance: number): void {
        this.position.add(this.direction.clone().setLength(distance));
        this.velocity -= distance;
        this.direction.reflect(normal);
        this.updateWorldMatrix(false, false);
    }
}

class Platform extends Mesh {
    public override parent: CustomScene;

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
    public override detectChangesMode = DetectChangesMode.manual;
    private static geometry = new BoxGeometry(9.5, 2);
    private static materials = [
        new MeshBasicMaterial({ color: 0xffffff }),
        new MeshBasicMaterial({ color: 0x00ff00 }),
        new MeshBasicMaterial({ color: 0xffff00 }),
        new MeshBasicMaterial({ color: 0xff0000 }),
    ];
    public override parent: CustomScene;
    public isBrick = true;

    constructor(rowIndex: number, colIndex: number, public durability: number) {
        super(Brick.geometry);
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

class Wall extends Mesh {
    constructor(position: Vector3, width: number, height: number) {
        super(new BoxGeometry(width, height, 0.1), new MeshBasicMaterial({ color: 0xffffff }));
        this.position.copy(position);
    }
}

class CustomScene extends Scene {
    public camera = new OrthographicCamera(-50 / window.innerHeight * window.innerWidth, 50 / window.innerHeight * window.innerWidth, 50, -50).translateZ(10);
    public raycaster = new Raycaster();
    public light = new DirectionalLight(0xffffff, 0.9).translateZ(10);
    public sphere = new Sphere();
    public platform = new Platform();
    public deathLine = new Wall(new Vector3(0, -50), 100, 0.1);
    public walls = [new Wall(new Vector3(50), 0.1, 100), new Wall(new Vector3(-50), 0.1, 100), new Wall(new Vector3(0, 50), 100, 0.1)];
    public time = 0;
    public timeAlpha = 0;
    public speed = 0.1;
    public bricksRemoved = 0;

    constructor() {
        super();
        window.addEventListener("resize", this.onWindowResize.bind(this));
        
        this.raycaster.params.Mesh = { threshold: Sphere.radius };
        this.add(this.light, this.platform, this.sphere, ...this.walls, this.deathLine);

        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 10; j++) {
                this.add(new Brick(i, j, Math.abs(3 - i)));
            }
        }

        this.bindCallback("collisions", () => {
            let bounced: boolean;
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

                        if ((intersection.object as Brick).isBrick) {
                            (intersection.object as Brick).durability--;
                            (intersection.object as Brick).detectChanges();

                            if (this.bricksRemoved === 10 * 4) {
                                this.endGame("./assets/win.png");
                                break;
                            }
                        } else if (intersection.object === this.deathLine) {
                            this.endGame("./assets/gameover.png");
                            break;
                        }
                    }
                }
            } while (bounced);
        });
    }

    public endGame(imgPath: string): void {
        this.remove(...this.children);
        new TextureLoader().load(imgPath, (texture) => {
            this.add(new Mesh(new PlaneGeometry(50, 50), new MeshBasicMaterial({ map: texture })));
        });
    }

    public setTime(time: number): void {
        this.timeAlpha = (time - this.time) * (this.speed + this.bricksRemoved * 0.005);
        this.time = time;
    }

    public onWindowResize(): void {
        this.camera.left = -50 / window.innerHeight * window.innerWidth;
        this.camera.right = 50 / window.innerHeight * window.innerWidth;
        this.camera.updateProjectionMatrix();
    }
}

(window as any).main = new Main(new CustomScene());