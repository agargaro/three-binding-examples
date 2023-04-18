import { BoxGeometry, DirectionalLight, Mesh, MeshLambertMaterial, PerspectiveCamera, Raycaster, Scene, Vector2, Vector3 } from "three";
import { Main } from "./main.js";
class Box extends Mesh {
    constructor(position) {
        super(new BoxGeometry(3, 3, 3), new MeshLambertMaterial());
        this._colors = [0xaaaaaa, 0xffaaaa, 0xffff00];
        this._rotationSpeed = new Vector3(Math.random() / 100, Math.random() / 100, Math.random() / 100);
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
    constructor() {
        super();
        this.camera = new PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 10000).translateZ(10);
        this.boxes = [];
        this.raycaster = new Raycaster();
        this._pointer = new Vector2();
        window.addEventListener("resize", this.onWindowResize.bind(this));
        window.addEventListener("pointermove", this.onPointerMove.bind(this));
        window.addEventListener("click", this.onClick.bind(this));
        this.add(new DirectionalLight(0xffffff, 0.9).translateZ(10), ...this.boxes = [new Box(new Vector3(6)), new Box(new Vector3()), new Box(new Vector3(-6))]);
        this.bindCallback("raycasting", () => {
            var _a;
            this.raycaster.setFromCamera(this._pointer, this.camera);
            const intersects = this.raycaster.intersectObjects(this.boxes);
            this.hoveredObject = (_a = intersects[0]) === null || _a === void 0 ? void 0 : _a.object;
        });
    }
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    }
    onPointerMove(event) {
        this._pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        this._pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }
    onClick() {
        this.activeObject = this.hoveredObject;
    }
}
window.main = new Main(new CustomScene());
