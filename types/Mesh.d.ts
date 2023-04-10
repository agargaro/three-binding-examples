import { Mesh as MeshBase } from "three/index";
import { Object3D } from "three";
import { BindingPrototype, DetectChangesMode } from "../src/binding";

export class Mesh extends MeshBase implements BindingPrototype {
    override parent: Object3D;
    override children: Object3D[];
    detectChangesMode: DetectChangesMode;
    detectChanges(): void;
    bindProperty<T extends keyof this>(property: T, getCallback: () => this[T], bindAfterParentAdded?: boolean): this;
    bindCallback(key: string, callback: () => void, bindAfterParentAdded?: boolean): this;
    unbindByKey(key: string): this;
}
