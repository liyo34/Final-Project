import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../config/apiConfig';

const LecturerLoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const navigation = useNavigation();

  const handleLogin = async () => {
    // Reset error state
    setError('');
    
    // Simple validation
    if (email.trim() === '' || password.trim() === '') {
      setError('Please enter both email and password');
      return;
    }
    
    try {
      setLoading(true);
      
      // Try multiple API endpoints for login
      let loginSuccess = false;
      let responseData = null;
      
      // Create login payload with multiple possible field names
      const loginPayload = {
        email: email,
        username: email, // Some APIs might use username instead of email
        password: password
      };
      
      console.log('Attempting login with payload:', loginPayload);
      
      // Try different API endpoints
      const loginEndpoints = [
        `${API_BASE_URL}/api/auth/lecturer/login`,
        `${API_BASE_URL}/api/lecturers/login`,
        `${API_BASE_URL}/api/lecturer/login`,
        `${API_BASE_URL}/api/auth/login`
      ];
      
      for (const endpoint of loginEndpoints) {
        try {
          console.log(`Trying login endpoint: ${endpoint}`);
          
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(loginPayload),
            // Set a timeout to avoid waiting too long
            timeout: 5000
          });
          
          console.log(`Endpoint ${endpoint} returned status:`, response.status);
          
          if (response.ok) {
            try {
              responseData = await response.json();
              console.log('Login response data:', responseData);
              loginSuccess = true;
              break; // Exit the loop if we get a successful response
            } catch (jsonError) {
              console.error(`Error parsing JSON from ${endpoint}:`, jsonError);
            }
          }
        } catch (endpointError) {
          console.error(`Error with endpoint ${endpoint}:`, endpointError);
        }
      }
      
      // If API login was successful
      if (loginSuccess && responseData) {
        console.log('API login successful, processing lecturer data');
        
        // Prepare lecturer data for storage
        const lecturerInfo = responseData.lecturer || responseData.user || responseData;
        
        // Create a normalized lecturer data object
        const lecturerData = {
          ...lecturerInfo,
          role: 'lecturer',
          lecturerId: lecturerInfo.lecturerId || lecturerInfo.lecturer_id || lecturerInfo.id || 'LEC-' + Date.now(),
          name: lecturerInfo.name || lecturerInfo.fullName || lecturerInfo.full_name || email.split('@')[0],
          email: lecturerInfo.email || lecturerInfo.emailAddress || lecturerInfo.email_address || email,
          department: lecturerInfo.department || lecturerInfo.dept || 'Not specified',
          lastLogin: new Date().toISOString(),
          _debug: 'API login successful'
        };
        
        // Store user token and data
        await AsyncStorage.setItem('userToken', responseData.token || 'token-' + Date.now());
        await AsyncStorage.setItem('userData', JSON.stringify(lecturerData));
      } else {
        // Show error message for invalid credentials
        setError('Invalid email or password. Please try again.');
        return; // Stop execution to prevent navigation
      }
      
      // Navigate to LecturerDashboard after successful login
      console.log('Login successful, navigating to LecturerDashboard');
      
      // Use the exact same approach as in AdminLoginScreen
      router.replace('/(lecturer)/dashboard');
      console.log('Navigation initiated using router.replace');
    } catch (error) {
      console.error('Login error:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{`AUTOMATED
ATTENDANCE`}</Text>
        <Text style={styles.subtitle}>RECORD SYSTEM</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.welcomeText}>Welcome Back Lecturer!</Text>
        <Text style={styles.signInText}>Please sign in to continue</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>EMAIL ADDRESS</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>PASSWORD</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity onPress={() => router.push('/forgot-password')}>
          <Text style={styles.forgotPassword}>Forgot Password?</Text>
        </TouchableOpacity>
        
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity 
          style={styles.signInButton} 
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.signInButtonText}>Sign In</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1B3358',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  title: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 40,
  },
  subtitle: {
    color: 'white',
    fontSize: 18,
    marginTop: 10,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  signInText: {
    color: '#666',
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#F5F6FA',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
  },
  forgotPassword: {
    color: '#4CAF50',
    textAlign: 'right',
    marginTop: 10,
    marginBottom: 20,
  },
  signInButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  signInButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#FF6B6B',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
});

export default LecturerLoginScreen;
