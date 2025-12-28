# Input Devices - Future Extensions TODO

## Current Status (v0.3.0)

### Implemented
- [x] Base input device type system (`types.ts`)
- [x] Standard gamepad support via Web Gamepad API (`useGamepad.ts`)
- [x] Gamepad presets for Xbox, PlayStation, Nintendo controllers (`gamepad-presets.ts`)
- [x] Unified input device hook (`useInputDevice.ts`)
- [x] Convenience hook combining jog control + gamepad (`useJogWithGamepad.ts`)
- [x] Visual status panel component (`GamepadStatusPanel.tsx`)
- [x] Demo module in react-demo (`GamepadControlModule.tsx`)

---

## Future Extensions

### 1. SpaceMouse / 3DConnexion Support
**Priority: High**

The SpaceMouse provides true 6DoF input, making it ideal for Cartesian robot control.

#### Tasks
- [ ] Research 3DConnexion driver integration options:
  - WebHID API for direct device access
  - WebSocket bridge to native driver
  - Electron/Node.js native module
- [ ] Implement `useSpaceMouse.ts` hook
- [ ] Add SpaceMouse-specific mapping configuration
- [ ] Handle haptic feedback (if supported)
- [ ] Add dead zone and sensitivity calibration UI

#### Technical Notes
```typescript
// Proposed interface
interface SpaceMouseState {
  translation: { x: number; y: number; z: number };
  rotation: { rx: number; ry: number; rz: number };
  buttons: boolean[];
}
```

---

### 2. VR/AR Controller Support (6DoF)
**Priority: Medium**

WebXR controllers provide 6DoF tracking, useful for intuitive robot teaching.

#### Tasks
- [ ] Implement WebXR device enumeration
- [ ] Create `useXRController.ts` hook
- [ ] Map controller pose to robot TCP pose
- [ ] Support haptic feedback for collision/limits
- [ ] Handle grip/trigger as enable/deadman switches
- [ ] Add virtual robot arm overlay in VR scene

#### Use Cases
- Virtual teaching: Move VR controller, robot follows
- Teleoperation preview: See ghost robot before committing
- Collision visualization in 3D space

---

### 3. Touch Input / Mobile Support
**Priority: Medium**

Support multi-touch gestures for tablet/mobile robot control.

#### Tasks
- [ ] Implement virtual joystick overlay
- [ ] Two-finger pan for XY translation
- [ ] Pinch for Z axis
- [ ] Three-finger rotate for orientation
- [ ] Add touch-specific `GamepadStatusPanel` variant
- [ ] Support iOS haptic feedback

---

### 4. Custom HID Device Support
**Priority: Low**

Allow users to connect custom industrial pendants or HID devices.

#### Tasks
- [ ] Implement WebHID device discovery
- [ ] Create generic HID mapping interface
- [ ] Add UI for custom button/axis mapping
- [ ] Support for industrial teach pendants (vendor-specific)
- [ ] Save/load custom device profiles

---

### 5. Input Recording & Playback
**Priority: Medium**

Record input sequences for testing and demonstration.

#### Tasks
- [ ] Record timestamped input events
- [ ] Playback with time scaling
- [ ] Export/import recording files
- [ ] Integration with trajectory system
- [ ] Visual timeline editor

---

### 6. Multi-Device Coordination
**Priority: Low**

Support multiple input devices simultaneously.

#### Tasks
- [ ] Device priority system (which device controls what)
- [ ] Split control (e.g., gamepad for joints, SpaceMouse for Cartesian)
- [ ] Collaborative control with conflict resolution
- [ ] Per-device deadman switch requirements

---

### 7. Accessibility Improvements
**Priority: Medium**

Improve input device support for users with different abilities.

#### Tasks
- [ ] Keyboard-only mode enhancements
- [ ] Switch-based input (scanning mode)
- [ ] Voice control integration (Web Speech API)
- [ ] Configurable button hold times
- [ ] Audio feedback for mode changes

---

## Architecture Considerations

### Input Device Manager (Future)
Consider creating a central `InputDeviceManager` class that:
- Manages all connected devices
- Routes input to appropriate handlers
- Handles device hot-plugging
- Provides unified event stream

```typescript
// Proposed architecture
interface InputDeviceManager {
  // Device discovery
  discoverDevices(): Promise<InputDeviceInfo[]>;

  // Event stream
  onInput: Observable<JogInputAction>;

  // Device control
  setActiveDevice(deviceId: string): void;
  getActiveDevice(): InputDeviceInfo | null;

  // Configuration
  setDeviceMapping(deviceId: string, mapping: DeviceMapping): void;
}
```

---

## References

- [W3C Gamepad API](https://w3c.github.io/gamepad/)
- [WebHID API](https://wicg.github.io/webhid/)
- [WebXR Device API](https://immersive-web.github.io/webxr/)
- [3DConnexion Developer Resources](https://3dconnexion.com/us/software-developer-programme/)
