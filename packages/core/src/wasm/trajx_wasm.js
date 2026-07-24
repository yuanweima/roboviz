let wasm;

const heap = new Array(128).fill(undefined);

heap.push(undefined, null, true, false);

function getObject(idx) { return heap[idx]; }

let WASM_VECTOR_LEN = 0;

let cachedUint8ArrayMemory0 = null;

function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

const cachedTextEncoder = (typeof TextEncoder !== 'undefined' ? new TextEncoder('utf-8') : { encode: () => { throw Error('TextEncoder not available') } } );

const encodeString = (typeof cachedTextEncoder.encodeInto === 'function'
    ? function (arg, view) {
    return cachedTextEncoder.encodeInto(arg, view);
}
    : function (arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
        read: arg.length,
        written: buf.length
    };
});

function passStringToWasm0(arg, malloc, realloc) {

    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }

    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = encodeString(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

let cachedDataViewMemory0 = null;

function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

let heap_next = heap.length;

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    heap[idx] = obj;
    return idx;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        wasm.__wbindgen_export_2(addHeapObject(e));
    }
}

function dropObject(idx) {
    if (idx < 132) return;
    heap[idx] = heap_next;
    heap_next = idx;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}

const cachedTextDecoder = (typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8', { ignoreBOM: true, fatal: true }) : { decode: () => { throw Error('TextDecoder not available') } } );

if (typeof TextDecoder !== 'undefined') { cachedTextDecoder.decode(); };

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

let cachedUint32ArrayMemory0 = null;

function getUint32ArrayMemory0() {
    if (cachedUint32ArrayMemory0 === null || cachedUint32ArrayMemory0.byteLength === 0) {
        cachedUint32ArrayMemory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachedUint32ArrayMemory0;
}

function getArrayU32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

const CLOSURE_DTORS = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(state => {
    wasm.__wbindgen_export_4.get(state.dtor)(state.a, state.b)
});

function makeMutClosure(arg0, arg1, dtor, f) {
    const state = { a: arg0, b: arg1, cnt: 1, dtor };
    const real = (...args) => {
        // First up with a closure we increment the internal reference
        // count. This ensures that the Rust closure environment won't
        // be deallocated while we're invoking it.
        state.cnt++;
        const a = state.a;
        state.a = 0;
        try {
            return f(a, state.b, ...args);
        } finally {
            if (--state.cnt === 0) {
                wasm.__wbindgen_export_4.get(state.dtor)(a, state.b);
                CLOSURE_DTORS.unregister(state);
            } else {
                state.a = a;
            }
        }
    };
    real.original = state;
    CLOSURE_DTORS.register(real, state, state);
    return real;
}

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches && builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}
/**
 * Initialize panic hook for better error messages in browser console
 */
export function init() {
    wasm.init();
}

/**
 * Get the library version
 * @returns {string}
 */
export function version() {
    let deferred1_0;
    let deferred1_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.version(retptr);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        deferred1_0 = r0;
        deferred1_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_export_3(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Check if the library is initialized
 * @returns {boolean}
 */
export function is_ready() {
    const ret = wasm.is_ready();
    return ret !== 0;
}

let cachedFloat64ArrayMemory0 = null;

function getFloat64ArrayMemory0() {
    if (cachedFloat64ArrayMemory0 === null || cachedFloat64ArrayMemory0.byteLength === 0) {
        cachedFloat64ArrayMemory0 = new Float64Array(wasm.memory.buffer);
    }
    return cachedFloat64ArrayMemory0;
}

function passArrayF64ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 8, 8) >>> 0;
    getFloat64ArrayMemory0().set(arg, ptr / 8);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function _assertClass(instance, klass) {
    if (!(instance instanceof klass)) {
        throw new Error(`expected instance of ${klass.name}`);
    }
}

function passArray32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4, 4) >>> 0;
    getUint32ArrayMemory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}
/**
 * Create a robot from a URDF string
 * @param {string} urdf_content
 * @returns {Robot}
 */
export function createRobot(urdf_content) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(urdf_content, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len0 = WASM_VECTOR_LEN;
        wasm.createRobot(retptr, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return Robot.__wrap(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

function getArrayJsValueFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    const mem = getDataViewMemory0();
    const result = [];
    for (let i = ptr; i < ptr + 4 * len; i += 4) {
        result.push(takeObject(mem.getUint32(i, true)));
    }
    return result;
}
/**
 * List available robots in the DH database
 * @returns {string[]}
 */
export function listDhDatabase() {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.listDhDatabase(retptr);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var v1 = getArrayJsValueFromWasm0(r0, r1).slice();
        wasm.__wbindgen_export_3(r0, r1 * 4, 4);
        return v1;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Generate TypeScript code for creating a batch edge checker function
 *
 * This generates a JavaScript function that can be used with `GpuPlanningContext.planPath()`.
 * Users copy this template and customize it for their collision detection setup.
 *
 * # Example
 * ```typescript
 * // Get the template code
 * const template = generateBatchCheckerTemplate(config);
 * console.log(template);
 *
 * // Output:
 * // function checkEdgesBatch(edges) {
 * //   return edges.map(([startJoints, endJoints]) => {
 * //     for (let t = 0; t <= 1; t += 0.25) {
 * //       const joints = startJoints.map((s, i) => s + t * (endJoints[i] - s));
 * //       const poses = robot.getLinkTransforms(joints);
 * //       if (robotCollision.isSelfCollidingFast(poses)) return false;
 * //       if (!robotCollision.isConfigCollisionFree(env, poses)) return false;
 * //     }
 * //     return true;
 * //   });
 * // }
 * ```
 * @param {BatchCollisionCheckerConfig | null} [config]
 * @returns {string}
 */
export function generateBatchCheckerTemplate(config) {
    let deferred2_0;
    let deferred2_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        let ptr0 = 0;
        if (!isLikeNone(config)) {
            _assertClass(config, BatchCollisionCheckerConfig);
            ptr0 = config.__destroy_into_raw();
        }
        wasm.generateBatchCheckerTemplate(retptr, ptr0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        deferred2_0 = r0;
        deferred2_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_export_3(deferred2_0, deferred2_1, 1);
    }
}

function getArrayF64FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getFloat64ArrayMemory0().subarray(ptr / 8, ptr / 8 + len);
}
/**
 * Helper to interpolate joint configurations
 *
 * Creates intermediate joint configurations between start and end.
 * Useful for implementing custom batch collision checkers.
 *
 * # Arguments
 * * `start` - Start joint configuration
 * * `end` - End joint configuration
 * * `num_samples` - Number of samples (including start and end)
 *
 * # Returns
 * Flattened array of all joint configurations: [s0, s1, ..., sn, m0_0, m0_1, ..., e0, e1, ..., en]
 * @param {Float64Array} start
 * @param {Float64Array} end
 * @param {number} num_samples
 * @returns {Float64Array}
 */
export function interpolateEdge(start, end, num_samples) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArrayF64ToWasm0(start, wasm.__wbindgen_export_0);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayF64ToWasm0(end, wasm.__wbindgen_export_0);
        const len1 = WASM_VECTOR_LEN;
        wasm.interpolateEdge(retptr, ptr0, len0, ptr1, len1, num_samples);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v3 = getArrayF64FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export_3(r0, r1 * 8, 8);
        return v3;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Batch interpolate multiple edges at once
 *
 * Optimized for GPU batch processing - interpolates all edges and returns
 * a flat array ready for batch FK computation.
 *
 * # Arguments
 * * `edges_flat` - Flattened edges: [s1_0, s1_1, ..., e1_0, e1_1, ..., s2_0, ...]
 * * `dof` - Degrees of freedom (number of joints)
 * * `num_samples` - Samples per edge
 *
 * # Returns
 * All interpolated points as flat array, organized by edge then by sample
 * @param {Float64Array} edges_flat
 * @param {number} dof
 * @param {number} num_samples
 * @returns {Float64Array}
 */
export function interpolateEdgesBatch(edges_flat, dof, num_samples) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArrayF64ToWasm0(edges_flat, wasm.__wbindgen_export_0);
        const len0 = WASM_VECTOR_LEN;
        wasm.interpolateEdgesBatch(retptr, ptr0, len0, dof, num_samples);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v2 = getArrayF64FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export_3(r0, r1 * 8, 8);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Check if all samples in a batch result are collision-free
 *
 * Helper to process results from batch FK + collision checking.
 *
 * # Arguments
 * * `collision_results` - Flat array of collision results (true = collision, false = free)
 * * `samples_per_edge` - Number of samples checked per edge
 *
 * # Returns
 * Array of edge results (true = collision-free for entire edge)
 * @param {Array<any>} collision_results
 * @param {number} samples_per_edge
 * @returns {Array<any>}
 */
export function aggregateBatchResults(collision_results, samples_per_edge) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.aggregateBatchResults(retptr, addHeapObject(collision_results), samples_per_edge);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Helper function to create a GPU planning pipeline
 *
 * Returns a JavaScript object with all necessary components for GPU planning.
 *
 * # Example
 * ```typescript
 * const pipeline = await createGpuPlanningPipeline(robot, urdfContent);
 * console.log(`Ready: ${pipeline.robotCollision.totalGeometries} geometries`);
 *
 * const result = pipeline.planner.planPath(start, goal, pipeline.checkEdges);
 * ```
 * @param {Robot} robot
 * @param {GpuPlanningContextConfig | null} [config]
 * @returns {any}
 */
export function createGpuPlanningPipeline(robot, config) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        _assertClass(robot, Robot);
        let ptr0 = 0;
        if (!isLikeNone(config)) {
            _assertClass(config, GpuPlanningContextConfig);
            ptr0 = config.__destroy_into_raw();
        }
        wasm.createGpuPlanningPipeline(retptr, robot.__wbg_ptr, ptr0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

function passArrayJsValueToWasm0(array, malloc) {
    const ptr = malloc(array.length * 4, 4) >>> 0;
    const mem = getDataViewMemory0();
    for (let i = 0; i < array.length; i++) {
        mem.setUint32(ptr + 4 * i, addHeapObject(array[i]), true);
    }
    WASM_VECTOR_LEN = array.length;
    return ptr;
}
/**
 * Compute forward kinematics from DH parameters
 *
 * # Arguments
 * * `dh_params` - Array of DH parameters [a, alpha, d, theta] for each joint
 * * `joint_angles` - Current joint angles in radians
 *
 * # Returns
 * End-effector pose (position + orientation)
 * @param {DhParam[]} dh_params
 * @param {Float64Array} joint_angles
 * @returns {Pose}
 */
export function forwardKinematicsDh(dh_params, joint_angles) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArrayJsValueToWasm0(dh_params, wasm.__wbindgen_export_0);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayF64ToWasm0(joint_angles, wasm.__wbindgen_export_0);
        const len1 = WASM_VECTOR_LEN;
        wasm.forwardKinematicsDh(retptr, ptr0, len0, ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return Pose.__wrap(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Compute forward kinematics for visualization (returns all link poses)
 *
 * # Returns
 * Array of poses for each link (useful for rendering robot in 3D)
 * @param {DhParam[]} dh_params
 * @param {Float64Array} joint_angles
 * @returns {Pose[]}
 */
export function forwardKinematicsChainDh(dh_params, joint_angles) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArrayJsValueToWasm0(dh_params, wasm.__wbindgen_export_0);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayF64ToWasm0(joint_angles, wasm.__wbindgen_export_0);
        const len1 = WASM_VECTOR_LEN;
        wasm.forwardKinematicsChainDh(retptr, ptr0, len0, ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v3 = getArrayJsValueFromWasm0(r0, r1).slice();
        wasm.__wbindgen_export_3(r0, r1 * 4, 4);
        return v3;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Batch forward kinematics for multiple robots (GPU instancing optimization)
 *
 * Computes forward kinematics for multiple robot instances in parallel,
 * returning all link transformation matrices in a single flat array.
 *
 * # Arguments
 * * `dh_params` - DH parameters for the robot (shared by all instances)
 * * `joint_angles_flat` - Flat array of joint angles: [robot1_j1, robot1_j2, ..., robot2_j1, ...]
 * * `robot_count` - Number of robot instances
 * * `joint_count` - Number of joints per robot
 *
 * # Returns
 * Flat array of 4x4 transformation matrices (column-major, compatible with Three.js):
 * Format: [robot1_link1_mat4, robot1_link2_mat4, ..., robot2_link1_mat4, ...]
 * Each robot has (joint_count + 1) links (including base)
 * Total size: robot_count * (joint_count + 1) * 16
 *
 * # Example (JavaScript)
 * ```js
 * const robotCount = 500;
 * const jointCount = 6;
 * const jointAngles = new Float32Array(robotCount * jointCount);
 * // ... fill joint angles ...
 * const transforms = batchForwardKinematics(dhParams, jointAngles, robotCount, jointCount);
 * // transforms.length = 500 * 7 * 16 = 56000
 * ```
 * @param {DhParam[]} dh_params
 * @param {Float64Array} joint_angles_flat
 * @param {number} robot_count
 * @param {number} joint_count
 * @returns {Float64Array}
 */
export function batchForwardKinematics(dh_params, joint_angles_flat, robot_count, joint_count) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArrayJsValueToWasm0(dh_params, wasm.__wbindgen_export_0);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayF64ToWasm0(joint_angles_flat, wasm.__wbindgen_export_0);
        const len1 = WASM_VECTOR_LEN;
        wasm.batchForwardKinematics(retptr, ptr0, len0, ptr1, len1, robot_count, joint_count);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v3 = getArrayF64FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export_3(r0, r1 * 8, 8);
        return v3;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

let cachedFloat32ArrayMemory0 = null;

function getFloat32ArrayMemory0() {
    if (cachedFloat32ArrayMemory0 === null || cachedFloat32ArrayMemory0.byteLength === 0) {
        cachedFloat32ArrayMemory0 = new Float32Array(wasm.memory.buffer);
    }
    return cachedFloat32ArrayMemory0;
}

function passArrayF32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4, 4) >>> 0;
    getFloat32ArrayMemory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function getArrayF32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getFloat32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}
/**
 * Batch forward kinematics with Float32 input/output for WebGL/InstancedMesh compatibility
 *
 * Same as batchForwardKinematics but uses Float32Array for zero-copy with GPU buffers.
 * @param {DhParam[]} dh_params
 * @param {Float32Array} joint_angles_flat
 * @param {number} robot_count
 * @param {number} joint_count
 * @returns {Float32Array}
 */
export function batchForwardKinematicsF32(dh_params, joint_angles_flat, robot_count, joint_count) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArrayJsValueToWasm0(dh_params, wasm.__wbindgen_export_0);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayF32ToWasm0(joint_angles_flat, wasm.__wbindgen_export_0);
        const len1 = WASM_VECTOR_LEN;
        wasm.batchForwardKinematicsF32(retptr, ptr0, len0, ptr1, len1, robot_count, joint_count);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v3 = getArrayF32FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export_3(r0, r1 * 4, 4);
        return v3;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Batch FK returning only end-effector poses (for scenarios where link transforms aren't needed)
 *
 * More efficient when you only need the final pose of each robot.
 *
 * # Returns
 * Flat array of 4x4 matrices for end-effector only:
 * Format: [robot1_ee_mat4, robot2_ee_mat4, ...]
 * Total size: robot_count * 16
 * @param {DhParam[]} dh_params
 * @param {Float32Array} joint_angles_flat
 * @param {number} robot_count
 * @param {number} joint_count
 * @returns {Float32Array}
 */
export function batchForwardKinematicsEndEffector(dh_params, joint_angles_flat, robot_count, joint_count) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArrayJsValueToWasm0(dh_params, wasm.__wbindgen_export_0);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayF32ToWasm0(joint_angles_flat, wasm.__wbindgen_export_0);
        const len1 = WASM_VECTOR_LEN;
        wasm.batchForwardKinematicsEndEffector(retptr, ptr0, len0, ptr1, len1, robot_count, joint_count);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v3 = getArrayF32FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export_3(r0, r1 * 4, 4);
        return v3;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Compute inverse kinematics using numerical method (Damped Least Squares)
 *
 * # Arguments
 * * `dh_params` - DH parameters for the robot
 * * `target_pose` - Target end-effector pose
 * * `seed` - Initial joint configuration (optional, uses zeros if not provided)
 * * `joint_limits` - Joint limits for the robot
 * * `max_iterations` - Maximum solver iterations (default: 100)
 * * `tolerance` - Position tolerance in meters (default: 1e-4)
 *
 * # Returns
 * IK solution or error
 * @param {DhParam[]} dh_params
 * @param {Pose} target_pose
 * @param {Float64Array | null} [seed]
 * @param {JointLimits | null} [joint_limits]
 * @param {number | null} [max_iterations]
 * @param {number | null} [tolerance]
 * @returns {IkResult}
 */
export function inverseKinematicsDh(dh_params, target_pose, seed, joint_limits, max_iterations, tolerance) {
    const ptr0 = passArrayJsValueToWasm0(dh_params, wasm.__wbindgen_export_0);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(target_pose, Pose);
    var ptr1 = isLikeNone(seed) ? 0 : passArrayF64ToWasm0(seed, wasm.__wbindgen_export_0);
    var len1 = WASM_VECTOR_LEN;
    let ptr2 = 0;
    if (!isLikeNone(joint_limits)) {
        _assertClass(joint_limits, JointLimits);
        ptr2 = joint_limits.__destroy_into_raw();
    }
    const ret = wasm.inverseKinematicsDh(ptr0, len0, target_pose.__wbg_ptr, ptr1, len1, ptr2, isLikeNone(max_iterations) ? 0x100000001 : (max_iterations) >>> 0, !isLikeNone(tolerance), isLikeNone(tolerance) ? 0 : tolerance);
    return IkResult.__wrap(ret);
}

/**
 * Create a simple trajectory from waypoints using default limits
 * @param {Float64Array} waypoints
 * @param {number} dof
 * @param {number} max_velocity
 * @param {number} max_acceleration
 * @returns {WasmTrajectory}
 */
export function createSimpleTrajectory(waypoints, dof, max_velocity, max_acceleration) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArrayF64ToWasm0(waypoints, wasm.__wbindgen_export_0);
        const len0 = WASM_VECTOR_LEN;
        wasm.createSimpleTrajectory(retptr, ptr0, len0, dof, max_velocity, max_acceleration);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return WasmTrajectory.__wrap(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Get list of all supported robot names from the default database
 * @returns {string[]}
 */
export function listSupportedRobots() {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.listSupportedRobots(retptr);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var v1 = getArrayJsValueFromWasm0(r0, r1).slice();
        wasm.__wbindgen_export_3(r0, r1 * 4, 4);
        return v1;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Create RobotContext from URDF (convenience function)
 *
 * ```typescript
 * const ctx = createRobotContext(urdfContent);
 * ```
 * @param {string} urdf_content
 * @returns {RobotContext}
 */
export function createRobotContext(urdf_content) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(urdf_content, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len0 = WASM_VECTOR_LEN;
        wasm.createRobotContext(retptr, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return RobotContext.__wrap(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Create RobotContext with custom config (convenience function)
 *
 * ```typescript
 * const config = RobotContextConfig.fast();
 * const ctx = createRobotContextWithConfig(urdfContent, config);
 * ```
 * @param {string} urdf_content
 * @param {RobotContextConfig} config
 * @returns {RobotContext}
 */
export function createRobotContextWithConfig(urdf_content, config) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(urdf_content, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len0 = WASM_VECTOR_LEN;
        _assertClass(config, RobotContextConfig);
        wasm.createRobotContextWithConfig(retptr, ptr0, len0, config.__wbg_ptr);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return RobotContext.__wrap(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Check if WebGPU is available for integrated planning
 * @returns {Promise<boolean>}
 */
export function isIntegratedGpuPlanningAvailable() {
    const ret = wasm.isIntegratedGpuPlanningAvailable();
    return takeObject(ret);
}

/**
 * Run a performance comparison between GPU and CPU collision detection
 *
 * Tests sphere-sphere collision detection with the specified number of pairs.
 *
 * # Arguments
 * * `num_pairs` - Number of collision pairs to test
 *
 * # Returns
 * GpuVsCpuComparison with timing results
 * @param {number} num_pairs
 * @returns {Promise<GpuVsCpuComparison>}
 */
export function benchmarkGpuVsCpu(num_pairs) {
    const ret = wasm.benchmarkGpuVsCpu(num_pairs);
    return takeObject(ret);
}

/**
 * Run a comprehensive GPU benchmark with multiple batch sizes
 *
 * Tests GPU collision detection at various batch sizes to find optimal performance.
 *
 * # Arguments
 * * `sizes` - Array of batch sizes to test
 *
 * # Returns
 * Array of GpuVsCpuComparison results
 * @param {Uint32Array} sizes
 * @returns {Promise<Array<any>>}
 */
export function benchmarkGpuBatchSizes(sizes) {
    const ptr0 = passArray32ToWasm0(sizes, wasm.__wbindgen_export_0);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.benchmarkGpuBatchSizes(ptr0, len0);
    return takeObject(ret);
}

/**
 * Helper: Create a JavaScript collision checker function for GPU planning
 *
 * Generates a template function that can be customized for your collision setup.
 *
 * # Example
 * ```typescript
 * const checkerCode = getGpuCollisionCheckerTemplate(5);
 * console.log(checkerCode);
 * // Copy and customize the template for your use case
 * ```
 * @param {number} samples_per_edge
 * @returns {string}
 */
export function getGpuCollisionCheckerTemplate(samples_per_edge) {
    let deferred1_0;
    let deferred1_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.getGpuCollisionCheckerTemplate(retptr, samples_per_edge);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        deferred1_0 = r0;
        deferred1_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_export_3(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Check if WebGPU is available in the current browser
 * @returns {Promise<boolean>}
 */
export function isWebGpuAvailable() {
    const ret = wasm.isWebGpuAvailable();
    return takeObject(ret);
}

/**
 * Get a standard cable configuration (4π limit, 2 full rotations / 720°)
 * @returns {CableConfig}
 */
export function cablePresetStandard() {
    const ret = wasm.cablePresetStandard();
    return CableConfig.__wrap(ret);
}

/**
 * Get a heavy-duty cable configuration (2π limit, 1 full rotation / 360°)
 * For thick, stiff cables that cannot twist much
 * @returns {CableConfig}
 */
export function cablePresetHeavyDuty() {
    const ret = wasm.cablePresetHeavyDuty();
    return CableConfig.__wrap(ret);
}

/**
 * Get a light cable configuration (8π limit, 4 full rotations / 1440°)
 * For thin, flexible cables
 * @returns {CableConfig}
 */
export function cablePresetLight() {
    const ret = wasm.cablePresetLight();
    return CableConfig.__wrap(ret);
}

/**
 * Get a precision cable configuration (2π limit with auto-unwind)
 * For applications requiring minimal cable stress
 * @returns {CableConfig}
 */
export function cablePresetPrecision() {
    const ret = wasm.cablePresetPrecision();
    return CableConfig.__wrap(ret);
}

/**
 * Compute path length from flat array
 * @param {Float64Array} path_flat
 * @param {number} dof
 * @returns {number}
 */
export function computePathLength(path_flat, dof) {
    const ptr0 = passArrayF64ToWasm0(path_flat, wasm.__wbindgen_export_0);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.computePathLength(ptr0, len0, dof);
    return ret;
}

/**
 * Compute path smoothness from flat array (sum of squared accelerations)
 * @param {Float64Array} path_flat
 * @param {number} dof
 * @returns {number}
 */
export function computePathSmoothness(path_flat, dof) {
    const ptr0 = passArrayF64ToWasm0(path_flat, wasm.__wbindgen_export_0);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.computePathSmoothness(ptr0, len0, dof);
    return ret;
}

/**
 * Interpolate between waypoints with specified resolution
 * Input/output as flat array: [dof, n_waypoints, j1_1, j2_1, ..., j1_2, j2_2, ...]
 * @param {Float64Array} path_flat
 * @param {number} resolution
 * @returns {Float64Array}
 */
export function interpolatePathFlat(path_flat, resolution) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArrayF64ToWasm0(path_flat, wasm.__wbindgen_export_0);
        const len0 = WASM_VECTOR_LEN;
        wasm.interpolatePathFlat(retptr, ptr0, len0, resolution);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var v2 = getArrayF64FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export_3(r0, r1 * 8, 8);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

let stack_pointer = 128;

function addBorrowedObject(obj) {
    if (stack_pointer == 1) throw new Error('out of js stack');
    heap[--stack_pointer] = obj;
    return stack_pointer;
}
/**
 * Check a path for collisions
 *
 * @param path_flat - Flat array of waypoints
 * @param dof - Degrees of freedom
 * @param collision_checker - Function(config: number[]) => boolean (true = valid)
 * @param stop_at_first - Stop checking after first collision
 * @param {Float64Array} path_flat
 * @param {number} dof
 * @param {Function} collision_checker
 * @param {boolean} stop_at_first
 * @returns {PathCollisionResult}
 */
export function checkPathCollision(path_flat, dof, collision_checker, stop_at_first) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArrayF64ToWasm0(path_flat, wasm.__wbindgen_export_0);
        const len0 = WASM_VECTOR_LEN;
        wasm.checkPathCollision(retptr, ptr0, len0, dof, addBorrowedObject(collision_checker), stop_at_first);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return PathCollisionResult.__wrap(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        heap[stack_pointer++] = undefined;
    }
}

/**
 * Check edges between waypoints for collisions (interpolated checking)
 *
 * @param path_flat - Flat array of waypoints
 * @param dof - Degrees of freedom
 * @param collision_checker - Function(config: number[]) => boolean (true = valid)
 * @param step_size - Step size for interpolation
 * @param {Float64Array} path_flat
 * @param {number} dof
 * @param {Function} collision_checker
 * @param {number} step_size
 * @returns {PathCollisionResult}
 */
export function checkPathEdgesCollision(path_flat, dof, collision_checker, step_size) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArrayF64ToWasm0(path_flat, wasm.__wbindgen_export_0);
        const len0 = WASM_VECTOR_LEN;
        wasm.checkPathEdgesCollision(retptr, ptr0, len0, dof, addBorrowedObject(collision_checker), step_size);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return PathCollisionResult.__wrap(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        heap[stack_pointer++] = undefined;
    }
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}
function __wbg_adapter_40(arg0, arg1, arg2) {
    wasm.__wbindgen_export_5(arg0, arg1, addHeapObject(arg2));
}

function __wbg_adapter_1175(arg0, arg1, arg2, arg3) {
    wasm.__wbindgen_export_6(arg0, arg1, addHeapObject(arg2), addHeapObject(arg3));
}

/**
 * Cable constraint mode
 * @enum {0 | 1 | 2}
 */
export const CableMode = Object.freeze({
    /**
     * No cable tracking (default)
     */
    Disabled: 0, "0": "Disabled",
    /**
     * Track cable twist without constraining planning
     */
    TrackOnly: 1, "1": "TrackOnly",
    /**
     * Constrain planning to respect cable limits
     */
    Constrained: 2, "2": "Constrained",
});
/**
 * Policy for handling IK failures during Cartesian motion
 *
 * When executing Cartesian linear or arc motion, intermediate points may
 * be unreachable (IK fails to converge). This policy determines how to
 * handle such failures.
 * @enum {0 | 1 | 2 | 3}
 */
export const CartesianIkPolicy = Object.freeze({
    /**
     * Strict mode: Fail if any intermediate point is unreachable
     *
     * This is the safest option for applications requiring precise TCP paths:
     * - Welding: seam must be exact
     * - Dispensing/gluing: path accuracy critical
     * - Machining: cutting path must be followed
     *
     * Returns an error if IK fails for any point.
     */
    Strict: 0, "0": "Strict",
    /**
     * Fallback mode: Fall back to joint-space interpolation (default)
     *
     * When IK fails, the segment uses joint-space linear interpolation instead.
     * The TCP will NOT follow a straight line in these segments.
     *
     * **Warning**: This may cause unexpected TCP paths. Use only when:
     * - Path accuracy is not critical
     * - You need the motion to complete at all costs
     */
    Fallback: 1, "1": "Fallback",
    /**
     * Warn mode: Fall back but include warnings in result
     *
     * Like Fallback, but returns detailed warnings about which segments
     * used joint-space interpolation. Allows post-hoc analysis.
     */
    WarnAndFallback: 2, "2": "WarnAndFallback",
    /**
     * Adaptive mode: Try different IK seeds before falling back
     *
     * When IK fails:
     * 1. Try alternative IK seeds (different configurations)
     * 2. If still failing, fall back to joint-space interpolation
     */
    Adaptive: 3, "3": "Adaptive",
});
/**
 * Collision handling mode
 * @enum {0 | 1 | 2 | 3 | 4 | 5}
 */
export const CollisionMode = Object.freeze({
    /**
     * No collision checking (fastest)
     */
    Disabled: 0, "0": "Disabled",
    /**
     * Verify path is collision-free
     */
    Verify: 1, "1": "Verify",
    /**
     * Plan around obstacles
     */
    Avoid: 2, "2": "Avoid",
    /**
     * Adaptive replanning
     */
    Adaptive: 3, "3": "Adaptive",
    /**
     * GPU-accelerated batch planning with Lazy-PRM
     * Uses batch collision checking optimized for GPU/WebGPU
     */
    GpuBatch: 4, "4": "GpuBatch",
    /**
     * GPU-accelerated SDF-based planning
     * Uses Signed Distance Field for fast collision detection
     */
    GpuSdf: 5, "5": "GpuSdf",
});
/**
 * Motion style for path generation
 * @enum {0 | 1 | 2 | 3}
 */
export const MotionStyle = Object.freeze({
    /**
     * Automatic selection based on constraints
     */
    Auto: 0, "0": "Auto",
    /**
     * Joint-space interpolation (fastest)
     */
    Joint: 1, "1": "Joint",
    /**
     * Cartesian linear motion
     */
    Linear: 2, "2": "Linear",
    /**
     * Spline interpolation
     */
    Spline: 3, "3": "Spline",
});
/**
 * Smoothness level
 * @enum {0 | 1 | 2 | 3}
 */
export const Smoothness = Object.freeze({
    /**
     * No smoothing
     */
    None: 0, "0": "None",
    /**
     * Standard smoothness
     */
    Standard: 1, "1": "Standard",
    /**
     * High smoothness
     */
    High: 2, "2": "High",
    /**
     * Very high smoothness (slowest)
     */
    VeryHigh: 3, "3": "VeryHigh",
});

const __wbindgen_enum_GpuBufferBindingType = ["uniform", "storage", "read-only-storage"];

const __wbindgen_enum_GpuPowerPreference = ["low-power", "high-performance"];

const __wbindgen_enum_GpuSamplerBindingType = ["filtering", "non-filtering", "comparison"];

const __wbindgen_enum_GpuStorageTextureAccess = ["write-only", "read-only", "read-write"];

const __wbindgen_enum_GpuTextureFormat = ["r8unorm", "r8snorm", "r8uint", "r8sint", "r16uint", "r16sint", "r16float", "rg8unorm", "rg8snorm", "rg8uint", "rg8sint", "r32uint", "r32sint", "r32float", "rg16uint", "rg16sint", "rg16float", "rgba8unorm", "rgba8unorm-srgb", "rgba8snorm", "rgba8uint", "rgba8sint", "bgra8unorm", "bgra8unorm-srgb", "rgb9e5ufloat", "rgb10a2uint", "rgb10a2unorm", "rg11b10ufloat", "rg32uint", "rg32sint", "rg32float", "rgba16uint", "rgba16sint", "rgba16float", "rgba32uint", "rgba32sint", "rgba32float", "stencil8", "depth16unorm", "depth24plus", "depth24plus-stencil8", "depth32float", "depth32float-stencil8", "bc1-rgba-unorm", "bc1-rgba-unorm-srgb", "bc2-rgba-unorm", "bc2-rgba-unorm-srgb", "bc3-rgba-unorm", "bc3-rgba-unorm-srgb", "bc4-r-unorm", "bc4-r-snorm", "bc5-rg-unorm", "bc5-rg-snorm", "bc6h-rgb-ufloat", "bc6h-rgb-float", "bc7-rgba-unorm", "bc7-rgba-unorm-srgb", "etc2-rgb8unorm", "etc2-rgb8unorm-srgb", "etc2-rgb8a1unorm", "etc2-rgb8a1unorm-srgb", "etc2-rgba8unorm", "etc2-rgba8unorm-srgb", "eac-r11unorm", "eac-r11snorm", "eac-rg11unorm", "eac-rg11snorm", "astc-4x4-unorm", "astc-4x4-unorm-srgb", "astc-5x4-unorm", "astc-5x4-unorm-srgb", "astc-5x5-unorm", "astc-5x5-unorm-srgb", "astc-6x5-unorm", "astc-6x5-unorm-srgb", "astc-6x6-unorm", "astc-6x6-unorm-srgb", "astc-8x5-unorm", "astc-8x5-unorm-srgb", "astc-8x6-unorm", "astc-8x6-unorm-srgb", "astc-8x8-unorm", "astc-8x8-unorm-srgb", "astc-10x5-unorm", "astc-10x5-unorm-srgb", "astc-10x6-unorm", "astc-10x6-unorm-srgb", "astc-10x8-unorm", "astc-10x8-unorm-srgb", "astc-10x10-unorm", "astc-10x10-unorm-srgb", "astc-12x10-unorm", "astc-12x10-unorm-srgb", "astc-12x12-unorm", "astc-12x12-unorm-srgb"];

const __wbindgen_enum_GpuTextureSampleType = ["float", "unfilterable-float", "depth", "sint", "uint"];

const __wbindgen_enum_GpuTextureViewDimension = ["1d", "2d", "2d-array", "cube", "cube-array", "3d"];

const AsyncGpuPlanningContextFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_asyncgpuplanningcontext_free(ptr >>> 0, 1));
/**
 * Async GPU planning result that returns a Promise
 *
 * This allows integration with async JavaScript code and WebGPU.
 */
export class AsyncGpuPlanningContext {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        AsyncGpuPlanningContextFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_asyncgpuplanningcontext_free(ptr, 0);
    }
    /**
     * Get edge count
     * @returns {number}
     */
    get edgeCount() {
        const ret = wasm.asyncgpuplanningcontext_edgeCount(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get node count
     * @returns {number}
     */
    get nodeCount() {
        const ret = wasm.asyncgpuplanningcontext_nodeCount(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Build the roadmap (synchronous, but exposed for consistency)
     */
    buildRoadmap() {
        wasm.asyncgpuplanningcontext_buildRoadmap(this.__wbg_ptr);
    }
    /**
     * Plan a path with Promise-based result handling
     *
     * This method wraps the synchronous planning in a Promise for easier
     * integration with async JavaScript code. The collision checker callback
     * is still invoked synchronously during planning.
     *
     * Note: For truly async collision checking (e.g., WebGPU compute shaders
     * that return Promises), use `GpuPlanningContext.planPath()` with a
     * synchronous wrapper callback that blocks on the Promise. WebGPU dispatch
     * is typically fast enough that sync callbacks work well in practice.
     *
     * # Arguments
     * * `start` - Start joint configuration
     * * `goal` - Goal joint configuration
     * * `check_edges` - Collision checker callback: (edges: [start[], end[]][]) => boolean[]
     *
     * # Returns
     * Promise<GpuPlanningResult>
     *
     * # Example
     * ```typescript
     * const asyncPlanner = new AsyncGpuPlanningContext(robot);
     * asyncPlanner.buildRoadmap();
     *
     * // Collision checker (called synchronously during planning)
     * function checkEdges(edges) {
     *     return edges.map(([start, end]) => isEdgeFree(start, end));
     * }
     *
     * // await for Promise-based result
     * const result = await asyncPlanner.planPathAsync(start, goal, checkEdges);
     * if (result.success) {
     *     console.log(`Found path with ${result.waypointCount} waypoints`);
     * }
     * ```
     * @param {Float64Array} start
     * @param {Float64Array} goal
     * @param {Function} check_edges
     * @returns {Promise<any>}
     */
    planPathAsync(start, goal, check_edges) {
        try {
            const ptr0 = passArrayF64ToWasm0(start, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(goal, wasm.__wbindgen_export_0);
            const len1 = WASM_VECTOR_LEN;
            const ret = wasm.asyncgpuplanningcontext_planPathAsync(this.__wbg_ptr, ptr0, len0, ptr1, len1, addBorrowedObject(check_edges));
            return takeObject(ret);
        } finally {
            heap[stack_pointer++] = undefined;
        }
    }
    /**
     * Check if roadmap is built
     * @returns {boolean}
     */
    isRoadmapBuilt() {
        const ret = wasm.asyncgpuplanningcontext_isRoadmapBuilt(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Reset edge validation cache
     */
    resetValidations() {
        wasm.asyncgpuplanningcontext_resetValidations(this.__wbg_ptr);
    }
    /**
     * Create an async GPU planning context
     *
     * This wraps GpuPlanningContext to provide Promise-based methods.
     * @param {Robot} robot
     * @param {GpuPlanningContextConfig | null} [config]
     */
    constructor(robot, config) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(robot, Robot);
            let ptr0 = 0;
            if (!isLikeNone(config)) {
                _assertClass(config, GpuPlanningContextConfig);
                ptr0 = config.__destroy_into_raw();
            }
            wasm.asyncgpuplanningcontext_new(retptr, robot.__wbg_ptr, ptr0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            this.__wbg_ptr = r0 >>> 0;
            AsyncGpuPlanningContextFinalization.register(this, this.__wbg_ptr, this);
            return this;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}

const BatchCollisionCheckerFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_batchcollisionchecker_free(ptr >>> 0, 1));
/**
 * Batch collision checker for efficient multi-configuration checking
 */
export class BatchCollisionChecker {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        BatchCollisionCheckerFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_batchcollisionchecker_free(ptr, 0);
    }
    /**
     * Check multiple configurations for environment collision
     *
     * @param configs_flat - Flat array of configurations [c1_j1, c1_j2, ..., c2_j1, c2_j2, ...]
     * @param dof - Degrees of freedom (number of joints)
     * @param collision_checker - Function(config: number[]) => boolean (true = valid)
     * @param {Float64Array} configs_flat
     * @param {number} dof
     * @param {Function} collision_checker
     * @returns {BatchCollisionResult}
     */
    checkBatch(configs_flat, dof, collision_checker) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF64ToWasm0(configs_flat, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            wasm.batchcollisionchecker_checkBatch(retptr, this.__wbg_ptr, ptr0, len0, dof, addBorrowedObject(collision_checker));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return BatchCollisionResult.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            heap[stack_pointer++] = undefined;
        }
    }
    /**
     * Create a new batch collision checker
     * @param {CollisionEnvironment} env
     */
    constructor(env) {
        _assertClass(env, CollisionEnvironment);
        var ptr0 = env.__destroy_into_raw();
        const ret = wasm.batchcollisionchecker_new(ptr0);
        this.__wbg_ptr = ret >>> 0;
        BatchCollisionCheckerFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}

const BatchCollisionCheckerConfigFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_batchcollisioncheckerconfig_free(ptr >>> 0, 1));
/**
 * Configuration for creating a batch collision checker
 */
export class BatchCollisionCheckerConfig {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(BatchCollisionCheckerConfig.prototype);
        obj.__wbg_ptr = ptr;
        BatchCollisionCheckerConfigFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        BatchCollisionCheckerConfigFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_batchcollisioncheckerconfig_free(ptr, 0);
    }
    /**
     * Number of samples per edge (5 = start + 3 intermediate + end)
     * @returns {number}
     */
    get samples_per_edge() {
        const ret = wasm.__wbg_get_batchcollisioncheckerconfig_samples_per_edge(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Number of samples per edge (5 = start + 3 intermediate + end)
     * @param {number} arg0
     */
    set samples_per_edge(arg0) {
        wasm.__wbg_set_batchcollisioncheckerconfig_samples_per_edge(this.__wbg_ptr, arg0);
    }
    /**
     * Whether to include self-collision checking
     * @returns {boolean}
     */
    get check_self_collision() {
        const ret = wasm.__wbg_get_batchcollisioncheckerconfig_check_self_collision(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Whether to include self-collision checking
     * @param {boolean} arg0
     */
    set check_self_collision(arg0) {
        wasm.__wbg_set_batchcollisioncheckerconfig_check_self_collision(this.__wbg_ptr, arg0);
    }
    /**
     * Safety margin in meters
     * @returns {number}
     */
    get safety_margin() {
        const ret = wasm.__wbg_get_batchcollisioncheckerconfig_safety_margin(this.__wbg_ptr);
        return ret;
    }
    /**
     * Safety margin in meters
     * @param {number} arg0
     */
    set safety_margin(arg0) {
        wasm.__wbg_set_batchcollisioncheckerconfig_safety_margin(this.__wbg_ptr, arg0);
    }
    /**
     * Set safety margin
     * @param {number} margin
     * @returns {BatchCollisionCheckerConfig}
     */
    withSafetyMargin(margin) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.batchcollisioncheckerconfig_withSafetyMargin(ptr, margin);
        return BatchCollisionCheckerConfig.__wrap(ret);
    }
    /**
     * Set whether to check self-collision
     * @param {boolean} enabled
     * @returns {BatchCollisionCheckerConfig}
     */
    withSelfCollision(enabled) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.batchcollisioncheckerconfig_withSelfCollision(ptr, enabled);
        return BatchCollisionCheckerConfig.__wrap(ret);
    }
    /**
     * Set samples per edge
     * @param {number} n
     * @returns {BatchCollisionCheckerConfig}
     */
    withSamplesPerEdge(n) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.batchcollisioncheckerconfig_withSamplesPerEdge(ptr, n);
        return BatchCollisionCheckerConfig.__wrap(ret);
    }
    constructor() {
        const ret = wasm.batchcollisioncheckerconfig_new();
        this.__wbg_ptr = ret >>> 0;
        BatchCollisionCheckerConfigFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Fast preset: fewer samples for quicker checking
     * @returns {BatchCollisionCheckerConfig}
     */
    static fast() {
        const ret = wasm.batchcollisioncheckerconfig_fast();
        return BatchCollisionCheckerConfig.__wrap(ret);
    }
    /**
     * Accurate preset: more samples for thorough checking
     * @returns {BatchCollisionCheckerConfig}
     */
    static accurate() {
        const ret = wasm.batchcollisioncheckerconfig_accurate();
        return BatchCollisionCheckerConfig.__wrap(ret);
    }
}

const BatchCollisionResultFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_batchcollisionresult_free(ptr >>> 0, 1));
/**
 * Result of batch collision checking
 */
export class BatchCollisionResult {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(BatchCollisionResult.prototype);
        obj.__wbg_ptr = ptr;
        BatchCollisionResultFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        BatchCollisionResultFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_batchcollisionresult_free(ptr, 0);
    }
    /**
     * Get number of configurations checked
     * @returns {number}
     */
    get numChecked() {
        const ret = wasm.batchcollisionresult_numChecked(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get total checking time in ms
     * @returns {number}
     */
    get totalTimeMs() {
        const ret = wasm.batchcollisionresult_totalTimeMs(this.__wbg_ptr);
        return ret;
    }
    /**
     * Get validity ratio
     * @returns {number}
     */
    get validityRatio() {
        const ret = wasm.batchcollisionresult_validityRatio(this.__wbg_ptr);
        return ret;
    }
    /**
     * Get indices of valid configurations
     * @returns {Uint32Array}
     */
    getValidIndices() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.batchcollisionresult_getValidIndices(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayU32FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 4, 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get average time per configuration in ms
     * @returns {number}
     */
    get avgTimePerConfig() {
        const ret = wasm.batchcollisionresult_avgTimePerConfig(this.__wbg_ptr);
        return ret;
    }
    /**
     * Get indices of invalid (colliding) configurations
     * @returns {Uint32Array}
     */
    getInvalidIndices() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.batchcollisionresult_getInvalidIndices(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayU32FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 4, 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get all results as array
     * @returns {Uint8Array}
     */
    get results() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.batchcollisionresult_results(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 1, 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get result for specific index
     * @param {number} index
     * @returns {boolean}
     */
    isValid(index) {
        const ret = wasm.batchcollisionresult_isValid(this.__wbg_ptr, index);
        return ret !== 0;
    }
    /**
     * Get number of valid (collision-free) configurations
     * @returns {number}
     */
    get numValid() {
        const ret = wasm.batchcollisionresult_numValid(this.__wbg_ptr);
        return ret >>> 0;
    }
}

const BatchIkSolverFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_batchiksolver_free(ptr >>> 0, 1));
/**
 * GPU 批量 IK 求解器（WebGPU）
 *
 * 限制与 `GpuBatchIk` 一致：标准 DH、仅旋转关节、dof ≤ 8、f32 精度、
 * DLS 局部收敛（建议配合多种子 `solveBest` 使用）。
 */
export class BatchIkSolver {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(BatchIkSolver.prototype);
        obj.__wbg_ptr = ptr;
        BatchIkSolverFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        BatchIkSolverFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_batchiksolver_free(ptr, 0);
    }
    /**
     * 多种子批量求解：每个目标尝试 `seeds_per_target` 个种子取最优
     *
     * `seeds` 为 target-major 扁平数组，
     * 长度 = 目标数 × seeds_per_target × dof。
     * @param {Float64Array} targets
     * @param {Float64Array} seeds
     * @param {number} seeds_per_target
     * @param {BatchIkSolverOptions} options
     * @returns {Promise<any>}
     */
    solveBest(targets, seeds, seeds_per_target, options) {
        const ptr0 = passArrayF64ToWasm0(targets, wasm.__wbindgen_export_0);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayF64ToWasm0(seeds, wasm.__wbindgen_export_0);
        const len1 = WASM_VECTOR_LEN;
        _assertClass(options, BatchIkSolverOptions);
        var ptr2 = options.__destroy_into_raw();
        const ret = wasm.batchiksolver_solveBest(this.__wbg_ptr, ptr0, len0, ptr1, len1, seeds_per_target, ptr2);
        return takeObject(ret);
    }
    /**
     * 批量求解：每个目标一个种子
     *
     * * `targets` - 扁平目标位姿，每个 7 个数
     *   `[px, py, pz, qx, qy, qz, qw]`（three.js 四元数顺序）
     * * `seeds` - 扁平种子，长度 = 目标数 × dof
     *
     * 返回 `[{ joints, converged, iterations, posError, rotError }, ...]`。
     * 未收敛的问题 `converged` 为 false——不会静默给出错误解。
     * @param {Float64Array} targets
     * @param {Float64Array} seeds
     * @param {BatchIkSolverOptions} options
     * @returns {Promise<any>}
     */
    solve(targets, seeds, options) {
        const ptr0 = passArrayF64ToWasm0(targets, wasm.__wbindgen_export_0);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayF64ToWasm0(seeds, wasm.__wbindgen_export_0);
        const len1 = WASM_VECTOR_LEN;
        _assertClass(options, BatchIkSolverOptions);
        var ptr2 = options.__destroy_into_raw();
        const ret = wasm.batchiksolver_solve(this.__wbg_ptr, ptr0, len0, ptr1, len1, ptr2);
        return takeObject(ret);
    }
    /**
     * 创建求解器（初始化 WebGPU 设备并编译管线）
     *
     * * `dh_params` - 扁平 DH 参数，每关节 `[a, alpha, d, theta_offset]`，
     *   长度 = dof × 4
     * * `joint_limits` - 扁平限位 `[lo0, hi0, lo1, hi1, ...]`；
     *   传空数组表示不限位
     * @param {Float64Array} dh_params
     * @param {Float64Array} joint_limits
     * @returns {Promise<BatchIkSolver>}
     */
    static create(dh_params, joint_limits) {
        const ptr0 = passArrayF64ToWasm0(dh_params, wasm.__wbindgen_export_0);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayF64ToWasm0(joint_limits, wasm.__wbindgen_export_0);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.batchiksolver_create(ptr0, len0, ptr1, len1);
        return takeObject(ret);
    }
    /**
     * 关节数
     * @returns {number}
     */
    get dof() {
        const ret = wasm.batchiksolver_dof(this.__wbg_ptr);
        return ret >>> 0;
    }
}

const BatchIkSolverOptionsFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_batchiksolveroptions_free(ptr >>> 0, 1));
/**
 * 批量 IK 求解参数（JS 可读写的普通字段）
 */
export class BatchIkSolverOptions {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(BatchIkSolverOptions.prototype);
        obj.__wbg_ptr = ptr;
        BatchIkSolverOptionsFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        BatchIkSolverOptionsFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_batchiksolveroptions_free(ptr, 0);
    }
    /**
     * 最大迭代次数
     * @returns {number}
     */
    get max_iters() {
        const ret = wasm.__wbg_get_batchiksolveroptions_max_iters(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * 最大迭代次数
     * @param {number} arg0
     */
    set max_iters(arg0) {
        wasm.__wbg_set_batchiksolveroptions_max_iters(this.__wbg_ptr, arg0);
    }
    /**
     * 位置收敛容差（米）
     * @returns {number}
     */
    get pos_tol() {
        const ret = wasm.__wbg_get_batchcollisioncheckerconfig_safety_margin(this.__wbg_ptr);
        return ret;
    }
    /**
     * 位置收敛容差（米）
     * @param {number} arg0
     */
    set pos_tol(arg0) {
        wasm.__wbg_set_batchcollisioncheckerconfig_safety_margin(this.__wbg_ptr, arg0);
    }
    /**
     * 姿态收敛容差（弧度）
     * @returns {number}
     */
    get rot_tol() {
        const ret = wasm.__wbg_get_batchiksolveroptions_rot_tol(this.__wbg_ptr);
        return ret;
    }
    /**
     * 姿态收敛容差（弧度）
     * @param {number} arg0
     */
    set rot_tol(arg0) {
        wasm.__wbg_set_batchiksolveroptions_rot_tol(this.__wbg_ptr, arg0);
    }
    /**
     * DLS 阻尼 λ
     * @returns {number}
     */
    get damping() {
        const ret = wasm.__wbg_get_batchiksolveroptions_damping(this.__wbg_ptr);
        return ret;
    }
    /**
     * DLS 阻尼 λ
     * @param {number} arg0
     */
    set damping(arg0) {
        wasm.__wbg_set_batchiksolveroptions_damping(this.__wbg_ptr, arg0);
    }
    /**
     * 单次迭代 Δq 最大范数（弧度）
     * @returns {number}
     */
    get max_step() {
        const ret = wasm.__wbg_get_batchiksolveroptions_max_step(this.__wbg_ptr);
        return ret;
    }
    /**
     * 单次迭代 Δq 最大范数（弧度）
     * @param {number} arg0
     */
    set max_step(arg0) {
        wasm.__wbg_set_batchiksolveroptions_max_step(this.__wbg_ptr, arg0);
    }
    /**
     * 默认参数（max_iters=100, pos_tol=1e-3, rot_tol=1e-3, damping=0.05, max_step=0.5）
     * @returns {BatchIkSolverOptions}
     */
    static default() {
        const ret = wasm.batchiksolveroptions_default();
        return BatchIkSolverOptions.__wrap(ret);
    }
}

const BiRRTConfigFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_birrtconfig_free(ptr >>> 0, 1));
/**
 * BiRRT planner configuration
 */
export class BiRRTConfig {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(BiRRTConfig.prototype);
        obj.__wbg_ptr = ptr;
        BiRRTConfigFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        BiRRTConfigFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_birrtconfig_free(ptr, 0);
    }
    /**
     * Maximum iterations
     * @returns {number}
     */
    get max_iterations() {
        const ret = wasm.__wbg_get_batchiksolveroptions_max_iters(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Maximum iterations
     * @param {number} arg0
     */
    set max_iterations(arg0) {
        wasm.__wbg_set_batchiksolveroptions_max_iters(this.__wbg_ptr, arg0);
    }
    /**
     * Goal bias probability (0.0 - 1.0)
     * @returns {number}
     */
    get goal_bias() {
        const ret = wasm.__wbg_get_batchcollisioncheckerconfig_safety_margin(this.__wbg_ptr);
        return ret;
    }
    /**
     * Goal bias probability (0.0 - 1.0)
     * @param {number} arg0
     */
    set goal_bias(arg0) {
        wasm.__wbg_set_batchcollisioncheckerconfig_safety_margin(this.__wbg_ptr, arg0);
    }
    /**
     * Maximum extension distance per step
     * @returns {number}
     */
    get max_extension() {
        const ret = wasm.__wbg_get_batchiksolveroptions_rot_tol(this.__wbg_ptr);
        return ret;
    }
    /**
     * Maximum extension distance per step
     * @param {number} arg0
     */
    set max_extension(arg0) {
        wasm.__wbg_set_batchiksolveroptions_rot_tol(this.__wbg_ptr, arg0);
    }
    /**
     * Connection distance threshold
     * @returns {number}
     */
    get connect_threshold() {
        const ret = wasm.__wbg_get_batchiksolveroptions_damping(this.__wbg_ptr);
        return ret;
    }
    /**
     * Connection distance threshold
     * @param {number} arg0
     */
    set connect_threshold(arg0) {
        wasm.__wbg_set_batchiksolveroptions_damping(this.__wbg_ptr, arg0);
    }
    /**
     * Step size for collision checking
     * @returns {number}
     */
    get step_size() {
        const ret = wasm.__wbg_get_batchiksolveroptions_max_step(this.__wbg_ptr);
        return ret;
    }
    /**
     * Step size for collision checking
     * @param {number} arg0
     */
    set step_size(arg0) {
        wasm.__wbg_set_batchiksolveroptions_max_step(this.__wbg_ptr, arg0);
    }
    /**
     * Create with custom parameters
     * @param {number} max_iterations
     * @param {number} goal_bias
     * @param {number} max_extension
     * @returns {BiRRTConfig}
     */
    static withParams(max_iterations, goal_bias, max_extension) {
        const ret = wasm.birrtconfig_withParams(max_iterations, goal_bias, max_extension);
        return BiRRTConfig.__wrap(ret);
    }
    /**
     * Set goal bias
     * @param {number} goal_bias
     * @returns {BiRRTConfig}
     */
    withGoalBias(goal_bias) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.birrtconfig_withGoalBias(ptr, goal_bias);
        return BiRRTConfig.__wrap(ret);
    }
    /**
     * Set max extension
     * @param {number} max_extension
     * @returns {BiRRTConfig}
     */
    withMaxExtension(max_extension) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.birrtconfig_withMaxExtension(ptr, max_extension);
        return BiRRTConfig.__wrap(ret);
    }
    /**
     * Set max iterations
     * @param {number} max_iterations
     * @returns {BiRRTConfig}
     */
    withMaxIterations(max_iterations) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.birrtconfig_withMaxIterations(ptr, max_iterations);
        return BiRRTConfig.__wrap(ret);
    }
    /**
     * Set connection threshold
     * @param {number} threshold
     * @returns {BiRRTConfig}
     */
    withConnectionThreshold(threshold) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.birrtconfig_withConnectionThreshold(ptr, threshold);
        return BiRRTConfig.__wrap(ret);
    }
    constructor() {
        const ret = wasm.birrtconfig_new();
        this.__wbg_ptr = ret >>> 0;
        BiRRTConfigFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}

const BiRRTPlannerFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_birrtplanner_free(ptr >>> 0, 1));
/**
 * BiRRT Planner for WASM
 *
 * This is a thin wrapper around `trajx_planning::planners::core::BiRRTCore`.
 * It provides WASM bindings that allow JavaScript to use the planner with
 * callback-based collision checking.
 *
 * ## Performance
 *
 * Uses KD-Tree acceleration for O(log n) nearest neighbor queries.
 * Typical planning time: 0.07-10 ms for simple 6-DOF queries.
 */
export class BiRRTPlanner {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        BiRRTPlannerFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_birrtplanner_free(ptr, 0);
    }
    /**
     * Plan with collision checking callback
     *
     * The callback receives joint configuration and returns true if valid (no collision)
     * @param {Float64Array} start
     * @param {Float64Array} goal
     * @param {Function} collision_checker
     * @returns {PlanningResult}
     */
    planWithCollisionCheck(start, goal, collision_checker) {
        try {
            const ptr0 = passArrayF64ToWasm0(start, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(goal, wasm.__wbindgen_export_0);
            const len1 = WASM_VECTOR_LEN;
            const ret = wasm.birrtplanner_planWithCollisionCheck(this.__wbg_ptr, ptr0, len0, ptr1, len1, addBorrowedObject(collision_checker));
            return PlanningResult.__wrap(ret);
        } finally {
            heap[stack_pointer++] = undefined;
        }
    }
    /**
     * Plan with dense-path collision checking callback
     *
     * Returns a densely sampled path with all validated intermediate points.
     * The callback receives joint configuration and returns true if valid (no collision).
     * @param {Float64Array} start
     * @param {Float64Array} goal
     * @param {Function} collision_checker
     * @returns {PlanningResult}
     */
    planDenseWithCollisionCheck(start, goal, collision_checker) {
        try {
            const ptr0 = passArrayF64ToWasm0(start, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(goal, wasm.__wbindgen_export_0);
            const len1 = WASM_VECTOR_LEN;
            const ret = wasm.birrtplanner_planDenseWithCollisionCheck(this.__wbg_ptr, ptr0, len0, ptr1, len1, addBorrowedObject(collision_checker));
            return PlanningResult.__wrap(ret);
        } finally {
            heap[stack_pointer++] = undefined;
        }
    }
    /**
     * Create a new BiRRT planner
     * @param {JointLimits} joint_limits
     * @param {BiRRTConfig | null} [config]
     */
    constructor(joint_limits, config) {
        _assertClass(joint_limits, JointLimits);
        let ptr0 = 0;
        if (!isLikeNone(config)) {
            _assertClass(config, BiRRTConfig);
            ptr0 = config.__destroy_into_raw();
        }
        const ret = wasm.birrtplanner_new(joint_limits.__wbg_ptr, ptr0);
        this.__wbg_ptr = ret >>> 0;
        BiRRTPlannerFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Plan a path from start to goal (joint limits only, no collision checking)
     * @param {Float64Array} start
     * @param {Float64Array} goal
     * @returns {PlanningResult}
     */
    plan(start, goal) {
        const ptr0 = passArrayF64ToWasm0(start, wasm.__wbindgen_export_0);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayF64ToWasm0(goal, wasm.__wbindgen_export_0);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.birrtplanner_plan(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        return PlanningResult.__wrap(ret);
    }
}

const CableConfigFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_cableconfig_free(ptr >>> 0, 1));
/**
 * Cable configuration for cable-aware motion planning
 *
 * Configure cable twist limits and warning thresholds.
 * Used with `WasmMotion.cableAwareWith(config)`.
 */
export class CableConfig {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(CableConfig.prototype);
        obj.__wbg_ptr = ptr;
        CableConfigFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        CableConfigFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_cableconfig_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    get initialTwist() {
        const ret = wasm.cableconfig_initialTwist(this.__wbg_ptr);
        return ret;
    }
    /**
     * Check if a twist value is within limits
     * @param {number} twist
     * @returns {boolean}
     */
    isTwistValid(twist) {
        const ret = wasm.cableconfig_isTwistValid(this.__wbg_ptr, twist);
        return ret !== 0;
    }
    /**
     * @returns {number}
     */
    get maxTwistRate() {
        const ret = wasm.cableconfig_maxTwistRate(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get maxTotalTwist() {
        const ret = wasm.batchcollisionresult_totalTimeMs(this.__wbg_ptr);
        return ret;
    }
    /**
     * Check if twist is in warning zone
     * @param {number} twist
     * @returns {boolean}
     */
    isTwistWarning(twist) {
        const ret = wasm.cableconfig_isTwistWarning(this.__wbg_ptr, twist);
        return ret !== 0;
    }
    /**
     * Enable/disable auto-unwind strategy
     * @param {boolean} enabled
     * @returns {CableConfig}
     */
    withAutoUnwind(enabled) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.cableconfig_withAutoUnwind(ptr, enabled);
        return CableConfig.__wrap(ret);
    }
    /**
     * @returns {number}
     */
    get warningThreshold() {
        const ret = wasm.cableconfig_warningThreshold(this.__wbg_ptr);
        return ret;
    }
    /**
     * Set initial twist (radians)
     * @param {number} twist
     * @returns {CableConfig}
     */
    withInitialTwist(twist) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.birrtconfig_withConnectionThreshold(ptr, twist);
        return CableConfig.__wrap(ret);
    }
    /**
     * @returns {boolean}
     */
    get autoUnwindEnabled() {
        const ret = wasm.cableconfig_autoUnwindEnabled(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Set maximum twist rate (radians per meter)
     * @param {number} rate
     * @returns {CableConfig}
     */
    withMaxTwistRate(rate) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.birrtconfig_withMaxExtension(ptr, rate);
        return CableConfig.__wrap(ret);
    }
    /**
     * Set maximum total twist (radians)
     * @param {number} max_twist
     * @returns {CableConfig}
     */
    withMaxTotalTwist(max_twist) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.cableconfig_withMaxTotalTwist(ptr, max_twist);
        return CableConfig.__wrap(ret);
    }
    /**
     * Set warning threshold (fraction of max_total_twist, 0.0-1.0)
     * @param {number} threshold
     * @returns {CableConfig}
     */
    withWarningThreshold(threshold) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.cableconfig_withWarningThreshold(ptr, threshold);
        return CableConfig.__wrap(ret);
    }
    /**
     * Create default cable configuration
     * - max_total_twist: 4*PI (2 full rotations / 720°)
     * - max_twist_rate: PI rad/m
     * - enable_auto_unwind: true
     * - warning_threshold: 0.75
     */
    constructor() {
        const ret = wasm.cablePresetStandard();
        this.__wbg_ptr = ret >>> 0;
        CableConfigFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}

const CollisionEnvironmentFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_collisionenvironment_free(ptr >>> 0, 1));
/**
 * Collision environment for managing obstacles
 *
 * Provides efficient collision checking against a set of obstacles.
 */
export class CollisionEnvironment {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(CollisionEnvironment.prototype);
        obj.__wbg_ptr = ptr;
        CollisionEnvironmentFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        CollisionEnvironmentFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_collisionenvironment_free(ptr, 0);
    }
    /**
     * Check if all obstacles are GPU-compatible
     *
     * Returns true if all obstacles are Sphere, Box, Capsule, or Cylinder.
     * Meshes and other complex shapes are not GPU-compatible.
     * @returns {boolean}
     */
    isGpuCompatible() {
        const ret = wasm.collisionenvironment_isGpuCompatible(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Get count of GPU-incompatible obstacles
     *
     * Useful for determining how many obstacles need conversion.
     * @returns {number}
     */
    countGpuIncompatible() {
        const ret = wasm.collisionenvironment_countGpuIncompatible(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Convert environment obstacles to capsule approximations for GPU collision
     *
     * This creates a new CollisionEnvironment where complex shapes (meshes, boxes,
     * cylinders) are converted to capsule approximations. The resulting environment
     * is optimized for GPU-accelerated collision detection.
     *
     * # Example
     * ```typescript
     * const env = new CollisionEnvironment();
     * env.addBox("table", [0.5, 0.3, 0.02], tablePose);
     *
     * const options = WasmEnvironmentCapsuleOptions.gpuOptimized();
     * const { env: gpuEnv, stats } = env.toCapsuleApproximation(options);
     * console.log(`Converted ${stats.obstaclesConverted} obstacles to ${stats.capsulesGenerated} capsules`);
     * ```
     * @param {WasmEnvironmentCapsuleOptions} options
     * @returns {WasmEnvironmentCapsuleResult}
     */
    toCapsuleApproximation(options) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(options, WasmEnvironmentCapsuleOptions);
            wasm.collisionenvironment_toCapsuleApproximation(retptr, this.__wbg_ptr, options.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return WasmEnvironmentCapsuleResult.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Ignore all collisions involving a specific link
     * @param {string} link_name
     */
    ignoreLink(link_name) {
        const ptr0 = passStringToWasm0(link_name, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len0 = WASM_VECTOR_LEN;
        wasm.collisionenvironment_ignoreLink(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * Unignore all collisions involving a specific link
     * @param {string} link_name
     */
    unignoreLink(link_name) {
        const ptr0 = passStringToWasm0(link_name, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len0 = WASM_VECTOR_LEN;
        wasm.collisionenvironment_unignoreLink(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * Ignore all collisions with a specific obstacle
     * @param {string} obstacle_id
     */
    ignoreObstacle(obstacle_id) {
        const ptr0 = passStringToWasm0(obstacle_id, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len0 = WASM_VECTOR_LEN;
        wasm.collisionenvironment_ignoreObstacle(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * Get total number of obstacles (simple + composite)
     * @returns {number}
     */
    get totalObstacles() {
        const ret = wasm.collisionenvironment_totalObstacles(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get all obstacle IDs (both simple and composite)
     * @returns {string[]}
     */
    allObstacleIds() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.collisionenvironment_allObstacleIds(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayJsValueFromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 4, 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get list of ignored links
     * @returns {string[]}
     */
    getIgnoredLinks() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.collisionenvironment_getIgnoredLinks(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayJsValueFromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 4, 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Unignore all collisions with a specific obstacle
     * @param {string} obstacle_id
     */
    unignoreObstacle(obstacle_id) {
        const ptr0 = passStringToWasm0(obstacle_id, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len0 = WASM_VECTOR_LEN;
        wasm.collisionenvironment_unignoreObstacle(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * Remove any obstacle (simple or composite) by ID
     * @param {string} id
     * @returns {boolean}
     */
    removeAnyObstacle(id) {
        const ptr0 = passStringToWasm0(id, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.collisionenvironment_removeAnyObstacle(this.__wbg_ptr, ptr0, len0);
        return ret !== 0;
    }
    /**
     * Get list of ignored obstacles
     * @returns {string[]}
     */
    getIgnoredObstacles() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.collisionenvironment_getIgnoredObstacles(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayJsValueFromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 4, 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Add a composite obstacle to the environment
     * @param {WasmCompositeObstacle} obstacle
     */
    addCompositeObstacle(obstacle) {
        _assertClass(obstacle, WasmCompositeObstacle);
        var ptr0 = obstacle.__destroy_into_raw();
        wasm.collisionenvironment_addCompositeObstacle(this.__wbg_ptr, ptr0);
    }
    /**
     * Get all composite obstacle IDs
     * @returns {string[]}
     */
    compositeObstacleIds() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.collisionenvironment_compositeObstacleIds(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayJsValueFromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 4, 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get number of composite obstacles
     * @returns {number}
     */
    get numCompositeObstacles() {
        const ret = wasm.collisionenvironment_numCompositeObstacles(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Remove a composite obstacle by ID
     * @param {string} id
     * @returns {boolean}
     */
    removeCompositeObstacle(id) {
        const ptr0 = passStringToWasm0(id, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.collisionenvironment_removeCompositeObstacle(this.__wbg_ptr, ptr0, len0);
        return ret !== 0;
    }
    /**
     * Check if a link-obstacle pair is ignored
     * @param {string} link_name
     * @param {string} obstacle_id
     * @returns {boolean}
     */
    isLinkObstaclePairIgnored(link_name, obstacle_id) {
        const ptr0 = passStringToWasm0(link_name, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(obstacle_id, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.collisionenvironment_isLinkObstaclePairIgnored(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        return ret !== 0;
    }
    /**
     * Update composite obstacle pose
     * @param {string} id
     * @param {Pose} pose
     */
    updateCompositeObstaclePose(id, pose) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(id, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            const len0 = WASM_VECTOR_LEN;
            _assertClass(pose, Pose);
            wasm.collisionenvironment_updateCompositeObstaclePose(retptr, this.__wbg_ptr, ptr0, len0, pose.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Clear all ACM settings
     */
    clearAcm() {
        wasm.collisionenvironment_clearAcm(this.__wbg_ptr);
    }
    /**
     * Add a sphere obstacle
     *
     * # Arguments
     * * `id` - Unique identifier for the obstacle
     * * `radius` - Sphere radius
     * * `position` - Center position [x, y, z]
     * @param {string} id
     * @param {number} radius
     * @param {Float64Array} position
     */
    addSphere(id, radius, position) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(id, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(position, wasm.__wbindgen_export_0);
            const len1 = WASM_VECTOR_LEN;
            wasm.collisionenvironment_addSphere(retptr, this.__wbg_ptr, ptr0, len0, radius, ptr1, len1);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Add a cylinder obstacle
     *
     * # Arguments
     * * `id` - Unique identifier for the obstacle
     * * `radius` - Cylinder radius
     * * `half_height` - Half height of the cylinder
     * * `pose` - Pose of the obstacle
     * @param {string} id
     * @param {number} radius
     * @param {number} half_height
     * @param {Pose} pose
     */
    addCylinder(id, radius, half_height, pose) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(id, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            const len0 = WASM_VECTOR_LEN;
            _assertClass(pose, Pose);
            wasm.collisionenvironment_addCylinder(retptr, this.__wbg_ptr, ptr0, len0, radius, half_height, pose.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get all obstacle IDs
     * @returns {string[]}
     */
    obstacleIds() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.collisionenvironment_obstacleIds(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayJsValueFromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 4, 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get number of obstacles
     * @returns {number}
     */
    get numObstacles() {
        const ret = wasm.collisionenvironment_numObstacles(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Remove an obstacle by ID
     * @param {string} id
     * @returns {boolean}
     */
    removeObstacle(id) {
        const ptr0 = passStringToWasm0(id, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.collisionenvironment_removeObstacle(this.__wbg_ptr, ptr0, len0);
        return ret !== 0;
    }
    /**
     * Check if a pose is collision-free (simplified check using a small sphere)
     *
     * # Arguments
     * * `position` - Position to check [x, y, z]
     * * `radius` - Collision radius (default: 0.01)
     * @param {Float64Array} position
     * @param {number | null} [radius]
     * @returns {boolean}
     */
    isCollisionFree(position, radius) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF64ToWasm0(position, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            wasm.collisionenvironment_isCollisionFree(retptr, this.__wbg_ptr, ptr0, len0, !isLikeNone(radius), isLikeNone(radius) ? 0 : radius);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return r0 !== 0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Update the pose of an obstacle
     * @param {string} id
     * @param {Pose} pose
     */
    updateObstaclePose(id, pose) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(id, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            const len0 = WASM_VECTOR_LEN;
            _assertClass(pose, Pose);
            wasm.collisionenvironment_updateObstaclePose(retptr, this.__wbg_ptr, ptr0, len0, pose.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Check if a shape at given pose collides with any obstacle
     *
     * # Arguments
     * * `shape_type` - Type of shape: "box", "sphere", "cylinder"
     * * `params` - Shape parameters (depends on type)
     * * `pose` - Pose of the shape
     * @param {string} shape_type
     * @param {Float64Array} params
     * @param {Pose} pose
     * @returns {boolean}
     */
    checkShapeCollision(shape_type, params, pose) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(shape_type, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(params, wasm.__wbindgen_export_0);
            const len1 = WASM_VECTOR_LEN;
            _assertClass(pose, Pose);
            wasm.collisionenvironment_checkShapeCollision(retptr, this.__wbg_ptr, ptr0, len0, ptr1, len1, pose.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return r0 !== 0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Ignore collision between a link and an obstacle
     * @param {string} link_name
     * @param {string} obstacle_id
     */
    ignoreLinkObstaclePair(link_name, obstacle_id) {
        const ptr0 = passStringToWasm0(link_name, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(obstacle_id, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len1 = WASM_VECTOR_LEN;
        wasm.collisionenvironment_ignoreLinkObstaclePair(this.__wbg_ptr, ptr0, len0, ptr1, len1);
    }
    /**
     * Unignore collision between a link and an obstacle
     * @param {string} link_name
     * @param {string} obstacle_id
     */
    unignoreLinkObstaclePair(link_name, obstacle_id) {
        const ptr0 = passStringToWasm0(link_name, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(obstacle_id, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len1 = WASM_VECTOR_LEN;
        wasm.collisionenvironment_unignoreLinkObstaclePair(this.__wbg_ptr, ptr0, len0, ptr1, len1);
    }
    /**
     * Create a new empty collision environment
     */
    constructor() {
        const ret = wasm.collisionenvironment_new();
        this.__wbg_ptr = ret >>> 0;
        CollisionEnvironmentFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Clear all obstacles
     */
    clear() {
        wasm.collisionenvironment_clear(this.__wbg_ptr);
    }
    /**
     * Add a box obstacle
     *
     * # Arguments
     * * `id` - Unique identifier for the obstacle
     * * `half_extents` - Half dimensions [x, y, z]
     * * `pose` - Pose of the obstacle
     * @param {string} id
     * @param {Float64Array} half_extents
     * @param {Pose} pose
     */
    addBox(id, half_extents, pose) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(id, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(half_extents, wasm.__wbindgen_export_0);
            const len1 = WASM_VECTOR_LEN;
            _assertClass(pose, Pose);
            wasm.collisionenvironment_addBox(retptr, this.__wbg_ptr, ptr0, len0, ptr1, len1, pose.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}

const DhParamFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_dhparam_free(ptr >>> 0, 1));
/**
 * DH Parameter for a single joint
 */
export class DhParam {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(DhParam.prototype);
        obj.__wbg_ptr = ptr;
        DhParamFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    static __unwrap(jsValue) {
        if (!(jsValue instanceof DhParam)) {
            return 0;
        }
        return jsValue.__destroy_into_raw();
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        DhParamFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_dhparam_free(ptr, 0);
    }
    /**
     * Link length (a)
     * @returns {number}
     */
    get a() {
        const ret = wasm.__wbg_get_batchcollisioncheckerconfig_safety_margin(this.__wbg_ptr);
        return ret;
    }
    /**
     * Link length (a)
     * @param {number} arg0
     */
    set a(arg0) {
        wasm.__wbg_set_batchcollisioncheckerconfig_safety_margin(this.__wbg_ptr, arg0);
    }
    /**
     * Link twist (alpha) in radians
     * @returns {number}
     */
    get alpha() {
        const ret = wasm.__wbg_get_batchiksolveroptions_rot_tol(this.__wbg_ptr);
        return ret;
    }
    /**
     * Link twist (alpha) in radians
     * @param {number} arg0
     */
    set alpha(arg0) {
        wasm.__wbg_set_batchiksolveroptions_rot_tol(this.__wbg_ptr, arg0);
    }
    /**
     * Link offset (d)
     * @returns {number}
     */
    get d() {
        const ret = wasm.__wbg_get_batchiksolveroptions_damping(this.__wbg_ptr);
        return ret;
    }
    /**
     * Link offset (d)
     * @param {number} arg0
     */
    set d(arg0) {
        wasm.__wbg_set_batchiksolveroptions_damping(this.__wbg_ptr, arg0);
    }
    /**
     * Joint angle offset (theta) in radians
     * @returns {number}
     */
    get theta() {
        const ret = wasm.__wbg_get_batchiksolveroptions_max_step(this.__wbg_ptr);
        return ret;
    }
    /**
     * Joint angle offset (theta) in radians
     * @param {number} arg0
     */
    set theta(arg0) {
        wasm.__wbg_set_batchiksolveroptions_max_step(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} a
     * @param {number} alpha
     * @param {number} d
     * @param {number} theta
     */
    constructor(a, alpha, d, theta) {
        const ret = wasm.dhparam_new(a, alpha, d, theta);
        this.__wbg_ptr = ret >>> 0;
        DhParamFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}

const DistanceQueryResultFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_distancequeryresult_free(ptr >>> 0, 1));
/**
 * Result of a distance query
 */
export class DistanceQueryResult {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        DistanceQueryResultFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_distancequeryresult_free(ptr, 0);
    }
    /**
     * Distance between objects (negative if penetrating)
     * @returns {number}
     */
    get distance() {
        const ret = wasm.__wbg_get_batchcollisioncheckerconfig_safety_margin(this.__wbg_ptr);
        return ret;
    }
    /**
     * Distance between objects (negative if penetrating)
     * @param {number} arg0
     */
    set distance(arg0) {
        wasm.__wbg_set_batchcollisioncheckerconfig_safety_margin(this.__wbg_ptr, arg0);
    }
    /**
     * Closest point on first object
     * @returns {number}
     */
    get point1_x() {
        const ret = wasm.__wbg_get_batchiksolveroptions_rot_tol(this.__wbg_ptr);
        return ret;
    }
    /**
     * Closest point on first object
     * @param {number} arg0
     */
    set point1_x(arg0) {
        wasm.__wbg_set_batchiksolveroptions_rot_tol(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get point1_y() {
        const ret = wasm.__wbg_get_batchiksolveroptions_damping(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set point1_y(arg0) {
        wasm.__wbg_set_batchiksolveroptions_damping(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get point1_z() {
        const ret = wasm.__wbg_get_batchiksolveroptions_max_step(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set point1_z(arg0) {
        wasm.__wbg_set_batchiksolveroptions_max_step(this.__wbg_ptr, arg0);
    }
    /**
     * Closest point on second object
     * @returns {number}
     */
    get point2_x() {
        const ret = wasm.__wbg_get_distancequeryresult_point2_x(this.__wbg_ptr);
        return ret;
    }
    /**
     * Closest point on second object
     * @param {number} arg0
     */
    set point2_x(arg0) {
        wasm.__wbg_set_distancequeryresult_point2_x(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get point2_y() {
        const ret = wasm.__wbg_get_distancequeryresult_point2_y(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set point2_y(arg0) {
        wasm.__wbg_set_distancequeryresult_point2_y(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get point2_z() {
        const ret = wasm.__wbg_get_distancequeryresult_point2_z(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set point2_z(arg0) {
        wasm.__wbg_set_distancequeryresult_point2_z(this.__wbg_ptr, arg0);
    }
    /**
     * Get closest point on first object as array
     * @returns {Float64Array}
     */
    getPoint1() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.distancequeryresult_getPoint1(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get closest point on second object as array
     * @returns {Float64Array}
     */
    getPoint2() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.distancequeryresult_getPoint2(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}

const EdgeValidationResultFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_edgevalidationresult_free(ptr >>> 0, 1));
/**
 * Result of edge validation
 */
export class EdgeValidationResult {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(EdgeValidationResult.prototype);
        obj.__wbg_ptr = ptr;
        EdgeValidationResultFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        EdgeValidationResultFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_edgevalidationresult_free(ptr, 0);
    }
    /**
     * Number of interpolated points
     * @returns {number}
     */
    get numPoints() {
        const ret = wasm.edgevalidationresult_numPoints(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get interpolated points as flat array (if caching enabled)
     * @returns {Float64Array}
     */
    get interpolatedPoints() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.edgevalidationresult_interpolatedPoints(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Whether the edge is valid
     * @returns {boolean}
     */
    get valid() {
        const ret = wasm.edgevalidationresult_valid(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Get a specific interpolated point by index
     * @param {number} index
     * @returns {Float64Array}
     */
    getPoint(index) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.edgevalidationresult_getPoint(retptr, this.__wbg_ptr, index);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
            if (r3) {
                throw takeObject(r2);
            }
            var v1 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}

const GpuBatchResultFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_gpubatchresult_free(ptr >>> 0, 1));
/**
 * Result of a GPU batch collision check
 */
export class GpuBatchResult {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(GpuBatchResult.prototype);
        obj.__wbg_ptr = ptr;
        GpuBatchResultFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        GpuBatchResultFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_gpubatchresult_free(ptr, 0);
    }
    /**
     * Get distance for pair at index
     * @param {number} index
     * @returns {number}
     */
    getDistance(index) {
        const ret = wasm.gpubatchresult_getDistance(this.__wbg_ptr, index);
        return ret;
    }
    /**
     * Check if pair at index is colliding
     * @param {number} index
     * @returns {boolean}
     */
    isColliding(index) {
        const ret = wasm.gpubatchresult_isColliding(this.__wbg_ptr, index);
        return ret !== 0;
    }
    /**
     * Get number of colliding pairs
     * @returns {number}
     */
    get collisionCount() {
        const ret = wasm.gpubatchresult_collisionCount(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get collision flags as array (1 = colliding, 0 = not colliding)
     * @returns {Uint32Array}
     */
    get collisionFlags() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.gpubatchresult_collisionFlags(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayU32FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 4, 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get number of pairs checked
     * @returns {number}
     */
    get count() {
        const ret = wasm.gpubatchresult_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get signed distances (negative = penetrating)
     * @returns {Float32Array}
     */
    get distances() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.gpubatchresult_distances(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayF32FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 4, 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}

const GpuCollisionContextFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_gpucollisioncontext_free(ptr >>> 0, 1));
/**
 * GPU-accelerated collision context for WASM
 *
 * Provides high-performance batch collision detection using WebGPU.
 * Best suited for checking many collision pairs simultaneously.
 */
export class GpuCollisionContext {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(GpuCollisionContext.prototype);
        obj.__wbg_ptr = ptr;
        GpuCollisionContextFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        GpuCollisionContextFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_gpucollisioncontext_free(ptr, 0);
    }
    /**
     * Check mixed shape collisions in batch (async)
     *
     * This is the most flexible API that supports any combination of shapes.
     *
     * # Arguments
     * * `shape_types1` - Array of shape type indices (0=sphere, 1=box, 2=capsule, 3=cylinder)
     * * `shape_params1` - Flat array of shape parameters (8 floats per shape)
     * * `poses1` - Flat array of [x, y, z, qx, qy, qz, qw] poses
     * * `shape_types2` - Array of shape type indices
     * * `shape_params2` - Flat array of shape parameters
     * * `poses2` - Flat array of poses
     * @param {Uint32Array} shape_types1
     * @param {Float64Array} shape_params1
     * @param {Float64Array} poses1
     * @param {Uint32Array} shape_types2
     * @param {Float64Array} shape_params2
     * @param {Float64Array} poses2
     * @returns {Promise<GpuBatchResult>}
     */
    checkMixedAsync(shape_types1, shape_params1, poses1, shape_types2, shape_params2, poses2) {
        const ptr0 = passArray32ToWasm0(shape_types1, wasm.__wbindgen_export_0);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayF64ToWasm0(shape_params1, wasm.__wbindgen_export_0);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passArrayF64ToWasm0(poses1, wasm.__wbindgen_export_0);
        const len2 = WASM_VECTOR_LEN;
        const ptr3 = passArray32ToWasm0(shape_types2, wasm.__wbindgen_export_0);
        const len3 = WASM_VECTOR_LEN;
        const ptr4 = passArrayF64ToWasm0(shape_params2, wasm.__wbindgen_export_0);
        const len4 = WASM_VECTOR_LEN;
        const ptr5 = passArrayF64ToWasm0(poses2, wasm.__wbindgen_export_0);
        const len5 = WASM_VECTOR_LEN;
        const ret = wasm.gpucollisioncontext_checkMixedAsync(this.__wbg_ptr, ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, ptr4, len4, ptr5, len5);
        return takeObject(ret);
    }
    /**
     * Check box-box collisions in batch (async)
     *
     * # Arguments
     * * `half_extents1` - Flat array of [hx, hy, hz] half-extents for first boxes
     * * `poses1` - Flat array of [x, y, z, qx, qy, qz, qw] poses for first boxes
     * * `half_extents2` - Flat array of [hx, hy, hz] half-extents for second boxes
     * * `poses2` - Flat array of [x, y, z, qx, qy, qz, qw] poses for second boxes
     * @param {Float64Array} half_extents1
     * @param {Float64Array} poses1
     * @param {Float64Array} half_extents2
     * @param {Float64Array} poses2
     * @returns {Promise<GpuBatchResult>}
     */
    checkBoxBoxAsync(half_extents1, poses1, half_extents2, poses2) {
        const ptr0 = passArrayF64ToWasm0(half_extents1, wasm.__wbindgen_export_0);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayF64ToWasm0(poses1, wasm.__wbindgen_export_0);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passArrayF64ToWasm0(half_extents2, wasm.__wbindgen_export_0);
        const len2 = WASM_VECTOR_LEN;
        const ptr3 = passArrayF64ToWasm0(poses2, wasm.__wbindgen_export_0);
        const len3 = WASM_VECTOR_LEN;
        const ret = wasm.gpucollisioncontext_checkBoxBoxAsync(this.__wbg_ptr, ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3);
        return takeObject(ret);
    }
    /**
     * Check sphere-sphere collisions in batch (async)
     *
     * # Arguments
     * * `positions1` - Flat array of [x, y, z] positions for first spheres
     * * `radii1` - Array of radii for first spheres
     * * `positions2` - Flat array of [x, y, z] positions for second spheres
     * * `radii2` - Array of radii for second spheres
     *
     * # Returns
     * Promise resolving to `GpuBatchResult`
     * @param {Float64Array} positions1
     * @param {Float64Array} radii1
     * @param {Float64Array} positions2
     * @param {Float64Array} radii2
     * @returns {Promise<GpuBatchResult>}
     */
    checkSphereSphereAsync(positions1, radii1, positions2, radii2) {
        const ptr0 = passArrayF64ToWasm0(positions1, wasm.__wbindgen_export_0);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayF64ToWasm0(radii1, wasm.__wbindgen_export_0);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passArrayF64ToWasm0(positions2, wasm.__wbindgen_export_0);
        const len2 = WASM_VECTOR_LEN;
        const ptr3 = passArrayF64ToWasm0(radii2, wasm.__wbindgen_export_0);
        const len3 = WASM_VECTOR_LEN;
        const ret = wasm.gpucollisioncontext_checkSphereSphereAsync(this.__wbg_ptr, ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3);
        return takeObject(ret);
    }
    /**
     * Initialize GPU collision context
     *
     * Returns a Promise that resolves to a GpuCollisionContext or rejects
     * if WebGPU is not available or initialization fails.
     * @returns {Promise<GpuCollisionContext>}
     */
    static init() {
        const ret = wasm.gpucollisioncontext_init();
        return takeObject(ret);
    }
    /**
     * Get device information string
     * @returns {string}
     */
    deviceInfo() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.gpucollisioncontext_deviceInfo(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_export_3(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Get the GPU batch threshold (minimum pairs for GPU to be faster)
     * @returns {number}
     */
    gpuThreshold() {
        const ret = wasm.gpucollisioncontext_gpuThreshold(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get preferred batch size for optimal GPU performance
     * @returns {number}
     */
    preferredBatchSize() {
        const ret = wasm.gpucollisioncontext_preferredBatchSize(this.__wbg_ptr);
        return ret >>> 0;
    }
}

const GpuPlanningContextFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_gpuplanningcontext_free(ptr >>> 0, 1));
/**
 * GPU Planning Context
 *
 * Provides Lazy-PRM planning with batch collision checking callback.
 * The collision checking is delegated to a JavaScript function which
 * can use WebGPU, CPU, or any other collision detection backend.
 */
export class GpuPlanningContext {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        GpuPlanningContextFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_gpuplanningcontext_free(ptr, 0);
    }
    /**
     * Get number of edges in roadmap
     * @returns {number}
     */
    get edgeCount() {
        const ret = wasm.asyncgpuplanningcontext_edgeCount(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get number of nodes in roadmap
     * @returns {number}
     */
    get nodeCount() {
        const ret = wasm.asyncgpuplanningcontext_nodeCount(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Build the roadmap
     *
     * Call this once after construction. This samples configurations
     * and builds the roadmap graph without collision checking.
     */
    buildRoadmap() {
        wasm.asyncgpuplanningcontext_buildRoadmap(this.__wbg_ptr);
    }
    /**
     * Check if roadmap is built
     * @returns {boolean}
     */
    isRoadmapBuilt() {
        const ret = wasm.asyncgpuplanningcontext_isRoadmapBuilt(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Reset edge validation cache
     *
     * Call this when the environment changes to invalidate cached results.
     */
    resetValidations() {
        wasm.gpuplanningcontext_resetValidations(this.__wbg_ptr);
    }
    /**
     * Plan path with custom collision checker callback
     *
     * For WebGPU integration, provide a JS function that performs
     * batch collision checking on GPU.
     *
     * # Arguments
     * * `start` - Start joint configuration
     * * `goal` - Goal joint configuration
     * * `check_edges` - JS function: (edges: [start[], end[]][]) => boolean[]
     * @param {Float64Array} start
     * @param {Float64Array} goal
     * @param {Function} check_edges
     * @returns {LazyPrmResult}
     */
    planPathWithChecker(start, goal, check_edges) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF64ToWasm0(start, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(goal, wasm.__wbindgen_export_0);
            const len1 = WASM_VECTOR_LEN;
            wasm.gpuplanningcontext_planPathWithChecker(retptr, this.__wbg_ptr, ptr0, len0, ptr1, len1, addBorrowedObject(check_edges));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return LazyPrmResult.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            heap[stack_pointer++] = undefined;
        }
    }
    /**
     * Create a new GPU planning context
     *
     * # Arguments
     * * `robot` - The robot for FK computations and joint limits
     * * `config` - Optional planning configuration
     * @param {Robot} robot
     * @param {GpuPlanningContextConfig | null} [config]
     */
    constructor(robot, config) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(robot, Robot);
            let ptr0 = 0;
            if (!isLikeNone(config)) {
                _assertClass(config, GpuPlanningContextConfig);
                ptr0 = config.__destroy_into_raw();
            }
            wasm.gpuplanningcontext_new(retptr, robot.__wbg_ptr, ptr0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            this.__wbg_ptr = r0 >>> 0;
            GpuPlanningContextFinalization.register(this, this.__wbg_ptr, this);
            return this;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get planning statistics
     * @returns {LazyPrmStats}
     */
    stats() {
        const ret = wasm.gpuplanningcontext_stats(this.__wbg_ptr);
        return LazyPrmStats.__wrap(ret);
    }
    /**
     * Plan a path from start to goal with collision checker callback
     *
     * Uses Lazy-PRM with batch collision checking optimized for GPU.
     *
     * # Arguments
     * * `start` - Start joint configuration
     * * `goal` - Goal joint configuration
     * * `check_edges` - JS function that validates edges in batch
     *   - Input: Array<[start: number[], end: number[]]>
     *   - Output: Array<boolean> (true = collision-free)
     *
     * # Returns
     * GpuPlanningResult with path and statistics
     * @param {Float64Array} start
     * @param {Float64Array} goal
     * @param {Function} check_edges
     * @returns {GpuPlanningResult}
     */
    planPath(start, goal, check_edges) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF64ToWasm0(start, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(goal, wasm.__wbindgen_export_0);
            const len1 = WASM_VECTOR_LEN;
            wasm.gpuplanningcontext_planPath(retptr, this.__wbg_ptr, ptr0, len0, ptr1, len1, addBorrowedObject(check_edges));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return GpuPlanningResult.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            heap[stack_pointer++] = undefined;
        }
    }
}

const GpuPlanningContextConfigFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_gpuplanningcontextconfig_free(ptr >>> 0, 1));
/**
 * Configuration for GPU planning context
 */
export class GpuPlanningContextConfig {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(GpuPlanningContextConfig.prototype);
        obj.__wbg_ptr = ptr;
        GpuPlanningContextConfigFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        GpuPlanningContextConfigFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_gpuplanningcontextconfig_free(ptr, 0);
    }
    /**
     * Number of roadmap samples
     * @returns {number}
     */
    get num_samples() {
        const ret = wasm.__wbg_get_gpuplanningcontextconfig_num_samples(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Number of roadmap samples
     * @param {number} arg0
     */
    set num_samples(arg0) {
        wasm.__wbg_set_gpuplanningcontextconfig_num_samples(this.__wbg_ptr, arg0);
    }
    /**
     * K nearest neighbors
     * @returns {number}
     */
    get k_neighbors() {
        const ret = wasm.__wbg_get_gpuplanningcontextconfig_k_neighbors(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * K nearest neighbors
     * @param {number} arg0
     */
    set k_neighbors(arg0) {
        wasm.__wbg_set_gpuplanningcontextconfig_k_neighbors(this.__wbg_ptr, arg0);
    }
    /**
     * Maximum connection distance (radians)
     * @returns {number}
     */
    get max_connection_distance() {
        const ret = wasm.__wbg_get_batchcollisioncheckerconfig_safety_margin(this.__wbg_ptr);
        return ret;
    }
    /**
     * Maximum connection distance (radians)
     * @param {number} arg0
     */
    set max_connection_distance(arg0) {
        wasm.__wbg_set_batchcollisioncheckerconfig_safety_margin(this.__wbg_ptr, arg0);
    }
    /**
     * Edge discretization step size (radians)
     * @returns {number}
     */
    get edge_step_size() {
        const ret = wasm.__wbg_get_batchiksolveroptions_rot_tol(this.__wbg_ptr);
        return ret;
    }
    /**
     * Edge discretization step size (radians)
     * @param {number} arg0
     */
    set edge_step_size(arg0) {
        wasm.__wbg_set_batchiksolveroptions_rot_tol(this.__wbg_ptr, arg0);
    }
    /**
     * Batch size for collision validation
     * @returns {number}
     */
    get validation_batch_size() {
        const ret = wasm.__wbg_get_batchiksolveroptions_max_iters(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Batch size for collision validation
     * @param {number} arg0
     */
    set validation_batch_size(arg0) {
        wasm.__wbg_set_batchiksolveroptions_max_iters(this.__wbg_ptr, arg0);
    }
    /**
     * Safety margin for collision checking (meters)
     * @returns {number}
     */
    get safety_margin() {
        const ret = wasm.__wbg_get_batchiksolveroptions_damping(this.__wbg_ptr);
        return ret;
    }
    /**
     * Safety margin for collision checking (meters)
     * @param {number} arg0
     */
    set safety_margin(arg0) {
        wasm.__wbg_set_batchiksolveroptions_damping(this.__wbg_ptr, arg0);
    }
    /**
     * Set validation batch size
     * @param {number} size
     * @returns {GpuPlanningContextConfig}
     */
    withBatchSize(size) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.birrtconfig_withMaxIterations(ptr, size);
        return GpuPlanningContextConfig.__wrap(ret);
    }
    /**
     * Set k neighbors
     * @param {number} k
     * @returns {GpuPlanningContextConfig}
     */
    withKNeighbors(k) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.gpuplanningcontextconfig_withKNeighbors(ptr, k);
        return GpuPlanningContextConfig.__wrap(ret);
    }
    /**
     * Set number of samples
     * @param {number} n
     * @returns {GpuPlanningContextConfig}
     */
    withNumSamples(n) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.gpuplanningcontextconfig_withNumSamples(ptr, n);
        return GpuPlanningContextConfig.__wrap(ret);
    }
    /**
     * Set safety margin in meters
     * @param {number} margin
     * @returns {GpuPlanningContextConfig}
     */
    withSafetyMargin(margin) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.birrtconfig_withConnectionThreshold(ptr, margin);
        return GpuPlanningContextConfig.__wrap(ret);
    }
    constructor() {
        const ret = wasm.gpuplanningcontextconfig_balanced();
        this.__wbg_ptr = ret >>> 0;
        GpuPlanningContextConfigFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Fast preset - fewer samples, faster planning
     * @returns {GpuPlanningContextConfig}
     */
    static fast() {
        const ret = wasm.gpuplanningcontextconfig_fast();
        return GpuPlanningContextConfig.__wrap(ret);
    }
    /**
     * Quality preset - more samples, better paths
     * @returns {GpuPlanningContextConfig}
     */
    static quality() {
        const ret = wasm.gpuplanningcontextconfig_quality();
        return GpuPlanningContextConfig.__wrap(ret);
    }
    /**
     * Balanced preset - good trade-off
     * @returns {GpuPlanningContextConfig}
     */
    static balanced() {
        const ret = wasm.gpuplanningcontextconfig_balanced();
        return GpuPlanningContextConfig.__wrap(ret);
    }
}

const GpuPlanningResultFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_gpuplanningresult_free(ptr >>> 0, 1));
/**
 * Result of GPU-accelerated path planning
 */
export class GpuPlanningResult {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(GpuPlanningResult.prototype);
        obj.__wbg_ptr = ptr;
        GpuPlanningResultFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        GpuPlanningResultFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_gpuplanningresult_free(ptr, 0);
    }
    /**
     * Number of GPU batch calls
     * @returns {number}
     */
    get gpuBatches() {
        const ret = wasm.batchcollisionresult_numValid(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Path length in joint space (radians)
     * @returns {number}
     */
    get pathLength() {
        const ret = wasm.batchcollisionresult_totalTimeMs(this.__wbg_ptr);
        return ret;
    }
    /**
     * Number of waypoints
     * @returns {number}
     */
    get waypointCount() {
        const ret = wasm.gpuplanningresult_waypointCount(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Number of edges validated during planning
     * @returns {number}
     */
    get edgesValidated() {
        const ret = wasm.batchcollisionresult_numChecked(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Total collision checks performed
     * @returns {number}
     */
    get collisionChecks() {
        const ret = wasm.gpuplanningresult_collisionChecks(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Planning time in milliseconds
     * @returns {number}
     */
    get planningTimeMs() {
        const ret = wasm.cableconfig_maxTwistRate(this.__wbg_ptr);
        return ret;
    }
    /**
     * Get the path as a flat array [j1, j2, ..., jn, j1, j2, ..., jn, ...]
     * @returns {Float64Array}
     */
    get path() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.gpuplanningresult_path(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Error message if planning failed
     * @returns {string | undefined}
     */
    get error() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.gpuplanningresult_error(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            let v1;
            if (r0 !== 0) {
                v1 = getStringFromWasm0(r0, r1).slice();
                wasm.__wbindgen_export_3(r0, r1 * 1, 1);
            }
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Whether planning succeeded
     * @returns {boolean}
     */
    get success() {
        const ret = wasm.gpuplanningresult_success(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Get summary string for logging
     * @returns {string}
     */
    summary() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.gpuplanningresult_summary(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_export_3(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Get path as array of waypoints
     * @returns {Array<any>}
     */
    get waypoints() {
        const ret = wasm.gpuplanningresult_waypoints(this.__wbg_ptr);
        return takeObject(ret);
    }
}

const GpuVsCpuComparisonFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_gpuvscpucomparison_free(ptr >>> 0, 1));
/**
 * Performance comparison result
 */
export class GpuVsCpuComparison {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(GpuVsCpuComparison.prototype);
        obj.__wbg_ptr = ptr;
        GpuVsCpuComparisonFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        GpuVsCpuComparisonFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_gpuvscpucomparison_free(ptr, 0);
    }
    /**
     * Whether GPU was faster than CPU
     * @returns {boolean}
     */
    get gpuFaster() {
        const ret = wasm.gpuvscpucomparison_gpuFaster(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * CPU time in milliseconds
     * @returns {number}
     */
    get cpuTimeMs() {
        const ret = wasm.cableconfig_maxTwistRate(this.__wbg_ptr);
        return ret;
    }
    /**
     * GPU time in milliseconds
     * @returns {number}
     */
    get gpuTimeMs() {
        const ret = wasm.batchcollisionresult_totalTimeMs(this.__wbg_ptr);
        return ret;
    }
    /**
     * Number of collision pairs tested
     * @returns {number}
     */
    get collisionPairs() {
        const ret = wasm.batchcollisionresult_numValid(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Speedup factor (cpu_time / gpu_time)
     * @returns {number}
     */
    get speedup() {
        const ret = wasm.cableconfig_initialTwist(this.__wbg_ptr);
        return ret;
    }
    /**
     * Get a summary string
     * @returns {string}
     */
    summary() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.gpuvscpucomparison_summary(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_export_3(deferred1_0, deferred1_1, 1);
        }
    }
}

const IkResultFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_ikresult_free(ptr >>> 0, 1));
/**
 * IK result (single solution)
 */
export class IkResult {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(IkResult.prototype);
        obj.__wbg_ptr = ptr;
        IkResultFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        IkResultFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_ikresult_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    get iterations() {
        const ret = wasm.ikresult_iterations(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {string | undefined}
     */
    get errorMessage() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.ikresult_errorMessage(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            let v1;
            if (r0 !== 0) {
                v1 = getStringFromWasm0(r0, r1).slice();
                wasm.__wbindgen_export_3(r0, r1 * 1, 1);
            }
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Whether analytical IK was used (vs numerical)
     * @returns {boolean}
     */
    get isAnalytical() {
        const ret = wasm.ikresult_isAnalytical(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {number | undefined}
     */
    get positionError() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.ikresult_error(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r2 = getDataViewMemory0().getFloat64(retptr + 8 * 1, true);
            return r0 === 0 ? undefined : r2;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @returns {number | undefined}
     */
    get error() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.ikresult_error(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r2 = getDataViewMemory0().getFloat64(retptr + 8 * 1, true);
            return r0 === 0 ? undefined : r2;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @returns {string | undefined}
     */
    get message() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.ikresult_errorMessage(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            let v1;
            if (r0 !== 0) {
                v1 = getStringFromWasm0(r0, r1).slice();
                wasm.__wbindgen_export_3(r0, r1 * 1, 1);
            }
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @returns {boolean}
     */
    get success() {
        const ret = wasm.ikresult_success(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {Float64Array | undefined}
     */
    get solution() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.ikresult_solution(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            let v1;
            if (r0 !== 0) {
                v1 = getArrayF64FromWasm0(r0, r1).slice();
                wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            }
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}

const IntegratedGpuPlannerConfigFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_integratedgpuplannerconfig_free(ptr >>> 0, 1));
/**
 * Configuration for integrated GPU planning
 */
export class IntegratedGpuPlannerConfig {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(IntegratedGpuPlannerConfig.prototype);
        obj.__wbg_ptr = ptr;
        IntegratedGpuPlannerConfigFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        IntegratedGpuPlannerConfigFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_integratedgpuplannerconfig_free(ptr, 0);
    }
    /**
     * Get prefer GPU setting
     * @returns {boolean}
     */
    get preferGpu() {
        const ret = wasm.integratedgpuplannerconfig_preferGpu(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Get k neighbors
     * @returns {number}
     */
    get kNeighbors() {
        const ret = wasm.gpuplanningresult_waypointCount(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get roadmap samples
     * @returns {number}
     */
    get roadmapSamples() {
        const ret = wasm.collisionenvironment_numObstacles(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get samples per edge
     * @returns {number}
     */
    get samplesPerEdge() {
        const ret = wasm.integratedgpuplannerconfig_samplesPerEdge(this.__wbg_ptr);
        return ret >>> 0;
    }
    constructor() {
        const ret = wasm.integratedgpuplannerconfig_balanced();
        this.__wbg_ptr = ret >>> 0;
        IntegratedGpuPlannerConfigFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Fast preset - fewer samples, quick planning
     * @returns {IntegratedGpuPlannerConfig}
     */
    static fast() {
        const ret = wasm.integratedgpuplannerconfig_fast();
        return IntegratedGpuPlannerConfig.__wrap(ret);
    }
    /**
     * Quality preset - thorough checking
     * @returns {IntegratedGpuPlannerConfig}
     */
    static quality() {
        const ret = wasm.integratedgpuplannerconfig_quality();
        return IntegratedGpuPlannerConfig.__wrap(ret);
    }
    /**
     * Balanced preset - good tradeoff
     * @returns {IntegratedGpuPlannerConfig}
     */
    static balanced() {
        const ret = wasm.integratedgpuplannerconfig_balanced();
        return IntegratedGpuPlannerConfig.__wrap(ret);
    }
    /**
     * CPU-only preset (no GPU)
     * @returns {IntegratedGpuPlannerConfig}
     */
    static cpuOnly() {
        const ret = wasm.integratedgpuplannerconfig_cpuOnly();
        return IntegratedGpuPlannerConfig.__wrap(ret);
    }
}

const JointLimitsFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_jointlimits_free(ptr >>> 0, 1));
/**
 * Joint limits configuration
 */
export class JointLimits {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(JointLimits.prototype);
        obj.__wbg_ptr = ptr;
        JointLimitsFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        JointLimitsFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_jointlimits_free(ptr, 0);
    }
    /**
     * Number of joints
     * @returns {number}
     */
    get dof() {
        const ret = wasm.jointlimits_dof(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @param {Float64Array} lower
     * @param {Float64Array} upper
     */
    constructor(lower, upper) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF64ToWasm0(lower, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(upper, wasm.__wbindgen_export_0);
            const len1 = WASM_VECTOR_LEN;
            wasm.jointlimits_new(retptr, ptr0, len0, ptr1, len1);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            this.__wbg_ptr = r0 >>> 0;
            JointLimitsFinalization.register(this, this.__wbg_ptr, this);
            return this;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Clamp joint values to limits
     * @param {Float64Array} joints
     * @returns {Float64Array}
     */
    clamp(joints) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF64ToWasm0(joints, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            wasm.jointlimits_clamp(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v2 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            return v2;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @returns {Float64Array}
     */
    get lower() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.jointlimits_lower(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @returns {Float64Array}
     */
    get upper() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.jointlimits_upper(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Check if joint values are within limits
     * @param {Float64Array} joints
     * @returns {boolean}
     */
    isValid(joints) {
        const ptr0 = passArrayF64ToWasm0(joints, wasm.__wbindgen_export_0);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.jointlimits_isValid(this.__wbg_ptr, ptr0, len0);
        return ret !== 0;
    }
}

const KinematicLimitsFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_kinematiclimits_free(ptr >>> 0, 1));
/**
 * Kinematic limits (velocity, acceleration, jerk)
 */
export class KinematicLimits {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(KinematicLimits.prototype);
        obj.__wbg_ptr = ptr;
        KinematicLimitsFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        KinematicLimitsFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_kinematiclimits_free(ptr, 0);
    }
    /**
     * @returns {Float64Array}
     */
    get maxJerk() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.kinematiclimits_maxJerk(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @returns {Float64Array}
     */
    get maxVelocity() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.kinematiclimits_maxVelocity(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @returns {Float64Array}
     */
    get maxAcceleration() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.kinematiclimits_maxAcceleration(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {Float64Array} max_velocity
     * @param {Float64Array} max_acceleration
     * @param {Float64Array} max_jerk
     */
    constructor(max_velocity, max_acceleration, max_jerk) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF64ToWasm0(max_velocity, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(max_acceleration, wasm.__wbindgen_export_0);
            const len1 = WASM_VECTOR_LEN;
            const ptr2 = passArrayF64ToWasm0(max_jerk, wasm.__wbindgen_export_0);
            const len2 = WASM_VECTOR_LEN;
            wasm.kinematiclimits_new(retptr, ptr0, len0, ptr1, len1, ptr2, len2);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            this.__wbg_ptr = r0 >>> 0;
            KinematicLimitsFinalization.register(this, this.__wbg_ptr, this);
            return this;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Create uniform limits for all joints
     * @param {number} dof
     * @param {number} velocity
     * @param {number} acceleration
     * @param {number} jerk
     * @returns {KinematicLimits}
     */
    static uniform(dof, velocity, acceleration, jerk) {
        const ret = wasm.kinematiclimits_uniform(dof, velocity, acceleration, jerk);
        return KinematicLimits.__wrap(ret);
    }
}

const LazyPrmConfigFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_lazyprmconfig_free(ptr >>> 0, 1));
/**
 * Configuration for Lazy-PRM planner
 */
export class LazyPrmConfig {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(LazyPrmConfig.prototype);
        obj.__wbg_ptr = ptr;
        LazyPrmConfigFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        LazyPrmConfigFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_lazyprmconfig_free(ptr, 0);
    }
    /**
     * Number of samples in the roadmap
     * @returns {number}
     */
    get num_samples() {
        const ret = wasm.__wbg_get_lazyprmconfig_num_samples(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Number of samples in the roadmap
     * @param {number} arg0
     */
    set num_samples(arg0) {
        wasm.__wbg_set_lazyprmconfig_num_samples(this.__wbg_ptr, arg0);
    }
    /**
     * Number of nearest neighbors to connect
     * @returns {number}
     */
    get k_neighbors() {
        const ret = wasm.__wbg_get_lazyprmconfig_k_neighbors(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Number of nearest neighbors to connect
     * @param {number} arg0
     */
    set k_neighbors(arg0) {
        wasm.__wbg_set_lazyprmconfig_k_neighbors(this.__wbg_ptr, arg0);
    }
    /**
     * Maximum connection distance
     * @returns {number}
     */
    get max_connection_distance() {
        const ret = wasm.__wbg_get_batchcollisioncheckerconfig_safety_margin(this.__wbg_ptr);
        return ret;
    }
    /**
     * Maximum connection distance
     * @param {number} arg0
     */
    set max_connection_distance(arg0) {
        wasm.__wbg_set_batchcollisioncheckerconfig_safety_margin(this.__wbg_ptr, arg0);
    }
    /**
     * Step size for edge discretization
     * @returns {number}
     */
    get edge_step_size() {
        const ret = wasm.__wbg_get_batchiksolveroptions_rot_tol(this.__wbg_ptr);
        return ret;
    }
    /**
     * Step size for edge discretization
     * @param {number} arg0
     */
    set edge_step_size(arg0) {
        wasm.__wbg_set_batchiksolveroptions_rot_tol(this.__wbg_ptr, arg0);
    }
    /**
     * Batch size for edge validation
     * @returns {number}
     */
    get validation_batch_size() {
        const ret = wasm.__wbg_get_gpuplanningcontextconfig_num_samples(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Batch size for edge validation
     * @param {number} arg0
     */
    set validation_batch_size(arg0) {
        wasm.__wbg_set_gpuplanningcontextconfig_num_samples(this.__wbg_ptr, arg0);
    }
    /**
     * Set number of nearest neighbors
     * @param {number} k
     * @returns {LazyPrmConfig}
     */
    withKNeighbors(k) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.lazyprmconfig_withKNeighbors(ptr, k);
        return LazyPrmConfig.__wrap(ret);
    }
    /**
     * Set number of samples
     * @param {number} num_samples
     * @returns {LazyPrmConfig}
     */
    withNumSamples(num_samples) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.lazyprmconfig_withNumSamples(ptr, num_samples);
        return LazyPrmConfig.__wrap(ret);
    }
    /**
     * Set edge step size for discretization
     * @param {number} step_size
     * @returns {LazyPrmConfig}
     */
    withEdgeStepSize(step_size) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.lazyprmconfig_withEdgeStepSize(ptr, step_size);
        return LazyPrmConfig.__wrap(ret);
    }
    /**
     * Set validation batch size
     * @param {number} batch_size
     * @returns {LazyPrmConfig}
     */
    withValidationBatchSize(batch_size) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.lazyprmconfig_withValidationBatchSize(ptr, batch_size);
        return LazyPrmConfig.__wrap(ret);
    }
    /**
     * Set maximum connection distance
     * @param {number} distance
     * @returns {LazyPrmConfig}
     */
    withMaxConnectionDistance(distance) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.lazyprmconfig_withMaxConnectionDistance(ptr, distance);
        return LazyPrmConfig.__wrap(ret);
    }
    constructor() {
        const ret = wasm.lazyprmconfig_new();
        this.__wbg_ptr = ret >>> 0;
        LazyPrmConfigFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}

const LazyPrmPlannerFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_lazyprmplanner_free(ptr >>> 0, 1));
/**
 * Lazy-PRM planner for WASM
 *
 * Probabilistic Roadmap planner with lazy edge validation, optimized for
 * GPU batch collision checking. Defers collision checks until edges are
 * actually needed, then validates them in batches.
 *
 * # Key Features
 * - Builds roadmap without collision checking (fast)
 * - Validates edges lazily during path search
 * - Batches collision checks for GPU efficiency
 * - Caches validation results for repeated queries
 */
export class LazyPrmPlanner {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(LazyPrmPlanner.prototype);
        obj.__wbg_ptr = ptr;
        LazyPrmPlannerFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        LazyPrmPlannerFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_lazyprmplanner_free(ptr, 0);
    }
    /**
     * Get number of edges in the roadmap
     * @returns {number}
     */
    get edgeCount() {
        const ret = wasm.lazyprmplanner_edgeCount(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get number of nodes in the roadmap
     * @returns {number}
     */
    get nodeCount() {
        const ret = wasm.lazyprmplanner_nodeCount(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Query with a simple collision checker callback
     *
     * Simplified version that checks each edge individually.
     * Use `query()` for batch collision checking.
     *
     * # Arguments
     * * `start` - Start joint configuration
     * * `goal` - Goal joint configuration
     * * `check_edge` - JS function (start: number[], end: number[]) => boolean
     * @param {Float64Array} start
     * @param {Float64Array} goal
     * @param {Function} check_edge
     * @returns {LazyPrmResult}
     */
    querySimple(start, goal, check_edge) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF64ToWasm0(start, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(goal, wasm.__wbindgen_export_0);
            const len1 = WASM_VECTOR_LEN;
            wasm.lazyprmplanner_querySimple(retptr, this.__wbg_ptr, ptr0, len0, ptr1, len1, addBorrowedObject(check_edge));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return LazyPrmResult.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            heap[stack_pointer++] = undefined;
        }
    }
    /**
     * Build the roadmap graph
     *
     * This samples configurations and builds edges but does NOT perform
     * any collision checking. Call this once before queries.
     */
    buildRoadmap() {
        wasm.lazyprmplanner_buildRoadmap(this.__wbg_ptr);
    }
    /**
     * Reset all edge validation states
     *
     * Call this if the environment has changed and cached edge validations
     * are no longer valid.
     */
    resetValidations() {
        wasm.lazyprmplanner_resetValidations(this.__wbg_ptr);
    }
    /**
     * Create a new Lazy-PRM planner
     *
     * # Arguments
     * * `dimension` - Number of joints/DOF
     * * `joint_limits` - Array of [min, max] pairs for each joint
     * * `config` - Optional configuration
     * @param {number} dimension
     * @param {Float64Array} joint_limits
     * @param {LazyPrmConfig | null} [config]
     */
    constructor(dimension, joint_limits, config) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF64ToWasm0(joint_limits, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            let ptr1 = 0;
            if (!isLikeNone(config)) {
                _assertClass(config, LazyPrmConfig);
                ptr1 = config.__destroy_into_raw();
            }
            wasm.lazyprmplanner_new(retptr, dimension, ptr0, len0, ptr1);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            this.__wbg_ptr = r0 >>> 0;
            LazyPrmPlannerFinalization.register(this, this.__wbg_ptr, this);
            return this;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Query for a path from start to goal
     *
     * # Arguments
     * * `start` - Start joint configuration
     * * `goal` - Goal joint configuration
     * * `validate_edges` - JS function that takes edges array and returns boolean array
     *   - Input: Array<[start: number[], end: number[]]>
     *   - Output: Array<boolean> (true = collision-free, false = in collision)
     *
     * # Returns
     * LazyPrmResult with path if successful
     * @param {Float64Array} start
     * @param {Float64Array} goal
     * @param {Function} validate_edges
     * @returns {LazyPrmResult}
     */
    query(start, goal, validate_edges) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF64ToWasm0(start, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(goal, wasm.__wbindgen_export_0);
            const len1 = WASM_VECTOR_LEN;
            wasm.lazyprmplanner_query(retptr, this.__wbg_ptr, ptr0, len0, ptr1, len1, addBorrowedObject(validate_edges));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return LazyPrmResult.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            heap[stack_pointer++] = undefined;
        }
    }
    /**
     * Get planning statistics
     * @returns {LazyPrmStats}
     */
    stats() {
        const ret = wasm.lazyprmplanner_stats(this.__wbg_ptr);
        return LazyPrmStats.__wrap(ret);
    }
    /**
     * Check if roadmap has been built
     * @returns {boolean}
     */
    isBuilt() {
        const ret = wasm.lazyprmplanner_isBuilt(this.__wbg_ptr);
        return ret !== 0;
    }
}

const LazyPrmResultFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_lazyprmresult_free(ptr >>> 0, 1));
/**
 * Result of Lazy-PRM planning
 */
export class LazyPrmResult {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(LazyPrmResult.prototype);
        obj.__wbg_ptr = ptr;
        LazyPrmResultFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        LazyPrmResultFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_lazyprmresult_free(ptr, 0);
    }
    /**
     * Number of GPU batch calls made
     * @returns {number}
     */
    get gpuBatches() {
        const ret = wasm.batchcollisionresult_numChecked(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Total path length in joint space
     * @returns {number}
     */
    get pathLength() {
        const ret = wasm.batchcollisionresult_totalTimeMs(this.__wbg_ptr);
        return ret;
    }
    /**
     * Get number of waypoints in path
     * @returns {number}
     */
    get waypointCount() {
        const ret = wasm.lazyprmresult_waypointCount(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Number of edges validated during planning
     * @returns {number}
     */
    get edgesValidated() {
        const ret = wasm.gpuplanningresult_waypointCount(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Planning time in milliseconds
     * @returns {number}
     */
    get planningTimeMs() {
        const ret = wasm.cableconfig_maxTwistRate(this.__wbg_ptr);
        return ret;
    }
    /**
     * Get the path as a flat array [j1, j2, j3, ..., j1, j2, j3, ...]
     * @returns {Float64Array}
     */
    get path() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.lazyprmresult_path(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Error message if planning failed
     * @returns {string | undefined}
     */
    get error() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.lazyprmresult_error(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            let v1;
            if (r0 !== 0) {
                v1 = getStringFromWasm0(r0, r1).slice();
                wasm.__wbindgen_export_3(r0, r1 * 1, 1);
            }
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Whether planning succeeded
     * @returns {boolean}
     */
    get success() {
        const ret = wasm.lazyprmresult_success(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Get path as array of waypoints
     * @returns {Array<any>}
     */
    get waypoints() {
        const ret = wasm.lazyprmresult_waypoints(this.__wbg_ptr);
        return takeObject(ret);
    }
}

const LazyPrmStatsFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_lazyprmstats_free(ptr >>> 0, 1));
/**
 * Statistics from Lazy-PRM planner
 */
export class LazyPrmStats {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(LazyPrmStats.prototype);
        obj.__wbg_ptr = ptr;
        LazyPrmStatsFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        LazyPrmStatsFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_lazyprmstats_free(ptr, 0);
    }
    /**
     * Total configurations checked
     * @returns {number}
     */
    get states_checked() {
        const ret = wasm.__wbg_get_lazyprmconfig_num_samples(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Total configurations checked
     * @param {number} arg0
     */
    set states_checked(arg0) {
        wasm.__wbg_set_lazyprmconfig_num_samples(this.__wbg_ptr, arg0);
    }
    /**
     * Total edges checked
     * @returns {number}
     */
    get edges_checked() {
        const ret = wasm.__wbg_get_lazyprmconfig_k_neighbors(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Total edges checked
     * @param {number} arg0
     */
    set edges_checked(arg0) {
        wasm.__wbg_set_lazyprmconfig_k_neighbors(this.__wbg_ptr, arg0);
    }
    /**
     * Number of GPU batch dispatches
     * @returns {number}
     */
    get gpu_batches() {
        const ret = wasm.__wbg_get_gpuplanningcontextconfig_num_samples(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Number of GPU batch dispatches
     * @param {number} arg0
     */
    set gpu_batches(arg0) {
        wasm.__wbg_set_gpuplanningcontextconfig_num_samples(this.__wbg_ptr, arg0);
    }
    /**
     * Average batch size
     * @returns {number}
     */
    get avg_batch_size() {
        const ret = wasm.__wbg_get_batchcollisioncheckerconfig_safety_margin(this.__wbg_ptr);
        return ret;
    }
    /**
     * Average batch size
     * @param {number} arg0
     */
    set avg_batch_size(arg0) {
        wasm.__wbg_set_batchcollisioncheckerconfig_safety_margin(this.__wbg_ptr, arg0);
    }
    /**
     * Time spent in GPU collision checking (ms)
     * @returns {number}
     */
    get gpu_time_ms() {
        const ret = wasm.__wbg_get_batchiksolveroptions_rot_tol(this.__wbg_ptr);
        return ret;
    }
    /**
     * Time spent in GPU collision checking (ms)
     * @param {number} arg0
     */
    set gpu_time_ms(arg0) {
        wasm.__wbg_set_batchiksolveroptions_rot_tol(this.__wbg_ptr, arg0);
    }
    /**
     * Get total checks (states + edges)
     * @returns {number}
     */
    get totalChecks() {
        const ret = wasm.lazyprmstats_totalChecks(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get average edges per batch (already computed)
     * @returns {number}
     */
    get avgEdgesPerBatch() {
        const ret = wasm.batchcollisionresult_totalTimeMs(this.__wbg_ptr);
        return ret;
    }
}

const MotionConstraintsFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_motionconstraints_free(ptr >>> 0, 1));
/**
 * Motion constraints
 */
export class MotionConstraints {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        MotionConstraintsFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_motionconstraints_free(ptr, 0);
    }
    /**
     * @returns {Smoothness}
     */
    get smoothness() {
        const ret = wasm.motionconstraints_smoothness(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get speed_scale() {
        const ret = wasm.cableconfig_initialTwist(this.__wbg_ptr);
        return ret;
    }
    constructor() {
        const ret = wasm.motionconstraints_new();
        this.__wbg_ptr = ret >>> 0;
        MotionConstraintsFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {bigint | undefined}
     */
    get dwell_ms() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.motionconstraints_dwell_ms(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r2 = getDataViewMemory0().getBigInt64(retptr + 8 * 1, true);
            return r0 === 0 ? undefined : BigInt.asUintN(64, r2);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @returns {CollisionMode}
     */
    get collision() {
        const ret = wasm.motionconstraints_collision(this.__wbg_ptr);
        return ret;
    }
}

const MotionValidationStatsFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_motionvalidationstats_free(ptr >>> 0, 1));
/**
 * Motion validation statistics
 */
export class MotionValidationStats {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        MotionValidationStatsFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_motionvalidationstats_free(ptr, 0);
    }
    /**
     * Total number of configurations checked
     * @returns {number}
     */
    get configs_checked() {
        const ret = wasm.__wbg_get_batchcollisioncheckerconfig_samples_per_edge(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Total number of configurations checked
     * @param {number} arg0
     */
    set configs_checked(arg0) {
        wasm.__wbg_set_batchcollisioncheckerconfig_samples_per_edge(this.__wbg_ptr, arg0);
    }
    /**
     * Number of valid configurations
     * @returns {number}
     */
    get valid_configs() {
        const ret = wasm.__wbg_get_motionvalidationstats_valid_configs(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Number of valid configurations
     * @param {number} arg0
     */
    set valid_configs(arg0) {
        wasm.__wbg_set_motionvalidationstats_valid_configs(this.__wbg_ptr, arg0);
    }
    /**
     * Number of invalid configurations
     * @returns {number}
     */
    get invalid_configs() {
        const ret = wasm.__wbg_get_lazyprmconfig_num_samples(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Number of invalid configurations
     * @param {number} arg0
     */
    set invalid_configs(arg0) {
        wasm.__wbg_set_lazyprmconfig_num_samples(this.__wbg_ptr, arg0);
    }
    /**
     * Total validation time in milliseconds
     * @returns {number}
     */
    get total_time_ms() {
        const ret = wasm.__wbg_get_batchcollisioncheckerconfig_safety_margin(this.__wbg_ptr);
        return ret;
    }
    /**
     * Total validation time in milliseconds
     * @param {number} arg0
     */
    set total_time_ms(arg0) {
        wasm.__wbg_set_batchcollisioncheckerconfig_safety_margin(this.__wbg_ptr, arg0);
    }
    /**
     * Get validity ratio
     * @returns {number}
     */
    get validityRatio() {
        const ret = wasm.motionvalidationstats_validityRatio(this.__wbg_ptr);
        return ret;
    }
    constructor() {
        const ret = wasm.motionvalidationstats_new();
        this.__wbg_ptr = ret >>> 0;
        MotionValidationStatsFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}

const MultiIkResultFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_multiikresult_free(ptr >>> 0, 1));
/**
 * Multi-solution IK result
 */
export class MultiIkResult {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(MultiIkResult.prototype);
        obj.__wbg_ptr = ptr;
        MultiIkResultFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        MultiIkResultFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_multiikresult_free(ptr, 0);
    }
    /**
     * Get a specific solution by index
     * @param {number} index
     * @returns {Float64Array | undefined}
     */
    getSolution(index) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.multiikresult_getSolution(retptr, this.__wbg_ptr, index);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            let v1;
            if (r0 !== 0) {
                v1 = getArrayF64FromWasm0(r0, r1).slice();
                wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            }
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @returns {string | undefined}
     */
    get errorMessage() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.multiikresult_errorMessage(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            let v1;
            if (r0 !== 0) {
                v1 = getStringFromWasm0(r0, r1).slice();
                wasm.__wbindgen_export_3(r0, r1 * 1, 1);
            }
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Whether analytical IK was used
     * @returns {boolean}
     */
    get isAnalytical() {
        const ret = wasm.multiikresult_isAnalytical(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Number of solutions found
     * @returns {number}
     */
    get solutionCount() {
        const ret = wasm.multiikresult_solutionCount(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get all position errors
     * @returns {Float64Array}
     */
    get positionErrors() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.multiikresult_positionErrors(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get position error for a specific solution
     * @param {number} index
     * @returns {number | undefined}
     */
    getPositionError(index) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.multiikresult_getPositionError(retptr, this.__wbg_ptr, index);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r2 = getDataViewMemory0().getFloat64(retptr + 8 * 1, true);
            return r0 === 0 ? undefined : r2;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get all solutions as flat array
     * Format: [dof, n_solutions, sol1_j1, sol1_j2, ..., sol2_j1, sol2_j2, ...]
     * @returns {Float64Array}
     */
    getSolutionsFlat() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.multiikresult_getSolutionsFlat(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @returns {boolean}
     */
    get success() {
        const ret = wasm.multiikresult_success(this.__wbg_ptr);
        return ret !== 0;
    }
}

const PRMConfigFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_prmconfig_free(ptr >>> 0, 1));
/**
 * PRM configuration
 */
export class PRMConfig {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(PRMConfig.prototype);
        obj.__wbg_ptr = ptr;
        PRMConfigFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PRMConfigFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_prmconfig_free(ptr, 0);
    }
    /**
     * Number of samples for roadmap construction
     * @returns {number}
     */
    get num_samples() {
        const ret = wasm.__wbg_get_lazyprmconfig_num_samples(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Number of samples for roadmap construction
     * @param {number} arg0
     */
    set num_samples(arg0) {
        wasm.__wbg_set_lazyprmconfig_num_samples(this.__wbg_ptr, arg0);
    }
    /**
     * Number of neighbors to connect
     * @returns {number}
     */
    get k_neighbors() {
        const ret = wasm.__wbg_get_lazyprmconfig_k_neighbors(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Number of neighbors to connect
     * @param {number} arg0
     */
    set k_neighbors(arg0) {
        wasm.__wbg_set_lazyprmconfig_k_neighbors(this.__wbg_ptr, arg0);
    }
    /**
     * Maximum connection distance
     * @returns {number}
     */
    get max_connection_distance() {
        const ret = wasm.__wbg_get_batchcollisioncheckerconfig_safety_margin(this.__wbg_ptr);
        return ret;
    }
    /**
     * Maximum connection distance
     * @param {number} arg0
     */
    set max_connection_distance(arg0) {
        wasm.__wbg_set_batchcollisioncheckerconfig_safety_margin(this.__wbg_ptr, arg0);
    }
    /**
     * Step size for collision checking
     * @returns {number}
     */
    get step_size() {
        const ret = wasm.__wbg_get_batchiksolveroptions_rot_tol(this.__wbg_ptr);
        return ret;
    }
    /**
     * Step size for collision checking
     * @param {number} arg0
     */
    set step_size(arg0) {
        wasm.__wbg_set_batchiksolveroptions_rot_tol(this.__wbg_ptr, arg0);
    }
    /**
     * Set number of neighbors
     * @param {number} k_neighbors
     * @returns {PRMConfig}
     */
    withKNeighbors(k_neighbors) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.prmconfig_withKNeighbors(ptr, k_neighbors);
        return PRMConfig.__wrap(ret);
    }
    /**
     * Set number of samples
     * @param {number} num_samples
     * @returns {PRMConfig}
     */
    withNumSamples(num_samples) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.prmconfig_withNumSamples(ptr, num_samples);
        return PRMConfig.__wrap(ret);
    }
    /**
     * Set max connection distance
     * @param {number} distance
     * @returns {PRMConfig}
     */
    withMaxConnectionDistance(distance) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.prmconfig_withMaxConnectionDistance(ptr, distance);
        return PRMConfig.__wrap(ret);
    }
    constructor() {
        const ret = wasm.prmconfig_new();
        this.__wbg_ptr = ret >>> 0;
        PRMConfigFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}

const PRMPlannerFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_prmplanner_free(ptr >>> 0, 1));
/**
 * Probabilistic Roadmap (PRM) Planner for WASM
 *
 * Pre-builds a roadmap of the configuration space for fast multi-query planning.
 * Good for environments where multiple queries will be made.
 */
export class PRMPlanner {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PRMPlannerFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_prmplanner_free(ptr, 0);
    }
    /**
     * Get roadmap size
     * @returns {number}
     */
    get roadmapSize() {
        const ret = wasm.prmplanner_roadmapSize(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Build the roadmap (joint limits only)
     * @returns {number}
     */
    buildRoadmap() {
        const ret = wasm.prmplanner_buildRoadmap(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Clear the roadmap
     */
    clearRoadmap() {
        wasm.prmplanner_clearRoadmap(this.__wbg_ptr);
    }
    /**
     * Check if roadmap is built
     * @returns {boolean}
     */
    get isRoadmapBuilt() {
        const ret = wasm.prmplanner_isRoadmapBuilt(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Query with collision checking for start/goal connections
     * @param {Float64Array} start
     * @param {Float64Array} goal
     * @param {Function} collision_checker
     * @returns {PlanningResult}
     */
    queryWithCollisionCheck(start, goal, collision_checker) {
        try {
            const ptr0 = passArrayF64ToWasm0(start, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(goal, wasm.__wbindgen_export_0);
            const len1 = WASM_VECTOR_LEN;
            const ret = wasm.prmplanner_queryWithCollisionCheck(this.__wbg_ptr, ptr0, len0, ptr1, len1, addBorrowedObject(collision_checker));
            return PlanningResult.__wrap(ret);
        } finally {
            heap[stack_pointer++] = undefined;
        }
    }
    /**
     * Build the roadmap with collision checking
     * @param {Function} collision_checker
     * @returns {number}
     */
    buildRoadmapWithCollisionCheck(collision_checker) {
        try {
            const ret = wasm.prmplanner_buildRoadmapWithCollisionCheck(this.__wbg_ptr, addBorrowedObject(collision_checker));
            return ret >>> 0;
        } finally {
            heap[stack_pointer++] = undefined;
        }
    }
    /**
     * Create a new PRM planner
     * @param {JointLimits} joint_limits
     * @param {PRMConfig | null} [config]
     */
    constructor(joint_limits, config) {
        _assertClass(joint_limits, JointLimits);
        let ptr0 = 0;
        if (!isLikeNone(config)) {
            _assertClass(config, PRMConfig);
            ptr0 = config.__destroy_into_raw();
        }
        const ret = wasm.prmplanner_new(joint_limits.__wbg_ptr, ptr0);
        this.__wbg_ptr = ret >>> 0;
        PRMPlannerFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Query the roadmap for a path
     * @param {Float64Array} start
     * @param {Float64Array} goal
     * @returns {PlanningResult}
     */
    query(start, goal) {
        const ptr0 = passArrayF64ToWasm0(start, wasm.__wbindgen_export_0);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayF64ToWasm0(goal, wasm.__wbindgen_export_0);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.prmplanner_query(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        return PlanningResult.__wrap(ret);
    }
}

const PathCollisionResultFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_pathcollisionresult_free(ptr >>> 0, 1));
/**
 * Result of path collision checking
 */
export class PathCollisionResult {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(PathCollisionResult.prototype);
        obj.__wbg_ptr = ptr;
        PathCollisionResultFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PathCollisionResultFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_pathcollisionresult_free(ptr, 0);
    }
    /**
     * Get waypoint results
     * @returns {Uint8Array}
     */
    get waypointResults() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.pathcollisionresult_waypointResults(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 1, 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get number of waypoints checked
     * @returns {number}
     */
    get waypointsChecked() {
        const ret = wasm.pathcollisionresult_waypointsChecked(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get index of first collision (-1 if no collision)
     * @returns {number}
     */
    get firstCollisionIndex() {
        const ret = wasm.pathcollisionresult_firstCollisionIndex(this.__wbg_ptr);
        return ret;
    }
    /**
     * Whether path is valid (collision-free)
     * @returns {boolean}
     */
    get valid() {
        const ret = wasm.pathcollisionresult_valid(this.__wbg_ptr);
        return ret !== 0;
    }
}

const PathOptimizerFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_pathoptimizer_free(ptr >>> 0, 1));
/**
 * Path smoother for post-processing planned paths
 */
export class PathOptimizer {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PathOptimizerFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_pathoptimizer_free(ptr, 0);
    }
    /**
     * Smooth a path with collision checking
     * @param {Float64Array} path_flat
     * @param {JointLimits} joint_limits
     * @param {Function} collision_checker
     * @returns {Float64Array}
     */
    shortcutWithCollisionCheck(path_flat, joint_limits, collision_checker) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF64ToWasm0(path_flat, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            _assertClass(joint_limits, JointLimits);
            wasm.pathoptimizer_shortcutWithCollisionCheck(retptr, this.__wbg_ptr, ptr0, len0, joint_limits.__wbg_ptr, addBorrowedObject(collision_checker));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v2 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            return v2;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            heap[stack_pointer++] = undefined;
        }
    }
    /**
     * @param {number | null} [shortcut_attempts]
     */
    constructor(shortcut_attempts) {
        const ret = wasm.pathoptimizer_new(isLikeNone(shortcut_attempts) ? 0x100000001 : (shortcut_attempts) >>> 0);
        this.__wbg_ptr = ret >>> 0;
        PathOptimizerFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Smooth a path using shortcutting
     *
     * Attempts to remove unnecessary waypoints by connecting non-adjacent points.
     * @param {Float64Array} path_flat
     * @param {JointLimits} joint_limits
     * @returns {Float64Array}
     */
    shortcut(path_flat, joint_limits) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF64ToWasm0(path_flat, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            _assertClass(joint_limits, JointLimits);
            wasm.pathoptimizer_shortcut(retptr, this.__wbg_ptr, ptr0, len0, joint_limits.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v2 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            return v2;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}

const PlanningResultFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_planningresult_free(ptr >>> 0, 1));
/**
 * Planning result
 */
export class PlanningResult {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(PlanningResult.prototype);
        obj.__wbg_ptr = ptr;
        PlanningResultFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PlanningResultFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_planningresult_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    get pathLength() {
        const ret = wasm.cableconfig_maxTwistRate(this.__wbg_ptr);
        return ret;
    }
    /**
     * Get a specific waypoint
     * @param {number} index
     * @returns {Float64Array | undefined}
     */
    getWaypoint(index) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.planningresult_getWaypoint(retptr, this.__wbg_ptr, index);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            let v1;
            if (r0 !== 0) {
                v1 = getArrayF64FromWasm0(r0, r1).slice();
                wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            }
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get path as flat array for efficient transfer
     * Format: [dof, n_waypoints, j1_1, j2_1, ..., j1_2, j2_2, ...]
     * @returns {Float64Array}
     */
    getPathFlat() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.planningresult_getPathFlat(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @returns {number}
     */
    get nodesExplored() {
        const ret = wasm.gpuplanningresult_waypointCount(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get number of waypoints
     * @returns {number}
     */
    get waypointCount() {
        const ret = wasm.planningresult_waypointCount(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get planningTimeMs() {
        const ret = wasm.batchcollisionresult_totalTimeMs(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {string | undefined}
     */
    get error() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.planningresult_error(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            let v1;
            if (r0 !== 0) {
                v1 = getStringFromWasm0(r0, r1).slice();
                wasm.__wbindgen_export_3(r0, r1 * 1, 1);
            }
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @returns {boolean}
     */
    get success() {
        const ret = wasm.ikresult_success(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Get path as flat array (getter version for property access)
     * Format: [dof, n_waypoints, j1_1, j2_1, ..., j1_2, j2_2, ...]
     * @returns {Float64Array}
     */
    get pathFlat() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.planningresult_getPathFlat(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}

const PoseFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_pose_free(ptr >>> 0, 1));
/**
 * 6-DOF Pose (position + orientation)
 */
export class Pose {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(Pose.prototype);
        obj.__wbg_ptr = ptr;
        PoseFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PoseFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_pose_free(ptr, 0);
    }
    /**
     * Get as 4x4 transformation matrix (column-major)
     * @returns {Float64Array}
     */
    toMatrix4() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.pose_toMatrix4(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @returns {Quaternion}
     */
    get orientation() {
        const ret = wasm.pose_orientation(this.__wbg_ptr);
        return Quaternion.__wrap(ret);
    }
    /**
     * Get position as [x, y, z]
     * @returns {Float64Array}
     */
    getPositionArray() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.pose_getPositionArray(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Create pose from position and Euler angles
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {number} roll
     * @param {number} pitch
     * @param {number} yaw
     * @returns {Pose}
     */
    static fromPositionEuler(x, y, z, roll, pitch, yaw) {
        const ret = wasm.pose_fromPositionEuler(x, y, z, roll, pitch, yaw);
        return Pose.__wrap(ret);
    }
    /**
     * Get orientation as [qx, qy, qz, qw]
     * @returns {Float64Array}
     */
    getOrientationArray() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.pose_getOrientationArray(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {Position} position
     * @param {Quaternion} orientation
     */
    constructor(position, orientation) {
        _assertClass(position, Position);
        var ptr0 = position.__destroy_into_raw();
        _assertClass(orientation, Quaternion);
        var ptr1 = orientation.__destroy_into_raw();
        const ret = wasm.pose_new(ptr0, ptr1);
        this.__wbg_ptr = ret >>> 0;
        PoseFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Identity pose (origin, no rotation)
     * @returns {Pose}
     */
    static identity() {
        const ret = wasm.pose_identity();
        return Pose.__wrap(ret);
    }
    /**
     * @returns {Position}
     */
    get position() {
        const ret = wasm.pose_position(this.__wbg_ptr);
        return Position.__wrap(ret);
    }
}

const PositionFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_position_free(ptr >>> 0, 1));
/**
 * 3D Position (x, y, z)
 */
export class Position {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(Position.prototype);
        obj.__wbg_ptr = ptr;
        PositionFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PositionFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_position_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    get x() {
        const ret = wasm.__wbg_get_batchcollisioncheckerconfig_safety_margin(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set x(arg0) {
        wasm.__wbg_set_batchcollisioncheckerconfig_safety_margin(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get y() {
        const ret = wasm.__wbg_get_batchiksolveroptions_rot_tol(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set y(arg0) {
        wasm.__wbg_set_batchiksolveroptions_rot_tol(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get z() {
        const ret = wasm.__wbg_get_batchiksolveroptions_damping(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set z(arg0) {
        wasm.__wbg_set_batchiksolveroptions_damping(this.__wbg_ptr, arg0);
    }
    /**
     * Create from array [x, y, z]
     * @param {Float64Array} arr
     * @returns {Position}
     */
    static fromArray(arr) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF64ToWasm0(arr, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            wasm.position_fromArray(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return Position.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    constructor(x, y, z) {
        const ret = wasm.position_new(x, y, z);
        this.__wbg_ptr = ret >>> 0;
        PositionFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Convert to array [x, y, z]
     * @returns {Float64Array}
     */
    toArray() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.position_toArray(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}

const QuaternionFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_quaternion_free(ptr >>> 0, 1));
/**
 * Quaternion orientation (x, y, z, w)
 */
export class Quaternion {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(Quaternion.prototype);
        obj.__wbg_ptr = ptr;
        QuaternionFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        QuaternionFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_quaternion_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    get x() {
        const ret = wasm.__wbg_get_batchcollisioncheckerconfig_safety_margin(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set x(arg0) {
        wasm.__wbg_set_batchcollisioncheckerconfig_safety_margin(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get y() {
        const ret = wasm.__wbg_get_batchiksolveroptions_rot_tol(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set y(arg0) {
        wasm.__wbg_set_batchiksolveroptions_rot_tol(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get z() {
        const ret = wasm.__wbg_get_batchiksolveroptions_damping(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set z(arg0) {
        wasm.__wbg_set_batchiksolveroptions_damping(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get w() {
        const ret = wasm.__wbg_get_batchiksolveroptions_max_step(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set w(arg0) {
        wasm.__wbg_set_batchiksolveroptions_max_step(this.__wbg_ptr, arg0);
    }
    /**
     * Create from Euler angles (roll, pitch, yaw) in radians
     * @param {number} roll
     * @param {number} pitch
     * @param {number} yaw
     * @returns {Quaternion}
     */
    static fromEuler(roll, pitch, yaw) {
        const ret = wasm.quaternion_fromEuler(roll, pitch, yaw);
        return Quaternion.__wrap(ret);
    }
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {number} w
     */
    constructor(x, y, z, w) {
        const ret = wasm.dhparam_new(x, y, z, w);
        this.__wbg_ptr = ret >>> 0;
        QuaternionFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Identity quaternion (no rotation)
     * @returns {Quaternion}
     */
    static identity() {
        const ret = wasm.quaternion_identity();
        return Quaternion.__wrap(ret);
    }
    /**
     * Convert to array [x, y, z, w]
     * @returns {Float64Array}
     */
    toArray() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.quaternion_toArray(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Convert to Euler angles [roll, pitch, yaw] in radians
     * @returns {Float64Array}
     */
    toEuler() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.quaternion_toEuler(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}

const RRTStarConfigFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_rrtstarconfig_free(ptr >>> 0, 1));
/**
 * RRT* configuration
 */
export class RRTStarConfig {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(RRTStarConfig.prototype);
        obj.__wbg_ptr = ptr;
        RRTStarConfigFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        RRTStarConfigFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_rrtstarconfig_free(ptr, 0);
    }
    /**
     * Maximum iterations
     * @returns {number}
     */
    get max_iterations() {
        const ret = wasm.__wbg_get_rrtstarconfig_max_iterations(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Maximum iterations
     * @param {number} arg0
     */
    set max_iterations(arg0) {
        wasm.__wbg_set_rrtstarconfig_max_iterations(this.__wbg_ptr, arg0);
    }
    /**
     * Goal bias probability (0.0 - 1.0)
     * @returns {number}
     */
    get goal_bias() {
        const ret = wasm.__wbg_get_batchcollisioncheckerconfig_safety_margin(this.__wbg_ptr);
        return ret;
    }
    /**
     * Goal bias probability (0.0 - 1.0)
     * @param {number} arg0
     */
    set goal_bias(arg0) {
        wasm.__wbg_set_batchcollisioncheckerconfig_safety_margin(this.__wbg_ptr, arg0);
    }
    /**
     * Maximum extension distance per step
     * @returns {number}
     */
    get max_extension() {
        const ret = wasm.__wbg_get_batchiksolveroptions_rot_tol(this.__wbg_ptr);
        return ret;
    }
    /**
     * Maximum extension distance per step
     * @param {number} arg0
     */
    set max_extension(arg0) {
        wasm.__wbg_set_batchiksolveroptions_rot_tol(this.__wbg_ptr, arg0);
    }
    /**
     * Goal radius for determining when goal is reached
     * @returns {number}
     */
    get goal_radius() {
        const ret = wasm.__wbg_get_batchiksolveroptions_damping(this.__wbg_ptr);
        return ret;
    }
    /**
     * Goal radius for determining when goal is reached
     * @param {number} arg0
     */
    set goal_radius(arg0) {
        wasm.__wbg_set_batchiksolveroptions_damping(this.__wbg_ptr, arg0);
    }
    /**
     * Step size for collision checking
     * @returns {number}
     */
    get step_size() {
        const ret = wasm.__wbg_get_batchiksolveroptions_max_step(this.__wbg_ptr);
        return ret;
    }
    /**
     * Step size for collision checking
     * @param {number} arg0
     */
    set step_size(arg0) {
        wasm.__wbg_set_batchiksolveroptions_max_step(this.__wbg_ptr, arg0);
    }
    /**
     * Rewire radius multiplier (gamma)
     * @returns {number}
     */
    get rewire_factor() {
        const ret = wasm.__wbg_get_distancequeryresult_point2_x(this.__wbg_ptr);
        return ret;
    }
    /**
     * Rewire radius multiplier (gamma)
     * @param {number} arg0
     */
    set rewire_factor(arg0) {
        wasm.__wbg_set_distancequeryresult_point2_x(this.__wbg_ptr, arg0);
    }
    /**
     * Set goal bias
     * @param {number} goal_bias
     * @returns {RRTStarConfig}
     */
    withGoalBias(goal_bias) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.rrtstarconfig_withGoalBias(ptr, goal_bias);
        return RRTStarConfig.__wrap(ret);
    }
    /**
     * Set goal radius
     * @param {number} goal_radius
     * @returns {RRTStarConfig}
     */
    withGoalRadius(goal_radius) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.rrtstarconfig_withGoalRadius(ptr, goal_radius);
        return RRTStarConfig.__wrap(ret);
    }
    /**
     * Set max extension
     * @param {number} max_extension
     * @returns {RRTStarConfig}
     */
    withMaxExtension(max_extension) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.rrtstarconfig_withMaxExtension(ptr, max_extension);
        return RRTStarConfig.__wrap(ret);
    }
    /**
     * Set rewire factor
     * @param {number} rewire_factor
     * @returns {RRTStarConfig}
     */
    withRewireFactor(rewire_factor) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.rrtstarconfig_withRewireFactor(ptr, rewire_factor);
        return RRTStarConfig.__wrap(ret);
    }
    /**
     * Set max iterations
     * @param {number} max_iterations
     * @returns {RRTStarConfig}
     */
    withMaxIterations(max_iterations) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.rrtstarconfig_withMaxIterations(ptr, max_iterations);
        return RRTStarConfig.__wrap(ret);
    }
    constructor() {
        const ret = wasm.rrtstarconfig_new();
        this.__wbg_ptr = ret >>> 0;
        RRTStarConfigFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}

const RRTStarPlannerFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_rrtstarplanner_free(ptr >>> 0, 1));
/**
 * RRT* Planner for WASM
 *
 * Optimal path planner that iteratively improves path cost.
 * Provides asymptotically optimal paths but is slower than BiRRT.
 *
 * This is a thin wrapper around `trajx_planning::planners::core::RRTStarCore`.
 */
export class RRTStarPlanner {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        RRTStarPlannerFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_rrtstarplanner_free(ptr, 0);
    }
    /**
     * Plan with collision checking callback
     * @param {Float64Array} start
     * @param {Float64Array} goal
     * @param {Function} collision_checker
     * @returns {PlanningResult}
     */
    planWithCollisionCheck(start, goal, collision_checker) {
        try {
            const ptr0 = passArrayF64ToWasm0(start, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(goal, wasm.__wbindgen_export_0);
            const len1 = WASM_VECTOR_LEN;
            const ret = wasm.rrtstarplanner_planWithCollisionCheck(this.__wbg_ptr, ptr0, len0, ptr1, len1, addBorrowedObject(collision_checker));
            return PlanningResult.__wrap(ret);
        } finally {
            heap[stack_pointer++] = undefined;
        }
    }
    /**
     * Create a new RRT* planner
     * @param {JointLimits} joint_limits
     * @param {RRTStarConfig | null} [config]
     */
    constructor(joint_limits, config) {
        _assertClass(joint_limits, JointLimits);
        let ptr0 = 0;
        if (!isLikeNone(config)) {
            _assertClass(config, RRTStarConfig);
            ptr0 = config.__destroy_into_raw();
        }
        const ret = wasm.rrtstarplanner_new(joint_limits.__wbg_ptr, ptr0);
        this.__wbg_ptr = ret >>> 0;
        RRTStarPlannerFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Plan a path from start to goal (joint limits only)
     * @param {Float64Array} start
     * @param {Float64Array} goal
     * @returns {PlanningResult}
     */
    plan(start, goal) {
        const ptr0 = passArrayF64ToWasm0(start, wasm.__wbindgen_export_0);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayF64ToWasm0(goal, wasm.__wbindgen_export_0);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.rrtstarplanner_plan(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        return PlanningResult.__wrap(ret);
    }
}

const RobotFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_robot_free(ptr >>> 0, 1));
/**
 * Robot wrapper using trajx_core::Robot
 *
 * This is the primary robot class providing full functionality:
 * - URDF parsing from string
 * - Forward and inverse kinematics
 * - Analytical IK for 6-DOF spherical wrist robots (auto-matched from DH database)
 * - All IK solutions (inverseKinematicsAll)
 * - Workspace analysis (manipulability, singularity detection)
 * - Link transforms for visualization
 * - Jacobian computation
 *
 * DH parameters are automatically loaded from database if the URDF robot name
 * matches a known robot. Use `loadDhParamsFromDatabase()` to manually specify
 * which database entry to use.
 */
export class Robot {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(Robot.prototype);
        obj.__wbg_ptr = ptr;
        RobotFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        RobotFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_robot_free(ptr, 0);
    }
    /**
     * Get link names
     * @returns {string[]}
     */
    linkNames() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.robot_linkNames(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayJsValueFromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 4, 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * List all tool names in the library
     * @returns {any[]}
     */
    listTools() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.robot_listTools(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayJsValueFromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 4, 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Attach a tool with the given offset
     * @param {Pose} tool_pose
     */
    attachTool(tool_pose) {
        _assertClass(tool_pose, Pose);
        wasm.robot_attachTool(this.__wbg_ptr, tool_pose.__wbg_ptr);
    }
    /**
     * Detach the current tool
     */
    detachTool() {
        wasm.robot_detachTool(this.__wbg_ptr);
    }
    /**
     * Create a robot from a URDF string
     *
     * # Arguments
     * * `urdf_content` - The URDF XML content as a string
     *
     * # Example
     * ```js
     * const urdf = `<?xml version="1.0"?>
     * <robot name="my_robot">
     *   <link name="base_link"/>
     *   <link name="link1"/>
     *   <joint name="joint1" type="revolute">
     *     <parent link="base_link"/>
     *     <child link="link1"/>
     *     <origin xyz="0 0 1" rpy="0 0 0"/>
     *     <axis xyz="0 0 1"/>
     *     <limit lower="-3.14" upper="3.14" velocity="1.0" effort="100"/>
     *   </joint>
     * </robot>`;
     * const robot = Robot.fromString(urdf);
     * ```
     * @param {string} urdf_content
     * @returns {Robot}
     */
    static fromString(urdf_content) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(urdf_content, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            const len0 = WASM_VECTOR_LEN;
            wasm.createRobot(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return Robot.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get joint names
     * @returns {string[]}
     */
    jointNames() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.robot_jointNames(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayJsValueFromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 4, 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Check if a target pose is reachable
     *
     * Attempts IK and returns whether a solution exists within joint limits.
     * @param {Pose} target_pose
     * @returns {boolean}
     */
    isReachable(target_pose) {
        _assertClass(target_pose, Pose);
        const ret = wasm.robot_isReachable(this.__wbg_ptr, target_pose.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Activate a tool from the library
     *
     * # Arguments
     * * `tool_name` - Name of the tool to activate
     * * `tcp_name` - Optional TCP name to activate (null for tool's default TCP)
     * @param {string} tool_name
     * @param {string | null} [tcp_name]
     */
    activateTool(tool_name, tcp_name) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(tool_name, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            const len0 = WASM_VECTOR_LEN;
            var ptr1 = isLikeNone(tcp_name) ? 0 : passStringToWasm0(tcp_name, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            var len1 = WASM_VECTOR_LEN;
            wasm.robot_activateTool(retptr, this.__wbg_ptr, ptr0, len0, ptr1, len1);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Check if DH parameters are loaded (from database match)
     *
     * Returns true if the robot has DH parameters from the database,
     * which enables analytical IK and DH-based FK.
     * @returns {boolean}
     */
    hasDhParams() {
        const ret = wasm.robot_hasDhParams(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Manually set DH parameters for this robot
     *
     * Use this when the URDF name doesn't match the DH database entry.
     * After calling this, analytical IK will be enabled for 6-DOF robots.
     *
     * # Arguments
     * * `dh_params` - Array of DH parameters (7 rows for 6-DOF: base + 6 joints)
     * @param {DhParam[]} dh_params
     */
    setDhParams(dh_params) {
        const ptr0 = passArrayJsValueToWasm0(dh_params, wasm.__wbindgen_export_0);
        const len0 = WASM_VECTOR_LEN;
        wasm.robot_setDhParams(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * Set the active TCP on the currently active tool
     * @param {string} tcp_name
     */
    setActiveTcp(tcp_name) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(tcp_name, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            const len0 = WASM_VECTOR_LEN;
            wasm.robot_setActiveTcp(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Check if robot is using DH-based FK (vs URDF-based)
     *
     * When true, forward kinematics uses DH parameters for consistency
     * with analytical IK. When false, uses URDF geometry (better for visualization).
     * @returns {boolean}
     */
    usesDhForFk() {
        const ret = wasm.robot_usesDhForFk(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Add a TCP point to an existing tool
     *
     * # Arguments
     * * `tool_name` - Name of the tool to add TCP to
     * * `tcp_name` - Name of the TCP point (e.g., "camera", "welder")
     * * `offset` - Transform from tool base to TCP
     * @param {string} tool_name
     * @param {string} tcp_name
     * @param {Pose} offset
     */
    addTcpToTool(tool_name, tcp_name, offset) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(tool_name, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passStringToWasm0(tcp_name, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            const len1 = WASM_VECTOR_LEN;
            _assertClass(offset, Pose);
            wasm.robot_addTcpToTool(retptr, this.__wbg_ptr, ptr0, len0, ptr1, len1, offset.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Deactivate the current tool
     */
    deactivateTool() {
        wasm.robot_deactivateTool(this.__wbg_ptr);
    }
    /**
     * Get the current tool offset (flange to TCP transform)
     *
     * Returns the currently active tool offset, or null if no tool is attached.
     * @returns {Pose | undefined}
     */
    getToolOffset() {
        const ret = wasm.robot_getToolOffset(this.__wbg_ptr);
        return ret === 0 ? undefined : Pose.__wrap(ret);
    }
    /**
     * Check if joint configuration is within limits
     * @param {Float64Array} joints
     * @returns {boolean}
     */
    isValidConfig(joints) {
        const ptr0 = passArrayF64ToWasm0(joints, wasm.__wbindgen_export_0);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.robot_isValidConfig(this.__wbg_ptr, ptr0, len0);
        return ret !== 0;
    }
    /**
     * Get joint limits as [lower..., upper...]
     * @returns {JointLimits}
     */
    getJointLimits() {
        const ret = wasm.robot_getJointLimits(this.__wbg_ptr);
        return JointLimits.__wrap(ret);
    }
    /**
     * Get the default standoff (working distance) for a TCP
     * @param {string} tool_name
     * @param {string} tcp_name
     * @returns {number}
     */
    getTcpStandoff(tool_name, tcp_name) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(tool_name, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passStringToWasm0(tcp_name, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            const len1 = WASM_VECTOR_LEN;
            wasm.robot_getTcpStandoff(retptr, this.__wbg_ptr, ptr0, len0, ptr1, len1);
            var r0 = getDataViewMemory0().getFloat64(retptr + 8 * 0, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
            if (r3) {
                throw takeObject(r2);
            }
            return r0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Analyze workspace properties at the given joint configuration
     *
     * Returns manipulability, singularity status, and joint limit margins.
     * @param {Float64Array} joint_angles
     * @returns {WorkspaceAnalysis}
     */
    analyzeWorkspace(joint_angles) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF64ToWasm0(joint_angles, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            wasm.robot_analyzeWorkspace(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return WorkspaceAnalysis.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Compute forward kinematics (end-effector pose)
     * @param {Float64Array} joint_angles
     * @returns {Pose}
     */
    forwardKinematics(joint_angles) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF64ToWasm0(joint_angles, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            wasm.robot_forwardKinematics(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return Pose.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Compute inverse kinematics
     *
     * Uses analytical IK when available (6-DOF spherical wrist robots),
     * otherwise falls back to numerical IK (Damped Least Squares).
     * @param {Pose} target_pose
     * @param {Float64Array | null} [seed]
     * @returns {IkResult}
     */
    inverseKinematics(target_pose, seed) {
        _assertClass(target_pose, Pose);
        var ptr0 = isLikeNone(seed) ? 0 : passArrayF64ToWasm0(seed, wasm.__wbindgen_export_0);
        var len0 = WASM_VECTOR_LEN;
        const ret = wasm.robot_inverseKinematics(this.__wbg_ptr, target_pose.__wbg_ptr, ptr0, len0);
        return IkResult.__wrap(ret);
    }
    /**
     * Get the active TCP name on the currently active tool
     * @returns {string | undefined}
     */
    getActiveTcpName() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.robot_getActiveTcpName(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            let v1;
            if (r0 !== 0) {
                v1 = getStringFromWasm0(r0, r1).slice();
                wasm.__wbindgen_export_3(r0, r1 * 1, 1);
            }
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get current joint positions
     * @returns {Float64Array}
     */
    getJointPositions() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.robot_getJointPositions(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get link transforms as a map (for visualization with link names)
     *
     * Returns an object mapping link names to their poses.
     * This is more convenient than forwardKinematicsChain when you need to
     * match transforms to specific link meshes.
     * @param {Float64Array} joint_angles
     * @returns {any}
     */
    getLinkTransforms(joint_angles) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF64ToWasm0(joint_angles, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            wasm.robot_getLinkTransforms(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get velocity limits (if available)
     * @returns {Float64Array | undefined}
     */
    getVelocityLimits() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.robot_getVelocityLimits(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            let v1;
            if (r0 !== 0) {
                v1 = getArrayF64FromWasm0(r0, r1).slice();
                wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            }
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Check if the robot is near a singularity at the given configuration
     *
     * Uses condition number of the Jacobian matrix for robust singularity detection.
     * The default threshold of 1000.0 is appropriate for industrial applications
     * where only configurations within ~1cm of singularity should trigger warnings.
     *
     * # Arguments
     * * `joint_angles` - Current joint configuration
     * * `threshold` - Optional condition number threshold (default: 1000.0)
     *
     * Returns true if condition number exceeds threshold.
     * @param {Float64Array} joint_angles
     * @param {number | null} [threshold]
     * @returns {boolean}
     */
    isNearSingularity(joint_angles, threshold) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF64ToWasm0(joint_angles, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            wasm.robot_isNearSingularity(retptr, this.__wbg_ptr, ptr0, len0, !isLikeNone(threshold), isLikeNone(threshold) ? 0 : threshold);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return r0 !== 0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Set current joint positions
     * @param {Float64Array} positions
     */
    setJointPositions(positions) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF64ToWasm0(positions, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            wasm.robot_setJointPositions(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get the name of the currently active tool
     * @returns {string | undefined}
     */
    getActiveToolName() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.robot_getActiveToolName(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            let v1;
            if (r0 !== 0) {
                v1 = getStringFromWasm0(r0, r1).slice();
                wasm.__wbindgen_export_3(r0, r1 * 1, 1);
            }
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Add a TCP with standoff (working distance) configuration
     *
     * # Arguments
     * * `tool_name` - Name of the tool
     * * `tcp_name` - Name of the TCP point
     * * `offset` - Transform from tool base to TCP
     * * `standoff` - Default working distance in meters
     * @param {string} tool_name
     * @param {string} tcp_name
     * @param {Pose} offset
     * @param {number} standoff
     */
    addTcpWithStandoff(tool_name, tcp_name, offset, standoff) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(tool_name, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passStringToWasm0(tcp_name, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            const len1 = WASM_VECTOR_LEN;
            _assertClass(offset, Pose);
            wasm.robot_addTcpWithStandoff(retptr, this.__wbg_ptr, ptr0, len0, ptr1, len1, offset.__wbg_ptr, standoff);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Compute manipulability at the given configuration
     *
     * Returns sqrt(det(J * J^T)), which is zero at singularities.
     * @param {Float64Array} joint_angles
     * @returns {number}
     */
    computeManipulability(joint_angles) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF64ToWasm0(joint_angles, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            wasm.robot_computeManipulability(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getFloat64(retptr + 8 * 0, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
            if (r3) {
                throw takeObject(r2);
            }
            return r0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Compute forward kinematics including tool offset (TCP pose)
     *
     * This method returns the pose of the Tool Center Point (TCP) if a tool is attached,
     * otherwise returns the end-effector pose.
     * @param {Float64Array} joint_angles
     * @returns {Pose}
     */
    forwardKinematicsTcp(joint_angles) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF64ToWasm0(joint_angles, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            wasm.robot_forwardKinematicsTcp(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return Pose.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Compute inverse kinematics and return ALL solutions
     *
     * For 6-DOF spherical wrist robots, returns all analytical solutions (up to 8).
     * For other robots, returns a single numerical solution.
     *
     * Solutions are verified with forward kinematics and sorted by distance to seed.
     * @param {Pose} target_pose
     * @param {Float64Array | null} [seed]
     * @returns {MultiIkResult}
     */
    inverseKinematicsAll(target_pose, seed) {
        _assertClass(target_pose, Pose);
        var ptr0 = isLikeNone(seed) ? 0 : passArrayF64ToWasm0(seed, wasm.__wbindgen_export_0);
        var len0 = WASM_VECTOR_LEN;
        const ret = wasm.robot_inverseKinematicsAll(this.__wbg_ptr, target_pose.__wbg_ptr, ptr0, len0);
        return MultiIkResult.__wrap(ret);
    }
    /**
     * Compute inverse kinematics for TCP (Tool Center Point) position
     *
     * This method automatically accounts for the attached tool offset.
     * If a tool is attached via `attachTool()`, this will solve for the
     * joint angles that place the TCP at the target pose, not the flange.
     *
     * If no tool is attached, this behaves identically to `inverseKinematics()`.
     *
     * # Arguments
     * * `target_pose` - Target TCP pose in world frame
     * * `seed` - Optional seed joint angles for numerical solver
     *
     * # Returns
     * IkResult with joint angles that achieve the target TCP pose
     * @param {Pose} target_pose
     * @param {Float64Array | null} [seed]
     * @returns {IkResult}
     */
    inverseKinematicsTcp(target_pose, seed) {
        _assertClass(target_pose, Pose);
        var ptr0 = isLikeNone(seed) ? 0 : passArrayF64ToWasm0(seed, wasm.__wbindgen_export_0);
        var len0 = WASM_VECTOR_LEN;
        const ret = wasm.robot_inverseKinematicsTcp(this.__wbg_ptr, target_pose.__wbg_ptr, ptr0, len0);
        return IkResult.__wrap(ret);
    }
    /**
     * Check if robot supports analytical IK
     *
     * Analytical IK is supported for 6-DOF robots with spherical wrist
     * configurations (e.g., Fanuc, UR, ABB, KUKA, Yaskawa, Staubli).
     * @returns {boolean}
     */
    supportsAnalyticalIk() {
        const ret = wasm.robot_supportsAnalyticalIk(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Compute the Jacobian matrix at the given configuration
     * @param {Float64Array} joint_angles
     * @returns {Float64Array}
     */
    computeJacobian(joint_angles) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF64ToWasm0(joint_angles, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            wasm.robot_computeJacobian(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
            if (r3) {
                throw takeObject(r2);
            }
            var v2 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            return v2;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get acceleration limits (if available)
     * @returns {Float64Array | undefined}
     */
    getAccelerationLimits() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.robot_getAccelerationLimits(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            let v1;
            if (r0 !== 0) {
                v1 = getArrayF64FromWasm0(r0, r1).slice();
                wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            }
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Compute forward kinematics for all links (for visualization)
     *
     * Returns poses for all links in order of link_names.
     * @param {Float64Array} joint_angles
     * @returns {Pose[]}
     */
    forwardKinematicsChain(joint_angles) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF64ToWasm0(joint_angles, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            wasm.robot_forwardKinematicsChain(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
            if (r3) {
                throw takeObject(r2);
            }
            var v2 = getArrayJsValueFromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 4, 4);
            return v2;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Forward kinematics to a specific named TCP
     *
     * Computes FK using a specific tool/TCP combination without changing
     * the active tool selection.
     * @param {Float64Array} joint_angles
     * @param {string} tool_name
     * @param {string | null} [tcp_name]
     * @returns {Pose}
     */
    forwardKinematicsNamedTcp(joint_angles, tool_name, tcp_name) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF64ToWasm0(joint_angles, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passStringToWasm0(tool_name, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            const len1 = WASM_VECTOR_LEN;
            var ptr2 = isLikeNone(tcp_name) ? 0 : passStringToWasm0(tcp_name, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            var len2 = WASM_VECTOR_LEN;
            wasm.robot_forwardKinematicsNamedTcp(retptr, this.__wbg_ptr, ptr0, len0, ptr1, len1, ptr2, len2);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return Pose.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Inverse kinematics to reach a target with a specific named TCP
     *
     * Solves IK for a specific tool/TCP combination without changing
     * the active tool selection.
     * @param {Pose} target_pose
     * @param {string} tool_name
     * @param {string | null} [tcp_name]
     * @param {Float64Array | null} [seed]
     * @returns {IkResult}
     */
    inverseKinematicsNamedTcp(target_pose, tool_name, tcp_name, seed) {
        _assertClass(target_pose, Pose);
        const ptr0 = passStringToWasm0(tool_name, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(tcp_name) ? 0 : passStringToWasm0(tcp_name, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        var len1 = WASM_VECTOR_LEN;
        var ptr2 = isLikeNone(seed) ? 0 : passArrayF64ToWasm0(seed, wasm.__wbindgen_export_0);
        var len2 = WASM_VECTOR_LEN;
        const ret = wasm.robot_inverseKinematicsNamedTcp(this.__wbg_ptr, target_pose.__wbg_ptr, ptr0, len0, ptr1, len1, ptr2, len2);
        return IkResult.__wrap(ret);
    }
    /**
     * Load DH parameters from database by robot name
     *
     * Use this when the URDF robot name doesn't match the database entry name.
     * For example, if your URDF has name="my_fanuc" but database has "fanuc_m20ia".
     *
     * # Arguments
     * * `db_robot_name` - Name of the robot in the DH database
     *
     * # Returns
     * true if parameters were loaded successfully
     * @param {string} db_robot_name
     * @returns {boolean}
     */
    loadDhParamsFromDatabase(db_robot_name) {
        const ptr0 = passStringToWasm0(db_robot_name, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.robot_loadDhParamsFromDatabase(this.__wbg_ptr, ptr0, len0);
        return ret !== 0;
    }
    /**
     * Get degrees of freedom
     * @returns {number}
     */
    get dof() {
        const ret = wasm.robot_dof(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get robot name
     * @returns {string}
     */
    get name() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.robot_name(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_export_3(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Add a named tool to the tool library
     *
     * The tool can have multiple TCPs. After adding, activate it with `activateTool()`.
     *
     * # Arguments
     * * `name` - Tool name (e.g., "welding_torch", "camera_gripper")
     * * `flange_offset` - Transform from flange to tool base frame
     * @param {string} name
     * @param {Pose} flange_offset
     */
    addTool(name, flange_offset) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len0 = WASM_VECTOR_LEN;
        _assertClass(flange_offset, Pose);
        wasm.robot_addTool(this.__wbg_ptr, ptr0, len0, flange_offset.__wbg_ptr);
    }
    /**
     * Check if tool is attached
     * @returns {boolean}
     */
    hasTool() {
        const ret = wasm.robot_hasTool(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * List all TCP names for a specific tool
     * @param {string} tool_name
     * @returns {any[]}
     */
    listTcps(tool_name) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(tool_name, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            const len0 = WASM_VECTOR_LEN;
            wasm.robot_listTcps(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
            if (r3) {
                throw takeObject(r2);
            }
            var v2 = getArrayJsValueFromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 4, 4);
            return v2;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}

const RobotContextFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_robotcontext_free(ptr >>> 0, 1));
/**
 * Unified Robot Context for URDF loading and collision checking
 *
 * Provides a convenient API for:
 * - Loading URDF with automatic collision model creation
 * - GPU-friendly capsule approximation
 * - Quick collision checking
 * - Batch edge validation for planning
 */
export class RobotContext {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(RobotContext.prototype);
        obj.__wbg_ptr = ptr;
        RobotContextFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        RobotContextFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_robotcontext_free(ptr, 0);
    }
    /**
     * Create a LazyPRM planner configured for this robot
     *
     * ```typescript
     * const planner = ctx.createPlanner();
     * planner.buildRoadmap();
     * const result = planner.query(start, goal, (edges) => ctx.checkEdgesBatch(edges, env));
     * ```
     * @returns {LazyPrmPlanner}
     */
    createPlanner() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.robotcontext_createPlanner(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return LazyPrmPlanner.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Batch check multiple edges for collision
     *
     * This is the main API for GPU-friendly batch collision checking.
     * Returns an array of booleans, one per edge (true = collision-free).
     *
     * ```typescript
     * const edges = [
     *     [[0,0,0,0,0,0], [1,0,0,0,0,0]],
     *     [[1,0,0,0,0,0], [1,1,0,0,0,0]],
     * ];
     * const results = ctx.checkEdgesBatch(edges, env);
     * // results = [true, false]  // first edge free, second in collision
     * ```
     * @param {Array<any>} edges
     * @param {CollisionEnvironment} env
     * @param {number | null} [samples]
     * @returns {Array<any>}
     */
    checkEdgesBatch(edges, env, samples) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(env, CollisionEnvironment);
            wasm.robotcontext_checkEdgesBatch(retptr, this.__wbg_ptr, addHeapObject(edges), env.__wbg_ptr, isLikeNone(samples) ? 0x100000001 : (samples) >>> 0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Check if collision model is GPU-compatible (only uses capsules/spheres)
     * @returns {boolean}
     */
    isGpuCompatible() {
        const ret = wasm.robotcontext_isGpuCompatible(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Forward kinematics
     * @param {Float64Array} joints
     * @returns {Pose}
     */
    forwardKinematics(joints) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF64ToWasm0(joints, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            wasm.robotcontext_forwardKinematics(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return Pose.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get link transforms for visualization
     * @param {Float64Array} joints
     * @returns {any}
     */
    getLinkTransforms(joints) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF64ToWasm0(joints, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            wasm.robotcontext_getLinkTransforms(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Create RobotContext from URDF with custom config
     *
     * ```typescript
     * const config = RobotContextConfig.fast();
     * const ctx = RobotContext.fromUrdfWithConfig(urdfContent, config);
     * ```
     * @param {string} urdf_content
     * @param {RobotContextConfig} config
     * @returns {RobotContext}
     */
    static fromUrdfWithConfig(urdf_content, config) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(urdf_content, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            const len0 = WASM_VECTOR_LEN;
            _assertClass(config, RobotContextConfig);
            wasm.createRobotContextWithConfig(retptr, ptr0, len0, config.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return RobotContext.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get joint limits as flat array [min1, max1, min2, max2, ...]
     * @returns {Float64Array}
     */
    getJointLimitsFlat() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.robotcontext_getJointLimitsFlat(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Check if a single edge is collision-free
     *
     * Samples the edge and checks each sample for collision.
     * @param {Float64Array} start
     * @param {Float64Array} end
     * @param {CollisionEnvironment} env
     * @param {number | null} [samples]
     * @returns {boolean}
     */
    isEdgeCollisionFree(start, end, env, samples) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF64ToWasm0(start, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(end, wasm.__wbindgen_export_0);
            const len1 = WASM_VECTOR_LEN;
            _assertClass(env, CollisionEnvironment);
            wasm.robotcontext_isEdgeCollisionFree(retptr, this.__wbg_ptr, ptr0, len0, ptr1, len1, env.__wbg_ptr, isLikeNone(samples) ? 0x100000001 : (samples) >>> 0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return r0 !== 0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Check if a single configuration is collision-free
     *
     * Returns true if the configuration has no self-collision and no environment collision.
     * @param {Float64Array} joints
     * @param {CollisionEnvironment} env
     * @returns {boolean}
     */
    isConfigCollisionFree(joints, env) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF64ToWasm0(joints, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            _assertClass(env, CollisionEnvironment);
            wasm.robotcontext_isConfigCollisionFree(retptr, this.__wbg_ptr, ptr0, len0, env.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return r0 !== 0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get robot DOF
     * @returns {number}
     */
    get dof() {
        const ret = wasm.robot_dof(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get robot name
     * @returns {string}
     */
    get name() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.robotcontext_name(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_export_3(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Get creation statistics
     * @returns {RobotContextStats}
     */
    get stats() {
        const ret = wasm.robotcontext_stats(this.__wbg_ptr);
        return RobotContextStats.__wrap(ret);
    }
    /**
     * Get summary of the robot context
     * @returns {string}
     */
    summary() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.robotcontext_summary(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_export_3(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Create RobotContext from URDF with default GPU-optimized config
     *
     * This is the simplest way to load a robot:
     * ```typescript
     * const ctx = RobotContext.fromUrdf(urdfContent);
     * ```
     * @param {string} urdf_content
     * @returns {RobotContext}
     */
    static fromUrdf(urdf_content) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(urdf_content, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            const len0 = WASM_VECTOR_LEN;
            wasm.createRobotContext(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return RobotContext.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}

const RobotContextConfigFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_robotcontextconfig_free(ptr >>> 0, 1));
/**
 * Configuration for RobotContext
 */
export class RobotContextConfig {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(RobotContextConfig.prototype);
        obj.__wbg_ptr = ptr;
        RobotContextConfigFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        RobotContextConfigFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_robotcontextconfig_free(ptr, 0);
    }
    /**
     * GPU-optimized preset with capsule approximation
     * @returns {RobotContextConfig}
     */
    static gpuOptimized() {
        const ret = wasm.integratedgpuplannerconfig_balanced();
        return RobotContextConfig.__wrap(ret);
    }
    /**
     * @returns {number}
     */
    get safetyMargin() {
        const ret = wasm.batchcollisionresult_totalTimeMs(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get roadmapSamples() {
        const ret = wasm.collisionenvironment_numObstacles(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get samplesPerEdge() {
        const ret = wasm.integratedgpuplannerconfig_samplesPerEdge(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Set safety margin in meters
     * @param {number} margin
     * @returns {RobotContextConfig}
     */
    withSafetyMargin(margin) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.prmconfig_withMaxConnectionDistance(ptr, margin);
        return RobotContextConfig.__wrap(ret);
    }
    /**
     * Set whether to check self-collision
     * @param {boolean} check
     * @returns {RobotContextConfig}
     */
    withSelfCollision(check) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.robotcontextconfig_withSelfCollision(ptr, check);
        return RobotContextConfig.__wrap(ret);
    }
    /**
     * @returns {boolean}
     */
    get checkSelfCollision() {
        const ret = wasm.integratedgpuplannerconfig_preferGpu(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Set roadmap samples for planning
     * @param {number} samples
     * @returns {RobotContextConfig}
     */
    withRoadmapSamples(samples) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.robotcontextconfig_withRoadmapSamples(ptr, samples);
        return RobotContextConfig.__wrap(ret);
    }
    /**
     * Set samples per edge for collision checking
     * @param {number} samples
     * @returns {RobotContextConfig}
     */
    withSamplesPerEdge(samples) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.robotcontextconfig_withSamplesPerEdge(ptr, samples);
        return RobotContextConfig.__wrap(ret);
    }
    constructor() {
        const ret = wasm.integratedgpuplannerconfig_balanced();
        this.__wbg_ptr = ret >>> 0;
        RobotContextConfigFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Fast preset for quick planning
     * @returns {RobotContextConfig}
     */
    static fast() {
        const ret = wasm.integratedgpuplannerconfig_fast();
        return RobotContextConfig.__wrap(ret);
    }
    /**
     * High-quality preset for thorough collision checking
     * @returns {RobotContextConfig}
     */
    static quality() {
        const ret = wasm.integratedgpuplannerconfig_quality();
        return RobotContextConfig.__wrap(ret);
    }
    /**
     * CPU-only preset (no capsule approximation)
     * @returns {RobotContextConfig}
     */
    static cpuOnly() {
        const ret = wasm.robotcontextconfig_cpuOnly();
        return RobotContextConfig.__wrap(ret);
    }
}

const RobotContextStatsFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_robotcontextstats_free(ptr >>> 0, 1));
/**
 * Statistics from RobotContext creation
 */
export class RobotContextStats {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(RobotContextStats.prototype);
        obj.__wbg_ptr = ptr;
        RobotContextStatsFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        RobotContextStatsFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_robotcontextstats_free(ptr, 0);
    }
    /**
     * Number of shapes converted to capsules
     * @returns {number}
     */
    get shapes_converted() {
        const ret = wasm.__wbg_get_batchcollisioncheckerconfig_samples_per_edge(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Number of shapes converted to capsules
     * @param {number} arg0
     */
    set shapes_converted(arg0) {
        wasm.__wbg_set_batchcollisioncheckerconfig_samples_per_edge(this.__wbg_ptr, arg0);
    }
    /**
     * Number of capsules generated
     * @returns {number}
     */
    get capsules_generated() {
        const ret = wasm.__wbg_get_motionvalidationstats_valid_configs(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Number of capsules generated
     * @param {number} arg0
     */
    set capsules_generated(arg0) {
        wasm.__wbg_set_motionvalidationstats_valid_configs(this.__wbg_ptr, arg0);
    }
    /**
     * Number of shapes unchanged
     * @returns {number}
     */
    get shapes_unchanged() {
        const ret = wasm.__wbg_get_lazyprmconfig_num_samples(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Number of shapes unchanged
     * @param {number} arg0
     */
    set shapes_unchanged(arg0) {
        wasm.__wbg_set_lazyprmconfig_num_samples(this.__wbg_ptr, arg0);
    }
    /**
     * Average coverage ratio
     * @returns {number}
     */
    get avg_coverage_ratio() {
        const ret = wasm.__wbg_get_batchcollisioncheckerconfig_safety_margin(this.__wbg_ptr);
        return ret;
    }
    /**
     * Average coverage ratio
     * @param {number} arg0
     */
    set avg_coverage_ratio(arg0) {
        wasm.__wbg_set_batchcollisioncheckerconfig_safety_margin(this.__wbg_ptr, arg0);
    }
    /**
     * Whether capsule approximation was used
     * @returns {boolean}
     */
    get used_capsule_approximation() {
        const ret = wasm.__wbg_get_robotcontextstats_used_capsule_approximation(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Whether capsule approximation was used
     * @param {boolean} arg0
     */
    set used_capsule_approximation(arg0) {
        wasm.__wbg_set_robotcontextstats_used_capsule_approximation(this.__wbg_ptr, arg0);
    }
    /**
     * Get a summary string
     * @returns {string}
     */
    summary() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.robotcontextstats_summary(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_export_3(deferred1_0, deferred1_1, 1);
        }
    }
}

const RobotEnvironmentCollisionResultFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_robotenvironmentcollisionresult_free(ptr >>> 0, 1));
/**
 * Robot-environment collision check result
 */
export class RobotEnvironmentCollisionResult {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(RobotEnvironmentCollisionResult.prototype);
        obj.__wbg_ptr = ptr;
        RobotEnvironmentCollisionResultFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        RobotEnvironmentCollisionResultFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_robotenvironmentcollisionresult_free(ptr, 0);
    }
    /**
     * Get collisions as flattened array
     * [link1, obstacle1, link2, obstacle2, ...] represents pairs
     * @returns {string[]}
     */
    get collisions() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.robotenvironmentcollisionresult_collisions(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayJsValueFromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 4, 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Check if any collision was detected
     * @returns {boolean}
     */
    get inCollision() {
        const ret = wasm.robotenvironmentcollisionresult_inCollision(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Get number of collision pairs
     * @returns {number}
     */
    get numCollisions() {
        const ret = wasm.robotenvironmentcollisionresult_numCollisions(this.__wbg_ptr);
        return ret >>> 0;
    }
}

const SelfCollisionResultFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_selfcollisionresult_free(ptr >>> 0, 1));
/**
 * Self-collision check result
 */
export class SelfCollisionResult {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(SelfCollisionResult.prototype);
        obj.__wbg_ptr = ptr;
        SelfCollisionResultFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        SelfCollisionResultFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_selfcollisionresult_free(ptr, 0);
    }
    /**
     * Check if any self-collision was detected
     * @returns {boolean}
     */
    get inCollision() {
        const ret = wasm.robotenvironmentcollisionresult_inCollision(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Get colliding link pairs as flattened array
     * [link1, link2, link3, link4, ...] represents pairs (link1, link2), (link3, link4), ...
     * @returns {string[]}
     */
    get collidingPairs() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.robotenvironmentcollisionresult_collisions(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayJsValueFromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 4, 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get number of colliding pairs
     * @returns {number}
     */
    get numCollidingPairs() {
        const ret = wasm.robotenvironmentcollisionresult_numCollisions(this.__wbg_ptr);
        return ret >>> 0;
    }
}

const TaskSpacePlanningResultFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_taskspaceplanningresult_free(ptr >>> 0, 1));
/**
 * Task-space planning result
 */
export class TaskSpacePlanningResult {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(TaskSpacePlanningResult.prototype);
        obj.__wbg_ptr = ptr;
        TaskSpacePlanningResultFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        TaskSpacePlanningResultFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_taskspaceplanningresult_free(ptr, 0);
    }
    /**
     * Get joint configuration at index
     * @param {number} index
     * @returns {Float64Array | undefined}
     */
    getJoints(index) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.taskspaceplanningresult_getJoints(retptr, this.__wbg_ptr, index);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            let v1;
            if (r0 !== 0) {
                v1 = getArrayF64FromWasm0(r0, r1).slice();
                wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            }
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @returns {number}
     */
    get iterations() {
        const ret = wasm.collisionenvironment_numCompositeObstacles(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get path length (sum of joint distances)
     * @returns {number}
     */
    get pathLength() {
        const ret = wasm.taskspaceplanningresult_pathLength(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {string | undefined}
     */
    get errorMessage() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.taskspaceplanningresult_error(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            let v1;
            if (r0 !== 0) {
                v1 = getStringFromWasm0(r0, r1).slice();
                wasm.__wbindgen_export_3(r0, r1 * 1, 1);
            }
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get number of waypoints
     * @returns {number}
     */
    get waypointCount() {
        const ret = wasm.taskspaceplanningresult_waypointCount(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get planningTimeMs() {
        const ret = wasm.batchcollisionresult_totalTimeMs(this.__wbg_ptr);
        return ret;
    }
    /**
     * Get all joint configurations as flat array
     * Format: [dof, n_waypoints, j1_1, j2_1, ..., j1_2, j2_2, ...]
     * @returns {Float64Array}
     */
    getJointPathFlat() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.taskspaceplanningresult_getJointPathFlat(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @returns {string | undefined}
     */
    get error() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.taskspaceplanningresult_error(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            let v1;
            if (r0 !== 0) {
                v1 = getStringFromWasm0(r0, r1).slice();
                wasm.__wbindgen_export_3(r0, r1 * 1, 1);
            }
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @returns {boolean}
     */
    get success() {
        const ret = wasm.lazyprmresult_success(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Get a specific pose
     * @param {number} index
     * @returns {Pose | undefined}
     */
    getPose(index) {
        const ret = wasm.taskspaceplanningresult_getPose(this.__wbg_ptr, index);
        return ret === 0 ? undefined : Pose.__wrap(ret);
    }
    /**
     * @returns {number}
     */
    get treeSize() {
        const ret = wasm.taskspaceplanningresult_treeSize(this.__wbg_ptr);
        return ret >>> 0;
    }
}

const TaskSpaceRRTConfigFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_taskspacerrtconfig_free(ptr >>> 0, 1));
/**
 * Configuration for task-space RRT planner
 */
export class TaskSpaceRRTConfig {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(TaskSpaceRRTConfig.prototype);
        obj.__wbg_ptr = ptr;
        TaskSpaceRRTConfigFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        TaskSpaceRRTConfigFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_taskspacerrtconfig_free(ptr, 0);
    }
    /**
     * Create with custom parameters
     * @param {number} max_iterations
     * @param {number} step_size
     * @param {number} goal_bias
     * @returns {TaskSpaceRRTConfig}
     */
    static withParams(max_iterations, step_size, goal_bias) {
        const ret = wasm.taskspacerrtconfig_withParams(max_iterations, step_size, goal_bias);
        return TaskSpaceRRTConfig.__wrap(ret);
    }
    /**
     * @returns {number}
     */
    get goalBias() {
        const ret = wasm.cableconfig_maxTwistRate(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get stepSize() {
        const ret = wasm.batchcollisionresult_totalTimeMs(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} value
     */
    set goalBias(value) {
        wasm.taskspacerrtconfig_set_goalBias(this.__wbg_ptr, value);
    }
    /**
     * @param {number} value
     */
    set stepSize(value) {
        wasm.taskspacerrtconfig_set_stepSize(this.__wbg_ptr, value);
    }
    /**
     * @returns {number}
     */
    get maxIterations() {
        const ret = wasm.taskspaceplanningresult_treeSize(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @param {number} value
     */
    set maxIterations(value) {
        wasm.taskspacerrtconfig_set_maxIterations(this.__wbg_ptr, value);
    }
    /**
     * Set goal tolerance
     * @param {number} position
     * @param {number} orientation
     * @returns {TaskSpaceRRTConfig}
     */
    withGoalTolerance(position, orientation) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.taskspacerrtconfig_withGoalTolerance(ptr, position, orientation);
        return TaskSpaceRRTConfig.__wrap(ret);
    }
    /**
     * @returns {number}
     */
    get positionTolerance() {
        const ret = wasm.cableconfig_initialTwist(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} value
     */
    set positionTolerance(value) {
        wasm.taskspacerrtconfig_set_positionTolerance(this.__wbg_ptr, value);
    }
    /**
     * @returns {number}
     */
    get orientationTolerance() {
        const ret = wasm.cableconfig_warningThreshold(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} value
     */
    set orientationTolerance(value) {
        wasm.taskspacerrtconfig_set_orientationTolerance(this.__wbg_ptr, value);
    }
    constructor() {
        const ret = wasm.taskspacerrtconfig_new();
        this.__wbg_ptr = ret >>> 0;
        TaskSpaceRRTConfigFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}

const TaskSpaceRRTPlannerFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_taskspacerrtplanner_free(ptr >>> 0, 1));
/**
 * Task-space RRT planner for WASM
 *
 * Plans paths in Cartesian space, using IK to convert to joint space.
 */
export class TaskSpaceRRTPlanner {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        TaskSpaceRRTPlannerFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_taskspacerrtplanner_free(ptr, 0);
    }
    /**
     * Plan a path from start joints to goal pose
     *
     * This is the main planning method that takes start joint configuration
     * and goal end-effector pose.
     * @param {Float64Array} start_joints
     * @param {Pose} goal_pose
     * @returns {TaskSpacePlanningResult}
     */
    plan(start_joints, goal_pose) {
        const ptr0 = passArrayF64ToWasm0(start_joints, wasm.__wbindgen_export_0);
        const len0 = WASM_VECTOR_LEN;
        _assertClass(goal_pose, Pose);
        const ret = wasm.taskspacerrtplanner_plan(this.__wbg_ptr, ptr0, len0, goal_pose.__wbg_ptr);
        return TaskSpacePlanningResult.__wrap(ret);
    }
    /**
     * Set workspace bounds for sampling
     * Accepts array: [min_x, min_y, min_z, max_x, max_y, max_z]
     * @param {Float64Array} bounds
     */
    setWorkspaceBounds(bounds) {
        const ptr0 = passArrayF64ToWasm0(bounds, wasm.__wbindgen_export_0);
        const len0 = WASM_VECTOR_LEN;
        wasm.taskspacerrtplanner_setWorkspaceBounds(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * Create a new task-space RRT planner from a Robot instance
     *
     * Takes ownership of the robot.
     * @param {Robot} robot
     * @param {TaskSpaceRRTConfig | null} [config]
     */
    constructor(robot, config) {
        _assertClass(robot, Robot);
        var ptr0 = robot.__destroy_into_raw();
        let ptr1 = 0;
        if (!isLikeNone(config)) {
            _assertClass(config, TaskSpaceRRTConfig);
            ptr1 = config.__destroy_into_raw();
        }
        const ret = wasm.taskspacerrtplanner_new(ptr0, ptr1);
        this.__wbg_ptr = ret >>> 0;
        TaskSpaceRRTPlannerFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}

const TrajectoryConfigFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_trajectoryconfig_free(ptr >>> 0, 1));
/**
 * Configuration for trajectory generation
 */
export class TrajectoryConfig {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(TrajectoryConfig.prototype);
        obj.__wbg_ptr = ptr;
        TrajectoryConfigFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        TrajectoryConfigFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_trajectoryconfig_free(ptr, 0);
    }
    /**
     * Get velocity limits
     * @returns {Float64Array}
     */
    get velocityMax() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.trajectoryconfig_velocityMax(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Set time step for trajectory sampling
     * @param {number} time_step
     * @returns {TrajectoryConfig}
     */
    withTimeStep(time_step) {
        try {
            const ptr = this.__destroy_into_raw();
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.trajectoryconfig_withTimeStep(retptr, ptr, time_step);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return TrajectoryConfig.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get acceleration limits
     * @returns {Float64Array}
     */
    get accelerationMax() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.trajectoryconfig_accelerationMax(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Set jerk limits for S-curve profile
     * @param {Float64Array} jerk_max
     * @returns {TrajectoryConfig}
     */
    withJerkLimits(jerk_max) {
        try {
            const ptr = this.__destroy_into_raw();
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF64ToWasm0(jerk_max, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            wasm.trajectoryconfig_withJerkLimits(retptr, ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return TrajectoryConfig.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Create new configuration with velocity and acceleration limits
     * @param {Float64Array} velocity_max
     * @param {Float64Array} acceleration_max
     */
    constructor(velocity_max, acceleration_max) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF64ToWasm0(velocity_max, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(acceleration_max, wasm.__wbindgen_export_0);
            const len1 = WASM_VECTOR_LEN;
            wasm.trajectoryconfig_new(retptr, ptr0, len0, ptr1, len1);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            this.__wbg_ptr = r0 >>> 0;
            TrajectoryConfigFinalization.register(this, this.__wbg_ptr, this);
            return this;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get time step
     * @returns {number}
     */
    get timeStep() {
        const ret = wasm.batchcollisionresult_totalTimeMs(this.__wbg_ptr);
        return ret;
    }
}

const TrajectoryGeneratorFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_trajectorygenerator_free(ptr >>> 0, 1));
/**
 * Trajectory generator for time-parameterizing paths
 */
export class TrajectoryGenerator {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        TrajectoryGeneratorFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_trajectorygenerator_free(ptr, 0);
    }
    /**
     * Generate a time-parameterized trajectory from a path
     *
     * # Arguments
     * * `path_flat` - Flat path array [dof, n_waypoints, j1_1, j2_1, ..., j1_2, j2_2, ...]
     *
     * # Returns
     * Time-parameterized trajectory with positions, velocities, and accelerations
     * @param {Float64Array} path_flat
     * @returns {WasmTrajectory}
     */
    generateFromPath(path_flat) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF64ToWasm0(path_flat, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            wasm.trajectorygenerator_generateFromPath(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return WasmTrajectory.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Generate trajectory from array of waypoints
     *
     * Each waypoint is an array of joint positions.
     * @param {Float64Array} waypoints
     * @param {number} dof
     * @returns {WasmTrajectory}
     */
    generateFromWaypoints(waypoints, dof) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF64ToWasm0(waypoints, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            wasm.trajectorygenerator_generateFromWaypoints(retptr, this.__wbg_ptr, ptr0, len0, dof);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return WasmTrajectory.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Create a new trajectory generator
     * @param {TrajectoryConfig} config
     */
    constructor(config) {
        _assertClass(config, TrajectoryConfig);
        var ptr0 = config.__destroy_into_raw();
        const ret = wasm.trajectorygenerator_new(ptr0);
        this.__wbg_ptr = ret >>> 0;
        TrajectoryGeneratorFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}

const WasmCapsuleApproximationOptionsFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmcapsuleapproximationoptions_free(ptr >>> 0, 1));
/**
 * Options for capsule approximation
 *
 * Controls how geometries are converted to capsule approximations,
 * which enables GPU-accelerated collision detection.
 */
export class WasmCapsuleApproximationOptions {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmCapsuleApproximationOptions.prototype);
        obj.__wbg_ptr = ptr;
        WasmCapsuleApproximationOptionsFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmCapsuleApproximationOptionsFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmcapsuleapproximationoptions_free(ptr, 0);
    }
    /**
     * Conservative preset - only converts meshes
     * @returns {WasmCapsuleApproximationOptions}
     */
    static conservative() {
        const ret = wasm.wasmcapsuleapproximationoptions_conservative();
        return WasmCapsuleApproximationOptions.__wrap(ret);
    }
    /**
     * GPU optimized preset - converts all geometries to capsules
     * @returns {WasmCapsuleApproximationOptions}
     */
    static gpuOptimized() {
        const ret = wasm.wasmcapsuleapproximationoptions_gpuOptimized();
        return WasmCapsuleApproximationOptions.__wrap(ret);
    }
    /**
     * Set whether to convert box shapes
     * @param {boolean} value
     */
    setConvertBoxes(value) {
        wasm.wasmcapsuleapproximationoptions_setConvertBoxes(this.__wbg_ptr, value);
    }
    /**
     * Set whether to convert mesh shapes
     * @param {boolean} value
     */
    setConvertMeshes(value) {
        wasm.wasmcapsuleapproximationoptions_setConvertMeshes(this.__wbg_ptr, value);
    }
    /**
     * Set radius padding for conservative collision detection
     * @param {number} value
     */
    setRadiusPadding(value) {
        wasm.taskspacerrtconfig_set_goalBias(this.__wbg_ptr, value);
    }
    /**
     * Set whether to convert cylinder shapes
     * @param {boolean} value
     */
    setConvertCylinders(value) {
        wasm.wasmcapsuleapproximationoptions_setConvertCylinders(this.__wbg_ptr, value);
    }
    /**
     * Set maximum capsules per mesh
     * @param {number} value
     */
    setMaxCapsulesPerMesh(value) {
        wasm.wasmcapsuleapproximationoptions_setMaxCapsulesPerMesh(this.__wbg_ptr, value);
    }
    /**
     * Create default options
     */
    constructor() {
        const ret = wasm.wasmcapsuleapproximationoptions_new();
        this.__wbg_ptr = ret >>> 0;
        WasmCapsuleApproximationOptionsFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}

const WasmCapsuleApproximationResultFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmcapsuleapproximationresult_free(ptr >>> 0, 1));
/**
 * Result of capsule approximation containing both model and stats
 */
export class WasmCapsuleApproximationResult {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmCapsuleApproximationResult.prototype);
        obj.__wbg_ptr = ptr;
        WasmCapsuleApproximationResultFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmCapsuleApproximationResultFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmcapsuleapproximationresult_free(ptr, 0);
    }
    /**
     * Get the capsule-approximated model
     * @returns {WasmRobotCollisionModel}
     */
    get model() {
        const ret = wasm.wasmcapsuleapproximationresult_model(this.__wbg_ptr);
        return WasmRobotCollisionModel.__wrap(ret);
    }
    /**
     * Get the approximation statistics
     * @returns {WasmCapsuleApproximationStats}
     */
    get stats() {
        const ret = wasm.wasmcapsuleapproximationresult_stats(this.__wbg_ptr);
        return WasmCapsuleApproximationStats.__wrap(ret);
    }
}

const WasmCapsuleApproximationStatsFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmcapsuleapproximationstats_free(ptr >>> 0, 1));
/**
 * Statistics about capsule approximation
 */
export class WasmCapsuleApproximationStats {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmCapsuleApproximationStats.prototype);
        obj.__wbg_ptr = ptr;
        WasmCapsuleApproximationStatsFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmCapsuleApproximationStatsFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmcapsuleapproximationstats_free(ptr, 0);
    }
    /**
     * Number of shapes converted
     * @returns {number}
     */
    get shapes_converted() {
        const ret = wasm.__wbg_get_batchcollisioncheckerconfig_samples_per_edge(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Number of shapes converted
     * @param {number} arg0
     */
    set shapes_converted(arg0) {
        wasm.__wbg_set_batchcollisioncheckerconfig_samples_per_edge(this.__wbg_ptr, arg0);
    }
    /**
     * Number of capsules generated
     * @returns {number}
     */
    get capsules_generated() {
        const ret = wasm.__wbg_get_motionvalidationstats_valid_configs(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Number of capsules generated
     * @param {number} arg0
     */
    set capsules_generated(arg0) {
        wasm.__wbg_set_motionvalidationstats_valid_configs(this.__wbg_ptr, arg0);
    }
    /**
     * Number of shapes kept as-is
     * @returns {number}
     */
    get shapes_unchanged() {
        const ret = wasm.__wbg_get_lazyprmconfig_num_samples(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Number of shapes kept as-is
     * @param {number} arg0
     */
    set shapes_unchanged(arg0) {
        wasm.__wbg_set_lazyprmconfig_num_samples(this.__wbg_ptr, arg0);
    }
    /**
     * Average coverage ratio for mesh conversions
     * @returns {number}
     */
    get avg_coverage_ratio() {
        const ret = wasm.__wbg_get_batchcollisioncheckerconfig_safety_margin(this.__wbg_ptr);
        return ret;
    }
    /**
     * Average coverage ratio for mesh conversions
     * @param {number} arg0
     */
    set avg_coverage_ratio(arg0) {
        wasm.__wbg_set_batchcollisioncheckerconfig_safety_margin(this.__wbg_ptr, arg0);
    }
    /**
     * Get number of shapes converted
     * @returns {number}
     */
    get shapesConverted() {
        const ret = wasm.integratedgpuplannerconfig_samplesPerEdge(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get number of shapes unchanged
     * @returns {number}
     */
    get shapesUnchanged() {
        const ret = wasm.gpuplanningresult_waypointCount(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get average coverage ratio
     * @returns {number}
     */
    get avgCoverageRatio() {
        const ret = wasm.batchcollisionresult_totalTimeMs(this.__wbg_ptr);
        return ret;
    }
    /**
     * Get number of capsules generated
     * @returns {number}
     */
    get capsulesGenerated() {
        const ret = wasm.collisionenvironment_numObstacles(this.__wbg_ptr);
        return ret >>> 0;
    }
}

const WasmCompositeObstacleFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmcompositeobstacle_free(ptr >>> 0, 1));
/**
 * Composite obstacle with multiple collision parts
 *
 * Useful for complex objects like workpieces, fixtures, or multi-link obstacles.
 * All parts move together when the base pose is updated.
 */
export class WasmCompositeObstacle {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmCompositeObstacle.prototype);
        obj.__wbg_ptr = ptr;
        WasmCompositeObstacleFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmCompositeObstacleFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmcompositeobstacle_free(ptr, 0);
    }
    /**
     * Add a box part to the composite obstacle
     *
     * # Arguments
     * * `name` - Part name
     * * `half_extents` - Half dimensions [x, y, z]
     * * `position` - Local position relative to base [x, y, z]
     * * `orientation` - Local orientation as quaternion [x, y, z, w]
     * @param {string} name
     * @param {Float64Array} half_extents
     * @param {Float64Array} position
     * @param {Float64Array} orientation
     */
    addBoxPart(name, half_extents, position, orientation) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(name, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(half_extents, wasm.__wbindgen_export_0);
            const len1 = WASM_VECTOR_LEN;
            const ptr2 = passArrayF64ToWasm0(position, wasm.__wbindgen_export_0);
            const len2 = WASM_VECTOR_LEN;
            const ptr3 = passArrayF64ToWasm0(orientation, wasm.__wbindgen_export_0);
            const len3 = WASM_VECTOR_LEN;
            wasm.wasmcompositeobstacle_addBoxPart(retptr, this.__wbg_ptr, ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get the base pose
     * @returns {Pose}
     */
    getBasePose() {
        const ret = wasm.wasmcompositeobstacle_getBasePose(this.__wbg_ptr);
        return Pose.__wrap(ret);
    }
    /**
     * Set the base pose of the composite obstacle
     * @param {Pose} pose
     */
    setBasePose(pose) {
        _assertClass(pose, Pose);
        wasm.wasmcompositeobstacle_setBasePose(this.__wbg_ptr, pose.__wbg_ptr);
    }
    /**
     * Add a sphere part to the composite obstacle
     * @param {string} name
     * @param {number} radius
     * @param {Float64Array} position
     */
    addSpherePart(name, radius, position) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(name, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(position, wasm.__wbindgen_export_0);
            const len1 = WASM_VECTOR_LEN;
            wasm.wasmcompositeobstacle_addSpherePart(retptr, this.__wbg_ptr, ptr0, len0, radius, ptr1, len1);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Add a cylinder part to the composite obstacle
     * @param {string} name
     * @param {number} radius
     * @param {number} half_height
     * @param {Float64Array} position
     * @param {Float64Array} orientation
     */
    addCylinderPart(name, radius, half_height, position, orientation) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(name, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(position, wasm.__wbindgen_export_0);
            const len1 = WASM_VECTOR_LEN;
            const ptr2 = passArrayF64ToWasm0(orientation, wasm.__wbindgen_export_0);
            const len2 = WASM_VECTOR_LEN;
            wasm.wasmcompositeobstacle_addCylinderPart(retptr, this.__wbg_ptr, ptr0, len0, radius, half_height, ptr1, len1, ptr2, len2);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get world pose for a specific part
     * @param {number} part_index
     * @returns {Pose | undefined}
     */
    getPartWorldPose(part_index) {
        const ret = wasm.wasmcompositeobstacle_getPartWorldPose(this.__wbg_ptr, part_index);
        return ret === 0 ? undefined : Pose.__wrap(ret);
    }
    /**
     * Get obstacle ID
     * @returns {string}
     */
    get id() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmcompositeobstacle_id(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_export_3(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Create a new empty composite obstacle
     * @param {string} id
     */
    constructor(id) {
        const ptr0 = passStringToWasm0(id, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmcompositeobstacle_new(ptr0, len0);
        this.__wbg_ptr = ret >>> 0;
        WasmCompositeObstacleFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Get number of parts
     * @returns {number}
     */
    get numParts() {
        const ret = wasm.wasmcompositeobstacle_numParts(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Create a composite obstacle with a base pose
     * @param {string} id
     * @param {Pose} pose
     * @returns {WasmCompositeObstacle}
     */
    static withPose(id, pose) {
        const ptr0 = passStringToWasm0(id, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len0 = WASM_VECTOR_LEN;
        _assertClass(pose, Pose);
        const ret = wasm.wasmcompositeobstacle_withPose(ptr0, len0, pose.__wbg_ptr);
        return WasmCompositeObstacle.__wrap(ret);
    }
}

const WasmConfigurationSpaceFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmconfigurationspace_free(ptr >>> 0, 1));
/**
 * Configuration space for motion validation
 */
export class WasmConfigurationSpace {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmConfigurationSpace.prototype);
        obj.__wbg_ptr = ptr;
        WasmConfigurationSpaceFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmConfigurationSpaceFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmconfigurationspace_free(ptr, 0);
    }
    /**
     * Get the number of dimensions
     * @returns {number}
     */
    get dimensions() {
        const ret = wasm.batchcollisionresult_numChecked(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Interpolate between two configurations
     * @param {Float64Array} start
     * @param {Float64Array} end
     * @param {number} t
     * @returns {Float64Array}
     */
    interpolate(start, end, t) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF64ToWasm0(start, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(end, wasm.__wbindgen_export_0);
            const len1 = WASM_VECTOR_LEN;
            wasm.wasmconfigurationspace_interpolate(retptr, this.__wbg_ptr, ptr0, len0, ptr1, len1, t);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v3 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            return v3;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get lower bounds
     * @returns {Float64Array}
     */
    get lowerBounds() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmconfigurationspace_lowerBounds(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get upper bounds
     * @returns {Float64Array}
     */
    get upperBounds() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmconfigurationspace_upperBounds(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Check if a configuration is within bounds
     * @param {Float64Array} config
     * @returns {boolean}
     */
    isWithinBounds(config) {
        const ptr0 = passArrayF64ToWasm0(config, wasm.__wbindgen_export_0);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmconfigurationspace_isWithinBounds(this.__wbg_ptr, ptr0, len0);
        return ret !== 0;
    }
    /**
     * Create from JointLimits
     * @param {JointLimits} limits
     * @returns {WasmConfigurationSpace}
     */
    static fromJointLimits(limits) {
        _assertClass(limits, JointLimits);
        const ret = wasm.wasmconfigurationspace_fromJointLimits(limits.__wbg_ptr);
        return WasmConfigurationSpace.__wrap(ret);
    }
    /**
     * Create a new configuration space
     *
     * @param dimensions - Number of joints/DOF
     * @param lower_bounds - Lower joint limits
     * @param upper_bounds - Upper joint limits
     * @param {number} dimensions
     * @param {Float64Array} lower_bounds
     * @param {Float64Array} upper_bounds
     */
    constructor(dimensions, lower_bounds, upper_bounds) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF64ToWasm0(lower_bounds, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(upper_bounds, wasm.__wbindgen_export_0);
            const len1 = WASM_VECTOR_LEN;
            wasm.wasmconfigurationspace_new(retptr, dimensions, ptr0, len0, ptr1, len1);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            this.__wbg_ptr = r0 >>> 0;
            WasmConfigurationSpaceFinalization.register(this, this.__wbg_ptr, this);
            return this;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Compute distance between two configurations (Euclidean)
     * @param {Float64Array} a
     * @param {Float64Array} b
     * @returns {number}
     */
    distance(a, b) {
        const ptr0 = passArrayF64ToWasm0(a, wasm.__wbindgen_export_0);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayF64ToWasm0(b, wasm.__wbindgen_export_0);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.wasmconfigurationspace_distance(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        return ret;
    }
}

const WasmDhDatabaseFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmdhdatabase_free(ptr >>> 0, 1));
/**
 * DH Database wrapper for accessing known robot parameters
 */
export class WasmDhDatabase {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmDhDatabase.prototype);
        obj.__wbg_ptr = ptr;
        WasmDhDatabaseFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmDhDatabaseFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmdhdatabase_free(ptr, 0);
    }
    /**
     * List all available robots in the database
     * @returns {string[]}
     */
    listRobots() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmdhdatabase_listRobots(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayJsValueFromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 4, 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get DH parameters for a robot by name
     * @param {string} name
     * @returns {DhParam[]}
     */
    getDhParams(name) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(name, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            const len0 = WASM_VECTOR_LEN;
            wasm.wasmdhdatabase_getDhParams(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
            if (r3) {
                throw takeObject(r2);
            }
            var v2 = getArrayJsValueFromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 4, 4);
            return v2;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Create database with hardcoded default robot configurations
     * @returns {WasmDhDatabase}
     */
    static withDefaults() {
        const ret = wasm.wasmdhdatabase_withDefaults();
        return WasmDhDatabase.__wrap(ret);
    }
    /**
     * Get joint limits for a robot by name
     * @param {string} name
     * @returns {JointLimits}
     */
    getJointLimits(name) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(name, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            const len0 = WASM_VECTOR_LEN;
            wasm.wasmdhdatabase_getJointLimits(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return JointLimits.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get number of robots in database
     * @returns {number}
     */
    get len() {
        const ret = wasm.wasmdhdatabase_len(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Create a new empty database
     */
    constructor() {
        const ret = wasm.wasmdhdatabase_new();
        this.__wbg_ptr = ret >>> 0;
        WasmDhDatabaseFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Lookup robot config by name
     * @param {string} name
     * @returns {WasmRobotConfig | undefined}
     */
    lookup(name) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmdhdatabase_lookup(this.__wbg_ptr, ptr0, len0);
        return ret === 0 ? undefined : WasmRobotConfig.__wrap(ret);
    }
    /**
     * Check if database is empty
     * @returns {boolean}
     */
    isEmpty() {
        const ret = wasm.wasmdhdatabase_isEmpty(this.__wbg_ptr);
        return ret !== 0;
    }
}

const WasmDiscreteMotionValidatorFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmdiscretemotionvalidator_free(ptr >>> 0, 1));
/**
 * Discrete motion validator
 *
 * Validates motion by discretizing the path into small steps and checking
 * each intermediate configuration for validity.
 */
export class WasmDiscreteMotionValidator {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmDiscreteMotionValidator.prototype);
        obj.__wbg_ptr = ptr;
        WasmDiscreteMotionValidatorFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmDiscreteMotionValidatorFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmdiscretemotionvalidator_free(ptr, 0);
    }
    /**
     * Enable or disable caching
     * @param {boolean} enabled
     */
    setCaching(enabled) {
        wasm.wasmdiscretemotionvalidator_setCaching(this.__wbg_ptr, enabled);
    }
    /**
     * Create with caching enabled for dense path generation
     * @param {WasmConfigurationSpace} space
     * @param {number} max_step_size
     * @returns {WasmDiscreteMotionValidator}
     */
    static withCaching(space, max_step_size) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(space, WasmConfigurationSpace);
            wasm.wasmdiscretemotionvalidator_withCaching(retptr, space.__wbg_ptr, max_step_size);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return WasmDiscreteMotionValidator.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get max step size
     * @returns {number}
     */
    get maxStepSize() {
        const ret = wasm.batchcollisionresult_totalTimeMs(this.__wbg_ptr);
        return ret;
    }
    /**
     * Validate an edge and return interpolated points if caching is enabled
     * @param {Float64Array} start
     * @param {Float64Array} end
     * @returns {EdgeValidationResult}
     */
    validateEdge(start, end) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF64ToWasm0(start, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(end, wasm.__wbindgen_export_0);
            const len1 = WASM_VECTOR_LEN;
            wasm.wasmdiscretemotionvalidator_validateEdge(retptr, this.__wbg_ptr, ptr0, len0, ptr1, len1);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return EdgeValidationResult.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Validate an entire path
     * @param {Float64Array} path
     * @param {number} dof
     * @returns {boolean}
     */
    validatePath(path, dof) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF64ToWasm0(path, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            wasm.wasmdiscretemotionvalidator_validatePath(retptr, this.__wbg_ptr, ptr0, len0, dof);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return r0 !== 0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Check if a configuration is valid (within bounds)
     * @param {Float64Array} config
     * @returns {boolean}
     */
    isConfigValid(config) {
        const ptr0 = passArrayF64ToWasm0(config, wasm.__wbindgen_export_0);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmdiscretemotionvalidator_isConfigValid(this.__wbg_ptr, ptr0, len0);
        return ret !== 0;
    }
    /**
     * Validate motion between two configurations (bounds only)
     *
     * Returns true if all intermediate configurations are within bounds.
     * @param {Float64Array} start
     * @param {Float64Array} end
     * @returns {boolean}
     */
    validateMotion(start, end) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF64ToWasm0(start, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(end, wasm.__wbindgen_export_0);
            const len1 = WASM_VECTOR_LEN;
            wasm.wasmdiscretemotionvalidator_validateMotion(retptr, this.__wbg_ptr, ptr0, len0, ptr1, len1);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return r0 !== 0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Create with default step size (0.1 radians ~ 5.7 degrees)
     * @param {WasmConfigurationSpace} space
     * @returns {WasmDiscreteMotionValidator}
     */
    static withDefaultStep(space) {
        _assertClass(space, WasmConfigurationSpace);
        const ret = wasm.wasmdiscretemotionvalidator_withDefaultStep(space.__wbg_ptr);
        return WasmDiscreteMotionValidator.__wrap(ret);
    }
    /**
     * Check if caching is enabled
     * @returns {boolean}
     */
    get isCachingEnabled() {
        const ret = wasm.wasmdiscretemotionvalidator_isCachingEnabled(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Validate an edge with collision checking
     * @param {Float64Array} start
     * @param {Float64Array} end
     * @param {Function} collision_checker
     * @returns {EdgeValidationResult}
     */
    validateEdgeWithCollisionCheck(start, end, collision_checker) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF64ToWasm0(start, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(end, wasm.__wbindgen_export_0);
            const len1 = WASM_VECTOR_LEN;
            wasm.wasmdiscretemotionvalidator_validateEdgeWithCollisionCheck(retptr, this.__wbg_ptr, ptr0, len0, ptr1, len1, addBorrowedObject(collision_checker));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return EdgeValidationResult.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            heap[stack_pointer++] = undefined;
        }
    }
    /**
     * Validate an entire path with collision checking
     * @param {Float64Array} path
     * @param {number} dof
     * @param {Function} collision_checker
     * @returns {boolean}
     */
    validatePathWithCollisionCheck(path, dof, collision_checker) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF64ToWasm0(path, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            wasm.wasmdiscretemotionvalidator_validatePathWithCollisionCheck(retptr, this.__wbg_ptr, ptr0, len0, dof, addBorrowedObject(collision_checker));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return r0 !== 0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            heap[stack_pointer++] = undefined;
        }
    }
    /**
     * Validate motion with JavaScript collision checker callback
     *
     * @param start - Start configuration
     * @param end - End configuration
     * @param collision_checker - Function(config: number[]) => boolean (true = valid)
     * @param {Float64Array} start
     * @param {Float64Array} end
     * @param {Function} collision_checker
     * @returns {boolean}
     */
    validateMotionWithCollisionCheck(start, end, collision_checker) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF64ToWasm0(start, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(end, wasm.__wbindgen_export_0);
            const len1 = WASM_VECTOR_LEN;
            wasm.wasmdiscretemotionvalidator_validateMotionWithCollisionCheck(retptr, this.__wbg_ptr, ptr0, len0, ptr1, len1, addBorrowedObject(collision_checker));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return r0 !== 0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            heap[stack_pointer++] = undefined;
        }
    }
    /**
     * Create a new discrete motion validator
     *
     * @param space - Configuration space (will be cloned, original remains valid)
     * @param max_step_size - Maximum step size for discretization (radians)
     * @param {WasmConfigurationSpace} space
     * @param {number} max_step_size
     */
    constructor(space, max_step_size) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(space, WasmConfigurationSpace);
            wasm.wasmdiscretemotionvalidator_new(retptr, space.__wbg_ptr, max_step_size);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            this.__wbg_ptr = r0 >>> 0;
            WasmDiscreteMotionValidatorFinalization.register(this, this.__wbg_ptr, this);
            return this;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}

const WasmEnvironmentCapsuleOptionsFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmenvironmentcapsuleoptions_free(ptr >>> 0, 1));
/**
 * Options for converting environment obstacles to capsule approximations
 *
 * Controls how environment obstacles are converted to capsules for GPU-accelerated
 * collision detection.
 */
export class WasmEnvironmentCapsuleOptions {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmEnvironmentCapsuleOptions.prototype);
        obj.__wbg_ptr = ptr;
        WasmEnvironmentCapsuleOptionsFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmEnvironmentCapsuleOptionsFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmenvironmentcapsuleoptions_free(ptr, 0);
    }
    /**
     * Conservative preset - only converts meshes
     * @returns {WasmEnvironmentCapsuleOptions}
     */
    static conservative() {
        const ret = wasm.wasmenvironmentcapsuleoptions_conservative();
        return WasmEnvironmentCapsuleOptions.__wrap(ret);
    }
    /**
     * GPU optimized preset - converts all shapes to capsules
     * @returns {WasmEnvironmentCapsuleOptions}
     */
    static gpuOptimized() {
        const ret = wasm.wasmenvironmentcapsuleoptions_gpuOptimized();
        return WasmEnvironmentCapsuleOptions.__wrap(ret);
    }
    /**
     * Set whether to convert box shapes
     * @param {boolean} value
     */
    setConvertBoxes(value) {
        wasm.wasmcapsuleapproximationoptions_setConvertBoxes(this.__wbg_ptr, value);
    }
    /**
     * Set whether to convert mesh shapes
     * @param {boolean} value
     */
    setConvertMeshes(value) {
        wasm.wasmcapsuleapproximationoptions_setConvertMeshes(this.__wbg_ptr, value);
    }
    /**
     * Set radius padding for conservative collision detection
     * @param {number} value
     */
    setRadiusPadding(value) {
        wasm.taskspacerrtconfig_set_goalBias(this.__wbg_ptr, value);
    }
    /**
     * Set whether to convert cylinder shapes
     * @param {boolean} value
     */
    setConvertCylinders(value) {
        wasm.wasmcapsuleapproximationoptions_setConvertCylinders(this.__wbg_ptr, value);
    }
    /**
     * Set maximum capsules per mesh
     * @param {number} value
     */
    setMaxCapsulesPerMesh(value) {
        wasm.wasmcapsuleapproximationoptions_setMaxCapsulesPerMesh(this.__wbg_ptr, value);
    }
    /**
     * Create default options
     */
    constructor() {
        const ret = wasm.wasmenvironmentcapsuleoptions_new();
        this.__wbg_ptr = ret >>> 0;
        WasmEnvironmentCapsuleOptionsFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}

const WasmEnvironmentCapsuleResultFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmenvironmentcapsuleresult_free(ptr >>> 0, 1));
/**
 * Result of environment capsule approximation
 */
export class WasmEnvironmentCapsuleResult {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmEnvironmentCapsuleResult.prototype);
        obj.__wbg_ptr = ptr;
        WasmEnvironmentCapsuleResultFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmEnvironmentCapsuleResultFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmenvironmentcapsuleresult_free(ptr, 0);
    }
    /**
     * Get the capsule-approximated environment
     * @returns {CollisionEnvironment}
     */
    get env() {
        const ret = wasm.wasmenvironmentcapsuleresult_env(this.__wbg_ptr);
        return CollisionEnvironment.__wrap(ret);
    }
    /**
     * Get the approximation statistics
     * @returns {WasmEnvironmentCapsuleStats}
     */
    get stats() {
        const ret = wasm.wasmenvironmentcapsuleresult_stats(this.__wbg_ptr);
        return WasmEnvironmentCapsuleStats.__wrap(ret);
    }
}

const WasmEnvironmentCapsuleStatsFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmenvironmentcapsulestats_free(ptr >>> 0, 1));
/**
 * Statistics about environment capsule approximation
 */
export class WasmEnvironmentCapsuleStats {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmEnvironmentCapsuleStats.prototype);
        obj.__wbg_ptr = ptr;
        WasmEnvironmentCapsuleStatsFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmEnvironmentCapsuleStatsFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmenvironmentcapsulestats_free(ptr, 0);
    }
    /**
     * Number of obstacles converted
     * @returns {number}
     */
    get obstacles_converted() {
        const ret = wasm.__wbg_get_batchcollisioncheckerconfig_samples_per_edge(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Number of obstacles converted
     * @param {number} arg0
     */
    set obstacles_converted(arg0) {
        wasm.__wbg_set_batchcollisioncheckerconfig_samples_per_edge(this.__wbg_ptr, arg0);
    }
    /**
     * Number of capsules generated
     * @returns {number}
     */
    get capsules_generated() {
        const ret = wasm.__wbg_get_motionvalidationstats_valid_configs(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Number of capsules generated
     * @param {number} arg0
     */
    set capsules_generated(arg0) {
        wasm.__wbg_set_motionvalidationstats_valid_configs(this.__wbg_ptr, arg0);
    }
    /**
     * Number of obstacles kept unchanged
     * @returns {number}
     */
    get obstacles_unchanged() {
        const ret = wasm.__wbg_get_lazyprmconfig_num_samples(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Number of obstacles kept unchanged
     * @param {number} arg0
     */
    set obstacles_unchanged(arg0) {
        wasm.__wbg_set_lazyprmconfig_num_samples(this.__wbg_ptr, arg0);
    }
    /**
     * Average coverage ratio for mesh conversions
     * @returns {number}
     */
    get avg_coverage_ratio() {
        const ret = wasm.__wbg_get_batchcollisioncheckerconfig_safety_margin(this.__wbg_ptr);
        return ret;
    }
    /**
     * Average coverage ratio for mesh conversions
     * @param {number} arg0
     */
    set avg_coverage_ratio(arg0) {
        wasm.__wbg_set_batchcollisioncheckerconfig_safety_margin(this.__wbg_ptr, arg0);
    }
    /**
     * Get average coverage ratio
     * @returns {number}
     */
    get avgCoverageRatio() {
        const ret = wasm.batchcollisionresult_totalTimeMs(this.__wbg_ptr);
        return ret;
    }
    /**
     * Get number of capsules generated
     * @returns {number}
     */
    get capsulesGenerated() {
        const ret = wasm.collisionenvironment_numObstacles(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get number of obstacles converted
     * @returns {number}
     */
    get obstaclesConverted() {
        const ret = wasm.integratedgpuplannerconfig_samplesPerEdge(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get number of obstacles unchanged
     * @returns {number}
     */
    get obstaclesUnchanged() {
        const ret = wasm.gpuplanningresult_waypointCount(this.__wbg_ptr);
        return ret >>> 0;
    }
}

const WasmMotionFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmmotion_free(ptr >>> 0, 1));
/**
 * Motion builder for fluent API
 */
export class WasmMotion {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmMotion.prototype);
        obj.__wbg_ptr = ptr;
        WasmMotionFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmMotionFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmmotion_free(ptr, 0);
    }
    /**
     * Set adaptive IK policy for Cartesian motion
     *
     * Attempts alternative IK solutions before falling back to
     * joint-space interpolation. This can help navigate around
     * singularities or workspace limits.
     *
     * # Example
     * ```typescript
     * const result = WasmMotion.to(target)
     *     .linear()
     *     .adaptiveIk()
     *     .run(robot);
     * ```
     * @returns {WasmMotion}
     */
    adaptiveIk() {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.wasmmotion_adaptiveIk(ptr);
        return WasmMotion.__wrap(ret);
    }
    /**
     * Enable cable-aware planning with standard preset (4π limit)
     *
     * This enables cable twist tracking and constrains the path planner
     * to respect cable twist limits during motion planning.
     *
     * # Example
     * ```typescript
     * const result = WasmMotion.to(goal)
     *     .cableAware()
     *     .run(robot);
     * console.log(result.cableTwist);
     * ```
     * @returns {WasmMotion}
     */
    cableAware() {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.wasmmotion_cableAware(ptr);
        return WasmMotion.__wrap(ret);
    }
    /**
     * Track cable twist without constraining the planner
     *
     * This only tracks twist during motion without modifying the planned path.
     * Useful for monitoring cable state when twist constraints are soft.
     * @returns {WasmMotion}
     */
    cableTrack() {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.wasmmotion_cableTrack(ptr);
        return WasmMotion.__wrap(ret);
    }
    /**
     * Set very high smoothness
     * @returns {WasmMotion}
     */
    verySmooth() {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.wasmmotion_verySmooth(ptr);
        return WasmMotion.__wrap(ret);
    }
    /**
     * Enable cable-aware planning with custom configuration
     *
     * # Example
     * ```typescript
     * const config = new CableConfig().withMaxTotalTwist(2 * Math.PI);
     * const result = WasmMotion.to(goal)
     *     .cableAwareWith(config)
     *     .run(robot);
     * ```
     * @param {CableConfig} config
     * @returns {WasmMotion}
     */
    cableAwareWith(config) {
        const ptr = this.__destroy_into_raw();
        _assertClass(config, CableConfig);
        var ptr0 = config.__destroy_into_raw();
        const ret = wasm.wasmmotion_cableAwareWith(ptr, ptr0);
        return WasmMotion.__wrap(ret);
    }
    /**
     * Set warn-and-fallback IK policy for Cartesian motion
     *
     * Falls back to joint-space interpolation when IK fails, but
     * includes warnings in the result about which segments used fallback.
     *
     * # Example
     * ```typescript
     * const result = WasmMotion.to(target)
     *     .linear()
     *     .warnOnFallback()
     *     .run(robot);
     * ```
     * @returns {WasmMotion}
     */
    warnOnFallback() {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.wasmmotion_warnOnFallback(ptr);
        return WasmMotion.__wrap(ret);
    }
    /**
     * Set initial cable twist for this motion (for multi-segment tracking)
     *
     * Use this when planning multiple motions in sequence to maintain
     * accumulated twist state between motions.
     * @param {number} twist
     * @returns {WasmMotion}
     */
    withCableTwist(twist) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.wasmmotion_withCableTwist(ptr, twist);
        return WasmMotion.__wrap(ret);
    }
    /**
     * Execute the motion with collision-aware path planning
     *
     * When CollisionMode::Avoid is set (via .safe()), this method uses BiRRT
     * to plan a collision-free path. Otherwise, it falls back to simple
     * linear interpolation.
     *
     * # Arguments
     * * `robot` - The robot for kinematics
     * * `collision_checker` - JavaScript callback function(jointConfig: number[]) -> boolean
     *   Returns true if the configuration is collision-free
     *
     * # Example
     * ```typescript
     * // Create collision checker callback
     * const checkCollision = (joints: number[]): boolean => {
     *     const poses = robot.getLinkTransforms(joints);
     *     const selfResult = robotCollision.checkSelfCollision(poses);
     *     if (selfResult.inCollision) return false;
     *     const envResult = robotCollision.checkEnvironmentCollision(env, poses);
     *     return !envResult.inCollision;
     * };
     *
     * // Execute with collision avoidance
     * const result = WasmMotion.to(goal)
     *     .safe()  // Enable collision avoidance
     *     .runWithCollision(robot, checkCollision);
     * ```
     * @param {Robot} robot
     * @param {Function} collision_checker
     * @returns {WasmMotionResult}
     */
    runWithCollision(robot, collision_checker) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(robot, Robot);
            wasm.wasmmotion_runWithCollision(retptr, this.__wbg_ptr, robot.__wbg_ptr, addBorrowedObject(collision_checker));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return WasmMotionResult.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            heap[stack_pointer++] = undefined;
        }
    }
    /**
     * Run motion with GPU-accelerated collision planning using Lazy-PRM
     *
     * Uses GpuPlanningContext for batch collision checking, optimized for
     * WebGPU or GPU-accelerated environments.
     *
     * # Arguments
     * * `robot` - The robot to control
     * * `gpu_ctx` - GPU planning context (pre-built roadmap)
     * * `check_edges` - JS callback for batch edge validation:
     *   - Input: Array<[start: number[], end: number[]]>
     *   - Output: Array<boolean> (true = collision-free)
     *
     * # Example
     * ```typescript
     * // Setup GPU planning context
     * const gpuCtx = GpuPlanningContext.createBalanced(robot);
     * gpuCtx.buildRoadmap();
     *
     * // Create batch collision checker
     * const checkEdges = (edges) => {
     *     return edges.map(([start, end]) => {
     *         // Check each edge for collision
     *         const midpoint = start.map((s, i) => (s + end[i]) / 2);
     *         const poses = robot.getLinkTransforms(midpoint);
     *         return robotCollision.isConfigCollisionFree(env, poses);
     *     });
     * };
     *
     * // Plan with GPU-optimized Lazy-PRM
     * const result = WasmMotion.to(goal)
     *     .gpuBatch()  // Enable GPU batch mode
     *     .runWithGpuCollision(robot, gpuCtx, checkEdges);
     * ```
     * @param {Robot} robot
     * @param {GpuPlanningContext} gpu_ctx
     * @param {Function} check_edges
     * @returns {WasmMotionResult}
     */
    runWithGpuCollision(robot, gpu_ctx, check_edges) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(robot, Robot);
            _assertClass(gpu_ctx, GpuPlanningContext);
            wasm.wasmmotion_runWithGpuCollision(retptr, this.__wbg_ptr, robot.__wbg_ptr, gpu_ctx.__wbg_ptr, addBorrowedObject(check_edges));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return WasmMotionResult.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            heap[stack_pointer++] = undefined;
        }
    }
    /**
     * Create a motion to the target joint positions
     * @param {Float64Array} target
     * @returns {WasmMotion}
     */
    static to(target) {
        const ptr0 = passArrayF64ToWasm0(target, wasm.__wbindgen_export_0);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmmotion_to(ptr0, len0);
        return WasmMotion.__wrap(ret);
    }
    /**
     * Execute the motion on the robot
     *
     * Note: For collision-aware planning, use `runWithCollision()` which accepts
     * a collision checker callback. This method performs simple linear interpolation
     * or warns if collision mode is set without a collision checker.
     * @param {Robot} robot
     * @returns {WasmMotionResult}
     */
    run(robot) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(robot, Robot);
            wasm.wasmmotion_run(retptr, this.__wbg_ptr, robot.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return WasmMotionResult.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Set fast speed (1.0)
     * @returns {WasmMotion}
     */
    fast() {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.wasmmotion_fast(ptr);
        return WasmMotion.__wrap(ret);
    }
    /**
     * Set the start position (default: robot's current position)
     * @param {Float64Array} start
     * @returns {WasmMotion}
     */
    from(start) {
        const ptr = this.__destroy_into_raw();
        const ptr0 = passArrayF64ToWasm0(start, wasm.__wbindgen_export_0);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmmotion_from(ptr, ptr0, len0);
        return WasmMotion.__wrap(ret);
    }
    /**
     * Plan the motion without executing (returns trajectory)
     * @param {Robot} robot
     * @returns {WasmMotionResult}
     */
    plan(robot) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(robot, Robot);
            wasm.wasmmotion_plan(retptr, this.__wbg_ptr, robot.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return WasmMotionResult.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Enable collision avoidance
     * @returns {WasmMotion}
     */
    safe() {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.wasmmotion_safe(ptr);
        return WasmMotion.__wrap(ret);
    }
    /**
     * Set slow speed (0.3)
     * @returns {WasmMotion}
     */
    slow() {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.wasmmotion_slow(ptr);
        return WasmMotion.__wrap(ret);
    }
    /**
     * Use joint interpolation (fastest)
     * @returns {WasmMotion}
     */
    joint() {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.wasmmotion_joint(ptr);
        return WasmMotion.__wrap(ret);
    }
    /**
     * Set speed scale (0.01 - 1.0)
     * @param {number} scale
     * @returns {WasmMotion}
     */
    speed(scale) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.wasmmotion_speed(ptr, scale);
        return WasmMotion.__wrap(ret);
    }
    /**
     * Use linear Cartesian interpolation
     * @returns {WasmMotion}
     */
    linear() {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.wasmmotion_linear(ptr);
        return WasmMotion.__wrap(ret);
    }
    /**
     * Set smoothness level
     * @returns {WasmMotion}
     */
    smooth() {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.wasmmotion_smooth(ptr);
        return WasmMotion.__wrap(ret);
    }
    /**
     * Use spline interpolation
     * @returns {WasmMotion}
     */
    spline() {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.wasmmotion_spline(ptr);
        return WasmMotion.__wrap(ret);
    }
    /**
     * Set strict IK policy for Cartesian motion
     *
     * When enabled, the motion will fail if IK cannot solve for any
     * intermediate point along the Cartesian path. This ensures the TCP
     * follows the exact specified path.
     *
     * Use this for:
     * - Welding (seam accuracy)
     * - Dispensing/gluing (path precision)
     * - Machining (tool path accuracy)
     *
     * # Example
     * ```typescript
     * const result = WasmMotion.to(target)
     *     .linear()
     *     .strict()  // Fail if path unreachable
     *     .run(robot);
     * ```
     * @returns {WasmMotion}
     */
    strict() {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.wasmmotion_strict(ptr);
        return WasmMotion.__wrap(ret);
    }
    /**
     * Precision mode (slow + very smooth)
     * @returns {WasmMotion}
     */
    precise() {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.wasmmotion_precise(ptr);
        return WasmMotion.__wrap(ret);
    }
    /**
     * Enable adaptive replanning
     * @returns {WasmMotion}
     */
    adaptive() {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.wasmmotion_adaptive(ptr);
        return WasmMotion.__wrap(ret);
    }
    /**
     * Add dwell time at end (milliseconds)
     * @param {bigint} ms
     * @returns {WasmMotion}
     */
    dwellMs(ms) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.wasmmotion_dwellMs(ptr, ms);
        return WasmMotion.__wrap(ret);
    }
    /**
     * Verify collision-free (fail if collision detected)
     * @returns {WasmMotion}
     */
    verified() {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.wasmmotion_verified(ptr);
        return WasmMotion.__wrap(ret);
    }
    /**
     * Set collision mode to GPU batch planning
     *
     * Enables Lazy-PRM with batch collision checking, optimized for GPU/WebGPU.
     * Use with `runWithGpuCollision()` method.
     *
     * # Example
     * ```typescript
     * const result = WasmMotion.to(goal)
     *     .gpuBatch()  // Enable GPU batch mode
     *     .runWithGpuCollision(robot, gpuCtx, checkEdges);
     * ```
     * @returns {WasmMotion}
     */
    gpuBatch() {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.wasmmotion_gpuBatch(ptr);
        return WasmMotion.__wrap(ret);
    }
    /**
     * Get the current IK policy
     * @returns {CartesianIkPolicy}
     */
    get ikPolicy() {
        const ret = wasm.wasmmotion_ikPolicy(this.__wbg_ptr);
        return ret;
    }
    /**
     * Use linear Cartesian interpolation at specified TCP speed (mm/s)
     * @param {number} tcp_speed_mms
     * @returns {WasmMotion}
     */
    linearAt(tcp_speed_mms) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.wasmmotion_linearAt(ptr, tcp_speed_mms);
        return WasmMotion.__wrap(ret);
    }
}

const WasmMotionResultFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmmotionresult_free(ptr >>> 0, 1));
/**
 * Motion execution result
 */
export class WasmMotionResult {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmMotionResult.prototype);
        obj.__wbg_ptr = ptr;
        WasmMotionResultFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmMotionResultFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmmotionresult_free(ptr, 0);
    }
    /**
     * Get number of trajectory points
     * @returns {number}
     */
    get numPoints() {
        const ret = wasm.wasmmotionresult_numPoints(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get cable twist at end of motion (if cable-aware)
     * @returns {number | undefined}
     */
    get cableTwist() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.ikresult_error(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r2 = getDataViewMemory0().getFloat64(retptr + 8 * 1, true);
            return r0 === 0 ? undefined : r2;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get time at a specific index
     * @param {number} index
     * @returns {number | undefined}
     */
    getTimeAt(index) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmmotionresult_getTimeAt(retptr, this.__wbg_ptr, index);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r2 = getDataViewMemory0().getFloat64(retptr + 8 * 1, true);
            return r0 === 0 ? undefined : r2;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @returns {number}
     */
    get pathLength() {
        const ret = wasm.wasmmotionresult_pathLength(this.__wbg_ptr);
        return ret;
    }
    /**
     * Check if motion entered cable warning zone
     * @returns {boolean}
     */
    get cableWarning() {
        const ret = wasm.wasmmotionresult_cableWarning(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Check if motion exceeded cable limit
     * @returns {boolean}
     */
    get cableExceeded() {
        const ret = wasm.wasmmotionresult_cableExceeded(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {boolean}
     */
    get collisionFree() {
        const ret = wasm.wasmmotionresult_collisionFree(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Get trajectory as flat array [t0, j0_0..j0_n, t1, j1_0..j1_n, ...]
     * @returns {Float64Array}
     */
    getTrajectory() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmmotionresult_getTrajectory(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get maximum cable twist during motion
     * @returns {number | undefined}
     */
    get cableMaxTwist() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmmotionresult_cableMaxTwist(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r2 = getDataViewMemory0().getFloat64(retptr + 8 * 1, true);
            return r0 === 0 ? undefined : r2;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get joint positions at a specific index
     * @param {number} index
     * @returns {Float64Array | undefined}
     */
    getPositionsAt(index) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmmotionresult_getPositionsAt(retptr, this.__wbg_ptr, index);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            let v1;
            if (r0 !== 0) {
                v1 = getArrayF64FromWasm0(r0, r1).slice();
                wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            }
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @returns {number}
     */
    get planningTimeMs() {
        const ret = wasm.wasmmotionresult_planningTimeMs(this.__wbg_ptr);
        return ret;
    }
    /**
     * Check if cable tracking was enabled for this motion
     * @returns {boolean}
     */
    get hasCableTracking() {
        const ret = wasm.wasmmotionresult_hasCableTracking(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {number}
     */
    get trajectoryDuration() {
        const ret = wasm.wasmmotionresult_trajectoryDuration(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get dof() {
        const ret = wasm.wasmmotionresult_dof(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {boolean}
     */
    get executed() {
        const ret = wasm.wasmmotionresult_executed(this.__wbg_ptr);
        return ret !== 0;
    }
}

const WasmObstacleFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmobstacle_free(ptr >>> 0, 1));
/**
 * Simple obstacle shape for WASM (works without collision feature)
 */
export class WasmObstacle {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmObstacle.prototype);
        obj.__wbg_ptr = ptr;
        WasmObstacleFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmObstacleFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmobstacle_free(ptr, 0);
    }
    /**
     * Create a box obstacle
     * @param {string} id
     * @param {number} half_x
     * @param {number} half_y
     * @param {number} half_z
     * @returns {WasmObstacle}
     */
    static createBox(id, half_x, half_y, half_z) {
        const ptr0 = passStringToWasm0(id, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmobstacle_createBox(ptr0, len0, half_x, half_y, half_z);
        return WasmObstacle.__wrap(ret);
    }
    /**
     * @returns {string}
     */
    get shapeType() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmobstacle_shapeType(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_export_3(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {Float64Array}
     */
    get orientation() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmobstacle_orientation(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Set position
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    setPosition(x, y, z) {
        wasm.wasmobstacle_setPosition(this.__wbg_ptr, x, y, z);
    }
    /**
     * Create a sphere obstacle
     * @param {string} id
     * @param {number} radius
     * @returns {WasmObstacle}
     */
    static createSphere(id, radius) {
        const ptr0 = passStringToWasm0(id, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmobstacle_createSphere(ptr0, len0, radius);
        return WasmObstacle.__wrap(ret);
    }
    /**
     * Create a cylinder obstacle
     * @param {string} id
     * @param {number} radius
     * @param {number} half_height
     * @returns {WasmObstacle}
     */
    static createCylinder(id, radius, half_height) {
        const ptr0 = passStringToWasm0(id, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmobstacle_createCylinder(ptr0, len0, radius, half_height);
        return WasmObstacle.__wrap(ret);
    }
    /**
     * Set orientation from quaternion
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {number} w
     */
    setOrientation(x, y, z, w) {
        wasm.wasmobstacle_setOrientation(this.__wbg_ptr, x, y, z, w);
    }
    /**
     * @returns {string}
     */
    get id() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmobstacle_id(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_export_3(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {Float64Array}
     */
    get params() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmobstacle_params(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @returns {Float64Array}
     */
    get position() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmobstacle_position(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}

const WasmPathFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmpath_free(ptr >>> 0, 1));
/**
 * Path builder for multi-waypoint motions
 */
export class WasmPath {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmPath.prototype);
        obj.__wbg_ptr = ptr;
        WasmPathFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmPathFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmpath_free(ptr, 0);
    }
    /**
     * Execute the path with collision-aware planning
     *
     * Plans collision-free paths between consecutive waypoints using BiRRT.
     *
     * # Arguments
     * * `robot` - The robot for kinematics
     * * `collision_checker` - JS callback: (joints: number[]) => boolean (true = collision-free)
     *
     * # Example
     * ```typescript
     * const path = WasmPath.through([wp1, wp2, wp3], 6)
     *     .safe()  // Enable collision avoidance
     *     .runWithCollision(robot, checkCollision);
     * ```
     * @param {Robot} robot
     * @param {Function} collision_checker
     * @returns {WasmMotionResult}
     */
    runWithCollision(robot, collision_checker) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(robot, Robot);
            wasm.wasmpath_runWithCollision(retptr, this.__wbg_ptr, robot.__wbg_ptr, addBorrowedObject(collision_checker));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return WasmMotionResult.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            heap[stack_pointer++] = undefined;
        }
    }
    /**
     * Execute the path on the robot
     * @param {Robot} robot
     * @returns {WasmMotionResult}
     */
    run(robot) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(robot, Robot);
            wasm.wasmpath_run(retptr, this.__wbg_ptr, robot.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return WasmMotionResult.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Set the start position
     * @param {Float64Array} start
     * @returns {WasmPath}
     */
    from(start) {
        const ptr = this.__destroy_into_raw();
        const ptr0 = passArrayF64ToWasm0(start, wasm.__wbindgen_export_0);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmpath_from(ptr, ptr0, len0);
        return WasmPath.__wrap(ret);
    }
    /**
     * Enable collision avoidance
     * @returns {WasmPath}
     */
    safe() {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.wasmpath_safe(ptr);
        return WasmPath.__wrap(ret);
    }
    /**
     * Use joint interpolation
     * @returns {WasmPath}
     */
    joint() {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.wasmpath_joint(ptr);
        return WasmPath.__wrap(ret);
    }
    /**
     * Set speed scale
     * @param {number} scale
     * @returns {WasmPath}
     */
    speed(scale) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.wasmpath_speed(ptr, scale);
        return WasmPath.__wrap(ret);
    }
    /**
     * Use linear Cartesian interpolation
     * @returns {WasmPath}
     */
    linear() {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.wasmpath_linear(ptr);
        return WasmPath.__wrap(ret);
    }
    /**
     * Set smoothness
     * @returns {WasmPath}
     */
    smooth() {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.wasmpath_smooth(ptr);
        return WasmPath.__wrap(ret);
    }
    /**
     * Create a path through the given waypoints
     * waypoints: flattened array [wp1_j0, wp1_j1, ..., wp2_j0, wp2_j1, ...]
     * dof: degrees of freedom (to parse the flat array)
     * @param {Float64Array} waypoints_flat
     * @param {number} dof
     * @returns {WasmPath}
     */
    static through(waypoints_flat, dof) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF64ToWasm0(waypoints_flat, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            wasm.wasmpath_through(retptr, ptr0, len0, dof);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return WasmPath.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}

const WasmPathMetricsFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmpathmetrics_free(ptr >>> 0, 1));
/**
 * Path quality metrics
 */
export class WasmPathMetrics {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmPathMetrics.prototype);
        obj.__wbg_ptr = ptr;
        WasmPathMetricsFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmPathMetricsFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmpathmetrics_free(ptr, 0);
    }
    /**
     * Number of waypoints in the path
     * @returns {number}
     */
    get waypoint_count() {
        const ret = wasm.__wbg_get_gpuplanningcontextconfig_num_samples(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Number of waypoints in the path
     * @param {number} arg0
     */
    set waypoint_count(arg0) {
        wasm.__wbg_set_gpuplanningcontextconfig_num_samples(this.__wbg_ptr, arg0);
    }
    /**
     * Total path length in configuration space
     * @returns {number}
     */
    get path_length() {
        const ret = wasm.__wbg_get_batchcollisioncheckerconfig_safety_margin(this.__wbg_ptr);
        return ret;
    }
    /**
     * Total path length in configuration space
     * @param {number} arg0
     */
    set path_length(arg0) {
        wasm.__wbg_set_batchcollisioncheckerconfig_safety_margin(this.__wbg_ptr, arg0);
    }
    /**
     * Path smoothness (sum of squared accelerations)
     * @returns {number}
     */
    get smoothness() {
        const ret = wasm.__wbg_get_batchiksolveroptions_rot_tol(this.__wbg_ptr);
        return ret;
    }
    /**
     * Path smoothness (sum of squared accelerations)
     * @param {number} arg0
     */
    set smoothness(arg0) {
        wasm.__wbg_set_batchiksolveroptions_rot_tol(this.__wbg_ptr, arg0);
    }
    /**
     * Original waypoint count (before optimization)
     * @returns {number}
     */
    get original_waypoint_count() {
        const ret = wasm.__wbg_get_gpuplanningcontextconfig_k_neighbors(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Original waypoint count (before optimization)
     * @param {number} arg0
     */
    set original_waypoint_count(arg0) {
        wasm.__wbg_set_gpuplanningcontextconfig_k_neighbors(this.__wbg_ptr, arg0);
    }
    /**
     * Original path length (before optimization)
     * @returns {number}
     */
    get original_path_length() {
        const ret = wasm.__wbg_get_batchiksolveroptions_damping(this.__wbg_ptr);
        return ret;
    }
    /**
     * Original path length (before optimization)
     * @param {number} arg0
     */
    set original_path_length(arg0) {
        wasm.__wbg_set_batchiksolveroptions_damping(this.__wbg_ptr, arg0);
    }
    /**
     * Get improvement ratio (path length reduction)
     * @returns {number}
     */
    get improvementRatio() {
        const ret = wasm.wasmpathmetrics_improvementRatio(this.__wbg_ptr);
        return ret;
    }
    /**
     * Get waypoint reduction ratio
     * @returns {number}
     */
    get waypointReductionRatio() {
        const ret = wasm.wasmpathmetrics_waypointReductionRatio(this.__wbg_ptr);
        return ret;
    }
    constructor() {
        const ret = wasm.wasmpathmetrics_new();
        this.__wbg_ptr = ret >>> 0;
        WasmPathMetricsFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}

const WasmPipelineConfigFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmpipelineconfig_free(ptr >>> 0, 1));
/**
 * Configuration for the planning pipeline
 */
export class WasmPipelineConfig {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmPipelineConfig.prototype);
        obj.__wbg_ptr = ptr;
        WasmPipelineConfigFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmPipelineConfigFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmpipelineconfig_free(ptr, 0);
    }
    /**
     * Enable path post-processing (shortcutting + smoothing)
     * @returns {boolean}
     */
    get enable_post_processing() {
        const ret = wasm.__wbg_get_wasmpipelineconfig_enable_post_processing(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Enable path post-processing (shortcutting + smoothing)
     * @param {boolean} arg0
     */
    set enable_post_processing(arg0) {
        wasm.__wbg_set_wasmpipelineconfig_enable_post_processing(this.__wbg_ptr, arg0);
    }
    /**
     * Maximum iterations for shortcutting
     * @returns {number}
     */
    get shortcut_iterations() {
        const ret = wasm.__wbg_get_batchcollisioncheckerconfig_samples_per_edge(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Maximum iterations for shortcutting
     * @param {number} arg0
     */
    set shortcut_iterations(arg0) {
        wasm.__wbg_set_batchcollisioncheckerconfig_samples_per_edge(this.__wbg_ptr, arg0);
    }
    /**
     * Maximum iterations for smoothing
     * @returns {number}
     */
    get smooth_iterations() {
        const ret = wasm.__wbg_get_motionvalidationstats_valid_configs(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Maximum iterations for smoothing
     * @param {number} arg0
     */
    set smooth_iterations(arg0) {
        wasm.__wbg_set_motionvalidationstats_valid_configs(this.__wbg_ptr, arg0);
    }
    /**
     * Smoothing factor (0.0 to 1.0)
     * @returns {number}
     */
    get smoothing_factor() {
        const ret = wasm.__wbg_get_batchcollisioncheckerconfig_safety_margin(this.__wbg_ptr);
        return ret;
    }
    /**
     * Smoothing factor (0.0 to 1.0)
     * @param {number} arg0
     */
    set smoothing_factor(arg0) {
        wasm.__wbg_set_batchcollisioncheckerconfig_safety_margin(this.__wbg_ptr, arg0);
    }
    /**
     * Enable path quality metrics calculation
     * @returns {boolean}
     */
    get calculate_metrics() {
        const ret = wasm.__wbg_get_wasmpipelineconfig_calculate_metrics(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Enable path quality metrics calculation
     * @param {boolean} arg0
     */
    set calculate_metrics(arg0) {
        wasm.__wbg_set_wasmpipelineconfig_calculate_metrics(this.__wbg_ptr, arg0);
    }
    /**
     * Create with custom parameters
     * @param {number} shortcut_iterations
     * @param {number} smooth_iterations
     * @param {number} smoothing_factor
     * @returns {WasmPipelineConfig}
     */
    static withParams(shortcut_iterations, smooth_iterations, smoothing_factor) {
        const ret = wasm.wasmpipelineconfig_withParams(shortcut_iterations, smooth_iterations, smoothing_factor);
        return WasmPipelineConfig.__wrap(ret);
    }
    /**
     * Enable or disable metrics calculation
     * @param {boolean} enable
     * @returns {WasmPipelineConfig}
     */
    withMetrics(enable) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.wasmpipelineconfig_withMetrics(ptr, enable);
        return WasmPipelineConfig.__wrap(ret);
    }
    /**
     * Enable or disable post-processing
     * @param {boolean} enable
     * @returns {WasmPipelineConfig}
     */
    withPostProcessing(enable) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.wasmpipelineconfig_withPostProcessing(ptr, enable);
        return WasmPipelineConfig.__wrap(ret);
    }
    /**
     * Set smoothing factor
     * @param {number} factor
     * @returns {WasmPipelineConfig}
     */
    withSmoothingFactor(factor) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.wasmpipelineconfig_withSmoothingFactor(ptr, factor);
        return WasmPipelineConfig.__wrap(ret);
    }
    /**
     * Set smooth iterations
     * @param {number} iterations
     * @returns {WasmPipelineConfig}
     */
    withSmoothIterations(iterations) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.robotcontextconfig_withRoadmapSamples(ptr, iterations);
        return WasmPipelineConfig.__wrap(ret);
    }
    /**
     * Set shortcut iterations
     * @param {number} iterations
     * @returns {WasmPipelineConfig}
     */
    withShortcutIterations(iterations) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.robotcontextconfig_withSamplesPerEdge(ptr, iterations);
        return WasmPipelineConfig.__wrap(ret);
    }
    constructor() {
        const ret = wasm.wasmpipelineconfig_new();
        this.__wbg_ptr = ret >>> 0;
        WasmPipelineConfigFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}

const WasmPipelineResultFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmpipelineresult_free(ptr >>> 0, 1));
/**
 * Pipeline processing result
 */
export class WasmPipelineResult {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmPipelineResult.prototype);
        obj.__wbg_ptr = ptr;
        WasmPipelineResultFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmPipelineResultFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmpipelineresult_free(ptr, 0);
    }
    /**
     * Get a specific waypoint by index
     * @param {number} index
     * @returns {Float64Array}
     */
    getWaypoint(index) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmpipelineresult_getWaypoint(retptr, this.__wbg_ptr, index);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
            if (r3) {
                throw takeObject(r2);
            }
            var v1 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get number of waypoints
     * @returns {number}
     */
    get numWaypoints() {
        const ret = wasm.collisionenvironment_numCompositeObstacles(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Check if path was post-processed
     * @returns {boolean}
     */
    get postProcessed() {
        const ret = wasm.gpuplanningresult_success(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Get processing time in milliseconds
     * @returns {number}
     */
    get processingTimeMs() {
        const ret = wasm.wasmmotionresult_planningTimeMs(this.__wbg_ptr);
        return ret;
    }
    /**
     * Get DOF
     * @returns {number}
     */
    get dof() {
        const ret = wasm.ikresult_iterations(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get the optimized path as flat array
     * @returns {Float64Array}
     */
    get path() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmpipelineresult_path(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get path metrics
     * @returns {WasmPathMetrics}
     */
    get metrics() {
        const ret = wasm.pose_orientation(this.__wbg_ptr);
        return WasmPathMetrics.__wrap(ret);
    }
}

const WasmPlanningPipelineFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmplanningpipeline_free(ptr >>> 0, 1));
/**
 * Planning pipeline for path optimization
 *
 * Provides shortcutting and smoothing operations on planned paths.
 */
export class WasmPlanningPipeline {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmPlanningPipelineFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmplanningpipeline_free(ptr, 0);
    }
    /**
     * Apply only smoothing to a path
     * @param {Float64Array} path_flat
     * @param {number} dof
     * @param {Function | null} [collision_checker]
     * @returns {WasmPipelineResult}
     */
    smoothPath(path_flat, dof, collision_checker) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF64ToWasm0(path_flat, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            wasm.wasmplanningpipeline_smoothPath(retptr, this.__wbg_ptr, ptr0, len0, dof, isLikeNone(collision_checker) ? 0 : addHeapObject(collision_checker));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return WasmPipelineResult.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Set step size for collision checking
     * @param {number} step_size
     */
    setStepSize(step_size) {
        wasm.wasmplanningpipeline_setStepSize(this.__wbg_ptr, step_size);
    }
    /**
     * Apply only shortcutting to a path
     * @param {Float64Array} path_flat
     * @param {number} dof
     * @param {Function | null} [collision_checker]
     * @returns {WasmPipelineResult}
     */
    shortcutPath(path_flat, dof, collision_checker) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF64ToWasm0(path_flat, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            wasm.wasmplanningpipeline_shortcutPath(retptr, this.__wbg_ptr, ptr0, len0, dof, isLikeNone(collision_checker) ? 0 : addHeapObject(collision_checker));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return WasmPipelineResult.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Calculate path metrics without optimization
     * @param {Float64Array} path_flat
     * @param {number} dof
     * @returns {WasmPathMetrics}
     */
    calculateMetrics(path_flat, dof) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF64ToWasm0(path_flat, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            wasm.wasmplanningpipeline_calculateMetrics(retptr, this.__wbg_ptr, ptr0, len0, dof);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return WasmPathMetrics.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Process a path with collision checking
     *
     * @param path_flat - Flat array of waypoints
     * @param dof - Degrees of freedom
     * @param collision_checker - Function(config: number[]) => boolean (true = valid)
     * @param {Float64Array} path_flat
     * @param {number} dof
     * @param {Function} collision_checker
     * @returns {WasmPipelineResult}
     */
    processWithCollisionCheck(path_flat, dof, collision_checker) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF64ToWasm0(path_flat, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            wasm.wasmplanningpipeline_processWithCollisionCheck(retptr, this.__wbg_ptr, ptr0, len0, dof, addBorrowedObject(collision_checker));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return WasmPipelineResult.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            heap[stack_pointer++] = undefined;
        }
    }
    /**
     * Create a new planning pipeline
     * @param {JointLimits} joint_limits
     * @param {WasmPipelineConfig | null} [config]
     */
    constructor(joint_limits, config) {
        _assertClass(joint_limits, JointLimits);
        let ptr0 = 0;
        if (!isLikeNone(config)) {
            _assertClass(config, WasmPipelineConfig);
            ptr0 = config.__destroy_into_raw();
        }
        const ret = wasm.wasmplanningpipeline_new(joint_limits.__wbg_ptr, ptr0);
        this.__wbg_ptr = ret >>> 0;
        WasmPlanningPipelineFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Process a path through the pipeline (bounds checking only)
     *
     * @param path_flat - Flat array of waypoints
     * @param dof - Degrees of freedom
     * @param {Float64Array} path_flat
     * @param {number} dof
     * @returns {WasmPipelineResult}
     */
    process(path_flat, dof) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF64ToWasm0(path_flat, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            wasm.wasmplanningpipeline_process(retptr, this.__wbg_ptr, ptr0, len0, dof);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return WasmPipelineResult.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}

const WasmRobotCollisionModelFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmrobotcollisionmodel_free(ptr >>> 0, 1));
/**
 * Robot collision model for self-collision and environment collision checking
 *
 * Manages collision geometries for robot links and provides collision detection
 * methods. Includes an Allowed Collision Matrix (ACM) to skip collision checks
 * between adjacent links.
 *
 * ## Example
 *
 * ```typescript
 * // Create from URDF
 * const robotCollision = WasmRobotCollisionModel.fromUrdf(urdfContent);
 *
 * // Get link poses from robot FK
 * const linkPoses = robot.getLinkTransforms(joints);
 *
 * // Check self-collision
 * const selfResult = robotCollision.checkSelfCollision(linkPoses);
 * if (selfResult.inCollision) {
 *     console.log('Self-collision detected:', selfResult.collidingPairs);
 * }
 *
 * // Check environment collision
 * const envResult = robotCollision.checkEnvironmentCollision(env, linkPoses);
 * if (envResult.inCollision) {
 *     console.log('Environment collision detected:', envResult.collisions);
 * }
 * ```
 */
export class WasmRobotCollisionModel {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmRobotCollisionModel.prototype);
        obj.__wbg_ptr = ptr;
        WasmRobotCollisionModelFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmRobotCollisionModelFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmrobotcollisionmodel_free(ptr, 0);
    }
    /**
     * Get all link names that have collision geometries
     * @returns {string[]}
     */
    getLinkNames() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmrobotcollisionmodel_getLinkNames(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayJsValueFromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 4, 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Allow collision between two links (add to ACM)
     *
     * Collisions between these links will be skipped during self-collision checks.
     * @param {string} link1
     * @param {string} link2
     */
    allowLinkPair(link1, link2) {
        const ptr0 = passStringToWasm0(link1, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(link2, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len1 = WASM_VECTOR_LEN;
        wasm.wasmrobotcollisionmodel_allowLinkPair(this.__wbg_ptr, ptr0, len0, ptr1, len1);
    }
    /**
     * Add a box collision geometry to a link
     *
     * # Arguments
     * * `link_name` - Name of the link
     * * `half_extents` - Half dimensions [x, y, z]
     * * `origin` - Pose of the geometry relative to link frame
     * @param {string} link_name
     * @param {Float64Array} half_extents
     * @param {Pose} origin
     */
    addBoxGeometry(link_name, half_extents, origin) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(link_name, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(half_extents, wasm.__wbindgen_export_0);
            const len1 = WASM_VECTOR_LEN;
            _assertClass(origin, Pose);
            wasm.wasmrobotcollisionmodel_addBoxGeometry(retptr, this.__wbg_ptr, ptr0, len0, ptr1, len1, origin.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get total number of collision geometries
     * @returns {number}
     */
    get totalGeometries() {
        const ret = wasm.wasmrobotcollisionmodel_totalGeometries(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get all allowed link pairs
     *
     * Returns a flattened array: [link1, link2, link3, link4, ...]
     * representing pairs (link1, link2), (link3, link4), ...
     * @returns {string[]}
     */
    getAllowedPairs() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmrobotcollisionmodel_getAllowedPairs(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayJsValueFromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 4, 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Quick check if robot is in self-collision
     *
     * Returns true if any self-collision is detected. This is faster than
     * `checkSelfCollision` when you only need a boolean result.
     * @param {any} link_poses
     * @returns {boolean}
     */
    isSelfColliding(link_poses) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmrobotcollisionmodel_isSelfColliding(retptr, this.__wbg_ptr, addHeapObject(link_poses));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return r0 !== 0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Add a sphere collision geometry to a link
     * @param {string} link_name
     * @param {number} radius
     * @param {Pose} origin
     */
    addSphereGeometry(link_name, radius, origin) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(link_name, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            const len0 = WASM_VECTOR_LEN;
            _assertClass(origin, Pose);
            wasm.wasmrobotcollisionmodel_addSphereGeometry(retptr, this.__wbg_ptr, ptr0, len0, radius, origin.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Check for self-collision
     *
     * # Arguments
     * * `link_poses` - Object mapping link names to Pose objects
     *
     * # Returns
     * SelfCollisionResult with collision information
     * @param {any} link_poses
     * @returns {SelfCollisionResult}
     */
    checkSelfCollision(link_poses) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmrobotcollisionmodel_checkSelfCollision(retptr, this.__wbg_ptr, addHeapObject(link_poses));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return SelfCollisionResult.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Check if collision between two links is allowed
     * @param {string} link1
     * @param {string} link2
     * @returns {boolean}
     */
    isLinkPairAllowed(link1, link2) {
        const ptr0 = passStringToWasm0(link1, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(link2, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.wasmrobotcollisionmodel_isLinkPairAllowed(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        return ret !== 0;
    }
    /**
     * Add a cylinder collision geometry to a link
     * @param {string} link_name
     * @param {number} radius
     * @param {number} half_height
     * @param {Pose} origin
     */
    addCylinderGeometry(link_name, radius, half_height, origin) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(link_name, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            const len0 = WASM_VECTOR_LEN;
            _assertClass(origin, Pose);
            wasm.wasmrobotcollisionmodel_addCylinderGeometry(retptr, this.__wbg_ptr, ptr0, len0, radius, half_height, origin.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Check if an edge (two joint configurations) is collision-free
     *
     * Samples points along the edge and checks each for collision.
     * Optimized for planning - returns false on first collision found.
     *
     * # Arguments
     * * `env` - Collision environment
     * * `robot` - Robot for FK
     * * `start` - Start joint configuration
     * * `end` - End joint configuration
     * * `samples` - Number of samples along edge (default: 5)
     * @param {CollisionEnvironment} env
     * @param {Robot} robot
     * @param {Float64Array} start
     * @param {Float64Array} end
     * @param {number | null} [samples]
     * @returns {boolean}
     */
    isEdgeCollisionFree(env, robot, start, end, samples) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(env, CollisionEnvironment);
            _assertClass(robot, Robot);
            const ptr0 = passArrayF64ToWasm0(start, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(end, wasm.__wbindgen_export_0);
            const len1 = WASM_VECTOR_LEN;
            wasm.wasmrobotcollisionmodel_isEdgeCollisionFree(retptr, this.__wbg_ptr, env.__wbg_ptr, robot.__wbg_ptr, ptr0, len0, ptr1, len1, isLikeNone(samples) ? 0x100000001 : (samples) >>> 0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return r0 !== 0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Fast boolean self-collision check with early exit
     *
     * Optimized for motion planning where you only need to know IF there's
     * a collision. Returns immediately on first collision found.
     * @param {any} link_poses
     * @returns {boolean}
     */
    isSelfCollidingFast(link_poses) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmrobotcollisionmodel_isSelfCollidingFast(retptr, this.__wbg_ptr, addHeapObject(link_poses));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return r0 !== 0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Check if configuration is collision-free (no self-collision AND no environment collision)
     *
     * Optimized for motion planning - returns false on first collision found.
     * @param {CollisionEnvironment} env
     * @param {any} link_poses
     * @returns {boolean}
     */
    isConfigCollisionFree(env, link_poses) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(env, CollisionEnvironment);
            wasm.wasmrobotcollisionmodel_isConfigCollisionFree(retptr, this.__wbg_ptr, env.__wbg_ptr, addHeapObject(link_poses));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return r0 !== 0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Check collision between robot and environment
     *
     * # Arguments
     * * `env` - CollisionEnvironment with obstacles
     * * `link_poses` - Object mapping link names to Pose objects
     *
     * # Returns
     * RobotEnvironmentCollisionResult with collision information
     * @param {CollisionEnvironment} env
     * @param {any} link_poses
     * @returns {RobotEnvironmentCollisionResult}
     */
    checkEnvironmentCollision(env, link_poses) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(env, CollisionEnvironment);
            wasm.wasmrobotcollisionmodel_checkEnvironmentCollision(retptr, this.__wbg_ptr, env.__wbg_ptr, addHeapObject(link_poses));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return RobotEnvironmentCollisionResult.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Quick check if robot is colliding with environment
     *
     * Returns true if any collision with environment is detected.
     * @param {CollisionEnvironment} env
     * @param {any} link_poses
     * @returns {boolean}
     */
    isCollidingWithEnvironment(env, link_poses) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(env, CollisionEnvironment);
            wasm.wasmrobotcollisionmodel_isCollidingWithEnvironment(retptr, this.__wbg_ptr, env.__wbg_ptr, addHeapObject(link_poses));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return r0 !== 0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Create an empty robot collision model
     * @param {string} name
     */
    constructor(name) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmrobotcollisionmodel_new(ptr0, len0);
        this.__wbg_ptr = ret >>> 0;
        WasmRobotCollisionModelFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Get robot name
     * @returns {string}
     */
    get name() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmrobotcollisionmodel_name(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_export_3(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Get number of allowed pairs in the ACM
     * @returns {number}
     */
    get acmSize() {
        const ret = wasm.collisionenvironment_numCompositeObstacles(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Create a robot collision model from URDF content
     *
     * Automatically builds the Allowed Collision Matrix from the URDF joint tree,
     * excluding collision checks between adjacent links.
     * @param {string} urdf_content
     * @returns {WasmRobotCollisionModel}
     */
    static fromUrdf(urdf_content) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(urdf_content, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            const len0 = WASM_VECTOR_LEN;
            wasm.wasmrobotcollisionmodel_fromUrdf(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return WasmRobotCollisionModel.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Check if model only contains GPU-compatible shapes (Sphere, Capsule)
     * @returns {boolean}
     */
    isGpuCompatible() {
        const ret = wasm.wasmrobotcollisionmodel_isGpuCompatible(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Create from URDF with automatic capsule approximation
     *
     * This is optimal for GPU-accelerated collision detection.
     * All geometries are converted to capsules (Sphere and Capsule shapes).
     *
     * # Example
     * ```typescript
     * const options = WasmCapsuleApproximationOptions.gpuOptimized();
     * const { model, stats } = WasmRobotCollisionModel.fromUrdfWithCapsules(urdfContent, options);
     * console.log(`Converted ${stats.shapesConverted} shapes to ${stats.capsulesGenerated} capsules`);
     * ```
     * @param {string} urdf_content
     * @param {WasmCapsuleApproximationOptions} options
     * @returns {WasmCapsuleApproximationResult}
     */
    static fromUrdfWithCapsules(urdf_content, options) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(urdf_content, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            const len0 = WASM_VECTOR_LEN;
            _assertClass(options, WasmCapsuleApproximationOptions);
            wasm.wasmrobotcollisionmodel_fromUrdfWithCapsules(retptr, ptr0, len0, options.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return WasmCapsuleApproximationResult.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Convert existing model to use capsule approximations
     *
     * # Example
     * ```typescript
     * const model = WasmRobotCollisionModel.fromUrdf(urdfContent);
     * const options = WasmCapsuleApproximationOptions.gpuOptimized();
     * const { model: capsuleModel, stats } = model.toCapsuleApproximation(options);
     * ```
     * @param {WasmCapsuleApproximationOptions} options
     * @returns {WasmCapsuleApproximationResult}
     */
    toCapsuleApproximation(options) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(options, WasmCapsuleApproximationOptions);
            wasm.wasmrobotcollisionmodel_toCapsuleApproximation(retptr, this.__wbg_ptr, options.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return WasmCapsuleApproximationResult.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}

const WasmRobotConfigFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmrobotconfig_free(ptr >>> 0, 1));
/**
 * Robot configuration from the DH database
 */
export class WasmRobotConfig {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmRobotConfig.prototype);
        obj.__wbg_ptr = ptr;
        WasmRobotConfigFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmRobotConfigFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmrobotconfig_free(ptr, 0);
    }
    /**
     * Robot description
     * @returns {string}
     */
    get description() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmrobotconfig_description(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_export_3(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Get DH parameters
     * @returns {DhParam[]}
     */
    getDhParams() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmrobotconfig_getDhParams(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayJsValueFromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 4, 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get jerk limits (if available)
     * @returns {Float64Array | undefined}
     */
    getJerkLimits() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmrobotconfig_getJerkLimits(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            let v1;
            if (r0 !== 0) {
                v1 = getArrayF64FromWasm0(r0, r1).slice();
                wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            }
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get joint limits (if available)
     * @returns {JointLimits}
     */
    getJointLimits() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmrobotconfig_getJointLimits(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return JointLimits.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get velocity limits (if available)
     * @returns {Float64Array | undefined}
     */
    getVelocityLimits() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmrobotconfig_getVelocityLimits(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            let v1;
            if (r0 !== 0) {
                v1 = getArrayF64FromWasm0(r0, r1).slice();
                wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            }
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get acceleration limits (if available)
     * @returns {Float64Array | undefined}
     */
    getAccelerationLimits() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmrobotconfig_getAccelerationLimits(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            let v1;
            if (r0 !== 0) {
                v1 = getArrayF64FromWasm0(r0, r1).slice();
                wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            }
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Degrees of freedom
     * @returns {number}
     */
    get dof() {
        const ret = wasm.wasmrobotconfig_dof(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Robot name
     * @returns {string}
     */
    get name() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmrobotconfig_name(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_export_3(deferred1_0, deferred1_1, 1);
        }
    }
}

const WasmSequenceFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmsequence_free(ptr >>> 0, 1));
/**
 * Sequence builder for chaining motions
 */
export class WasmSequence {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmSequence.prototype);
        obj.__wbg_ptr = ptr;
        WasmSequenceFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmSequenceFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmsequence_free(ptr, 0);
    }
    /**
     * Enable cable-aware tracking for the entire sequence
     *
     * This tracks cable twist across all motions in the sequence,
     * accumulating twist from motion to motion.
     * @returns {WasmSequence}
     */
    cableAware() {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.wasmsequence_cableAware(ptr);
        return WasmSequence.__wrap(ret);
    }
    /**
     * Enable cable-aware tracking with custom configuration
     * @param {CableConfig} config
     * @returns {WasmSequence}
     */
    cableAwareWith(config) {
        const ptr = this.__destroy_into_raw();
        _assertClass(config, CableConfig);
        var ptr0 = config.__destroy_into_raw();
        const ret = wasm.wasmsequence_cableAwareWith(ptr, ptr0);
        return WasmSequence.__wrap(ret);
    }
    /**
     * Set initial cable twist for the sequence
     * @param {number} twist
     * @returns {WasmSequence}
     */
    withCableTwist(twist) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.wasmsequence_withCableTwist(ptr, twist);
        return WasmSequence.__wrap(ret);
    }
    /**
     * Execute all motions in sequence with collision avoidance
     *
     * Each motion in the sequence that has collision mode enabled will use
     * the BiRRT planner for collision-free path planning.
     *
     * # Arguments
     * * `robot` - The robot for kinematics
     * * `collision_checker` - JS callback: (joints: number[]) => boolean (true = collision-free)
     *
     * # Example
     * ```typescript
     * const seq = WasmSequence.start(motion1.safe())
     *     .then(motion2.safe())
     *     .runWithCollision(robot, checkCollision);
     * ```
     * @param {Robot} robot
     * @param {Function} collision_checker
     * @returns {WasmMotionResult}
     */
    runWithCollision(robot, collision_checker) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(robot, Robot);
            wasm.wasmsequence_runWithCollision(retptr, this.__wbg_ptr, robot.__wbg_ptr, addBorrowedObject(collision_checker));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return WasmMotionResult.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            heap[stack_pointer++] = undefined;
        }
    }
    /**
     * Execute all motions in sequence
     * @param {Robot} robot
     * @returns {WasmMotionResult}
     */
    run(robot) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(robot, Robot);
            wasm.wasmsequence_run(retptr, this.__wbg_ptr, robot.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return WasmMotionResult.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Add another motion to the sequence
     * @param {WasmMotion} motion
     * @returns {WasmSequence}
     */
    then(motion) {
        const ptr = this.__destroy_into_raw();
        _assertClass(motion, WasmMotion);
        var ptr0 = motion.__destroy_into_raw();
        const ret = wasm.wasmsequence_then(ptr, ptr0);
        return WasmSequence.__wrap(ret);
    }
    /**
     * Start a sequence with the first motion
     * @param {WasmMotion} motion
     * @returns {WasmSequence}
     */
    static start(motion) {
        _assertClass(motion, WasmMotion);
        var ptr0 = motion.__destroy_into_raw();
        const ret = wasm.wasmsequence_start(ptr0);
        return WasmSequence.__wrap(ret);
    }
}

const WasmTcpPointFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmtcppoint_free(ptr >>> 0, 1));
/**
 * A single TCP (Tool Center Point) definition for WASM
 *
 * Represents a point of interest on a tool with optional standoff distance.
 */
export class WasmTcpPoint {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmTcpPoint.prototype);
        obj.__wbg_ptr = ptr;
        WasmTcpPointFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmTcpPointFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmtcppoint_free(ptr, 0);
    }
    /**
     * Get TCP offset as pose
     * @returns {Pose}
     */
    getOffset() {
        const ret = wasm.wasmtcppoint_getOffset(this.__wbg_ptr);
        return Pose.__wrap(ret);
    }
    /**
     * Set the default standoff distance (mutating version)
     * @param {number} standoff
     */
    setStandoff(standoff) {
        wasm.wasmtcppoint_setStandoff(this.__wbg_ptr, standoff);
    }
    /**
     * Set the default standoff distance (builder pattern - consumes self)
     * Note: After calling this, the original object becomes invalid in JS
     * @param {number} standoff
     * @returns {WasmTcpPoint}
     */
    withStandoff(standoff) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.wasmtcppoint_withStandoff(ptr, standoff);
        return WasmTcpPoint.__wrap(ret);
    }
    /**
     * Get default standoff
     * @returns {number}
     */
    get defaultStandoff() {
        const ret = wasm.wasmtcppoint_defaultStandoff(this.__wbg_ptr);
        return ret;
    }
    /**
     * Get approach axis as [x, y, z]
     * @returns {Float64Array}
     */
    getApproachAxis() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmtcppoint_getApproachAxis(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Set the approach axis (mutating version)
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    setApproachAxis(x, y, z) {
        wasm.wasmtcppoint_setApproachAxis(this.__wbg_ptr, x, y, z);
    }
    /**
     * Validate if a standoff value is within range
     * @param {number} standoff
     * @returns {boolean}
     */
    validateStandoff(standoff) {
        const ret = wasm.wasmtcppoint_validateStandoff(this.__wbg_ptr, standoff);
        return ret !== 0;
    }
    /**
     * Get standoff range [min, max] or null
     * @returns {Float64Array | undefined}
     */
    getStandoffRange() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmtcppoint_getStandoffRange(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            let v1;
            if (r0 !== 0) {
                v1 = getArrayF64FromWasm0(r0, r1).slice();
                wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            }
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Set the standoff range (mutating version)
     * @param {number} min
     * @param {number} max
     */
    setStandoffRange(min, max) {
        wasm.wasmtcppoint_setStandoffRange(this.__wbg_ptr, min, max);
    }
    /**
     * Set the approach axis (builder pattern - consumes self)
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {WasmTcpPoint}
     */
    withApproachAxis(x, y, z) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.wasmtcppoint_withApproachAxis(ptr, x, y, z);
        return WasmTcpPoint.__wrap(ret);
    }
    /**
     * Set the standoff range (builder pattern - consumes self)
     * @param {number} min
     * @param {number} max
     * @returns {WasmTcpPoint}
     */
    withStandoffRange(min, max) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.wasmtcppoint_withStandoffRange(ptr, min, max);
        return WasmTcpPoint.__wrap(ret);
    }
    /**
     * Create a new TCP point
     *
     * # Arguments
     * * `name` - Human-readable name for this TCP
     * * `position` - Position offset [x, y, z] from tool base frame
     * * `orientation` - Quaternion [x, y, z, w] from tool base frame
     * @param {string} name
     * @param {Float64Array} position
     * @param {Float64Array} orientation
     */
    constructor(name, position, orientation) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(name, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(position, wasm.__wbindgen_export_0);
            const len1 = WASM_VECTOR_LEN;
            const ptr2 = passArrayF64ToWasm0(orientation, wasm.__wbindgen_export_0);
            const len2 = WASM_VECTOR_LEN;
            wasm.wasmtcppoint_new(retptr, ptr0, len0, ptr1, len1, ptr2, len2);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            this.__wbg_ptr = r0 >>> 0;
            WasmTcpPointFinalization.register(this, this.__wbg_ptr, this);
            return this;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get TCP name
     * @returns {string}
     */
    get name() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmtcppoint_name(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_export_3(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Create a simple TCP point with just position offset
     * @param {string} name
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {WasmTcpPoint}
     */
    static simple(name, x, y, z) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmtcppoint_simple(ptr0, len0, x, y, z);
        return WasmTcpPoint.__wrap(ret);
    }
}

const WasmToolFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmtool_free(ptr >>> 0, 1));
/**
 * A tool attached to the robot's end effector
 *
 * A tool can have multiple TCP (Tool Center Point) definitions for different
 * operations. For example, a vision-welder tool might have a "camera" TCP
 * for inspection and a "welder" TCP for welding.
 */
export class WasmTool {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmTool.prototype);
        obj.__wbg_ptr = ptr;
        WasmToolFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmToolFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmtool_free(ptr, 0);
    }
    /**
     * Remove a TCP by name
     * @param {string} name
     * @returns {boolean}
     */
    removeTcp(name) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmtool_removeTcp(this.__wbg_ptr, ptr0, len0);
        return ret !== 0;
    }
    /**
     * Get tool length (distance from flange to active TCP)
     * @returns {number}
     */
    get toolLength() {
        const ret = wasm.wasmtool_toolLength(this.__wbg_ptr);
        return ret;
    }
    /**
     * Add a TCP with full parameters
     * @param {string} name
     * @param {Float64Array} position
     * @param {Float64Array} orientation
     * @param {number} standoff
     * @param {number} standoff_min
     * @param {number} standoff_max
     * @param {Float64Array} approach_axis
     */
    addTcpFull(name, position, orientation, standoff, standoff_min, standoff_max, approach_axis) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(name, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(position, wasm.__wbindgen_export_0);
            const len1 = WASM_VECTOR_LEN;
            const ptr2 = passArrayF64ToWasm0(orientation, wasm.__wbindgen_export_0);
            const len2 = WASM_VECTOR_LEN;
            const ptr3 = passArrayF64ToWasm0(approach_axis, wasm.__wbindgen_export_0);
            const len3 = WASM_VECTOR_LEN;
            wasm.wasmtool_addTcpFull(retptr, this.__wbg_ptr, ptr0, len0, ptr1, len1, ptr2, len2, standoff, standoff_min, standoff_max, ptr3, len3);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Check if tool has multiple TCPs
     * @returns {boolean}
     */
    get isMultiTcp() {
        const ret = wasm.wasmtool_isMultiTcp(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Check if tool has collision geometries
     * @returns {boolean}
     */
    get hasCollision() {
        const ret = wasm.wasmtool_hasCollision(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Add a simple TCP with just position
     * @param {string} name
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    addSimpleTcp(name, x, y, z) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmtool_addSimpleTcp(this.__wbg_ptr, ptr0, len0, x, y, z);
    }
    /**
     * Get specific TCP offset by name
     * @param {string} name
     * @returns {Pose}
     */
    getTcpOffset(name) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(name, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            const len0 = WASM_VECTOR_LEN;
            wasm.wasmtool_getTcpOffset(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return Pose.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Set the active TCP
     * @param {string} name
     */
    setActiveTcp(name) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(name, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            const len0 = WASM_VECTOR_LEN;
            wasm.wasmtool_setActiveTcp(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get active TCP name (or null)
     * @returns {string | undefined}
     */
    get activeTcpName() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmtool_activeTcpName(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            let v1;
            if (r0 !== 0) {
                v1 = getStringFromWasm0(r0, r1).slice();
                wasm.__wbindgen_export_3(r0, r1 * 1, 1);
            }
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Create a simple tool with just position offset
     * @param {string} name
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {WasmTool}
     */
    static simplePosition(name, x, y, z) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmtool_simplePosition(ptr0, len0, x, y, z);
        return WasmTool.__wrap(ret);
    }
    /**
     * Clear the active TCP (use default)
     */
    clearActiveTcp() {
        wasm.wasmtool_clearActiveTcp(this.__wbg_ptr);
    }
    /**
     * Clear all obstacle exclusions
     */
    clearExclusions() {
        wasm.wasmtool_clearExclusions(this.__wbg_ptr);
    }
    /**
     * Exclude an obstacle from collision checking
     * @param {string} obstacle_id
     */
    excludeObstacle(obstacle_id) {
        const ptr0 = passStringToWasm0(obstacle_id, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmtool_excludeObstacle(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * Include an obstacle back into collision checking
     * @param {string} obstacle_id
     */
    includeObstacle(obstacle_id) {
        const ptr0 = passStringToWasm0(obstacle_id, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmtool_includeObstacle(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * Get flange offset as pose
     * @returns {Pose}
     */
    getFlangeOffset() {
        const ret = wasm.wasmtool_getFlangeOffset(this.__wbg_ptr);
        return Pose.__wrap(ret);
    }
    /**
     * Set flange offset (from robot flange to tool base frame)
     * @param {Float64Array} position
     * @param {Float64Array} orientation
     */
    setFlangeOffset(position, orientation) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF64ToWasm0(position, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(orientation, wasm.__wbindgen_export_0);
            const len1 = WASM_VECTOR_LEN;
            wasm.wasmtool_setFlangeOffset(retptr, this.__wbg_ptr, ptr0, len0, ptr1, len1);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Validate standoff for active TCP
     * @param {number} standoff
     * @returns {boolean}
     */
    validateStandoff(standoff) {
        const ret = wasm.wasmtool_validateStandoff(this.__wbg_ptr, standoff);
        return ret !== 0;
    }
    /**
     * Get center of mass
     * @returns {Float64Array | undefined}
     */
    getCenterOfMass() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmtool_getCenterOfMass(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            let v1;
            if (r0 !== 0) {
                v1 = getArrayF64FromWasm0(r0, r1).slice();
                wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            }
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Set center of mass
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    setCenterOfMass(x, y, z) {
        wasm.wasmtool_setCenterOfMass(this.__wbg_ptr, x, y, z);
    }
    /**
     * Get the collision link name for this tool
     * @returns {string}
     */
    get collisionLinkName() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmtool_collisionLinkName(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_export_3(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Check if an obstacle is excluded
     * @param {string} obstacle_id
     * @returns {boolean}
     */
    isObstacleExcluded(obstacle_id) {
        const ptr0 = passStringToWasm0(obstacle_id, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmtool_isObstacleExcluded(this.__wbg_ptr, ptr0, len0);
        return ret !== 0;
    }
    /**
     * Compute standoff pose given a target point and approach direction
     *
     * # Arguments
     * * `target_point` - Target point on workpiece [x, y, z]
     * * `approach_direction` - Direction to approach from [x, y, z]
     * * `standoff_distance` - Distance to maintain from target
     * @param {Float64Array} target_point
     * @param {Float64Array} approach_direction
     * @param {number} standoff_distance
     * @returns {Pose}
     */
    computeStandoffPose(target_point, approach_direction, standoff_distance) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF64ToWasm0(target_point, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(approach_direction, wasm.__wbindgen_export_0);
            const len1 = WASM_VECTOR_LEN;
            wasm.wasmtool_computeStandoffPose(retptr, this.__wbg_ptr, ptr0, len0, ptr1, len1, standoff_distance);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return Pose.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get active TCP offset as pose (flange to TCP)
     * @returns {Pose}
     */
    getActiveTcpOffset() {
        const ret = wasm.wasmtool_getActiveTcpOffset(this.__wbg_ptr);
        return Pose.__wrap(ret);
    }
    /**
     * Get list of excluded obstacles
     * @returns {string[]}
     */
    getExcludedObstacles() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmtool_getExcludedObstacles(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayJsValueFromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 4, 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get active TCP standoff range
     * @returns {Float64Array | undefined}
     */
    getActiveStandoffRange() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmtool_getActiveStandoffRange(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            let v1;
            if (r0 !== 0) {
                v1 = getArrayF64FromWasm0(r0, r1).slice();
                wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            }
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get active TCP default standoff
     * @returns {number}
     */
    getActiveDefaultStandoff() {
        const ret = wasm.wasmtool_getActiveDefaultStandoff(this.__wbg_ptr);
        return ret;
    }
    /**
     * Create a new empty tool
     * @param {string} name
     */
    constructor(name) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmtool_new(ptr0, len0);
        this.__wbg_ptr = ret >>> 0;
        WasmToolFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Get tool mass
     * @returns {number | undefined}
     */
    get mass() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.ikresult_error(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r2 = getDataViewMemory0().getFloat64(retptr + 8 * 1, true);
            return r0 === 0 ? undefined : r2;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get tool name
     * @returns {string}
     */
    get name() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmtool_name(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_export_3(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Create a simple tool with a single default TCP
     * @param {string} name
     * @param {Float64Array} position
     * @param {Float64Array} orientation
     * @returns {WasmTool}
     */
    static simple(name, position, orientation) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(name, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(position, wasm.__wbindgen_export_0);
            const len1 = WASM_VECTOR_LEN;
            const ptr2 = passArrayF64ToWasm0(orientation, wasm.__wbindgen_export_0);
            const len2 = WASM_VECTOR_LEN;
            wasm.wasmtool_simple(retptr, ptr0, len0, ptr1, len1, ptr2, len2);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return WasmTool.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Add a TCP to this tool
     *
     * # Arguments
     * * `name` - TCP name
     * * `position` - Position offset [x, y, z] from tool base
     * * `orientation` - Quaternion [x, y, z, w]
     * * `standoff` - Optional default standoff distance
     * @param {string} name
     * @param {Float64Array} position
     * @param {Float64Array} orientation
     * @param {number | null} [standoff]
     */
    addTcp(name, position, orientation, standoff) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(name, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(position, wasm.__wbindgen_export_0);
            const len1 = WASM_VECTOR_LEN;
            const ptr2 = passArrayF64ToWasm0(orientation, wasm.__wbindgen_export_0);
            const len2 = WASM_VECTOR_LEN;
            wasm.wasmtool_addTcp(retptr, this.__wbg_ptr, ptr0, len0, ptr1, len1, ptr2, len2, !isLikeNone(standoff), isLikeNone(standoff) ? 0 : standoff);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Set tool mass
     * @param {number} mass
     */
    setMass(mass) {
        wasm.wasmtool_setMass(this.__wbg_ptr, mass);
    }
    /**
     * Get number of TCPs
     * @returns {number}
     */
    get tcpCount() {
        const ret = wasm.wasmtool_tcpCount(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get all TCP names
     * @returns {string[]}
     */
    tcpNames() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmtool_tcpNames(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayJsValueFromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 4, 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}

const WasmToolLibraryFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmtoollibrary_free(ptr >>> 0, 1));
/**
 * Library for managing multiple tools
 *
 * Allows switching between different tools attached to the robot.
 */
export class WasmToolLibrary {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmToolLibraryFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmtoollibrary_free(ptr, 0);
    }
    /**
     * Get all tool names
     * @returns {string[]}
     */
    toolNames() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmtoollibrary_toolNames(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayJsValueFromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 4, 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Remove a tool from the library
     * @param {string} name
     * @returns {boolean}
     */
    removeTool(name) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmtoollibrary_removeTool(this.__wbg_ptr, ptr0, len0);
        return ret !== 0;
    }
    /**
     * Activate a tool by name
     * @param {string} name
     */
    activateTool(name) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(name, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            const len0 = WASM_VECTOR_LEN;
            wasm.wasmtoollibrary_activateTool(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Set active TCP on active tool
     * @param {string} tcp_name
     */
    setActiveTcp(tcp_name) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(tcp_name, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            const len0 = WASM_VECTOR_LEN;
            wasm.wasmtoollibrary_setActiveTcp(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Deactivate current tool
     */
    deactivateTool() {
        wasm.wasmtoollibrary_deactivateTool(this.__wbg_ptr);
    }
    /**
     * Get active tool name
     * @returns {string | undefined}
     */
    get activeToolName() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmtoollibrary_activeToolName(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            let v1;
            if (r0 !== 0) {
                v1 = getStringFromWasm0(r0, r1).slice();
                wasm.__wbindgen_export_3(r0, r1 * 1, 1);
            }
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get active tool offset (flange to TCP)
     * @returns {Pose | undefined}
     */
    getActiveToolOffset() {
        const ret = wasm.wasmtoollibrary_getActiveToolOffset(this.__wbg_ptr);
        return ret === 0 ? undefined : Pose.__wrap(ret);
    }
    /**
     * Get number of tools
     * @returns {number}
     */
    get len() {
        const ret = wasm.collisionenvironment_numObstacles(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Create a new empty tool library
     */
    constructor() {
        const ret = wasm.wasmtoollibrary_new();
        this.__wbg_ptr = ret >>> 0;
        WasmToolLibraryFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Activate tool and set TCP in one call
     * @param {string} tool_name
     * @param {string | null} [tcp_name]
     */
    activate(tool_name, tcp_name) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(tool_name, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            const len0 = WASM_VECTOR_LEN;
            var ptr1 = isLikeNone(tcp_name) ? 0 : passStringToWasm0(tcp_name, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            var len1 = WASM_VECTOR_LEN;
            wasm.wasmtoollibrary_activate(retptr, this.__wbg_ptr, ptr0, len0, ptr1, len1);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Add a tool to the library
     * @param {WasmTool} tool
     */
    addTool(tool) {
        _assertClass(tool, WasmTool);
        var ptr0 = tool.__destroy_into_raw();
        wasm.wasmtoollibrary_addTool(this.__wbg_ptr, ptr0);
    }
    /**
     * Check if a tool exists
     * @param {string} name
     * @returns {boolean}
     */
    hasTool(name) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmtoollibrary_hasTool(this.__wbg_ptr, ptr0, len0);
        return ret !== 0;
    }
    /**
     * Check if library is empty
     * @returns {boolean}
     */
    get isEmpty() {
        const ret = wasm.wasmdhdatabase_isEmpty(this.__wbg_ptr);
        return ret !== 0;
    }
}

const WasmTrajectoryFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmtrajectory_free(ptr >>> 0, 1));
/**
 * Generated trajectory result
 */
export class WasmTrajectory {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmTrajectory.prototype);
        obj.__wbg_ptr = ptr;
        WasmTrajectoryFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmTrajectoryFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmtrajectory_free(ptr, 0);
    }
    /**
     * Get number of joints
     * @returns {number}
     */
    get numJoints() {
        const ret = wasm.edgevalidationresult_numPoints(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get number of points
     * @returns {number}
     */
    get numPoints() {
        const ret = wasm.wasmtrajectory_numPoints(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get all positions as flat array [t0_j0, t0_j1, ..., t1_j0, t1_j1, ...]
     * @returns {Float64Array}
     */
    getPositionsFlat() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmtrajectory_getPositionsFlat(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get all velocities as flat array
     * @returns {Float64Array}
     */
    getVelocitiesFlat() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmtrajectory_getVelocitiesFlat(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get all accelerations as flat array
     * @returns {Float64Array}
     */
    getAccelerationsFlat() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmtrajectory_getAccelerationsFlat(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Sample trajectory at a specific time
     *
     * Uses linear interpolation between trajectory points.
     * @param {number} time
     * @returns {WasmTrajectoryPoint | undefined}
     */
    sample(time) {
        const ret = wasm.wasmtrajectory_sample(this.__wbg_ptr, time);
        return ret === 0 ? undefined : WasmTrajectoryPoint.__wrap(ret);
    }
    /**
     * Get trajectory duration in seconds
     * @returns {number}
     */
    get duration() {
        const ret = wasm.wasmtrajectory_duration(this.__wbg_ptr);
        return ret;
    }
    /**
     * Get a specific point by index
     * @param {number} index
     * @returns {WasmTrajectoryPoint | undefined}
     */
    getPoint(index) {
        const ret = wasm.wasmtrajectory_getPoint(this.__wbg_ptr, index);
        return ret === 0 ? undefined : WasmTrajectoryPoint.__wrap(ret);
    }
    /**
     * Get all times as array
     * @returns {Float64Array}
     */
    getTimes() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmtrajectory_getTimes(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}

const WasmTrajectoryPointFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmtrajectorypoint_free(ptr >>> 0, 1));
/**
 * A single trajectory point with time, position, velocity, and acceleration
 */
export class WasmTrajectoryPoint {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmTrajectoryPoint.prototype);
        obj.__wbg_ptr = ptr;
        WasmTrajectoryPointFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmTrajectoryPointFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmtrajectorypoint_free(ptr, 0);
    }
    /**
     * Get joint velocities
     * @returns {Float64Array}
     */
    get velocities() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmtrajectorypoint_velocities(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get joint accelerations
     * @returns {Float64Array}
     */
    get accelerations() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmtrajectorypoint_accelerations(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get time in seconds
     * @returns {number}
     */
    get time() {
        const ret = wasm.batchcollisionresult_totalTimeMs(this.__wbg_ptr);
        return ret;
    }
    /**
     * Get joint positions
     * @returns {Float64Array}
     */
    get positions() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmtrajectorypoint_positions(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}

const WorkspaceAnalysisFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_workspaceanalysis_free(ptr >>> 0, 1));
/**
 * Workspace analysis result
 */
export class WorkspaceAnalysis {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WorkspaceAnalysis.prototype);
        obj.__wbg_ptr = ptr;
        WorkspaceAnalysisFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WorkspaceAnalysisFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_workspaceanalysis_free(ptr, 0);
    }
    /**
     * @returns {boolean}
     */
    get isReachable() {
        const ret = wasm.wasmdiscretemotionvalidator_isCachingEnabled(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {number}
     */
    get manipulability() {
        const ret = wasm.batchcollisionresult_totalTimeMs(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get conditionNumber() {
        const ret = wasm.cableconfig_maxTwistRate(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {boolean}
     */
    get isNearSingular() {
        const ret = wasm.workspaceanalysis_isNearSingular(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {number}
     */
    get minSingularValue() {
        const ret = wasm.cableconfig_initialTwist(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {Float64Array}
     */
    get jointLimitMargins() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.workspaceanalysis_jointLimitMargins(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_3(r0, r1 * 8, 8);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);

            } catch (e) {
                if (module.headers.get('Content-Type') != 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else {
                    throw e;
                }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);

    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };

        } else {
            return instance;
        }
    }
}

function __wbg_get_imports() {
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbg_String_8f0eb39a4a4c2f66 = function(arg0, arg1) {
        const ret = String(getObject(arg1));
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbg_Window_2b9b35492d4b2d63 = function(arg0) {
        const ret = getObject(arg0).Window;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_WorkerGlobalScope_b4fb13f0ba6527ab = function(arg0) {
        const ret = getObject(arg0).WorkerGlobalScope;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_batchiksolver_new = function(arg0) {
        const ret = BatchIkSolver.__wrap(arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_beginComputePass_2061bb5db1032a35 = function(arg0, arg1) {
        const ret = getObject(arg0).beginComputePass(getObject(arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_buffer_609cc3eee51ed158 = function(arg0) {
        const ret = getObject(arg0).buffer;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_call_672a4d21634d4a24 = function() { return handleError(function (arg0, arg1) {
        const ret = getObject(arg0).call(getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_call_7cccdd69e0791ae2 = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = getObject(arg0).call(getObject(arg1), getObject(arg2));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_call_833bed5770ea2041 = function() { return handleError(function (arg0, arg1, arg2, arg3) {
        const ret = getObject(arg0).call(getObject(arg1), getObject(arg2), getObject(arg3));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_copyBufferToBuffer_e5b6f95a75ade65d = function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
        getObject(arg0).copyBufferToBuffer(getObject(arg1), arg2, getObject(arg3), arg4, arg5);
    }, arguments) };
    imports.wbg.__wbg_createBindGroupLayout_b87a1f26ed22bd5d = function() { return handleError(function (arg0, arg1) {
        const ret = getObject(arg0).createBindGroupLayout(getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_createBindGroup_dfdadbbcf4dcae54 = function(arg0, arg1) {
        const ret = getObject(arg0).createBindGroup(getObject(arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_createBuffer_fb1752eab5cb2a7f = function() { return handleError(function (arg0, arg1) {
        const ret = getObject(arg0).createBuffer(getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_createCommandEncoder_92b1c283a0372974 = function(arg0, arg1) {
        const ret = getObject(arg0).createCommandEncoder(getObject(arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_createComputePipeline_4cdc84e4d346bd71 = function(arg0, arg1) {
        const ret = getObject(arg0).createComputePipeline(getObject(arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_createPipelineLayout_c97169a1a177450e = function(arg0, arg1) {
        const ret = getObject(arg0).createPipelineLayout(getObject(arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_createShaderModule_159013272c1b4c4c = function(arg0, arg1) {
        const ret = getObject(arg0).createShaderModule(getObject(arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_crypto_86f2631e91b51511 = function(arg0) {
        const ret = getObject(arg0).crypto;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_dhparam_new = function(arg0) {
        const ret = DhParam.__wrap(arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_dhparam_unwrap = function(arg0) {
        const ret = DhParam.__unwrap(takeObject(arg0));
        return ret;
    };
    imports.wbg.__wbg_dispatchWorkgroups_89c6778d0518442a = function(arg0, arg1, arg2, arg3) {
        getObject(arg0).dispatchWorkgroups(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0);
    };
    imports.wbg.__wbg_end_56b2d6d0610f9131 = function(arg0) {
        getObject(arg0).end();
    };
    imports.wbg.__wbg_error_7534b8e9a36f1ab4 = function(arg0, arg1) {
        let deferred0_0;
        let deferred0_1;
        try {
            deferred0_0 = arg0;
            deferred0_1 = arg1;
            console.error(getStringFromWasm0(arg0, arg1));
        } finally {
            wasm.__wbindgen_export_3(deferred0_0, deferred0_1, 1);
        }
    };
    imports.wbg.__wbg_finish_ac8e8f8408208d93 = function(arg0) {
        const ret = getObject(arg0).finish();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_finish_b79779da004ef346 = function(arg0, arg1) {
        const ret = getObject(arg0).finish(getObject(arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_getMappedRange_86d4a434bceeb7fc = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = getObject(arg0).getMappedRange(arg1, arg2);
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_getRandomValues_b3f15fcbfabb0f8b = function() { return handleError(function (arg0, arg1) {
        getObject(arg0).getRandomValues(getObject(arg1));
    }, arguments) };
    imports.wbg.__wbg_get_67b2ba62fc30de12 = function() { return handleError(function (arg0, arg1) {
        const ret = Reflect.get(getObject(arg0), getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_get_b9b93047fe3cf45b = function(arg0, arg1) {
        const ret = getObject(arg0)[arg1 >>> 0];
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_getwithrefkey_1dc361bd10053bfe = function(arg0, arg1) {
        const ret = getObject(arg0)[getObject(arg1)];
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_gpu_051bdce6489ddf6a = function(arg0) {
        const ret = getObject(arg0).gpu;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_gpubatchresult_new = function(arg0) {
        const ret = GpuBatchResult.__wrap(arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_gpucollisioncontext_new = function(arg0) {
        const ret = GpuCollisionContext.__wrap(arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_gpuplanningresult_new = function(arg0) {
        const ret = GpuPlanningResult.__wrap(arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_gpuvscpucomparison_new = function(arg0) {
        const ret = GpuVsCpuComparison.__wrap(arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_instanceof_ArrayBuffer_e14585432e3737fc = function(arg0) {
        let result;
        try {
            result = getObject(arg0) instanceof ArrayBuffer;
        } catch (_) {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.wbg.__wbg_instanceof_GpuAdapter_aff4b0f95a6c1c3e = function(arg0) {
        let result;
        try {
            result = getObject(arg0) instanceof GPUAdapter;
        } catch (_) {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.wbg.__wbg_instanceof_Uint8Array_17156bcf118086a9 = function(arg0) {
        let result;
        try {
            result = getObject(arg0) instanceof Uint8Array;
        } catch (_) {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.wbg.__wbg_instanceof_Window_def73ea0955fc569 = function(arg0) {
        let result;
        try {
            result = getObject(arg0) instanceof Window;
        } catch (_) {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.wbg.__wbg_isArray_a1eab7e0d067391b = function(arg0) {
        const ret = Array.isArray(getObject(arg0));
        return ret;
    };
    imports.wbg.__wbg_keys_5c77a08ddc2fb8a6 = function(arg0) {
        const ret = Object.keys(getObject(arg0));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_label_c3a930571192f18e = function(arg0, arg1) {
        const ret = getObject(arg1).label;
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbg_length_a446193dc22c12f8 = function(arg0) {
        const ret = getObject(arg0).length;
        return ret;
    };
    imports.wbg.__wbg_length_e2d2a49132c1b256 = function(arg0) {
        const ret = getObject(arg0).length;
        return ret;
    };
    imports.wbg.__wbg_limits_4c117fe92a378b1a = function(arg0) {
        const ret = getObject(arg0).limits;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_mapAsync_0d9cf9d11808b275 = function(arg0, arg1, arg2, arg3) {
        const ret = getObject(arg0).mapAsync(arg1 >>> 0, arg2, arg3);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_maxBindGroups_060f2b40f8a292b1 = function(arg0) {
        const ret = getObject(arg0).maxBindGroups;
        return ret;
    };
    imports.wbg.__wbg_maxBindingsPerBindGroup_3e4b03bbed2da128 = function(arg0) {
        const ret = getObject(arg0).maxBindingsPerBindGroup;
        return ret;
    };
    imports.wbg.__wbg_maxBufferSize_deda0fa7852420cb = function(arg0) {
        const ret = getObject(arg0).maxBufferSize;
        return ret;
    };
    imports.wbg.__wbg_maxColorAttachmentBytesPerSample_4a4a0e04d76eaf2a = function(arg0) {
        const ret = getObject(arg0).maxColorAttachmentBytesPerSample;
        return ret;
    };
    imports.wbg.__wbg_maxColorAttachments_db4883eeb9e8aeae = function(arg0) {
        const ret = getObject(arg0).maxColorAttachments;
        return ret;
    };
    imports.wbg.__wbg_maxComputeInvocationsPerWorkgroup_d050c461ebc92998 = function(arg0) {
        const ret = getObject(arg0).maxComputeInvocationsPerWorkgroup;
        return ret;
    };
    imports.wbg.__wbg_maxComputeWorkgroupSizeX_48153a1b779879ad = function(arg0) {
        const ret = getObject(arg0).maxComputeWorkgroupSizeX;
        return ret;
    };
    imports.wbg.__wbg_maxComputeWorkgroupSizeY_7f73d3d16fdea180 = function(arg0) {
        const ret = getObject(arg0).maxComputeWorkgroupSizeY;
        return ret;
    };
    imports.wbg.__wbg_maxComputeWorkgroupSizeZ_9fcad0f0dfcffb05 = function(arg0) {
        const ret = getObject(arg0).maxComputeWorkgroupSizeZ;
        return ret;
    };
    imports.wbg.__wbg_maxComputeWorkgroupStorageSize_9fe29e00c7d166a6 = function(arg0) {
        const ret = getObject(arg0).maxComputeWorkgroupStorageSize;
        return ret;
    };
    imports.wbg.__wbg_maxComputeWorkgroupsPerDimension_f8321761bc8e8feb = function(arg0) {
        const ret = getObject(arg0).maxComputeWorkgroupsPerDimension;
        return ret;
    };
    imports.wbg.__wbg_maxDynamicStorageBuffersPerPipelineLayout_55e1416c376721db = function(arg0) {
        const ret = getObject(arg0).maxDynamicStorageBuffersPerPipelineLayout;
        return ret;
    };
    imports.wbg.__wbg_maxDynamicUniformBuffersPerPipelineLayout_17ff0903196c41a7 = function(arg0) {
        const ret = getObject(arg0).maxDynamicUniformBuffersPerPipelineLayout;
        return ret;
    };
    imports.wbg.__wbg_maxSampledTexturesPerShaderStage_59e5fc159e536f0d = function(arg0) {
        const ret = getObject(arg0).maxSampledTexturesPerShaderStage;
        return ret;
    };
    imports.wbg.__wbg_maxSamplersPerShaderStage_84f119909016576b = function(arg0) {
        const ret = getObject(arg0).maxSamplersPerShaderStage;
        return ret;
    };
    imports.wbg.__wbg_maxStorageBufferBindingSize_f9c3b3d285375ee0 = function(arg0) {
        const ret = getObject(arg0).maxStorageBufferBindingSize;
        return ret;
    };
    imports.wbg.__wbg_maxStorageBuffersPerShaderStage_f84b702138ac86a4 = function(arg0) {
        const ret = getObject(arg0).maxStorageBuffersPerShaderStage;
        return ret;
    };
    imports.wbg.__wbg_maxStorageTexturesPerShaderStage_226be46cbf594437 = function(arg0) {
        const ret = getObject(arg0).maxStorageTexturesPerShaderStage;
        return ret;
    };
    imports.wbg.__wbg_maxTextureArrayLayers_a8bf77269db7b94e = function(arg0) {
        const ret = getObject(arg0).maxTextureArrayLayers;
        return ret;
    };
    imports.wbg.__wbg_maxTextureDimension1D_8e69ba5596959195 = function(arg0) {
        const ret = getObject(arg0).maxTextureDimension1D;
        return ret;
    };
    imports.wbg.__wbg_maxTextureDimension2D_5a7a17047785cba5 = function(arg0) {
        const ret = getObject(arg0).maxTextureDimension2D;
        return ret;
    };
    imports.wbg.__wbg_maxTextureDimension3D_1ea793f1095d392a = function(arg0) {
        const ret = getObject(arg0).maxTextureDimension3D;
        return ret;
    };
    imports.wbg.__wbg_maxUniformBufferBindingSize_4b41f90d6914a995 = function(arg0) {
        const ret = getObject(arg0).maxUniformBufferBindingSize;
        return ret;
    };
    imports.wbg.__wbg_maxUniformBuffersPerShaderStage_c5db04bf022a0c83 = function(arg0) {
        const ret = getObject(arg0).maxUniformBuffersPerShaderStage;
        return ret;
    };
    imports.wbg.__wbg_maxVertexAttributes_e94e6c887b993b6c = function(arg0) {
        const ret = getObject(arg0).maxVertexAttributes;
        return ret;
    };
    imports.wbg.__wbg_maxVertexBufferArrayStride_92c15a2c2f0faf82 = function(arg0) {
        const ret = getObject(arg0).maxVertexBufferArrayStride;
        return ret;
    };
    imports.wbg.__wbg_maxVertexBuffers_db05674c76ef98c9 = function(arg0) {
        const ret = getObject(arg0).maxVertexBuffers;
        return ret;
    };
    imports.wbg.__wbg_minStorageBufferOffsetAlignment_2c9fb697a4aedb8b = function(arg0) {
        const ret = getObject(arg0).minStorageBufferOffsetAlignment;
        return ret;
    };
    imports.wbg.__wbg_minUniformBufferOffsetAlignment_6357875312bfd2f0 = function(arg0) {
        const ret = getObject(arg0).minUniformBufferOffsetAlignment;
        return ret;
    };
    imports.wbg.__wbg_msCrypto_d562bbe83e0d4b91 = function(arg0) {
        const ret = getObject(arg0).msCrypto;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_navigator_0a9bf1120e24fec2 = function(arg0) {
        const ret = getObject(arg0).navigator;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_navigator_1577371c070c8947 = function(arg0) {
        const ret = getObject(arg0).navigator;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_new_23a2665fac83c611 = function(arg0, arg1) {
        try {
            var state0 = {a: arg0, b: arg1};
            var cb0 = (arg0, arg1) => {
                const a = state0.a;
                state0.a = 0;
                try {
                    return __wbg_adapter_1175(a, state0.b, arg0, arg1);
                } finally {
                    state0.a = a;
                }
            };
            const ret = new Promise(cb0);
            return addHeapObject(ret);
        } finally {
            state0.a = state0.b = 0;
        }
    };
    imports.wbg.__wbg_new_405e22f390576ce2 = function() {
        const ret = new Object();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_new_78feb108b6472713 = function() {
        const ret = new Array();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_new_8a6f238a6ece86ea = function() {
        const ret = new Error();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_new_a12002a7f91c75be = function(arg0) {
        const ret = new Uint8Array(getObject(arg0));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_newnoargs_105ed471475aaf50 = function(arg0, arg1) {
        const ret = new Function(getStringFromWasm0(arg0, arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_newwithbyteoffsetandlength_d97e637ebe145a9a = function(arg0, arg1, arg2) {
        const ret = new Uint8Array(getObject(arg0), arg1 >>> 0, arg2 >>> 0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_newwithlength_a381634e90c276d4 = function(arg0) {
        const ret = new Uint8Array(arg0 >>> 0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_newwithlength_c4c419ef0bc8a1f8 = function(arg0) {
        const ret = new Array(arg0 >>> 0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_node_e1f24f89a7336c2e = function(arg0) {
        const ret = getObject(arg0).node;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_now_807e54c39636c349 = function() {
        const ret = Date.now();
        return ret;
    };
    imports.wbg.__wbg_pose_new = function(arg0) {
        const ret = Pose.__wrap(arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_process_3975fd6c72f520aa = function(arg0) {
        const ret = getObject(arg0).process;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_push_737cfc8c1432c2c6 = function(arg0, arg1) {
        const ret = getObject(arg0).push(getObject(arg1));
        return ret;
    };
    imports.wbg.__wbg_queueMicrotask_97d92b4fcc8a61c5 = function(arg0) {
        queueMicrotask(getObject(arg0));
    };
    imports.wbg.__wbg_queueMicrotask_d3219def82552485 = function(arg0) {
        const ret = getObject(arg0).queueMicrotask;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_queue_1f589e8194b004a6 = function(arg0) {
        const ret = getObject(arg0).queue;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_randomFillSync_f8c153b79f285817 = function() { return handleError(function (arg0, arg1) {
        getObject(arg0).randomFillSync(takeObject(arg1));
    }, arguments) };
    imports.wbg.__wbg_reject_b3fcf99063186ff7 = function(arg0) {
        const ret = Promise.reject(getObject(arg0));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_requestAdapter_51be7e8ee7d08b87 = function(arg0, arg1) {
        const ret = getObject(arg0).requestAdapter(getObject(arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_requestDevice_338f0085866d40a2 = function(arg0, arg1) {
        const ret = getObject(arg0).requestDevice(getObject(arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_require_b74f47fc2d022fd6 = function() { return handleError(function () {
        const ret = module.require;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_resolve_4851785c9c5f573d = function(arg0) {
        const ret = Promise.resolve(getObject(arg0));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_setBindGroup_43392eaf8ea524fa = function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
        getObject(arg0).setBindGroup(arg1 >>> 0, getObject(arg2), getArrayU32FromWasm0(arg3, arg4), arg5, arg6 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_setBindGroup_b90f6f79c7be4f96 = function(arg0, arg1, arg2) {
        getObject(arg0).setBindGroup(arg1 >>> 0, getObject(arg2));
    };
    imports.wbg.__wbg_setPipeline_e7c896fa93c7f292 = function(arg0, arg1) {
        getObject(arg0).setPipeline(getObject(arg1));
    };
    imports.wbg.__wbg_set_37837023f3d740e8 = function(arg0, arg1, arg2) {
        getObject(arg0)[arg1 >>> 0] = takeObject(arg2);
    };
    imports.wbg.__wbg_set_3f1d0b984ed272ed = function(arg0, arg1, arg2) {
        getObject(arg0)[takeObject(arg1)] = takeObject(arg2);
    };
    imports.wbg.__wbg_set_65595bdd868b3009 = function(arg0, arg1, arg2) {
        getObject(arg0).set(getObject(arg1), arg2 >>> 0);
    };
    imports.wbg.__wbg_set_bb8cecf6a62b9f46 = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = Reflect.set(getObject(arg0), getObject(arg1), getObject(arg2));
        return ret;
    }, arguments) };
    imports.wbg.__wbg_setaccess_c17e0a436ed1d78e = function(arg0, arg1) {
        getObject(arg0).access = __wbindgen_enum_GpuStorageTextureAccess[arg1];
    };
    imports.wbg.__wbg_setbeginningofpasswriteindex_90fab5f12cddf335 = function(arg0, arg1) {
        getObject(arg0).beginningOfPassWriteIndex = arg1 >>> 0;
    };
    imports.wbg.__wbg_setbindgrouplayouts_9eff5e187a1db39e = function(arg0, arg1) {
        getObject(arg0).bindGroupLayouts = getObject(arg1);
    };
    imports.wbg.__wbg_setbinding_3ada8a83c514d419 = function(arg0, arg1) {
        getObject(arg0).binding = arg1 >>> 0;
    };
    imports.wbg.__wbg_setbinding_9a389db987313ca9 = function(arg0, arg1) {
        getObject(arg0).binding = arg1 >>> 0;
    };
    imports.wbg.__wbg_setbuffer_581ee8422928bd0d = function(arg0, arg1) {
        getObject(arg0).buffer = getObject(arg1);
    };
    imports.wbg.__wbg_setbuffer_ac25c198252221bd = function(arg0, arg1) {
        getObject(arg0).buffer = getObject(arg1);
    };
    imports.wbg.__wbg_setcode_1d146372551ab97f = function(arg0, arg1, arg2) {
        getObject(arg0).code = getStringFromWasm0(arg1, arg2);
    };
    imports.wbg.__wbg_setcompute_edb2d4dd43759577 = function(arg0, arg1) {
        getObject(arg0).compute = getObject(arg1);
    };
    imports.wbg.__wbg_setendofpasswriteindex_bd98b6c885176c21 = function(arg0, arg1) {
        getObject(arg0).endOfPassWriteIndex = arg1 >>> 0;
    };
    imports.wbg.__wbg_setentries_136baaaafb25087f = function(arg0, arg1) {
        getObject(arg0).entries = getObject(arg1);
    };
    imports.wbg.__wbg_setentries_7c41d594195ebe78 = function(arg0, arg1) {
        getObject(arg0).entries = getObject(arg1);
    };
    imports.wbg.__wbg_setentrypoint_6f3d3792022065f4 = function(arg0, arg1, arg2) {
        getObject(arg0).entryPoint = getStringFromWasm0(arg1, arg2);
    };
    imports.wbg.__wbg_setformat_6ac892268eeef402 = function(arg0, arg1) {
        getObject(arg0).format = __wbindgen_enum_GpuTextureFormat[arg1];
    };
    imports.wbg.__wbg_sethasdynamicoffset_9dc29179158975e4 = function(arg0, arg1) {
        getObject(arg0).hasDynamicOffset = arg1 !== 0;
    };
    imports.wbg.__wbg_setlabel_21544401e31cd317 = function(arg0, arg1, arg2) {
        getObject(arg0).label = getStringFromWasm0(arg1, arg2);
    };
    imports.wbg.__wbg_setlabel_2312a64e22934a2b = function(arg0, arg1, arg2) {
        getObject(arg0).label = getStringFromWasm0(arg1, arg2);
    };
    imports.wbg.__wbg_setlabel_2ed86217d97ea3d5 = function(arg0, arg1, arg2) {
        getObject(arg0).label = getStringFromWasm0(arg1, arg2);
    };
    imports.wbg.__wbg_setlabel_4e4cb7e7f8cc2b59 = function(arg0, arg1, arg2) {
        getObject(arg0).label = getStringFromWasm0(arg1, arg2);
    };
    imports.wbg.__wbg_setlabel_81dd67dee9cd4287 = function(arg0, arg1, arg2) {
        getObject(arg0).label = getStringFromWasm0(arg1, arg2);
    };
    imports.wbg.__wbg_setlabel_8f9ebe053f8da7a0 = function(arg0, arg1, arg2) {
        getObject(arg0).label = getStringFromWasm0(arg1, arg2);
    };
    imports.wbg.__wbg_setlabel_a96e4bdaec7882ee = function(arg0, arg1, arg2) {
        getObject(arg0).label = getStringFromWasm0(arg1, arg2);
    };
    imports.wbg.__wbg_setlabel_bfbd23fc748f8f94 = function(arg0, arg1, arg2) {
        getObject(arg0).label = getStringFromWasm0(arg1, arg2);
    };
    imports.wbg.__wbg_setlabel_d400966bd7759b26 = function(arg0, arg1, arg2) {
        getObject(arg0).label = getStringFromWasm0(arg1, arg2);
    };
    imports.wbg.__wbg_setlabel_ecb2c1eab1d46433 = function(arg0, arg1, arg2) {
        getObject(arg0).label = getStringFromWasm0(arg1, arg2);
    };
    imports.wbg.__wbg_setlayout_0770a97fe3411616 = function(arg0, arg1) {
        getObject(arg0).layout = getObject(arg1);
    };
    imports.wbg.__wbg_setlayout_640caab7a290275b = function(arg0, arg1) {
        getObject(arg0).layout = getObject(arg1);
    };
    imports.wbg.__wbg_setmappedatcreation_e0c884a30f64323b = function(arg0, arg1) {
        getObject(arg0).mappedAtCreation = arg1 !== 0;
    };
    imports.wbg.__wbg_setminbindingsize_4a9f4d0d9ee579af = function(arg0, arg1) {
        getObject(arg0).minBindingSize = arg1;
    };
    imports.wbg.__wbg_setmodule_3b5d2caf4d494fba = function(arg0, arg1) {
        getObject(arg0).module = getObject(arg1);
    };
    imports.wbg.__wbg_setmultisampled_f2de771b3ad62ff3 = function(arg0, arg1) {
        getObject(arg0).multisampled = arg1 !== 0;
    };
    imports.wbg.__wbg_setoffset_a675629849c5f3b4 = function(arg0, arg1) {
        getObject(arg0).offset = arg1;
    };
    imports.wbg.__wbg_setpowerpreference_f4cead100f48bab0 = function(arg0, arg1) {
        getObject(arg0).powerPreference = __wbindgen_enum_GpuPowerPreference[arg1];
    };
    imports.wbg.__wbg_setqueryset_9921033bb33d882c = function(arg0, arg1) {
        getObject(arg0).querySet = getObject(arg1);
    };
    imports.wbg.__wbg_setrequiredfeatures_e9ee2e22feba0db3 = function(arg0, arg1) {
        getObject(arg0).requiredFeatures = getObject(arg1);
    };
    imports.wbg.__wbg_setresource_5a4cc69a127b394e = function(arg0, arg1) {
        getObject(arg0).resource = getObject(arg1);
    };
    imports.wbg.__wbg_setsampler_ab33334fb83c5a17 = function(arg0, arg1) {
        getObject(arg0).sampler = getObject(arg1);
    };
    imports.wbg.__wbg_setsampletype_89fd8e71274ee6c2 = function(arg0, arg1) {
        getObject(arg0).sampleType = __wbindgen_enum_GpuTextureSampleType[arg1];
    };
    imports.wbg.__wbg_setsize_a877ed6f434871bd = function(arg0, arg1) {
        getObject(arg0).size = arg1;
    };
    imports.wbg.__wbg_setsize_b2cab7e432ec25dc = function(arg0, arg1) {
        getObject(arg0).size = arg1;
    };
    imports.wbg.__wbg_setstoragetexture_0634dd6c87ac1132 = function(arg0, arg1) {
        getObject(arg0).storageTexture = getObject(arg1);
    };
    imports.wbg.__wbg_settexture_9dc3759e93cfbb84 = function(arg0, arg1) {
        getObject(arg0).texture = getObject(arg1);
    };
    imports.wbg.__wbg_settimestampwrites_be461aab39b4e744 = function(arg0, arg1) {
        getObject(arg0).timestampWrites = getObject(arg1);
    };
    imports.wbg.__wbg_settype_4ff365ea9ad896aa = function(arg0, arg1) {
        getObject(arg0).type = __wbindgen_enum_GpuBufferBindingType[arg1];
    };
    imports.wbg.__wbg_settype_b4b2fc6fbad39aeb = function(arg0, arg1) {
        getObject(arg0).type = __wbindgen_enum_GpuSamplerBindingType[arg1];
    };
    imports.wbg.__wbg_setusage_a102e6844c6a65de = function(arg0, arg1) {
        getObject(arg0).usage = arg1 >>> 0;
    };
    imports.wbg.__wbg_setviewdimension_c6aedf84f79e2593 = function(arg0, arg1) {
        getObject(arg0).viewDimension = __wbindgen_enum_GpuTextureViewDimension[arg1];
    };
    imports.wbg.__wbg_setviewdimension_ccb64a21a1495106 = function(arg0, arg1) {
        getObject(arg0).viewDimension = __wbindgen_enum_GpuTextureViewDimension[arg1];
    };
    imports.wbg.__wbg_setvisibility_3445d21752d17ded = function(arg0, arg1) {
        getObject(arg0).visibility = arg1 >>> 0;
    };
    imports.wbg.__wbg_stack_0ed75d68575b0f3c = function(arg0, arg1) {
        const ret = getObject(arg1).stack;
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbg_static_accessor_GLOBAL_88a902d13a557d07 = function() {
        const ret = typeof global === 'undefined' ? null : global;
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    };
    imports.wbg.__wbg_static_accessor_GLOBAL_THIS_56578be7e9f832b0 = function() {
        const ret = typeof globalThis === 'undefined' ? null : globalThis;
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    };
    imports.wbg.__wbg_static_accessor_SELF_37c5d418e4bf5819 = function() {
        const ret = typeof self === 'undefined' ? null : self;
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    };
    imports.wbg.__wbg_static_accessor_WINDOW_5de37043a91a9c40 = function() {
        const ret = typeof window === 'undefined' ? null : window;
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    };
    imports.wbg.__wbg_subarray_aa9065fa9dc5df96 = function(arg0, arg1, arg2) {
        const ret = getObject(arg0).subarray(arg1 >>> 0, arg2 >>> 0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_submit_522f9e0b9d7e22fd = function(arg0, arg1) {
        getObject(arg0).submit(getObject(arg1));
    };
    imports.wbg.__wbg_then_44b73946d2fb3e7d = function(arg0, arg1) {
        const ret = getObject(arg0).then(getObject(arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_then_48b406749878a531 = function(arg0, arg1, arg2) {
        const ret = getObject(arg0).then(getObject(arg1), getObject(arg2));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_unmap_a7fc4fb3238304a4 = function(arg0) {
        getObject(arg0).unmap();
    };
    imports.wbg.__wbg_versions_4e31226f5e8dc909 = function(arg0) {
        const ret = getObject(arg0).versions;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_warn_4ca3906c248c47c4 = function(arg0) {
        console.warn(getObject(arg0));
    };
    imports.wbg.__wbindgen_boolean_get = function(arg0) {
        const v = getObject(arg0);
        const ret = typeof(v) === 'boolean' ? (v ? 1 : 0) : 2;
        return ret;
    };
    imports.wbg.__wbindgen_cb_drop = function(arg0) {
        const obj = takeObject(arg0).original;
        if (obj.cnt-- == 1) {
            obj.a = 0;
            return true;
        }
        const ret = false;
        return ret;
    };
    imports.wbg.__wbindgen_closure_wrapper2456 = function(arg0, arg1, arg2) {
        const ret = makeMutClosure(arg0, arg1, 158, __wbg_adapter_40);
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_debug_string = function(arg0, arg1) {
        const ret = debugString(getObject(arg1));
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbindgen_error_new = function(arg0, arg1) {
        const ret = new Error(getStringFromWasm0(arg0, arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_in = function(arg0, arg1) {
        const ret = getObject(arg0) in getObject(arg1);
        return ret;
    };
    imports.wbg.__wbindgen_is_function = function(arg0) {
        const ret = typeof(getObject(arg0)) === 'function';
        return ret;
    };
    imports.wbg.__wbindgen_is_null = function(arg0) {
        const ret = getObject(arg0) === null;
        return ret;
    };
    imports.wbg.__wbindgen_is_object = function(arg0) {
        const val = getObject(arg0);
        const ret = typeof(val) === 'object' && val !== null;
        return ret;
    };
    imports.wbg.__wbindgen_is_string = function(arg0) {
        const ret = typeof(getObject(arg0)) === 'string';
        return ret;
    };
    imports.wbg.__wbindgen_is_undefined = function(arg0) {
        const ret = getObject(arg0) === undefined;
        return ret;
    };
    imports.wbg.__wbindgen_jsval_loose_eq = function(arg0, arg1) {
        const ret = getObject(arg0) == getObject(arg1);
        return ret;
    };
    imports.wbg.__wbindgen_memory = function() {
        const ret = wasm.memory;
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_number_get = function(arg0, arg1) {
        const obj = getObject(arg1);
        const ret = typeof(obj) === 'number' ? obj : undefined;
        getDataViewMemory0().setFloat64(arg0 + 8 * 1, isLikeNone(ret) ? 0 : ret, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
    };
    imports.wbg.__wbindgen_number_new = function(arg0) {
        const ret = arg0;
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_object_clone_ref = function(arg0) {
        const ret = getObject(arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_object_drop_ref = function(arg0) {
        takeObject(arg0);
    };
    imports.wbg.__wbindgen_string_get = function(arg0, arg1) {
        const obj = getObject(arg1);
        const ret = typeof(obj) === 'string' ? obj : undefined;
        var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        var len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbindgen_string_new = function(arg0, arg1) {
        const ret = getStringFromWasm0(arg0, arg1);
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_throw = function(arg0, arg1) {
        throw new Error(getStringFromWasm0(arg0, arg1));
    };

    return imports;
}

function __wbg_init_memory(imports, memory) {

}

function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    __wbg_init.__wbindgen_wasm_module = module;
    cachedDataViewMemory0 = null;
    cachedFloat32ArrayMemory0 = null;
    cachedFloat64ArrayMemory0 = null;
    cachedUint32ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;


    wasm.__wbindgen_start();
    return wasm;
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (typeof module !== 'undefined') {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();

    __wbg_init_memory(imports);

    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }

    const instance = new WebAssembly.Instance(module, imports);

    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (typeof module_or_path !== 'undefined') {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (typeof module_or_path === 'undefined') {
        module_or_path = new URL('trajx_wasm_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    __wbg_init_memory(imports);

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync };
export default __wbg_init;
