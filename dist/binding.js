import { Object3D } from "https://unpkg.com/three@0.151.0/build/three.module.js";
/**
 * Executes all callbacks bound to objects with detectChangesMode set to 'auto'.
 * @param scenes Scene or Scene array where execute bound callbacks.
 */
export function computeAutoBinding(scenes) {
    Binding.computeAll(scenes);
}
export var DetectChangesMode;
(function (DetectChangesMode) {
    DetectChangesMode[DetectChangesMode["auto"] = 0] = "auto";
    DetectChangesMode[DetectChangesMode["manual"] = 1] = "manual";
})(DetectChangesMode || (DetectChangesMode = {}));
class Binding {
    static create(key, getValueCallback, setValueCallback, obj) {
        if (!obj) {
            console.error("Error creating binding. Obj is mandatory.");
            return;
        }
        this.bindObjCallback({ setValueCallback, getValueCallback }, obj, key);
        this.bindSceneObj(obj);
    }
    static bindObjCallback(bindingCallback, obj, key) {
        var _a;
        const boundCallbacks = (_a = obj._boundCallbacks) !== null && _a !== void 0 ? _a : (obj._boundCallbacks = {});
        boundCallbacks[key] = bindingCallback;
        this.executeCallback(bindingCallback);
    }
    static bindSceneObj(obj) {
        var _a;
        if (obj.detectChangesMode === DetectChangesMode.auto) {
            const scene = this.getSceneFromObj(obj);
            if (scene) {
                const boundObjects = (_a = scene._boundObjects) !== null && _a !== void 0 ? _a : (scene._boundObjects = {});
                boundObjects[obj.id] = obj;
            }
        }
    }
    static bindSceneObjAndChildren(obj) {
        var _a;
        const scene = this.getSceneFromObj(obj);
        if (scene) {
            const boundObjects = (_a = scene._boundObjects) !== null && _a !== void 0 ? _a : (scene._boundObjects = {});
            for (const child of obj.children) {
                if (child.detectChangesMode === DetectChangesMode.auto && child._boundCallbacks) {
                    boundObjects[child.id] = child;
                }
            }
        }
    }
    static unbindObjAndChildren(obj) {
        var _a;
        const boundObjects = (_a = this.getSceneFromObj(obj)) === null || _a === void 0 ? void 0 : _a._boundObjects;
        if (boundObjects) {
            delete boundObjects[obj.id];
            for (const child of obj.children) {
                if (child.detectChangesMode === DetectChangesMode.auto) {
                    delete boundObjects[child.id];
                }
            }
        }
    }
    static getSceneFromObj(obj) {
        while (obj) {
            if (obj.isScene) {
                return obj;
            }
            obj = obj.parent;
        }
    }
    static executeCallback(bindingCallback) {
        bindingCallback.setValueCallback(bindingCallback.getValueCallback());
    }
    static executeAllCallbacks(obj) {
        const callbacks = obj._boundCallbacks;
        for (const key in callbacks) {
            this.executeCallback(callbacks[key]);
        }
    }
    static unbindByKey(obj, key) {
        delete obj._boundCallbacks[key];
    }
    static computeSingle(obj) {
        this.executeAllCallbacks(obj);
    }
    static computeAll(scenes) {
        if (scenes.isScene) {
            this.computeScene(scenes);
        }
        else {
            for (const scene of scenes) {
                this.computeScene(scene);
            }
        }
    }
    static computeScene(scene) {
        const boundObjs = scene._boundObjects;
        for (const objKey in boundObjs) {
            this.executeAllCallbacks(boundObjs[objKey]);
        }
    }
}
Object.defineProperty(Object3D.prototype, 'detectChangesMode', {
    get() {
        var _a;
        return (_a = this._detectChangesMode) !== null && _a !== void 0 ? _a : DetectChangesMode.auto;
    }, set(value) {
        if (this._detectChangesMode === undefined) {
            this._detectChangesMode = value;
        }
        else {
            console.error("Cannot change detectChangesMode");
        }
    },
});
Object3D.prototype.detectChanges = function () {
    Binding.computeSingle(this);
};
Object3D.prototype.bindProperty = function (property, getValue, bindAfterParentAdded = true) {
    const event = () => {
        var _a, _b, _c, _d;
        if (((_a = this[property]) === null || _a === void 0 ? void 0 : _a.isVector3) || ((_b = this[property]) === null || _b === void 0 ? void 0 : _b.isVector2) ||
            ((_c = this[property]) === null || _c === void 0 ? void 0 : _c.isQuaternion) || ((_d = this[property]) === null || _d === void 0 ? void 0 : _d.isEuler)) {
            Binding.create(property, getValue, (value) => { this[property].copy(value); }, this);
        }
        else {
            Binding.create(property, getValue, (value) => { this[property] = value; }, this);
        }
        this.removeEventListener("added", event);
    };
    bindAfterParentAdded && !this.parent && !this.isScene ? this.addEventListener("added", event) : event();
    return this;
};
{
    const emptySet = () => { };
    Object3D.prototype.bindCallback = function (key, callback, bindAfterParentAdded = true) {
        const event = () => {
            Binding.create(key, callback, emptySet, this);
            this.removeEventListener("added", event);
        };
        bindAfterParentAdded && !this.parent && !this.isScene ? this.addEventListener("added", event) : event();
        return this;
    };
}
Object3D.prototype.unbindByKey = function (property) {
    Binding.unbindByKey(this, property);
    return this;
};
{
    const addBase = Object3D.prototype.add;
    Object3D.prototype.add = function (object) {
        addBase.bind(this)(...arguments);
        if (arguments.length == 1 && object !== this && (object === null || object === void 0 ? void 0 : object.isObject3D)) {
            Binding.bindSceneObjAndChildren(object);
        }
        return this;
    };
}
{
    const removeBase = Object3D.prototype.remove;
    Object3D.prototype.remove = function (object) {
        if (arguments.length == 1 && this.children.indexOf(object) !== -1) {
            Binding.unbindObjAndChildren(object);
        }
        removeBase.bind(this)(...arguments);
        return this;
    };
}
