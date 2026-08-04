import { registerRootComponent } from 'expo';
import { registerGlobals } from '@livekit/react-native';

import App from './App';

// Must run before any LiveKit usage — sets up WebRTC globals (RTCPeerConnection
// etc.) that @livekit/react-native-webrtc provides but React Native doesn't
// have natively. Only takes effect in a real dev-client/prebuild build, not
// Expo Go, since react-native-webrtc is a native module.
registerGlobals();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
