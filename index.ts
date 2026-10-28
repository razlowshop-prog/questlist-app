import { registerRootComponent } from 'expo';
import { createElement, type ComponentType } from 'react';

import { catchFatalErrors, CrashScreen } from './src/components/CrashScreen';
import { registerWidget } from './src/widget';

// A crash shows what went wrong instead of closing the app. Set up before the
// app's code is loaded, so even an error while loading it shows on screen.
catchFatalErrors();
let App: ComponentType;
try {
  App = require('./App').default;
} catch (error) {
  App = () => createElement(CrashScreen, { error });
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

// The Android home screen widget draws itself even while the app is closed.
registerWidget();
