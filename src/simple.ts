import { BoxGeometry, DirectionalLight, Mesh, MeshLambertMaterial, PerspectiveCamera, Raycaster, Scene, Vector2, Vector3 } from "three";
import { Main } from "./main";

class Box extends Mesh {
    public override parent: CustomScene;
    public override material: MeshLambertMaterial;
    public isActive: boolean;
    public isHovered: boolean;
    private _colors = [0xaaaaaa, 0xffaaaa, 0xffff00];
    private _rotationSpeed = new Vector3(Math.random() / 100, Math.random() / 100, Math.random() / 100);

    constructor(position: Vector3) {
        super(new BoxGeometry(3, 3, 3), new MeshLambertMaterial());
        this.position.copy(position);

        this.bindProperty("isHovered", () => this.parent.hoveredObject === this);

        this.bindProperty("isActive", () => this.parent.activeObject === this);

        this.bindCallback("materialColor", () => this.material.color.set(this._colors[this.isActive ? 2 : this.isHovered ? 1 : 0]));

        this.bindCallback("rotation", () => {
            this.rotation.x += this._rotationSpeed.x;
            this.rotation.y += this._rotationSpeed.y;
            this.rotation.z += this._rotationSpeed.z;
        });
    }
}

class CustomScene extends Scene {
    public hoveredObject: Box;
    public activeObject: Box;
    public camera = new PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 10000).translateZ(10);
    public boxes: Box[] = [];
    public raycaster = new Raycaster();
    private _pointer = new Vector2();

    constructor() {
        super();

        window.addEventListener("resize", this.onWindowResize.bind(this));
        window.addEventListener("pointermove", this.onPointerMove.bind(this));
        window.addEventListener("click", this.onClick.bind(this));

        this.add(
            new DirectionalLight(0xffffff, 0.9).translateZ(10),
            ...this.boxes = [new Box(new Vector3(6)), new Box(new Vector3()), new Box(new Vector3(-6))],
        );

        this.bindCallback("raycasting", () => {
            this.raycaster.setFromCamera(this._pointer, this.camera);
            const intersects = this.raycaster.intersectObjects(this.boxes);
            this.hoveredObject = intersects[0]?.object as Box;
        });
    }

    public onWindowResize(): void {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    }

    public onPointerMove(event: PointerEvent) {
        this._pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        this._pointer.y = - (event.clientY / window.innerHeight) * 2 + 1;
    }

    public onClick() {
        this.activeObject = this.hoveredObject;
    }
}

(window as any).main = new Main(new CustomScene());