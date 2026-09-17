import 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
import { registerRootComponent } from 'expo';
import App from './App';

// Optimize native screens memory & performance
enableScreens(true);

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
registerRootComponent(App);
