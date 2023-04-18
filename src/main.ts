import { Camera, Scene, WebGLRenderer } from "three";
import Stats from "three/examples/jsm/libs/stats.module";
import { computeAutoBinding } from "./binding";

type CustomScene = Scene & { setTime?(time: number): void, camera: Camera };

export class Main {
    public renderer = new WebGLRenderer({ antialias: true, alpha: true, canvas: document.getElementById("canvas") });
    public scene: CustomScene;
    public stats = Stats();

    constructor(scene: CustomScene) {
        this.scene = scene;
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setAnimationLoop(this.animate.bind(this));
        document.body.appendChild(this.stats.dom);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    public animate(time: number): void {
        this.scene.setTime && this.scene.setTime(time);
        computeAutoBinding(this.scene); // this is important!
        this.renderer.render(this.scene, this.scene.camera);
        this.stats.update();
    }

    public onWindowResize(): void {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}
