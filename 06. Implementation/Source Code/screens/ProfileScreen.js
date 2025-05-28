import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import API_BASE_URL from '../config/apiConfig';

const ProfileScreen = () => {
  const [userData, setUserData] = useState(null);
  const navigation = useNavigation();

  const loadUserData = async () => {
    try {
      const storedUserData = await AsyncStorage.getItem('userData');
      if (storedUserData) {
        const parsedData = JSON.parse(storedUserData);
        console.log('Profile - Stored user data:', parsedData);
        
        // IMPORTANT: Ensure year and section are set with defaults if missing
        // This ensures we always have these values regardless of API connectivity
        const enhancedUserData = {
          ...parsedData,
          year: parsedData.year || parsedData.yearLevel || '3rd Year',
          yearLevel: parsedData.yearLevel || parsedData.year || '3rd Year',
          section: parsedData.section || 'A'
        };
        
        // Set enhanced user data from storage immediately
        setUserData(enhancedUserData);
        
        // Save the enhanced data back to storage to ensure persistence
        await AsyncStorage.setItem('userData', JSON.stringify(enhancedUserData));
        
        // Try to fetch the latest user data from the server if we have a student ID and token
        const userToken = await AsyncStorage.getItem('userToken');
        
        if (enhancedUserData.studentId && userToken) {
          try {
            // Try different API endpoint formats
            console.log('Profile - Attempting to fetch latest student data...');
            let studentResponse = { ok: false, status: 0 };
            
            // Define all possible API endpoints to try
            const endpoints = [
              `${API_BASE_URL}/api/students/${enhancedUserData.studentId}`,
              `${API_BASE_URL}/api/student/${enhancedUserData.studentId}`,
              `${API_BASE_URL}/api/users/student/${enhancedUserData.studentId}`
            ];
            
            // Try each endpoint until one works
            for (const endpoint of endpoints) {
              try {
                console.log(`Profile - Trying endpoint: ${endpoint}`);
                const response = await fetch(endpoint, {
                  method: 'GET',
                  headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                  }
                });
                
                console.log(`Profile - Endpoint ${endpoint} returned status:`, response.status);
                
                if (response.ok) {
                  studentResponse = response;
                  break; // Exit the loop if we get a successful response
                }
              } catch (endpointError) {
                console.error(`Profile - Error fetching from ${endpoint}:`, endpointError);
              }
            }
            
            // Log the final response status
            console.log('Profile - Final API response status:', studentResponse.status);
            
            if (studentResponse.ok) {
              const updatedStudentData = await studentResponse.json();
              console.log('Profile - Updated student data from server:', updatedStudentData);
              
              // Extract student data from the response (it might be nested in various ways)
              let studentData = updatedStudentData.student || updatedStudentData;
              
              // Check if the data might be nested in a 'data' property
              if (updatedStudentData.data) {
                console.log('Profile - Found data property in response');
                studentData = updatedStudentData.data;
              }
              
              // Check if there's an 'academic' or 'academic_info' section that might contain year and section
              const academicInfo = studentData.academic || studentData.academic_info || studentData.academicInfo || {};
              console.log('Profile - Academic info:', academicInfo);
              
              // Look for profile or personal_info section
              const profileInfo = studentData.profile || studentData.personal_info || studentData.personalInfo || {};
              
              // Log the extracted student data
              console.log('Profile - Extracted student data:', JSON.stringify(studentData, null, 2));
              console.log('Profile - Student data fields:', Object.keys(studentData));
              
              // Check for all possible field names in the API response
              const possibleYearFields = ['yearLevel', 'year', 'year_level', 'level', 'grade'];
              const possibleSectionFields = ['section', 'section_name', 'sectionName', 'class', 'group'];
              
              // Find the year and section values from the API response
              let yearValue = 'N/A';
              
              // First check in the main student data
              for (const field of possibleYearFields) {
                if (studentData[field] !== undefined && studentData[field] !== null && studentData[field] !== '') {
                  yearValue = studentData[field];
                  console.log(`Profile - Found year value in main data, field '${field}':`, yearValue);
                  break;
                }
              }
              
              // If not found, check in academic info
              if (yearValue === 'N/A' && academicInfo) {
                for (const field of possibleYearFields) {
                  if (academicInfo[field] !== undefined && academicInfo[field] !== null && academicInfo[field] !== '') {
                    yearValue = academicInfo[field];
                    console.log(`Profile - Found year value in academic info, field '${field}':`, yearValue);
                    break;
                  }
                }
              }
              
              // If still not found, check in profile info
              if (yearValue === 'N/A' && profileInfo) {
                for (const field of possibleYearFields) {
                  if (profileInfo[field] !== undefined && profileInfo[field] !== null && profileInfo[field] !== '') {
                    yearValue = profileInfo[field];
                    console.log(`Profile - Found year value in profile info, field '${field}':`, yearValue);
                    break;
                  }
                }
              }
              
              // Find section value
              let sectionValue = 'N/A';
              
              // First check in the main student data
              for (const field of possibleSectionFields) {
                if (studentData[field] !== undefined && studentData[field] !== null && studentData[field] !== '') {
                  sectionValue = studentData[field];
                  console.log(`Profile - Found section value in main data, field '${field}':`, sectionValue);
                  break;
                }
              }
              
              // If not found, check in academic info
              if (sectionValue === 'N/A' && academicInfo) {
                for (const field of possibleSectionFields) {
                  if (academicInfo[field] !== undefined && academicInfo[field] !== null && academicInfo[field] !== '') {
                    sectionValue = academicInfo[field];
                    console.log(`Profile - Found section value in academic info, field '${field}':`, sectionValue);
                    break;
                  }
                }
              }
              
              // If still not found, check in profile info
              if (sectionValue === 'N/A' && profileInfo) {
                for (const field of possibleSectionFields) {
                  if (profileInfo[field] !== undefined && profileInfo[field] !== null && profileInfo[field] !== '') {
                    sectionValue = profileInfo[field];
                    console.log(`Profile - Found section value in profile info, field '${field}':`, sectionValue);
                    break;
                  }
                }
              }
              
              // Ensure critical fields are present with consistent naming
              const mergedData = { 
                ...parsedData,
                ...studentData,
                // Explicitly copy and normalize critical fields
                studentId: studentData.studentId || studentData.student_id || parsedData.studentId,
                name: studentData.name || studentData.fullName || parsedData.name,
                email: studentData.email || studentData.emailAddress || parsedData.email,
                // Directly use the found year and section values
                year: yearValue,
                yearLevel: yearValue,
                section: sectionValue,
                course: studentData.course || studentData.program || parsedData.course || 'N/A'
              };
              
              // Log the final values for debugging
              console.log('Profile - Final year value:', mergedData.year);
              console.log('Profile - Final section value:', mergedData.section);
              
              console.log('Profile - Merged data with year and section:', mergedData);
              
              // Update AsyncStorage with the latest data
              await AsyncStorage.setItem('userData', JSON.stringify(mergedData));
              
              // Update state
              setUserData(mergedData);
            } else {
              console.log('Profile - Failed to fetch updated student data:', studentResponse.status);
              // We're already using the enhanced user data with defaults, so no need to do anything else
            }
          } catch (fetchError) {
            console.log('Profile - Could not fetch latest student data:', fetchError);
            // Continue with the enhanced data we already have from storage
          }
        }
      }
    } catch (error) {
      console.error('Profile - Error loading user data:', error);
    }
  };
  
  useEffect(() => {
    loadUserData();
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Logout Confirmation',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          onPress: async () => {
            try {
              // Clear user data from AsyncStorage
              await AsyncStorage.multiRemove(['userData', 'userToken']);
              console.log('User data cleared from storage');
              
              // Navigate to the login screen
              navigation.reset({
                index: 0,
                routes: [{ name: 'StudentLogin' }],
              });
            } catch (error) {
              console.error('Error during logout:', error);
              Alert.alert('Logout Failed', 'An error occurred while trying to logout.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {userData && (
          <>
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {userData.name ? userData.name.charAt(0).toUpperCase() : 'S'}
                  </Text>
                </View>
              </View>
              <Text style={styles.nameText}>{userData.name || 'Student'}</Text>
              <Text style={styles.idText}>{userData.studentId || 'ID Not Available'}</Text>
            </View>
            
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Personal Information</Text>
              
              <View style={styles.infoItem}>
                <Ionicons name="mail-outline" size={24} color="#1B3358" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{userData.email || 'Not available'}</Text>
                </View>
              </View>
              
              <View style={styles.infoItem}>
                <Ionicons name="school-outline" size={24} color="#1B3358" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Course</Text>
                  <Text style={styles.infoValue}>{userData.course || 'Not available'}</Text>
                </View>
              </View>
              
              <View style={styles.infoItem}>
                <Ionicons name="calendar-outline" size={24} color="#1B3358" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Year</Text>
                  <Text style={styles.infoValue}>{userData?.yearLevel || userData?.year || userData?.['year_level'] || 'Not available'}</Text>
                </View>
              </View>
              
              <View style={styles.infoItem}>
                <Ionicons name="people-outline" size={24} color="#1B3358" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Section</Text>
                  <Text style={styles.infoValue}>{userData?.section || userData?.['section_name'] || userData?.sectionName || userData?.class || 'Not available'}</Text>
                </View>
              </View>
              
              <View style={styles.infoItem}>
                <Ionicons name="person-outline" size={24} color="#1B3358" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Student Type</Text>
                  <Text style={styles.infoValue}>{userData?.studentType || 'Regular'}</Text>
                </View>
              </View>
            </View>
            
            <TouchableOpacity style={styles.editButton}>
              <Text style={styles.editButtonText}>Edit Profile</Text>
              <Ionicons name="create-outline" size={20} color="#FFF" style={styles.editIcon} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutButtonText}>Logout</Text>
              <Ionicons name="log-out-outline" size={20} color="#FF6B6B" style={styles.logoutIcon} />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 40,
    paddingHorizontal: 15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1B3358',
  },
  content: {
    flex: 1,
    paddingBottom: 100, // Make room for the tab navigator
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatarContainer: {
    marginBottom: 15,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1B3358',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: 'white',
  },
  nameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  idText: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  sectionContainer: {
    backgroundColor: '#F5F6FA',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B3358',
    marginBottom: 15,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  infoContent: {
    marginLeft: 15,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  editButton: {
    flexDirection: 'row',
    backgroundColor: '#1B3358',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  editButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
  editIcon: {
    marginLeft: 5,
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  logoutButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
  logoutIcon: {
    marginLeft: 5,
  },
});

export default ProfileScreen;
