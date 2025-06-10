import { createSignal } from "solid-js";

/**
 * @template {T} T
 *
 * @param {string} key
 * @param {T} defaultValue
 * @returns {SignalObject<T>}
 */
export const createCachedSignal = (key, defaultValue, signalOptions = {}) => {
  const parseAs = (() => {
    switch (typeof defaultValue) {
      case "string":
        return "string";
      case "number":
        return "number";
      case "boolean":
        return "boolean";
      case "object":
        if (Array.isArray(defaultValue)) {
          return "array";
        } else {
          return "object";
        }
      default:
        throw new Error("Unimplemented defaultValue type");
    }
  })();

  const parseStringValue = (v) => {
    switch (parseAs) {
      case "string":
        return v;
      case "number":
        return Number(v);
      case "boolean":
        return v === "true";
      case "object":
      case "array":
        return JSON.parse(v);
    }
  };

  const value = (() => {
    const cachedValue = localStorage.getItem(key);
    if (cachedValue === null) return defaultValue;

    return parseStringValue(cachedValue);
  })();

  const [get, set] = createSignal(value, signalOptions);
  return {
    get,
    set: (v) => {
      if (typeof v == "function") {
        const current = get();
        const updatedValue = v(current);
        set(updatedValue);
        localStorage.setItem(key, updatedValue);
      } else {
        set(v);
        localStorage.setItem(key, v);
      }
    },
    setFromString: (stringValue) => {
      const v = parseStringValue(stringValue);

      console.log(stringValue, v);

      set(v);
      localStorage.setItem(key, v);
    },
    _type: parseAs,
  };
};

/**
 * @template {T} T
 *
 * @typedef {Object} SignalObject<T>
 * @property {() => T} get
 * @property {(value: T) => void} set
 * @property {(value: string) => void} setFromString
 * @property {"string" | "number" | "boolean" | "array" | "object"} _type
 */
