import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#1B3358',
        },
        headerTintColor: '#fff',
      }}
    >
      <Stack.Screen
        name="student-list"
        options={{
          title: 'Student List',
          presentation: 'card'
        }}
      />
    </Stack>
  );
}
