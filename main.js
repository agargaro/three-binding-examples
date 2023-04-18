import { WebGLRenderer } from "three";
import Stats from "three/addons/libs/stats.module";
import { computeAutoBinding } from "./binding.js";
export class Main {
    constructor(scene) {
        this.renderer = new WebGLRenderer({ antialias: true, alpha: true, canvas: document.getElementById("canvas") });
        this.stats = Stats();
        this.scene = scene;
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setAnimationLoop(this.animate.bind(this));
        document.body.appendChild(this.stats.dom);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    animate(time) {
        this.scene.setTime && this.scene.setTime(time);
        computeAutoBinding(this.scene); // this is important!
        this.renderer.render(this.scene, this.scene.camera);
        this.stats.update();
    }
    onWindowResize() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}
