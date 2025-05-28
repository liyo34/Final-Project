import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Switch, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import API_BASE_URL from '../config/apiConfig';


const StudentLoginScreen = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [useStudentId, setUseStudentId] = useState(false);
  const navigation = useNavigation();
  const router = useRouter();

  const handleLogin = async () => {
    // Reset error state
    setError('');
    
    // Simple validation
    if (identifier.trim() === '' || password.trim() === '') {
      setError('Please enter both ' + (useStudentId ? 'Student ID' : 'Email') + ' and password');
      return;
    }
    
    try {
      setLoading(true);
      
      // Create login payload with all possible authentication fields
      const loginPayload = {
        studentId: identifier,
        email: identifier,
        username: identifier,
        password: password
      };
      
      console.log('Sending login payload:', loginPayload);
      
      // Call the login API
      const response = await fetch(`${API_BASE_URL}/api/auth/student/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginPayload),
      });
      
      console.log('Login response status:', response.status);
      
      // Try to parse response as JSON
      let data;
      try {
        data = await response.json();
        console.log('Login response data:', data);
      } catch (jsonError) {
        console.error('Error parsing JSON response:', jsonError);
        setError('Server returned an invalid response');
        setLoading(false);
        return;
      }
      
      // Handle successful login
      if (response.ok && data) {
        console.log('Login successful, processing student data');
        
        // Prepare student data for storage
        // First, determine where the student data is in the response
        const studentInfo = data.student || data.user || data;
        
        // Log the raw data to help with debugging
        console.log('Raw student info from API:', studentInfo);
        
        // Create a normalized student data object with consistent field names
        const studentData = {
          // Copy all existing data
          ...studentInfo,
          // Add role identifier
          role: 'student',
          // Ensure critical fields are present with consistent naming
          // Try multiple possible field names for studentId
          studentId: studentInfo.studentId || studentInfo.student_id || studentInfo.id || identifier,
          // Try multiple possible field names for name
          name: studentInfo.name || studentInfo.fullName || studentInfo.full_name || '',
          // Try multiple possible field names for email
          email: studentInfo.email || studentInfo.emailAddress || studentInfo.email_address || identifier,
          // Try multiple possible field names for username
          username: studentInfo.username || studentInfo.user_name || identifier,
          // Add timestamp
          lastLogin: new Date().toISOString()
        };
        
        // Add a special debug field to help track where data came from
        studentData._debug = 'Processed by StudentLoginScreen';
        
        // Ensure studentId is always a string
        if (studentData.studentId) {
          studentData.studentId = String(studentData.studentId);
        }
        
        console.log('Storing student data:', studentData);
        
        // Store user token and data in AsyncStorage
        await AsyncStorage.setItem('userToken', data.token || '');
        await AsyncStorage.setItem('userData', JSON.stringify(studentData));
        
        // Navigate to StudentDashboard
        console.log('Login successful, navigating to StudentDashboard');
        
        try {
          // Use expo-router instead of navigation
          console.log('Using expo-router navigation');
          router.replace('/(student)/dashboard');
        } catch (navError) {
          console.error('Router navigation error:', navError);
          // Fallback to regular navigation as a backup
          try {
            console.log('Falling back to regular navigation');
            navigation.replace('StudentDashboard');
          } catch (error2) {
            console.error('All navigation attempts failed:', error2);
            setError('Login successful, but navigation failed. Please restart the app.');
          }
        }
      } else {
        // Handle login failure
        setError(data?.message || 'Login failed. Please check your credentials.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Network error. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AUTOMATED{'\n'}ATTENDANCE</Text>
        <Text style={styles.subtitle}>RECORD SYSTEM</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.welcomeText}>Welcome Back Student!</Text>
        <Text style={styles.signInText}>Please sign in to continue</Text>

        <View style={styles.loginTypeContainer}>
          <Text style={styles.loginTypeText}>Login with Student ID</Text>
          <Switch
            value={useStudentId}
            onValueChange={setUseStudentId}
            trackColor={{ false: '#767577', true: '#4CAF50' }}
            thumbColor={useStudentId ? '#f4f3f4' : '#f4f3f4'}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>{useStudentId ? 'STUDENT ID' : 'EMAIL ADDRESS'}</Text>
          <TextInput
            style={styles.input}
            placeholder={useStudentId ? 'Enter your Student ID' : 'Enter your email'}
            value={identifier}
            onChangeText={setIdentifier}
            keyboardType={useStudentId ? 'default' : 'email-address'}
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

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity onPress={() => console.log('Forgot password')}>
          <Text style={styles.forgotPassword}>Forgot Password?</Text>
        </TouchableOpacity>

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
    marginBottom: 20,
  },
  loginTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  loginTypeText: {
    fontSize: 14,
    color: '#333',
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
    color: '#dc3545',
    marginBottom: 10,
    textAlign: 'center',
  },
});

export default StudentLoginScreen;
