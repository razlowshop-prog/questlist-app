import { registerRootComponent } from 'expo';

import App from './App';
import { registerWidget } from './src/widget';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

// The Android home screen widget draws itself even while the app is closed.
registerWidget();
