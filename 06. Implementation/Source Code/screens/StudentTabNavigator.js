import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import StudentDashboard from './StudentDashboard';
import QRCodeScreen from './QrCodeScreen';
import ProfileScreen from './ProfileScreen';

const Tab = createBottomTabNavigator();

const StudentTabNavigator = () => (
  <Tab.Navigator
    initialRouteName="Dashboard"
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;
        if (route.name === 'Dashboard') {
          iconName = focused ? 'home' : 'home-outline';
        } else if (route.name === 'QR Code') {
          iconName = focused ? 'qr-code' : 'qr-code-outline';
        } else if (route.name === 'Profile') {
          iconName = focused ? 'person' : 'person-outline';
        }
        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#1B3358',
      tabBarInactiveTintColor: 'gray',
      headerShown: false,
      tabBarStyle: { 
        height: 60, 
        paddingBottom: 8,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      tabBarLabelStyle: { 
        fontSize: 12,
        fontWeight: '500',
      },
    })}
  >
    <Tab.Screen name="Dashboard" component={StudentDashboard} />
    <Tab.Screen name="QR Code" component={QRCodeScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

export default StudentTabNavigator;
