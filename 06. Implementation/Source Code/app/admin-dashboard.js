import { Stack } from 'expo-router';
import AdminDashboard from '@/screens/AdminDashboard';

export default function AdminDashboardScreen() {
  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: false 
        }} 
      />
      <AdminDashboard />
    </>
  );
}
