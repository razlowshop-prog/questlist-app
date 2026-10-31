// Test build without the home screen widget: the app has closed instantly on
// open since the widget (react-native-android-widget) was added, so its native
// part is left out of the Android build for now. The JS stays installed so the
// widget's drawing code keeps compiling; src/widget.android.ts is switched off.
// To bring the widget back: delete this file, put the plugin back in app.json
// and set WIDGET_ON in src/widget.android.ts.
module.exports = {
  dependencies: {
    'react-native-android-widget': { platforms: { android: null } },
  },
};
