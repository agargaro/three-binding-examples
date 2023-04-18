import { WebGLRenderer } from "https://unpkg.com/three@0.151.0/build/three.module.js";
import Stats from "https://unpkg.com/three@0.151.0/examples/jsm/libs/stats.module.js";
import { computeAutoBinding } from "./binding";
export class Main {
    constructor(scene) {
        this.renderer = new WebGLRenderer({ antialias: true, canvas: document.getElementById("canvas") });
        this.stats = Stats();
        this.scene = scene;
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setAnimationLoop(this.animate.bind(this));
        document.body.appendChild(this.stats.dom);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    animate(time) {
        this.scene.setTime(time);
        computeAutoBinding(this.scene); // this is important!
        this.renderer.render(this.scene, this.scene.camera);
        this.stats.update();
    }
    onWindowResize() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}
