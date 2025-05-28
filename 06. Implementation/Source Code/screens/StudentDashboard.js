import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import API_BASE_URL from '../config/apiConfig';

const StudentDashboard = () => {
  const [userData, setUserData] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigation = useNavigation();

  // Fetch user data and attendance data when component mounts
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Get stored user data
        const storedUserData = await AsyncStorage.getItem('userData');
        
        if (storedUserData) {
          const parsedUserData = JSON.parse(storedUserData);
          console.log('Stored user data:', parsedUserData);
          
          // IMPORTANT: Ensure year and section are set with defaults if missing
          // This ensures we always have these values regardless of API connectivity
          const enhancedUserData = {
            ...parsedUserData,
            year: parsedUserData.year || parsedUserData.yearLevel || '3rd Year',
            yearLevel: parsedUserData.yearLevel || parsedUserData.year || '3rd Year',
            section: parsedUserData.section || 'A'
          };
          
          // Set enhanced user data from storage immediately
          setUserData(enhancedUserData);
          
          // Save the enhanced data back to storage to ensure persistence
          await AsyncStorage.setItem('userData', JSON.stringify(enhancedUserData));
          
          // Fetch attendance data for this student
          if (enhancedUserData.studentId) {
            fetchAttendanceData(enhancedUserData.studentId);
          }
          
          // If we have a student ID, try to get the latest data from the server
          if (enhancedUserData.studentId) {
            try {
              // Get the authentication token
              const userToken = await AsyncStorage.getItem('userToken');
              
              // Try different API endpoint formats
              console.log('Attempting to fetch latest student data...');
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
                  console.log(`Trying endpoint: ${endpoint}`);
                  const response = await fetch(endpoint, {
                    method: 'GET',
                    headers: {
                      'Authorization': `Bearer ${userToken}`,
                      'Content-Type': 'application/json'
                    }
                  });
                  
                  console.log(`Endpoint ${endpoint} returned status:`, response.status);
                  
                  if (response.ok) {
                    studentResponse = response;
                    break; // Exit the loop if we get a successful response
                  }
                } catch (endpointError) {
                  console.error(`Error fetching from ${endpoint}:`, endpointError);
                }
              }
              
              // Log the final response status
              console.log('Final API response status:', studentResponse.status);
              
              if (studentResponse.ok) {
                const updatedStudentData = await studentResponse.json();
                console.log('Updated student data from server (raw):', JSON.stringify(updatedStudentData, null, 2));
                console.log('API Response Status:', studentResponse.status);
                console.log('API Response Type:', typeof updatedStudentData);
                
                // Extract student data from the response (it might be nested in various ways)
                let studentData = updatedStudentData.student || updatedStudentData;
                
                // Check if the data might be nested in a 'data' property
                if (updatedStudentData.data) {
                  console.log('Found data property in response');
                  studentData = updatedStudentData.data;
                }
                
                // Check if there's an 'academic' or 'academic_info' section that might contain year and section
                const academicInfo = studentData.academic || studentData.academic_info || studentData.academicInfo || {};
                console.log('Academic info:', academicInfo);
                
                // Look for profile or personal_info section
                const profileInfo = studentData.profile || studentData.personal_info || studentData.personalInfo || {};
                
                // Log the extracted student data
                console.log('Extracted student data:', JSON.stringify(studentData, null, 2));
                console.log('Student data fields:', Object.keys(studentData));
                
                // Specifically log year and section related fields
                console.log('Year field value:', studentData.year);
                console.log('YearLevel field value:', studentData.yearLevel);
                console.log('Section field value:', studentData.section);
                
                // Check for all possible field names in the API response
                const possibleYearFields = ['yearLevel', 'year', 'year_level', 'level', 'grade'];
                const possibleSectionFields = ['section', 'section_name', 'sectionName', 'class', 'group'];
                
                // Find the year and section values from the API response
                let yearValue = 'N/A';
                
                // First check in the main student data
                for (const field of possibleYearFields) {
                  if (studentData[field] !== undefined && studentData[field] !== null && studentData[field] !== '') {
                    yearValue = studentData[field];
                    console.log(`Found year value in main data, field '${field}':`, yearValue);
                    break;
                  }
                }
                
                // If not found, check in academic info
                if (yearValue === 'N/A' && academicInfo) {
                  for (const field of possibleYearFields) {
                    if (academicInfo[field] !== undefined && academicInfo[field] !== null && academicInfo[field] !== '') {
                      yearValue = academicInfo[field];
                      console.log(`Found year value in academic info, field '${field}':`, yearValue);
                      break;
                    }
                  }
                }
                
                // If still not found, check in profile info
                if (yearValue === 'N/A' && profileInfo) {
                  for (const field of possibleYearFields) {
                    if (profileInfo[field] !== undefined && profileInfo[field] !== null && profileInfo[field] !== '') {
                      yearValue = profileInfo[field];
                      console.log(`Found year value in profile info, field '${field}':`, yearValue);
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
                    console.log(`Found section value in main data, field '${field}':`, sectionValue);
                    break;
                  }
                }
                
                // If not found, check in academic info
                if (sectionValue === 'N/A' && academicInfo) {
                  for (const field of possibleSectionFields) {
                    if (academicInfo[field] !== undefined && academicInfo[field] !== null && academicInfo[field] !== '') {
                      sectionValue = academicInfo[field];
                      console.log(`Found section value in academic info, field '${field}':`, sectionValue);
                      break;
                    }
                  }
                }
                
                // If still not found, check in profile info
                if (sectionValue === 'N/A' && profileInfo) {
                  for (const field of possibleSectionFields) {
                    if (profileInfo[field] !== undefined && profileInfo[field] !== null && profileInfo[field] !== '') {
                      sectionValue = profileInfo[field];
                      console.log(`Found section value in profile info, field '${field}':`, sectionValue);
                      break;
                    }
                  }
                }
                
                // Ensure critical fields are present with consistent naming
                const mergedData = { 
                  ...parsedUserData,
                  ...studentData,
                  // Explicitly copy and normalize critical fields
                  studentId: studentData.studentId || studentData.student_id || parsedUserData.studentId,
                  name: studentData.name || studentData.fullName || parsedUserData.name,
                  email: studentData.email || studentData.emailAddress || parsedUserData.email,
                  // Directly use the found year and section values
                  year: yearValue,
                  yearLevel: yearValue,
                  section: sectionValue,
                  course: studentData.course || studentData.program || parsedUserData.course || 'N/A'
                };
                
                // Log the final values for debugging
                console.log('Final year value:', mergedData.year);
                console.log('Final section value:', mergedData.section);
                
                console.log('Merged data with year and section:', mergedData);
                
                // Update AsyncStorage with the latest data
                await AsyncStorage.setItem('userData', JSON.stringify(mergedData));
                
                // Update state
                setUserData(mergedData);
              } else {
                console.log('Failed to fetch updated student data:', studentResponse.status);
                
                // Add default year and section values if not already present in stored data
                const enhancedUserData = {
                  ...parsedUserData,
                  // Only set these defaults if they're not already present
                  year: parsedUserData.year || parsedUserData.yearLevel || '3rd Year',
                  yearLevel: parsedUserData.yearLevel || parsedUserData.year || '3rd Year',
                  section: parsedUserData.section || 'A',
                };
                
                console.log('Using enhanced local data with defaults:', enhancedUserData);
                setUserData(enhancedUserData);
                
                // Save the enhanced data back to storage
                await AsyncStorage.setItem('userData', JSON.stringify(enhancedUserData));
              }
            } catch (fetchError) {
              console.log('Could not fetch latest student data:', fetchError);
              // Continue with the data we already have from storage
            }
          } else {
            console.log('Student ID is undefined, using mock data instead');
            // Use mock data if studentId is undefined
            setAttendanceData([
              { id: 1, subject: 'Mathematics', day: 'Monday', time: '9:00 AM' },
              { id: 2, subject: 'Physics', day: 'Tuesday', time: '11:00 AM' },
              { id: 3, subject: 'Computer Science', day: 'Wednesday', time: '2:00 PM' },
              { id: 4, subject: 'English', day: 'Thursday', time: '10:00 AM' },
              { id: 5, subject: 'History', day: 'Friday', time: '1:00 PM' },
            ]);
          }
        } else {
          // If no user data, redirect to login
          setError('User session expired. Please login again.');
          setTimeout(() => {
            try {
              navigation.replace('StudentLogin'); 
            } catch (err) {
              console.log('Navigation error:', err);
            }
          }, 2000);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        setError('Error loading data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    loadUserData();
  }, [navigation]);
  
  const fetchAttendanceData = async (studentId) => {
    if (!studentId) {
      console.error('No student ID provided');
      setError('Student ID is required');
      setLoading(false);
      return;
    }
    try {
      console.log('Fetching attendance data for student ID:', studentId);
      
      if (!studentId) {
        console.error('No student ID provided, cannot fetch attendance data');
        setAttendanceData([]);
        return;
      }
      
      // Get user token for API authentication
      const userToken = await AsyncStorage.getItem('userToken');
      
      if (!userToken) {
        throw new Error('No user token found');
      }

      // Fetch all classes first
      const classesResponse = await fetch(`${API_BASE_URL}/api/classes`, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!classesResponse.ok) {
        throw new Error('Failed to fetch classes');
      }

      const classes = await classesResponse.json();
      console.log('Fetched classes:', classes);

      // Fetch attendance from both collections
      const [attendanceResponse, studentListAttResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/attendance/student/${studentId}`, {
          headers: {
            'Authorization': `Bearer ${userToken}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${API_BASE_URL}/api/studentlistatt/student/${studentId}`, {
          headers: {
            'Authorization': `Bearer ${userToken}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      // Get attendance records from both collections
      const attendanceRecords = attendanceResponse.ok ? await attendanceResponse.json() : [];
      const studentListAttRecords = studentListAttResponse.ok ? await studentListAttResponse.json() : [];

      console.log('Fetched attendance records:', attendanceRecords);
      console.log('Fetched studentListAtt records:', studentListAttRecords);

      // Combine all attendance records
      const allAttendanceRecords = [...attendanceRecords, ...studentListAttRecords];

      // Create a map of attendance by class
      const attendanceByClass = {};
      allAttendanceRecords.forEach(record => {
        if (record.classId) {
          if (!attendanceByClass[record.classId]) {
            attendanceByClass[record.classId] = [];
          }
          attendanceByClass[record.classId].push(record);
        }
      });

      // Create attendance summary for all classes
      const attendanceSummary = classes.map(classItem => {
        const classAttendance = attendanceByClass[classItem._id] || [];
        const latestAttendance = classAttendance.length > 0 ? 
          classAttendance.reduce((latest, current) => {
            return new Date(current.date) > new Date(latest.date) ? current : latest;
          }) : null;

        return {
          classId: classItem._id,
          courseCode: classItem.courseCode,
          courseName: classItem.courseName,
          section: classItem.section,
          schedule: classItem.schedule,
          room: classItem.room,
          status: latestAttendance ? latestAttendance.status : 'absent',
          date: latestAttendance ? latestAttendance.date : new Date().toISOString(),
          totalClasses: classAttendance.length,
          presentCount: classAttendance.filter(a => a.status === 'present').length
        };
      });

      console.log('Attendance summary:', attendanceSummary);
      setAttendanceData(attendanceSummary);
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      setError('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };
  
  const handleLogout = async () => {
    // Show confirmation dialog
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Logout",
          onPress: async () => {
            try {
              console.log('Logging out from dashboard...');
              
              // Clear stored data
              await AsyncStorage.removeItem('userToken');
              await AsyncStorage.removeItem('userData');
              console.log('AsyncStorage cleared');
              
              // Navigate to login screen
              console.log('Navigating to StudentLogin');
              navigation.reset({
                index: 0,
                routes: [{ name: 'StudentLogin' }],
              });
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          }
        }
      ]
    );
  };
  
  // Handle when an attendance item is pressed
  const handleAttendanceItemPress = (item) => {
    // Show a modal or navigate to a details screen
    Alert.alert(
      `${item.subject} - ${item.courseName}`,
      `Date: ${item.day}, ${item.date}\nTime: ${item.time}\nRoom: ${item.room}\nSection: ${item.section}\nLecturer: ${item.lecturerName}\nStatus: ${item.status === 'present' ? 'Present' : 'Absent'}`,
      [{ text: 'Close', style: 'cancel' }]
    );
  };
  
  // Handle viewing detailed attendance information
  const handleViewDetails = (item) => {
    Alert.alert(
      'Attendance Details',
      `Course: ${item.subject} - ${item.courseName}\n\nDate: ${item.day}, ${item.date}\nTime: ${item.time}\nRoom: ${item.room}\nSection: ${item.section}\nSchedule: ${item.schedule}\n\nLecturer: ${item.lecturerName}\nStatus: ${item.status === 'present' ? 'Present' : 'Absent'}`,
      [{ text: 'Close', style: 'cancel' }]
    );
  };
  
  // Handle downloading attendance record
  const handleDownloadRecord = (item) => {
    // In a real app, this would generate a PDF or other document
    Alert.alert(
      'Download Attendance Record',
      'This feature would allow you to download a PDF of your attendance record. This is a placeholder for that functionality.',
      [{ text: 'OK' }]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#1B3358" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Attendance Tracker</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={28} color="#FF6B6B" />
        </TouchableOpacity>
      </View>
      
      {userData && (
        <View style={styles.userInfoCard}>
          <Text style={styles.welcomeText}>
            Welcome, {userData.name || userData.username || 'Student'}
          </Text>
          <Text style={styles.studentInfoText}>
            ID: {userData.studentId || 'N/A'}
          </Text>
          <Text style={styles.studentInfoText}>
            Course: {userData.course || 'N/A'} | Year: {userData.yearLevel || userData.year || 'N/A'} | Section: {userData.section || 'N/A'}
          </Text>
        </View>
      )}
      
      <Text style={styles.title}>Attendance Report</Text>
      
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : attendanceData.length > 0 ? (
        <ScrollView style={styles.attendanceList}>
          <View style={styles.listHeader}>
            <Text style={[styles.headerCell, styles.courseCell]}>Course</Text>
            <Text style={[styles.headerCell, styles.detailsCell]}>Details</Text>
            <Text style={[styles.headerCell, styles.statusCell]}>Status</Text>
            <Text style={[styles.headerCell, styles.actionsCell]}>Actions</Text>
          </View>
          {attendanceData.map(item => (
            <TouchableOpacity 
              key={item.id} 
              style={styles.attendanceItem}
              onPress={() => handleAttendanceItemPress(item)}
            >
              <View style={styles.courseCell}>
                <Text style={styles.courseCode}>{item.subject}</Text>
                <Text style={styles.courseName}>{item.courseName}</Text>
                <Text style={styles.sectionText}>Section {item.section}</Text>
              </View>
              
              <View style={styles.detailsCell}>
                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={12} style={styles.detailIcon} />
                  <Text style={styles.detailText}>Last Attendance: {new Date(item.date).toLocaleDateString()}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="time-outline" size={12} style={styles.detailIcon} />
                  <Text style={styles.detailText}>{item.schedule}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="stats-chart-outline" size={12} style={styles.detailIcon} />
                  <Text style={styles.detailText}>Present: {item.presentCount}/{item.totalClasses} classes</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="person-outline" size={14} color="#666" style={styles.detailIcon} />
                  <Text style={styles.detailText}>{item.lecturerName}</Text>
                </View>
              </View>
              
              <View style={styles.statusCell}>
                <View style={[styles.statusBadge, item.status === 'present' ? styles.presentBadge : styles.absentBadge]}>
                  <Text style={styles.statusText}>{item.status === 'present' ? 'Present' : 'Absent'}</Text>
                </View>
              </View>
              
              <View style={styles.actionsCell}>
                <TouchableOpacity style={styles.actionButton} onPress={() => handleViewDetails(item)}>
                  <Ionicons name="eye-outline" size={22} color="#1B3358" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => handleDownloadRecord(item)}>
                  <Ionicons name="download-outline" size={22} color="#4CAF50" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.noDataContainer}>
          <Ionicons name="calendar-outline" size={64} color="#ccc" />
          <Text style={styles.noDataText}>No attendance records found</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    padding: 16,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B3358',
  },
  userInfoCard: {
    backgroundColor: '#1B3358',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  studentInfoText: {
    fontSize: 14,
    color: '#E0E0E0',
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  attendanceList: {
    flex: 1,
    marginBottom: 16,
  },
  listHeader: {
    flexDirection: 'row',
    backgroundColor: '#E0E0E0',
    padding: 10,
    borderRadius: 5,
    marginBottom: 8,
  },
  headerCell: {
    fontWeight: 'bold',
    color: '#333',
    fontSize: 14,
  },
  courseCell: {
    flex: 2,
    paddingRight: 8,
  },
  detailsCell: {
    flex: 3,
    paddingHorizontal: 4,
  },
  statusCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsCell: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  attendanceItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  courseCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B3358',
    marginBottom: 2,
  },
  sectionText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  courseName: {
    fontSize: 12,
    color: '#666',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailIcon: {
    marginRight: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#555',
    flex: 1,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    minWidth: 70,
    alignItems: 'center',
  },
  presentBadge: {
    backgroundColor: '#E6F7ED',
  },
  absentBadge: {
    backgroundColor: '#FFEAEA',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  actionButton: {
    padding: 5,
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});

export default StudentDashboard;
