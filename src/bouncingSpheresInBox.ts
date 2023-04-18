import { Main as MainBase } from "./main.js";
import GUI from "lil-gui";
import { BoxGeometry, CircleGeometry, Color, DirectionalLight, DoubleSide, Line3, Mesh, MeshBasicMaterial, MeshLambertMaterial, PerspectiveCamera, Plane, Scene, SphereGeometry, Vector3 } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

class Sphere extends Mesh {
    public static geometryRadius = 0.4;
    private static geometry = new SphereGeometry(this.geometryRadius);
    private static material = [
        new MeshLambertMaterial({ color: 0x00ff00 }), new MeshLambertMaterial({ color: 0xffffff }),
        new MeshLambertMaterial({ color: 0x0000ff }), new MeshLambertMaterial({ color: 0xff0000 })
    ];

    public override material: MeshLambertMaterial;
    public override parent: CustomScene;
    public isColliding: boolean;
    private _speed = Math.random() * 0.90 + 0.1;
    private _dir = new Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
    private _lineDir = new Line3();
    private _newPos = new Vector3();
    private _intersection = new Vector3();

    constructor(index: number) {
        super(Sphere.geometry);
        const materialIndex = index % 3;

        this.bindProperty("material", () => Sphere.material[this.isColliding ? 3 : materialIndex]);
        this.bindProperty("visible", () => this.parent.spheresCount > index && this.parent.colorVisibility[this.isColliding ? 3 : materialIndex]);
        this.bindProperty("isColliding", () => false);

        this.bindCallback("position", () => {
            if (this.parent.spheresCount <= index) return;
            let bounced: boolean;
            this._dir.setLength((this.parent.timeAlpha * this._speed) || 1e-5);
            this._newPos.addVectors(this.position, this._dir);

            do {
                bounced = false;
                this._lineDir.set(this.position, this._newPos);

                for (const face of this.parent.boxFaces) {
                    if (face.intersectsLine(this._lineDir)) {
                        bounced = true;
                        this.calculateBounce(face);
                        this.parent.add(new Impact(this._intersection, face.normal, Sphere.material[materialIndex].color));
                        break;
                    }
                }
            } while (bounced);

            this.position.copy(this._newPos);
        });
    }

    private calculateBounce(plane: Plane): void {
        plane.intersectLine(this._lineDir, this._intersection);
        const newLength = this._newPos.distanceTo(this._intersection);
        this._dir.setLength(Math.max(newLength, 1e-5)).reflect(plane.normal);
        this._newPos.addVectors(this._intersection, this._dir);
    }

    public checkCollisionWithSphere(sphere: Sphere): void {
        if (this.position.distanceTo(sphere.position) < Sphere.geometryRadius * 2) {
            this.isColliding = sphere.isColliding = true;
        }
    }
}

class Impact extends Mesh {
    private static geometry = new CircleGeometry(Sphere.geometryRadius, 16);
    public override material: MeshBasicMaterial;
    public override parent: CustomScene;

    constructor(position: Vector3, faceNormal: Vector3, color: Color) {
        super(Impact.geometry, new MeshBasicMaterial({ color, transparent: true, opacity: 0.7, side: DoubleSide }));

        this.position.copy(position).sub(faceNormal.clone().setLength(Sphere.geometryRadius));
        this.lookAt(this.position.clone().add(faceNormal));

        this.bindProperty("visible", () => this.parent.showImpact);

        this.bindCallback("opacity", () => {
            this.material.opacity -= this.parent.timeAlpha / 10;
            if (this.material.opacity <= 0) {
                this.material.dispose();
                this.removeFromParent();
            }
        });

        this.bindCallback("scale", () => this.scale.setScalar(this.material.opacity));
    }
}

class CustomScene extends Scene {
    public camera = new PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 10000).translateZ(12);
    public controls: OrbitControls;
    public colorVisibility = [true, true, true, true];
    public showImpact = true;
    public light: DirectionalLight;
    public sphere: Sphere[] = [];
    public box: Mesh;
    public timeSpeed = 5;
    public maxSpheres = 500;
    public spheresCount = 30;
    public time = 0;
    public timeAlpha = 0;
    public boxFaces: Plane[];

    constructor(domElement: HTMLCanvasElement) {
        super();

        window.addEventListener("resize", this.onWindowResize.bind(this));

        this.add(
            this.light = new DirectionalLight(0xffffff, 0.9),
            this.box = this.createBox()
        );

        this.updateLight();
        this.controls = new OrbitControls(this.camera, domElement);
        this.controls.autoRotate = true;
        this.controls.addEventListener("change", () => this.updateLight());
        this.bindCallback("controls", () => this.controls.autoRotate && this.controls.update());

        for (let i = 0; i < this.maxSpheres; i++) {
            this.add(this.sphere[i] = new Sphere(i));
        }

        this.bindCallback("collisions", () => {
            for (let i = 0; i < this.spheresCount - 1; i++) {
                for (let j = i + 1; j < this.spheresCount; j++) {
                    this.sphere[i].checkCollisionWithSphere(this.sphere[j]);
                }
            }
        });
    }

    public createBox(): Mesh {
        const box = new Mesh(new BoxGeometry(9, 9, 9, 5, 5, 5), new MeshBasicMaterial({ wireframe: true, transparent: true, opacity: 0.05 }))
        box.geometry.computeBoundingBox();
        const bbox = box.geometry.boundingBox;
        this.boxFaces = [
            new Plane(new Vector3(-1)).translate(new Vector3(bbox.max.x - Sphere.geometryRadius)),
            new Plane(new Vector3(1)).translate(new Vector3(bbox.min.x + Sphere.geometryRadius)),
            new Plane(new Vector3(0, -1)).translate(new Vector3(0, bbox.max.y - Sphere.geometryRadius)),
            new Plane(new Vector3(0, 1)).translate(new Vector3(0, bbox.min.y + Sphere.geometryRadius)),
            new Plane(new Vector3(0, 0, -1)).translate(new Vector3(0, 0, bbox.max.z - Sphere.geometryRadius)),
            new Plane(new Vector3(0, 0, 1)).translate(new Vector3(0, 0, bbox.min.z + Sphere.geometryRadius))
        ];
        return box;
    }

    public setTime(time: number): void {
        this.timeAlpha = (time - this.time) * this.timeSpeed / 1000;
        this.time = time;
    }

    public updateLight(): void {
        this.light.position.copy(this.camera.position);
    }

    public onWindowResize(): void {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    }
}

class Main extends MainBase {
    public override scene: CustomScene;

    constructor() {
        super(new CustomScene(document.getElementById("canvas") as HTMLCanvasElement));
        this.createGUI();
    }

    private createGUI(): void {
        const layers = {
            "toggle green": this.scene.colorVisibility[0],
            "toggle white": this.scene.colorVisibility[1],
            "toggle blue": this.scene.colorVisibility[2],
            "toggle red": this.scene.colorVisibility[3],
            "show impact": this.scene.showImpact,
            "speed": this.scene.timeSpeed,
            "spheres count": this.scene.spheresCount,
            "auto rotate": this.scene.controls.autoRotate
        };

        const gui = new GUI();
        gui.add(layers, "toggle green").onChange((value: boolean) => this.scene.colorVisibility[0] = value);
        gui.add(layers, "toggle white").onChange((value: boolean) => this.scene.colorVisibility[1] = value);
        gui.add(layers, "toggle blue").onChange((value: boolean) => this.scene.colorVisibility[2] = value);
        gui.add(layers, "toggle red").onChange((value: boolean) => this.scene.colorVisibility[3] = value);
        gui.add(layers, "show impact").onChange((value: boolean) => this.scene.showImpact = value);
        gui.add(layers, "speed", 1, 100, 1).onChange((value: number) => this.scene.timeSpeed = value);
        gui.add(layers, "spheres count", 3, this.scene.maxSpheres, 3).onChange((value: number) => this.scene.spheresCount = value);
        gui.add(layers, "auto rotate").onChange((value: boolean) => this.scene.controls.autoRotate = value);
    }
}

(window as any).main = new Main();