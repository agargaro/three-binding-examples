import { Scene as SceneBase } from "three/index";
import { Object3D } from "three";
import { BindingPrototype, DetectChangesMode } from "../src/binding";

export class Scene extends SceneBase implements BindingPrototype {
    override parent: Object3D;
    override children: Object3D[];
    detectChangesMode: DetectChangesMode;
    detectChanges(): void;
    bindProperty<T extends keyof this>(property: T, getCallback: () => this[T], bindAfterParentAdded?: boolean): this;
    bindCallback(key: string, callback: () => void, bindAfterParentAdded?: boolean): this;
    unbindByKey(key: string): this;
}
