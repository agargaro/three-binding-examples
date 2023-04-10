import { Euler, Object3D, Quaternion, Scene, Vector2, Vector3 } from "three";

type Object3DPrivate = Object3D & { _boundCallbacks: { [x: string]: BindingCallbacks }, _detectChangesMode: DetectChangesMode };
type ScenePrivate = Scene & { _boundObjects: { [x: number]: Object3D } };

/**
 * Executes all callbacks bound to objects with detectChangesMode set to 'auto'. 
 * @param scenes Scene or Scene array where execute bound callbacks.
 */
export function computeAutoBinding(scenes: Scene | Scene[]) {
  Binding.computeAll(scenes);
}

interface BindingCallbacks<T = any> {
  getValueCallback: () => T;
  setValueCallback: (value: T) => void;
}

export enum DetectChangesMode {
  auto,
  manual
}

export interface BindingPrototype {
  /**
   * If 'manual' you need to call detectChanges() manually. Used to increase performance. Default: auto.
   */
  detectChangesMode: DetectChangesMode;
  /**
   * Executes all callbacks bound to this object (children excluded). 
   */
  detectChanges(): void;
  /**
   * Bind an expression to a property.
   * @param property Property name and binding unique key.
   * @param getCallback Callback that returns the value to bind.
   * @param bindAfterParentAdded If true you can use 'parent' property in the getCallback, avoiding null exception. Default: true.
   */
  bindProperty<T extends keyof this>(property: T, getCallback: () => this[T], bindAfterParentAdded?: boolean): this;
  /**
   * Bind a callback. 
   * @param key Binding unique key.
   * @param callback Binding callback.
   * @param bindAfterParentAdded If true you can use 'parent' property in the callback, avoiding null exception. Default: true.
   */
  bindCallback(key: string, callback: () => void, bindAfterParentAdded?: boolean): this;
  /**
   * Remove a binding by a key.
   * @param key Binding unique key.
   */
  unbindByKey(key: string): this;
}

class Binding {

  public static create<T>(key: string, getValueCallback: () => T, setValueCallback: (value: T) => void, obj: Object3D): void {
    if (!obj) {
      console.error("Error creating binding. Obj is mandatory.");
      return;
    }
    this.bindObjCallback({ setValueCallback, getValueCallback }, obj, key);
    this.bindSceneObj(obj)
  }

  private static bindObjCallback(bindingCallback: BindingCallbacks, obj: Object3D, key: string): void {
    const boundCallbacks = (obj as Object3DPrivate)._boundCallbacks ?? ((obj as Object3DPrivate)._boundCallbacks = {});
    boundCallbacks[key] = bindingCallback;
    this.executeCallback(bindingCallback);
  }

  private static bindSceneObj(obj: Object3D): void {
    if (obj.detectChangesMode === DetectChangesMode.auto) {
      const scene = this.getSceneFromObj(obj);
      if (scene) {
        const boundObjects = scene._boundObjects ?? (scene._boundObjects = {});
        boundObjects[obj.id] = obj;
      }
    }
  }

  public static bindSceneObjAndChildren(obj: Object3D): void {
    const scene = this.getSceneFromObj(obj);
    if (scene) {
      const boundObjects = scene._boundObjects ?? (scene._boundObjects = {});
      for (const child of obj.children) {
        if ((child as Object3D).detectChangesMode === DetectChangesMode.auto && (child as Object3DPrivate)._boundCallbacks) {
          boundObjects[child.id] = child as Object3D;
        }
      }
    }
  }

  public static unbindObjAndChildren(obj: Object3D): void {
    const boundObjects = this.getSceneFromObj(obj)?._boundObjects;
    if (boundObjects) {
      delete boundObjects[obj.id];
      for (const child of obj.children) {
        if ((child as Object3D).detectChangesMode === DetectChangesMode.auto) {
          delete boundObjects[child.id];
        }
      }
    }
  }

  private static getSceneFromObj(obj: Object3D): ScenePrivate {
    while (obj) {
      if ((obj as Scene).isScene) {
        return obj as ScenePrivate;
      }
      obj = obj.parent;
    }
  }

  private static executeCallback(bindingCallback: BindingCallbacks): void {
    bindingCallback.setValueCallback(bindingCallback.getValueCallback());
  }

  private static executeAllCallbacks(obj: Object3D): void {
    const callbacks = (obj as Object3DPrivate)._boundCallbacks;
    for (const key in callbacks) {
      this.executeCallback(callbacks[key]);
    }
  }

  public static unbindByKey(obj: Object3D, key: string): void {
    delete (obj as Object3DPrivate)._boundCallbacks[key];
  }

  public static computeSingle(obj: Object3D): void {
    this.executeAllCallbacks(obj);
  }

  public static computeAll(scenes: Scene | Scene[]): void {
    if ((scenes as Scene).isScene) {
      this.computeScene(scenes as Scene);
    } else {
      for (const scene of scenes as Scene[]) {
        this.computeScene(scene);
      }
    }
  }

  private static computeScene(scene: Scene): void {
    const boundObjs = (scene as ScenePrivate)._boundObjects;
    for (const objKey in boundObjs) {
      this.executeAllCallbacks(boundObjs[objKey]);
    }
  }
}

Object.defineProperty(Object3D.prototype, 'detectChangesMode', {
  get() {
    return this._detectChangesMode ?? DetectChangesMode.auto;
  }, set(value) {
    if (this._detectChangesMode === undefined) {
      this._detectChangesMode = value;
    } else {
      console.error("Cannot change detectChangesMode");
    }
  },
});

Object3D.prototype.detectChanges = function () {
  Binding.computeSingle(this);
};

Object3D.prototype.bindProperty = function (property, getValue, bindAfterParentAdded = true) {
  const event = () => {
    if ((this[property] as Vector3)?.isVector3 || (this[property] as Vector2)?.isVector2 ||
      (this[property] as Quaternion)?.isQuaternion || (this[property] as Euler)?.isEuler) {
      Binding.create(property, getValue, (value) => { (this[property] as any).copy(value) }, this);
    } else {
      Binding.create(property, getValue, (value) => { this[property] = value }, this);
    }
    this.removeEventListener("added", event);
  };
  bindAfterParentAdded && !this.parent && !(this as Scene).isScene ? this.addEventListener("added", event) : event();
  return this;
};

{
  const emptySet = () => { };
  Object3D.prototype.bindCallback = function (key, callback, bindAfterParentAdded = true) {
    const event = () => {
      Binding.create(key, callback, emptySet, this);
      this.removeEventListener("added", event);
    }
    bindAfterParentAdded && !this.parent && !(this as Scene).isScene ? this.addEventListener("added", event) : event();
    return this;
  };
}

Object3D.prototype.unbindByKey = function (property) {
  Binding.unbindByKey(this, property);
  return this;
};

{
  const addBase = Object3D.prototype.add;
  Object3D.prototype.add = function (object: Object3D) {
    addBase.bind(this)(...arguments);
    if (arguments.length == 1 && object !== this && object?.isObject3D) {
      Binding.bindSceneObjAndChildren(object);
    }
    return this;
  };
}

{
  const removeBase = Object3D.prototype.remove;
  Object3D.prototype.remove = function (object: Object3D) {
    if (arguments.length == 1 && this.children.indexOf(object) !== -1) {
      Binding.unbindObjAndChildren(object);
    }
    removeBase.bind(this)(...arguments);
    return this;
  };
}
