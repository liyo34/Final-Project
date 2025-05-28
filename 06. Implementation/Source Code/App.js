import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import StudentLoginScreen from './screens/StudentLoginScreen';
import AdminLoginScreen from './screens/AdminLoginScreen';
import LecturerLoginScreen from './screens/LecturerLoginScreen';
import StudentTabNavigator from './screens/StudentTabNavigator';
import LecturerDashboard from './screens/LecturerDashboard';
import QrScanner from './screens/QrScanner';
import WebQRScannerScreen from './screens/WebQRScannerScreen';

// Create the stack navigator
const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="StudentLogin">
        <Stack.Screen 
          name="StudentLogin" 
          component={StudentLoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="AdminLogin" 
          component={AdminLoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="LecturerLogin" 
          component={LecturerLoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="StudentDashboard"
          component={StudentTabNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="LecturerDashboard"
          component={LecturerDashboard}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="QrScanner"
          component={QrScanner}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="WebQRScannerScreen"
          component={WebQRScannerScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}