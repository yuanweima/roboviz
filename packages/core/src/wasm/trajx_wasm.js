let wasm;

const heap = new Array(128).fill(undefined);

heap.push(undefined, null, true, false);

function getObject(idx) { return heap[idx]; }

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
        wasm.__wbindgen_export_0(addHeapObject(e));
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

let cachedUint8ArrayMemory0 = null;

function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

let WASM_VECTOR_LEN = 0;

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

function isLikeNone(x) {
    return x === undefined || x === null;
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
        wasm.__wbindgen_export_1(r0, r1 * 4, 4);
        return v1;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Create a robot from a URDF string
 * @param {string} urdf_content
 * @returns {Robot}
 */
export function createRobot(urdf_content) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(urdf_content, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
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

function _assertClass(instance, klass) {
    if (!(instance instanceof klass)) {
        throw new Error(`expected instance of ${klass.name}`);
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

function getArrayF64FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getFloat64ArrayMemory0().subarray(ptr / 8, ptr / 8 + len);
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
        const ptr0 = passArrayJsValueToWasm0(dh_params, wasm.__wbindgen_export_2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayF32ToWasm0(joint_angles_flat, wasm.__wbindgen_export_2);
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
        wasm.__wbindgen_export_1(r0, r1 * 4, 4);
        return v3;
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
        const ptr0 = passArrayJsValueToWasm0(dh_params, wasm.__wbindgen_export_2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayF64ToWasm0(joint_angles, wasm.__wbindgen_export_2);
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
        wasm.__wbindgen_export_1(r0, r1 * 4, 4);
        return v3;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
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
        const ptr0 = passArrayJsValueToWasm0(dh_params, wasm.__wbindgen_export_2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayF64ToWasm0(joint_angles, wasm.__wbindgen_export_2);
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
        const ptr0 = passArrayJsValueToWasm0(dh_params, wasm.__wbindgen_export_2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayF64ToWasm0(joint_angles_flat, wasm.__wbindgen_export_2);
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
        wasm.__wbindgen_export_1(r0, r1 * 8, 8);
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
    const ptr0 = passArrayJsValueToWasm0(dh_params, wasm.__wbindgen_export_2);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(target_pose, Pose);
    var ptr1 = isLikeNone(seed) ? 0 : passArrayF64ToWasm0(seed, wasm.__wbindgen_export_2);
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
        const ptr0 = passArrayJsValueToWasm0(dh_params, wasm.__wbindgen_export_2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayF32ToWasm0(joint_angles_flat, wasm.__wbindgen_export_2);
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
        wasm.__wbindgen_export_1(r0, r1 * 4, 4);
        return v3;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
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
        const ptr0 = passArrayF64ToWasm0(waypoints, wasm.__wbindgen_export_2);
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
        wasm.__wbindgen_export_1(r0, r1 * 4, 4);
        return v1;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
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
        wasm.__wbindgen_export_1(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Initialize panic hook for better error messages in browser console
 */
export function init() {
    wasm.init();
}

/**
 * Check if the library is initialized
 * @returns {boolean}
 */
export function is_ready() {
    const ret = wasm.is_ready();
    return ret !== 0;
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
 * Get a standard cable configuration (4π limit, 2 full rotations / 720°)
 * @returns {CableConfig}
 */
export function cablePresetStandard() {
    const ret = wasm.cablePresetStandard();
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
 * Get a heavy-duty cable configuration (2π limit, 1 full rotation / 360°)
 * For thick, stiff cables that cannot twist much
 * @returns {CableConfig}
 */
export function cablePresetHeavyDuty() {
    const ret = wasm.cablePresetHeavyDuty();
    return CableConfig.__wrap(ret);
}

let stack_pointer = 128;

function addBorrowedObject(obj) {
    if (stack_pointer == 1) throw new Error('out of js stack');
    heap[--stack_pointer] = obj;
    return stack_pointer;
}
/**
 * Compute path length from flat array
 * @param {Float64Array} path_flat
 * @param {number} dof
 * @returns {number}
 */
export function computePathLength(path_flat, dof) {
    const ptr0 = passArrayF64ToWasm0(path_flat, wasm.__wbindgen_export_2);
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
    const ptr0 = passArrayF64ToWasm0(path_flat, wasm.__wbindgen_export_2);
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
        const ptr0 = passArrayF64ToWasm0(path_flat, wasm.__wbindgen_export_2);
        const len0 = WASM_VECTOR_LEN;
        wasm.interpolatePathFlat(retptr, ptr0, len0, resolution);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var v2 = getArrayF64FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export_1(r0, r1 * 8, 8);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
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
 * Collision handling mode
 * @enum {0 | 1 | 2 | 3 | 4}
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
    /**
     * Maximum iterations
     * @returns {number}
     */
    get max_iterations() {
        const ret = wasm.__wbg_get_birrtconfig_max_iterations(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Maximum iterations
     * @param {number} arg0
     */
    set max_iterations(arg0) {
        wasm.__wbg_set_birrtconfig_max_iterations(this.__wbg_ptr, arg0);
    }
    /**
     * Goal bias probability (0.0 - 1.0)
     * @returns {number}
     */
    get goal_bias() {
        const ret = wasm.__wbg_get_birrtconfig_goal_bias(this.__wbg_ptr);
        return ret;
    }
    /**
     * Goal bias probability (0.0 - 1.0)
     * @param {number} arg0
     */
    set goal_bias(arg0) {
        wasm.__wbg_set_birrtconfig_goal_bias(this.__wbg_ptr, arg0);
    }
    /**
     * Maximum extension distance per step
     * @returns {number}
     */
    get max_extension() {
        const ret = wasm.__wbg_get_birrtconfig_max_extension(this.__wbg_ptr);
        return ret;
    }
    /**
     * Maximum extension distance per step
     * @param {number} arg0
     */
    set max_extension(arg0) {
        wasm.__wbg_set_birrtconfig_max_extension(this.__wbg_ptr, arg0);
    }
    /**
     * Connection distance threshold
     * @returns {number}
     */
    get connect_threshold() {
        const ret = wasm.__wbg_get_birrtconfig_connect_threshold(this.__wbg_ptr);
        return ret;
    }
    /**
     * Connection distance threshold
     * @param {number} arg0
     */
    set connect_threshold(arg0) {
        wasm.__wbg_set_birrtconfig_connect_threshold(this.__wbg_ptr, arg0);
    }
    /**
     * Step size for collision checking
     * @returns {number}
     */
    get step_size() {
        const ret = wasm.__wbg_get_birrtconfig_step_size(this.__wbg_ptr);
        return ret;
    }
    /**
     * Step size for collision checking
     * @param {number} arg0
     */
    set step_size(arg0) {
        wasm.__wbg_set_birrtconfig_step_size(this.__wbg_ptr, arg0);
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
            const ptr0 = passArrayF64ToWasm0(start, wasm.__wbindgen_export_2);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(goal, wasm.__wbindgen_export_2);
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
            const ptr0 = passArrayF64ToWasm0(start, wasm.__wbindgen_export_2);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(goal, wasm.__wbindgen_export_2);
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
        const ptr0 = passArrayF64ToWasm0(start, wasm.__wbindgen_export_2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayF64ToWasm0(goal, wasm.__wbindgen_export_2);
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
        const ret = wasm.cableconfig_maxTotalTwist(this.__wbg_ptr);
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
        const ret = wasm.__wbg_get_birrtconfig_goal_bias(this.__wbg_ptr);
        return ret;
    }
    /**
     * Link length (a)
     * @param {number} arg0
     */
    set a(arg0) {
        wasm.__wbg_set_birrtconfig_goal_bias(this.__wbg_ptr, arg0);
    }
    /**
     * Link twist (alpha) in radians
     * @returns {number}
     */
    get alpha() {
        const ret = wasm.__wbg_get_birrtconfig_max_extension(this.__wbg_ptr);
        return ret;
    }
    /**
     * Link twist (alpha) in radians
     * @param {number} arg0
     */
    set alpha(arg0) {
        wasm.__wbg_set_birrtconfig_max_extension(this.__wbg_ptr, arg0);
    }
    /**
     * Link offset (d)
     * @returns {number}
     */
    get d() {
        const ret = wasm.__wbg_get_birrtconfig_connect_threshold(this.__wbg_ptr);
        return ret;
    }
    /**
     * Link offset (d)
     * @param {number} arg0
     */
    set d(arg0) {
        wasm.__wbg_set_birrtconfig_connect_threshold(this.__wbg_ptr, arg0);
    }
    /**
     * Joint angle offset (theta) in radians
     * @returns {number}
     */
    get theta() {
        const ret = wasm.__wbg_get_birrtconfig_step_size(this.__wbg_ptr);
        return ret;
    }
    /**
     * Joint angle offset (theta) in radians
     * @param {number} arg0
     */
    set theta(arg0) {
        wasm.__wbg_set_birrtconfig_step_size(this.__wbg_ptr, arg0);
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
            wasm.__wbindgen_export_1(r0, r1 * 8, 8);
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
            wasm.__wbindgen_export_1(r0, r1 * 8, 8);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
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
                wasm.__wbindgen_export_1(r0, r1 * 1, 1);
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
                wasm.__wbindgen_export_1(r0, r1 * 1, 1);
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
                wasm.__wbindgen_export_1(r0, r1 * 8, 8);
            }
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
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
            const ptr0 = passArrayF64ToWasm0(lower, wasm.__wbindgen_export_2);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(upper, wasm.__wbindgen_export_2);
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
            const ptr0 = passArrayF64ToWasm0(joints, wasm.__wbindgen_export_2);
            const len0 = WASM_VECTOR_LEN;
            wasm.jointlimits_clamp(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v2 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_1(r0, r1 * 8, 8);
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
            wasm.__wbindgen_export_1(r0, r1 * 8, 8);
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
            wasm.__wbindgen_export_1(r0, r1 * 8, 8);
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
        const ptr0 = passArrayF64ToWasm0(joints, wasm.__wbindgen_export_2);
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
            wasm.__wbindgen_export_1(r0, r1 * 8, 8);
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
            wasm.__wbindgen_export_1(r0, r1 * 8, 8);
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
            wasm.__wbindgen_export_1(r0, r1 * 8, 8);
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
            const ptr0 = passArrayF64ToWasm0(max_velocity, wasm.__wbindgen_export_2);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(max_acceleration, wasm.__wbindgen_export_2);
            const len1 = WASM_VECTOR_LEN;
            const ptr2 = passArrayF64ToWasm0(max_jerk, wasm.__wbindgen_export_2);
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
        const ret = wasm.__wbg_get_motionvalidationstats_configs_checked(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Total number of configurations checked
     * @param {number} arg0
     */
    set configs_checked(arg0) {
        wasm.__wbg_set_motionvalidationstats_configs_checked(this.__wbg_ptr, arg0);
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
        const ret = wasm.__wbg_get_motionvalidationstats_invalid_configs(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Number of invalid configurations
     * @param {number} arg0
     */
    set invalid_configs(arg0) {
        wasm.__wbg_set_motionvalidationstats_invalid_configs(this.__wbg_ptr, arg0);
    }
    /**
     * Total validation time in milliseconds
     * @returns {number}
     */
    get total_time_ms() {
        const ret = wasm.__wbg_get_birrtconfig_goal_bias(this.__wbg_ptr);
        return ret;
    }
    /**
     * Total validation time in milliseconds
     * @param {number} arg0
     */
    set total_time_ms(arg0) {
        wasm.__wbg_set_birrtconfig_goal_bias(this.__wbg_ptr, arg0);
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
                wasm.__wbindgen_export_1(r0, r1 * 8, 8);
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
                wasm.__wbindgen_export_1(r0, r1 * 1, 1);
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
            wasm.__wbindgen_export_1(r0, r1 * 8, 8);
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
            wasm.__wbindgen_export_1(r0, r1 * 8, 8);
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
        const ret = wasm.__wbg_get_motionvalidationstats_invalid_configs(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Number of samples for roadmap construction
     * @param {number} arg0
     */
    set num_samples(arg0) {
        wasm.__wbg_set_motionvalidationstats_invalid_configs(this.__wbg_ptr, arg0);
    }
    /**
     * Number of neighbors to connect
     * @returns {number}
     */
    get k_neighbors() {
        const ret = wasm.__wbg_get_prmconfig_k_neighbors(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Number of neighbors to connect
     * @param {number} arg0
     */
    set k_neighbors(arg0) {
        wasm.__wbg_set_prmconfig_k_neighbors(this.__wbg_ptr, arg0);
    }
    /**
     * Maximum connection distance
     * @returns {number}
     */
    get max_connection_distance() {
        const ret = wasm.__wbg_get_birrtconfig_goal_bias(this.__wbg_ptr);
        return ret;
    }
    /**
     * Maximum connection distance
     * @param {number} arg0
     */
    set max_connection_distance(arg0) {
        wasm.__wbg_set_birrtconfig_goal_bias(this.__wbg_ptr, arg0);
    }
    /**
     * Step size for collision checking
     * @returns {number}
     */
    get step_size() {
        const ret = wasm.__wbg_get_birrtconfig_max_extension(this.__wbg_ptr);
        return ret;
    }
    /**
     * Step size for collision checking
     * @param {number} arg0
     */
    set step_size(arg0) {
        wasm.__wbg_set_birrtconfig_max_extension(this.__wbg_ptr, arg0);
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
            const ptr0 = passArrayF64ToWasm0(start, wasm.__wbindgen_export_2);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(goal, wasm.__wbindgen_export_2);
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
        const ptr0 = passArrayF64ToWasm0(start, wasm.__wbindgen_export_2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayF64ToWasm0(goal, wasm.__wbindgen_export_2);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.prmplanner_query(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        return PlanningResult.__wrap(ret);
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
            const ptr0 = passArrayF64ToWasm0(path_flat, wasm.__wbindgen_export_2);
            const len0 = WASM_VECTOR_LEN;
            _assertClass(joint_limits, JointLimits);
            wasm.pathoptimizer_shortcutWithCollisionCheck(retptr, this.__wbg_ptr, ptr0, len0, joint_limits.__wbg_ptr, addBorrowedObject(collision_checker));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v2 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_1(r0, r1 * 8, 8);
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
            const ptr0 = passArrayF64ToWasm0(path_flat, wasm.__wbindgen_export_2);
            const len0 = WASM_VECTOR_LEN;
            _assertClass(joint_limits, JointLimits);
            wasm.pathoptimizer_shortcut(retptr, this.__wbg_ptr, ptr0, len0, joint_limits.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v2 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_1(r0, r1 * 8, 8);
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
                wasm.__wbindgen_export_1(r0, r1 * 8, 8);
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
            wasm.__wbindgen_export_1(r0, r1 * 8, 8);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @returns {number}
     */
    get nodesExplored() {
        const ret = wasm.planningresult_nodesExplored(this.__wbg_ptr);
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
        const ret = wasm.cableconfig_maxTotalTwist(this.__wbg_ptr);
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
                wasm.__wbindgen_export_1(r0, r1 * 1, 1);
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
            wasm.__wbindgen_export_1(r0, r1 * 8, 8);
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
            wasm.__wbindgen_export_1(r0, r1 * 8, 8);
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
            wasm.__wbindgen_export_1(r0, r1 * 8, 8);
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
            wasm.__wbindgen_export_1(r0, r1 * 8, 8);
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
        const ret = wasm.__wbg_get_birrtconfig_goal_bias(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set x(arg0) {
        wasm.__wbg_set_birrtconfig_goal_bias(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get y() {
        const ret = wasm.__wbg_get_birrtconfig_max_extension(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set y(arg0) {
        wasm.__wbg_set_birrtconfig_max_extension(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get z() {
        const ret = wasm.__wbg_get_birrtconfig_connect_threshold(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set z(arg0) {
        wasm.__wbg_set_birrtconfig_connect_threshold(this.__wbg_ptr, arg0);
    }
    /**
     * Create from array [x, y, z]
     * @param {Float64Array} arr
     * @returns {Position}
     */
    static fromArray(arr) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF64ToWasm0(arr, wasm.__wbindgen_export_2);
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
            wasm.__wbindgen_export_1(r0, r1 * 8, 8);
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
            wasm.__wbindgen_export_1(r0, r1 * 8, 8);
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
            wasm.__wbindgen_export_1(r0, r1 * 8, 8);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @returns {number}
     */
    get x() {
        const ret = wasm.__wbg_get_birrtconfig_goal_bias(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set x(arg0) {
        wasm.__wbg_set_birrtconfig_goal_bias(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get y() {
        const ret = wasm.__wbg_get_birrtconfig_max_extension(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set y(arg0) {
        wasm.__wbg_set_birrtconfig_max_extension(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get z() {
        const ret = wasm.__wbg_get_birrtconfig_connect_threshold(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set z(arg0) {
        wasm.__wbg_set_birrtconfig_connect_threshold(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get w() {
        const ret = wasm.__wbg_get_birrtconfig_step_size(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set w(arg0) {
        wasm.__wbg_set_birrtconfig_step_size(this.__wbg_ptr, arg0);
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
        const ret = wasm.__wbg_get_birrtconfig_goal_bias(this.__wbg_ptr);
        return ret;
    }
    /**
     * Goal bias probability (0.0 - 1.0)
     * @param {number} arg0
     */
    set goal_bias(arg0) {
        wasm.__wbg_set_birrtconfig_goal_bias(this.__wbg_ptr, arg0);
    }
    /**
     * Maximum extension distance per step
     * @returns {number}
     */
    get max_extension() {
        const ret = wasm.__wbg_get_birrtconfig_max_extension(this.__wbg_ptr);
        return ret;
    }
    /**
     * Maximum extension distance per step
     * @param {number} arg0
     */
    set max_extension(arg0) {
        wasm.__wbg_set_birrtconfig_max_extension(this.__wbg_ptr, arg0);
    }
    /**
     * Goal radius for determining when goal is reached
     * @returns {number}
     */
    get goal_radius() {
        const ret = wasm.__wbg_get_birrtconfig_connect_threshold(this.__wbg_ptr);
        return ret;
    }
    /**
     * Goal radius for determining when goal is reached
     * @param {number} arg0
     */
    set goal_radius(arg0) {
        wasm.__wbg_set_birrtconfig_connect_threshold(this.__wbg_ptr, arg0);
    }
    /**
     * Step size for collision checking
     * @returns {number}
     */
    get step_size() {
        const ret = wasm.__wbg_get_birrtconfig_step_size(this.__wbg_ptr);
        return ret;
    }
    /**
     * Step size for collision checking
     * @param {number} arg0
     */
    set step_size(arg0) {
        wasm.__wbg_set_birrtconfig_step_size(this.__wbg_ptr, arg0);
    }
    /**
     * Rewire radius multiplier (gamma)
     * @returns {number}
     */
    get rewire_factor() {
        const ret = wasm.__wbg_get_rrtstarconfig_rewire_factor(this.__wbg_ptr);
        return ret;
    }
    /**
     * Rewire radius multiplier (gamma)
     * @param {number} arg0
     */
    set rewire_factor(arg0) {
        wasm.__wbg_set_rrtstarconfig_rewire_factor(this.__wbg_ptr, arg0);
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
            const ptr0 = passArrayF64ToWasm0(start, wasm.__wbindgen_export_2);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(goal, wasm.__wbindgen_export_2);
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
        const ptr0 = passArrayF64ToWasm0(start, wasm.__wbindgen_export_2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayF64ToWasm0(goal, wasm.__wbindgen_export_2);
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
            wasm.__wbindgen_export_1(r0, r1 * 4, 4);
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
            wasm.__wbindgen_export_1(r0, r1 * 4, 4);
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
            const ptr0 = passStringToWasm0(urdf_content, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
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
            wasm.__wbindgen_export_1(r0, r1 * 4, 4);
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
            const ptr0 = passStringToWasm0(tool_name, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
            const len0 = WASM_VECTOR_LEN;
            var ptr1 = isLikeNone(tcp_name) ? 0 : passStringToWasm0(tcp_name, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
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
        const ptr0 = passArrayJsValueToWasm0(dh_params, wasm.__wbindgen_export_2);
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
            const ptr0 = passStringToWasm0(tcp_name, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
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
            const ptr0 = passStringToWasm0(tool_name, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passStringToWasm0(tcp_name, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
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
        const ptr0 = passArrayF64ToWasm0(joints, wasm.__wbindgen_export_2);
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
            const ptr0 = passStringToWasm0(tool_name, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passStringToWasm0(tcp_name, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
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
            const ptr0 = passArrayF64ToWasm0(joint_angles, wasm.__wbindgen_export_2);
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
            const ptr0 = passArrayF64ToWasm0(joint_angles, wasm.__wbindgen_export_2);
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
        var ptr0 = isLikeNone(seed) ? 0 : passArrayF64ToWasm0(seed, wasm.__wbindgen_export_2);
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
                wasm.__wbindgen_export_1(r0, r1 * 1, 1);
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
            wasm.__wbindgen_export_1(r0, r1 * 8, 8);
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
            const ptr0 = passArrayF64ToWasm0(joint_angles, wasm.__wbindgen_export_2);
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
                wasm.__wbindgen_export_1(r0, r1 * 8, 8);
            }
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Check if the robot is near a singularity at the given configuration
     *
     * Returns true if the minimum singular value of the Jacobian is below threshold.
     * @param {Float64Array} joint_angles
     * @param {number | null} [threshold]
     * @returns {boolean}
     */
    isNearSingularity(joint_angles, threshold) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF64ToWasm0(joint_angles, wasm.__wbindgen_export_2);
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
            const ptr0 = passArrayF64ToWasm0(positions, wasm.__wbindgen_export_2);
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
                wasm.__wbindgen_export_1(r0, r1 * 1, 1);
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
            const ptr0 = passStringToWasm0(tool_name, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passStringToWasm0(tcp_name, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
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
            const ptr0 = passArrayF64ToWasm0(joint_angles, wasm.__wbindgen_export_2);
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
            const ptr0 = passArrayF64ToWasm0(joint_angles, wasm.__wbindgen_export_2);
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
        var ptr0 = isLikeNone(seed) ? 0 : passArrayF64ToWasm0(seed, wasm.__wbindgen_export_2);
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
        var ptr0 = isLikeNone(seed) ? 0 : passArrayF64ToWasm0(seed, wasm.__wbindgen_export_2);
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
            const ptr0 = passArrayF64ToWasm0(joint_angles, wasm.__wbindgen_export_2);
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
            wasm.__wbindgen_export_1(r0, r1 * 8, 8);
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
                wasm.__wbindgen_export_1(r0, r1 * 8, 8);
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
            const ptr0 = passArrayF64ToWasm0(joint_angles, wasm.__wbindgen_export_2);
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
            wasm.__wbindgen_export_1(r0, r1 * 4, 4);
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
            const ptr0 = passArrayF64ToWasm0(joint_angles, wasm.__wbindgen_export_2);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passStringToWasm0(tool_name, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
            const len1 = WASM_VECTOR_LEN;
            var ptr2 = isLikeNone(tcp_name) ? 0 : passStringToWasm0(tcp_name, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
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
        const ptr0 = passStringToWasm0(tool_name, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
        const len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(tcp_name) ? 0 : passStringToWasm0(tcp_name, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
        var len1 = WASM_VECTOR_LEN;
        var ptr2 = isLikeNone(seed) ? 0 : passArrayF64ToWasm0(seed, wasm.__wbindgen_export_2);
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
        const ptr0 = passStringToWasm0(db_robot_name, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
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
            wasm.__wbindgen_export_1(deferred1_0, deferred1_1, 1);
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
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
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
            const ptr0 = passStringToWasm0(tool_name, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
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
            wasm.__wbindgen_export_1(r0, r1 * 4, 4);
            return v2;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
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
                wasm.__wbindgen_export_1(r0, r1 * 8, 8);
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
        const ret = wasm.taskspaceplanningresult_iterations(this.__wbg_ptr);
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
                wasm.__wbindgen_export_1(r0, r1 * 1, 1);
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
        const ret = wasm.cableconfig_maxTotalTwist(this.__wbg_ptr);
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
            wasm.__wbindgen_export_1(r0, r1 * 8, 8);
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
                wasm.__wbindgen_export_1(r0, r1 * 1, 1);
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
        const ret = wasm.taskspaceplanningresult_success(this.__wbg_ptr);
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
        const ret = wasm.cableconfig_maxTotalTwist(this.__wbg_ptr);
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
        const ptr0 = passArrayF64ToWasm0(start_joints, wasm.__wbindgen_export_2);
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
        const ptr0 = passArrayF64ToWasm0(bounds, wasm.__wbindgen_export_2);
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
            wasm.__wbindgen_export_1(r0, r1 * 8, 8);
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
            wasm.__wbindgen_export_1(r0, r1 * 8, 8);
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
            const ptr0 = passArrayF64ToWasm0(jerk_max, wasm.__wbindgen_export_2);
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
            const ptr0 = passArrayF64ToWasm0(velocity_max, wasm.__wbindgen_export_2);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(acceleration_max, wasm.__wbindgen_export_2);
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
        const ret = wasm.cableconfig_maxTotalTwist(this.__wbg_ptr);
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
            const ptr0 = passArrayF64ToWasm0(path_flat, wasm.__wbindgen_export_2);
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
            const ptr0 = passArrayF64ToWasm0(waypoints, wasm.__wbindgen_export_2);
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
        const ret = wasm.wasmconfigurationspace_dimensions(this.__wbg_ptr);
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
            const ptr0 = passArrayF64ToWasm0(start, wasm.__wbindgen_export_2);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(end, wasm.__wbindgen_export_2);
            const len1 = WASM_VECTOR_LEN;
            wasm.wasmconfigurationspace_interpolate(retptr, this.__wbg_ptr, ptr0, len0, ptr1, len1, t);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v3 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_1(r0, r1 * 8, 8);
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
            wasm.__wbindgen_export_1(r0, r1 * 8, 8);
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
            wasm.__wbindgen_export_1(r0, r1 * 8, 8);
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
        const ptr0 = passArrayF64ToWasm0(config, wasm.__wbindgen_export_2);
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
            const ptr0 = passArrayF64ToWasm0(lower_bounds, wasm.__wbindgen_export_2);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(upper_bounds, wasm.__wbindgen_export_2);
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
        const ptr0 = passArrayF64ToWasm0(a, wasm.__wbindgen_export_2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayF64ToWasm0(b, wasm.__wbindgen_export_2);
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
            wasm.__wbindgen_export_1(r0, r1 * 4, 4);
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
            const ptr0 = passStringToWasm0(name, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
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
            wasm.__wbindgen_export_1(r0, r1 * 4, 4);
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
            const ptr0 = passStringToWasm0(name, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
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
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
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
        const ret = wasm.cableconfig_maxTotalTwist(this.__wbg_ptr);
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
            const ptr0 = passArrayF64ToWasm0(start, wasm.__wbindgen_export_2);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(end, wasm.__wbindgen_export_2);
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
            const ptr0 = passArrayF64ToWasm0(path, wasm.__wbindgen_export_2);
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
        const ptr0 = passArrayF64ToWasm0(config, wasm.__wbindgen_export_2);
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
            const ptr0 = passArrayF64ToWasm0(start, wasm.__wbindgen_export_2);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(end, wasm.__wbindgen_export_2);
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
            const ptr0 = passArrayF64ToWasm0(start, wasm.__wbindgen_export_2);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(end, wasm.__wbindgen_export_2);
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
            const ptr0 = passArrayF64ToWasm0(path, wasm.__wbindgen_export_2);
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
            const ptr0 = passArrayF64ToWasm0(start, wasm.__wbindgen_export_2);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(end, wasm.__wbindgen_export_2);
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
     * Create a motion to the target joint positions
     * @param {Float64Array} target
     * @returns {WasmMotion}
     */
    static to(target) {
        const ptr0 = passArrayF64ToWasm0(target, wasm.__wbindgen_export_2);
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
        const ptr0 = passArrayF64ToWasm0(start, wasm.__wbindgen_export_2);
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
            wasm.__wbindgen_export_1(r0, r1 * 8, 8);
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
                wasm.__wbindgen_export_1(r0, r1 * 8, 8);
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
        const ptr0 = passArrayF64ToWasm0(start, wasm.__wbindgen_export_2);
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
            const ptr0 = passArrayF64ToWasm0(waypoints_flat, wasm.__wbindgen_export_2);
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
    /**
     * Number of waypoints in the path
     * @returns {number}
     */
    get waypoint_count() {
        const ret = wasm.__wbg_get_wasmpathmetrics_waypoint_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Number of waypoints in the path
     * @param {number} arg0
     */
    set waypoint_count(arg0) {
        wasm.__wbg_set_wasmpathmetrics_waypoint_count(this.__wbg_ptr, arg0);
    }
    /**
     * Total path length in configuration space
     * @returns {number}
     */
    get path_length() {
        const ret = wasm.__wbg_get_birrtconfig_goal_bias(this.__wbg_ptr);
        return ret;
    }
    /**
     * Total path length in configuration space
     * @param {number} arg0
     */
    set path_length(arg0) {
        wasm.__wbg_set_birrtconfig_goal_bias(this.__wbg_ptr, arg0);
    }
    /**
     * Path smoothness (sum of squared accelerations)
     * @returns {number}
     */
    get smoothness() {
        const ret = wasm.__wbg_get_birrtconfig_max_extension(this.__wbg_ptr);
        return ret;
    }
    /**
     * Path smoothness (sum of squared accelerations)
     * @param {number} arg0
     */
    set smoothness(arg0) {
        wasm.__wbg_set_birrtconfig_max_extension(this.__wbg_ptr, arg0);
    }
    /**
     * Original waypoint count (before optimization)
     * @returns {number}
     */
    get original_waypoint_count() {
        const ret = wasm.__wbg_get_wasmpathmetrics_original_waypoint_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Original waypoint count (before optimization)
     * @param {number} arg0
     */
    set original_waypoint_count(arg0) {
        wasm.__wbg_set_wasmpathmetrics_original_waypoint_count(this.__wbg_ptr, arg0);
    }
    /**
     * Original path length (before optimization)
     * @returns {number}
     */
    get original_path_length() {
        const ret = wasm.__wbg_get_birrtconfig_connect_threshold(this.__wbg_ptr);
        return ret;
    }
    /**
     * Original path length (before optimization)
     * @param {number} arg0
     */
    set original_path_length(arg0) {
        wasm.__wbg_set_birrtconfig_connect_threshold(this.__wbg_ptr, arg0);
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
        const ret = wasm.wasmpipelineconfig_withSmoothIterations(ptr, iterations);
        return WasmPipelineConfig.__wrap(ret);
    }
    /**
     * Set shortcut iterations
     * @param {number} iterations
     * @returns {WasmPipelineConfig}
     */
    withShortcutIterations(iterations) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.wasmpipelineconfig_withShortcutIterations(ptr, iterations);
        return WasmPipelineConfig.__wrap(ret);
    }
    constructor() {
        const ret = wasm.wasmpipelineconfig_new();
        this.__wbg_ptr = ret >>> 0;
        WasmPipelineConfigFinalization.register(this, this.__wbg_ptr, this);
        return this;
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
        const ret = wasm.__wbg_get_motionvalidationstats_configs_checked(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Maximum iterations for shortcutting
     * @param {number} arg0
     */
    set shortcut_iterations(arg0) {
        wasm.__wbg_set_motionvalidationstats_configs_checked(this.__wbg_ptr, arg0);
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
        const ret = wasm.__wbg_get_birrtconfig_goal_bias(this.__wbg_ptr);
        return ret;
    }
    /**
     * Smoothing factor (0.0 to 1.0)
     * @param {number} arg0
     */
    set smoothing_factor(arg0) {
        wasm.__wbg_set_birrtconfig_goal_bias(this.__wbg_ptr, arg0);
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
            wasm.__wbindgen_export_1(r0, r1 * 8, 8);
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
        const ret = wasm.taskspaceplanningresult_iterations(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Check if path was post-processed
     * @returns {boolean}
     */
    get postProcessed() {
        const ret = wasm.wasmpipelineresult_postProcessed(this.__wbg_ptr);
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
            wasm.__wbindgen_export_1(r0, r1 * 8, 8);
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
            const ptr0 = passArrayF64ToWasm0(path_flat, wasm.__wbindgen_export_2);
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
            const ptr0 = passArrayF64ToWasm0(path_flat, wasm.__wbindgen_export_2);
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
            const ptr0 = passArrayF64ToWasm0(path_flat, wasm.__wbindgen_export_2);
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
            const ptr0 = passArrayF64ToWasm0(path_flat, wasm.__wbindgen_export_2);
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
            const ptr0 = passArrayF64ToWasm0(path_flat, wasm.__wbindgen_export_2);
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
            wasm.__wbindgen_export_1(deferred1_0, deferred1_1, 1);
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
            wasm.__wbindgen_export_1(r0, r1 * 4, 4);
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
                wasm.__wbindgen_export_1(r0, r1 * 8, 8);
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
                wasm.__wbindgen_export_1(r0, r1 * 8, 8);
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
                wasm.__wbindgen_export_1(r0, r1 * 8, 8);
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
            wasm.__wbindgen_export_1(deferred1_0, deferred1_1, 1);
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
            wasm.__wbindgen_export_1(r0, r1 * 8, 8);
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
                wasm.__wbindgen_export_1(r0, r1 * 8, 8);
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
            const ptr0 = passStringToWasm0(name, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(position, wasm.__wbindgen_export_2);
            const len1 = WASM_VECTOR_LEN;
            const ptr2 = passArrayF64ToWasm0(orientation, wasm.__wbindgen_export_2);
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
            wasm.__wbindgen_export_1(deferred1_0, deferred1_1, 1);
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
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
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
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
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
            const ptr0 = passStringToWasm0(name, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(position, wasm.__wbindgen_export_2);
            const len1 = WASM_VECTOR_LEN;
            const ptr2 = passArrayF64ToWasm0(orientation, wasm.__wbindgen_export_2);
            const len2 = WASM_VECTOR_LEN;
            const ptr3 = passArrayF64ToWasm0(approach_axis, wasm.__wbindgen_export_2);
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
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
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
            const ptr0 = passStringToWasm0(name, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
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
            const ptr0 = passStringToWasm0(name, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
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
                wasm.__wbindgen_export_1(r0, r1 * 1, 1);
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
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
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
        const ptr0 = passStringToWasm0(obstacle_id, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmtool_excludeObstacle(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * Include an obstacle back into collision checking
     * @param {string} obstacle_id
     */
    includeObstacle(obstacle_id) {
        const ptr0 = passStringToWasm0(obstacle_id, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
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
            const ptr0 = passArrayF64ToWasm0(position, wasm.__wbindgen_export_2);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(orientation, wasm.__wbindgen_export_2);
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
                wasm.__wbindgen_export_1(r0, r1 * 8, 8);
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
            wasm.__wbindgen_export_1(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Check if an obstacle is excluded
     * @param {string} obstacle_id
     * @returns {boolean}
     */
    isObstacleExcluded(obstacle_id) {
        const ptr0 = passStringToWasm0(obstacle_id, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
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
            const ptr0 = passArrayF64ToWasm0(target_point, wasm.__wbindgen_export_2);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(approach_direction, wasm.__wbindgen_export_2);
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
            wasm.__wbindgen_export_1(r0, r1 * 4, 4);
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
                wasm.__wbindgen_export_1(r0, r1 * 8, 8);
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
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
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
            wasm.__wbindgen_export_1(deferred1_0, deferred1_1, 1);
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
            const ptr0 = passStringToWasm0(name, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(position, wasm.__wbindgen_export_2);
            const len1 = WASM_VECTOR_LEN;
            const ptr2 = passArrayF64ToWasm0(orientation, wasm.__wbindgen_export_2);
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
            const ptr0 = passStringToWasm0(name, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArrayF64ToWasm0(position, wasm.__wbindgen_export_2);
            const len1 = WASM_VECTOR_LEN;
            const ptr2 = passArrayF64ToWasm0(orientation, wasm.__wbindgen_export_2);
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
            wasm.__wbindgen_export_1(r0, r1 * 4, 4);
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
            wasm.__wbindgen_export_1(r0, r1 * 4, 4);
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
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
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
            const ptr0 = passStringToWasm0(name, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
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
            const ptr0 = passStringToWasm0(tcp_name, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
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
                wasm.__wbindgen_export_1(r0, r1 * 1, 1);
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
        const ret = wasm.wasmtoollibrary_len(this.__wbg_ptr);
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
            const ptr0 = passStringToWasm0(tool_name, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
            const len0 = WASM_VECTOR_LEN;
            var ptr1 = isLikeNone(tcp_name) ? 0 : passStringToWasm0(tcp_name, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
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
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
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
            wasm.__wbindgen_export_1(r0, r1 * 8, 8);
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
            wasm.__wbindgen_export_1(r0, r1 * 8, 8);
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
            wasm.__wbindgen_export_1(r0, r1 * 8, 8);
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
            wasm.__wbindgen_export_1(r0, r1 * 8, 8);
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
            wasm.__wbindgen_export_1(r0, r1 * 8, 8);
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
            wasm.__wbindgen_export_1(r0, r1 * 8, 8);
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
        const ret = wasm.cableconfig_maxTotalTwist(this.__wbg_ptr);
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
            wasm.__wbindgen_export_1(r0, r1 * 8, 8);
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
        const ret = wasm.cableconfig_maxTotalTwist(this.__wbg_ptr);
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
            wasm.__wbindgen_export_1(r0, r1 * 8, 8);
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
    imports.wbg.__wbg_crypto_574e78ad8b13b65f = function(arg0) {
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
    imports.wbg.__wbg_error_7534b8e9a36f1ab4 = function(arg0, arg1) {
        let deferred0_0;
        let deferred0_1;
        try {
            deferred0_0 = arg0;
            deferred0_1 = arg1;
            console.error(getStringFromWasm0(arg0, arg1));
        } finally {
            wasm.__wbindgen_export_1(deferred0_0, deferred0_1, 1);
        }
    };
    imports.wbg.__wbg_getRandomValues_b8f5dbd5f3995a9e = function() { return handleError(function (arg0, arg1) {
        getObject(arg0).getRandomValues(getObject(arg1));
    }, arguments) };
    imports.wbg.__wbg_msCrypto_a61aeb35a24c1329 = function(arg0) {
        const ret = getObject(arg0).msCrypto;
        return addHeapObject(ret);
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
    imports.wbg.__wbg_node_905d3e251edff8a2 = function(arg0) {
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
    imports.wbg.__wbg_process_dc0fbacc7c1c06f7 = function(arg0) {
        const ret = getObject(arg0).process;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_push_737cfc8c1432c2c6 = function(arg0, arg1) {
        const ret = getObject(arg0).push(getObject(arg1));
        return ret;
    };
    imports.wbg.__wbg_randomFillSync_ac0988aba3254290 = function() { return handleError(function (arg0, arg1) {
        getObject(arg0).randomFillSync(takeObject(arg1));
    }, arguments) };
    imports.wbg.__wbg_require_60cc747a6bc5215a = function() { return handleError(function () {
        const ret = module.require;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_set_65595bdd868b3009 = function(arg0, arg1, arg2) {
        getObject(arg0).set(getObject(arg1), arg2 >>> 0);
    };
    imports.wbg.__wbg_set_bb8cecf6a62b9f46 = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = Reflect.set(getObject(arg0), getObject(arg1), getObject(arg2));
        return ret;
    }, arguments) };
    imports.wbg.__wbg_stack_0ed75d68575b0f3c = function(arg0, arg1) {
        const ret = getObject(arg1).stack;
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
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
    imports.wbg.__wbg_versions_c01dfd4722a88165 = function(arg0) {
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
    imports.wbg.__wbindgen_debug_string = function(arg0, arg1) {
        const ret = debugString(getObject(arg1));
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
        const len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbindgen_error_new = function(arg0, arg1) {
        const ret = new Error(getStringFromWasm0(arg0, arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_is_function = function(arg0) {
        const ret = typeof(getObject(arg0)) === 'function';
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
    imports.wbg.__wbindgen_memory = function() {
        const ret = wasm.memory;
        return addHeapObject(ret);
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
