var _a;
import GUI from "lil-gui";
import { BoxGeometry, CircleGeometry, DirectionalLight, DoubleSide, Line3, Mesh, MeshBasicMaterial, MeshLambertMaterial, PerspectiveCamera, Plane, Scene, SphereGeometry, Vector3, WebGLRenderer } from "https://unpkg.com/three@0.151.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.151.0/examples/jsm/controls/OrbitControls";
import Stats from "https://unpkg.com/three@0.151.0/examples/jsm/libs/stats.module";
import { computeAutoBinding } from "./binding";
class Sphere extends Mesh {
    constructor(index) {
        super(Sphere.geometry);
        this._speed = Math.random() * 0.90 + 0.1;
        this._dir = new Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
        this._lineDir = new Line3();
        this._newPos = new Vector3();
        this._intersection = new Vector3();
        const materialIndex = index % 3;
        this.bindProperty("material", () => Sphere.material[this.isColliding ? 3 : materialIndex]);
        this.bindProperty("visible", () => this.parent.spheresCount > index && this.parent.colorVisibility[this.isColliding ? 3 : materialIndex]);
        this.bindProperty("isColliding", () => false);
        this.bindCallback("position", () => {
            if (this.parent.spheresCount <= index)
                return;
            let bounced;
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
    calculateBounce(plane) {
        plane.intersectLine(this._lineDir, this._intersection);
        const newLength = this._newPos.distanceTo(this._intersection);
        this._dir.setLength(Math.max(newLength, 1e-5)).reflect(plane.normal);
        this._newPos.addVectors(this._intersection, this._dir);
    }
    checkCollisionWithSphere(sphere) {
        if (this.position.distanceTo(sphere.position) < Sphere.geometryRadius * 2) {
            this.isColliding = sphere.isColliding = true;
        }
    }
}
_a = Sphere;
Sphere.geometryRadius = 0.4;
Sphere.geometry = new SphereGeometry(_a.geometryRadius);
Sphere.material = [
    new MeshLambertMaterial({ color: 0x00ff00 }), new MeshLambertMaterial({ color: 0xffffff }),
    new MeshLambertMaterial({ color: 0x0000ff }), new MeshLambertMaterial({ color: 0xff0000 })
];
class Impact extends Mesh {
    constructor(position, faceNormal, color) {
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
Impact.geometry = new CircleGeometry(Sphere.geometryRadius, 16);
class CustomScene extends Scene {
    constructor(domElement) {
        super();
        this.camera = new PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 10000).translateZ(12);
        this.colorVisibility = [true, true, true, true];
        this.showImpact = true;
        this.sphere = [];
        this.timeSpeed = 5;
        this.maxSpheres = 500;
        this.spheresCount = 30;
        this.time = 0;
        this.timeAlpha = 0;
        this.add(this.light = new DirectionalLight(0xffffff, 0.9), this.box = this.createBox());
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
    createBox() {
        const box = new Mesh(new BoxGeometry(9, 9, 9, 5, 5, 5), new MeshBasicMaterial({ wireframe: true, transparent: true, opacity: 0.05 }));
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
    setTime(time) {
        this.timeAlpha = (time - this.time) * this.timeSpeed;
        this.time = time;
    }
    updateLight() {
        this.light.position.copy(this.camera.position);
    }
}
class Main {
    constructor() {
        this.renderer = new WebGLRenderer({ alpha: true, antialias: true });
        this.scene = new CustomScene(this.renderer.domElement);
        this.stats = Stats();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setAnimationLoop(this.animate.bind(this));
        document.body.appendChild(this.renderer.domElement);
        document.body.appendChild(this.stats.dom);
        window.addEventListener("resize", this.onWindowResize.bind(this));
        this.createGUI();
    }
    animate(time) {
        this.scene.setTime(time / 1000);
        computeAutoBinding(this.scene);
        this.renderer.render(this.scene, this.scene.camera);
        this.stats.update();
    }
    onWindowResize() {
        this.scene.camera.aspect = window.innerWidth / window.innerHeight;
        this.scene.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    createGUI() {
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
        gui.add(layers, "toggle green").onChange((value) => this.scene.colorVisibility[0] = value);
        gui.add(layers, "toggle white").onChange((value) => this.scene.colorVisibility[1] = value);
        gui.add(layers, "toggle blue").onChange((value) => this.scene.colorVisibility[2] = value);
        gui.add(layers, "toggle red").onChange((value) => this.scene.colorVisibility[3] = value);
        gui.add(layers, "show impact").onChange((value) => this.scene.showImpact = value);
        gui.add(layers, "speed", 1, 100, 1).onChange((value) => this.scene.timeSpeed = value);
        gui.add(layers, "spheres count", 3, this.scene.maxSpheres, 3).onChange((value) => this.scene.spheresCount = value);
        gui.add(layers, "auto rotate").onChange((value) => this.scene.controls.autoRotate = value);
    }
}
window.main = new Main();
