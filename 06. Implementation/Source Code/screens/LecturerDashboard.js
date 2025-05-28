import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { router } from 'expo-router';
import API_BASE_URL from '../config/apiConfig';
import CreateClassModal from '../components/CreateClassModal';

const LecturerDashboard = () => {
  const [userData, setUserData] = useState(null);
  const [upcomingClasses, setUpcomingClasses] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [classes, setClasses] = useState([]);
  const navigation = useNavigation();

  useEffect(() => {
    loadUserData();
    loadClasses();
  }, []);

  const loadUserData = async () => {
    try {
      const storedUserData = await AsyncStorage.getItem('userData');
      if (storedUserData) {
        const parsedData = JSON.parse(storedUserData);
        console.log('Lecturer Dashboard - Stored user data:', parsedData);
        
        // Set user data from storage
        setUserData(parsedData);
        
        // Try to fetch the latest user data from the server if we have a lecturer ID and token
        const userToken = await AsyncStorage.getItem('userToken');
        
        if (parsedData.lecturerId && userToken) {
          try {
            // Try different API endpoint formats
            console.log('Lecturer Dashboard - Attempting to fetch latest lecturer data...');
            let lecturerResponse = { ok: false, status: 0 };
            
            // Define all possible API endpoints to try
            const endpoints = [
              `${API_BASE_URL}/api/lecturers/${parsedData.lecturerId}`,
              `${API_BASE_URL}/api/lecturer/${parsedData.lecturerId}`,
              `${API_BASE_URL}/api/users/lecturer/${parsedData.lecturerId}`
            ];
            
            // Try each endpoint until one works
            for (const endpoint of endpoints) {
              try {
                console.log(`Lecturer Dashboard - Trying endpoint: ${endpoint}`);
                const response = await fetch(endpoint, {
                  method: 'GET',
                  headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                  }
                });
                
                console.log(`Lecturer Dashboard - Endpoint ${endpoint} returned status:`, response.status);
                
                if (response.ok) {
                  lecturerResponse = response;
                  break; // Exit the loop if we get a successful response
                }
              } catch (endpointError) {
                console.error(`Lecturer Dashboard - Error fetching from ${endpoint}:`, endpointError);
              }
            }
            
            if (lecturerResponse.ok) {
              const updatedLecturerData = await lecturerResponse.json();
              console.log('Lecturer Dashboard - Updated lecturer data from server:', updatedLecturerData);
              
              // Extract lecturer data from the response (it might be nested in various ways)
              let lecturerData = updatedLecturerData.lecturer || updatedLecturerData;
              
              // Check if the data might be nested in a 'data' property
              if (updatedLecturerData.data) {
                console.log('Lecturer Dashboard - Found data property in response');
                lecturerData = updatedLecturerData.data;
              }
              
              // Ensure critical fields are present with consistent naming
              const mergedData = { 
                ...parsedData,
                ...lecturerData,
                // Explicitly copy and normalize critical fields
                lecturerId: lecturerData.lecturerId || lecturerData.lecturer_id || parsedData.lecturerId,
                name: lecturerData.name || lecturerData.fullName || parsedData.name,
                email: lecturerData.email || lecturerData.emailAddress || parsedData.email,
                department: lecturerData.department || parsedData.department || 'Not specified',
                role: 'lecturer'
              };
              
              // Update AsyncStorage with the latest data
              await AsyncStorage.setItem('userData', JSON.stringify(mergedData));
              
              // Update state
              setUserData(mergedData);
            }
          } catch (fetchError) {
            console.log('Lecturer Dashboard - Could not fetch latest lecturer data:', fetchError);
            // Continue with the data we already have from storage
          }
        }
      }
    } catch (error) {
      console.error('Lecturer Dashboard - Error loading user data:', error);
    }
  };

  const loadClasses = async () => {
    try {
      setRefreshing(true);
      
      // Get authentication data
      const userToken = await AsyncStorage.getItem('userToken');
      const storedUserData = await AsyncStorage.getItem('userData');
      
      if (userToken && storedUserData) {
        const parsedData = JSON.parse(storedUserData);
        
        if (parsedData.lecturerId) {
          // Fetch classes directly from MongoDB via API
          const response = await fetch(`${API_BASE_URL}/api/classes/lecturer/${parsedData.lecturerId}`, {
            headers: {
              'Authorization': `Bearer ${userToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            const fetchedClasses = data.classes || data;
            console.log('Classes fetched from MongoDB:', fetchedClasses);
            
            // Update state with fetched classes
            setClasses(fetchedClasses || []);
            generateUpcomingClasses(fetchedClasses || []);
          } else {
            console.error('Failed to fetch classes:', response.status);
            setClasses([]);
            setUpcomingClasses([]);
          }
        } else {
          console.error('No lecturer ID found');
          setClasses([]);
          setUpcomingClasses([]);
        }
      } else {
        console.error('No authentication token found');
        setClasses([]);
        setUpcomingClasses([]);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
      // Set empty arrays if there's an error
      setClasses([]);
      setUpcomingClasses([]);
    } finally {
      setRefreshing(false);
    }
  };
  
  // Redirect to the classes screen
  const handleManageClasses = () => {
    router.push('/(lecturer)/classes');
  };
  
  const generateUpcomingClasses = (classData) => {
    // Generate dates for the next 7 days
    const today = new Date();
    const nextWeek = [];
    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(today);
      nextDay.setDate(today.getDate() + i);
      nextWeek.push(nextDay);
    }
    
    // Convert class data to upcoming classes format
    const upcoming = [];
    
    classData.forEach((classItem, index) => {
      // Parse schedule to determine days of the week
      const schedule = classItem.schedule || 'MWF 09:00 AM - 11:00 AM';
      const days = schedule.substring(0, schedule.indexOf(' '));
      
      // Extract time from schedule
      const timeMatch = schedule.match(/([0-9]{1,2}:[0-9]{2} [AP]M) - ([0-9]{1,2}:[0-9]{2} [AP]M)/);
      const startTime = timeMatch ? timeMatch[1] : '09:00 AM';
      const endTime = timeMatch ? timeMatch[2] : '11:00 AM';
      
      // Map days to upcoming dates
      const dayMap = {
        'M': 1, // Monday
        'T': 2, // Tuesday
        'W': 3, // Wednesday
        'Th': 4, // Thursday
        'F': 5, // Friday
        'S': 6, // Saturday
        'Su': 0  // Sunday
      };
      
      // Create class instances for each day in the schedule
      for (let i = 0; i < nextWeek.length; i++) {
        const date = nextWeek[i];
        const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
        
        // Check if this class occurs on this day
        let hasClass = false;
        
        if (days.includes('M') && dayOfWeek === 1) hasClass = true;
        if (days.includes('T') && !days.includes('Th') && dayOfWeek === 2) hasClass = true;
        if (days.includes('W') && dayOfWeek === 3) hasClass = true;
        if (days.includes('Th') && dayOfWeek === 4) hasClass = true;
        if (days.includes('F') && dayOfWeek === 5) hasClass = true;
        if (days.includes('S') && !days.includes('Su') && dayOfWeek === 6) hasClass = true;
        if (days.includes('Su') && dayOfWeek === 0) hasClass = true;
        
        if (hasClass) {
          upcoming.push({
            ...classItem,
            date: date.toISOString().split('T')[0],
            startTime,
            endTime
          });
        }
      }
    });
    
    // Sort by date and time
    upcoming.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.startTime.localeCompare(b.startTime);
    });
    
    setUpcomingClasses(upcoming);
  };

  const onRefresh = () => {
    loadClasses();
  };

  const formatDate = (dateString) => {
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const handleClassPress = (classItem) => {
    // Navigate to class details or attendance screen
    navigation.navigate('ClassAttendance', { classData: classItem });
  };

  const handleCameraPress = () => {
    // Navigate to camera screen
    navigation.navigate('QrScanner');
  };

  const handleWebScannerPress = () => {
    // Navigate to the scanner route using Expo Router
    router.push('/(lecturer)/scanner');
  };

  const renderHomeTab = () => {
    return (
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadClasses}
            colors={['#1B3358']}
            tintColor={'#1B3358'}
          />
        }
      >
        {/* Dashboard Header with Greeting */}
        <View style={styles.dashboardHeader}>
          <View style={styles.greetingContainer}>
            <Text style={styles.greetingText}>Hello,</Text>
            <Text style={styles.lecturerName}>{userData?.name || 'Lecturer'}</Text>
            <Text style={styles.dateSubtitle}>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>
          </View>
          <View style={styles.headerIconContainer}>
            <Ionicons name="school-outline" size={48} color="#1B3358" />
          </View>
        </View>
        
        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="calendar" size={24} color="#4CAF50" />
            <Text style={styles.statNumber}>{upcomingClasses.length}</Text>
            <Text style={styles.statLabel}>Classes</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="people" size={24} color="#2196F3" />
            <Text style={styles.statNumber}>{classes.reduce((total, c) => total + (c.students || 0), 0)}</Text>
            <Text style={styles.statLabel}>Students</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="time" size={24} color="#FF9800" />
            <Text style={styles.statNumber}>{upcomingClasses.filter(c => 
              c.date && new Date(c.date).toDateString() === new Date().toDateString()
            ).length}</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
        </View>

        {/* Upcoming Classes Section */}
        <View style={styles.sectionHeaderContainer}>
          <Text style={styles.sectionTitle}>Upcoming Classes</Text>
          <TouchableOpacity onPress={handleManageClasses}>
            <Text style={styles.seeAllButton}>See All</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.upcomingClassesContainer}>
          {upcomingClasses.length === 0 ? (
            <View style={styles.noClassesContainer}>
              <View style={styles.emptyStateIconContainer}>
                <Ionicons name="calendar-outline" size={64} color="#fff" />
              </View>
              <Text style={styles.noClassesText}>No upcoming classes</Text>
              <Text style={styles.noClassesSubText}>Your upcoming classes will appear here</Text>
              <TouchableOpacity 
                style={[styles.createClassButton, { marginTop: 20 }]}
                onPress={handleManageClasses}
              >
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={styles.createClassButtonText}>Manage Classes</Text>
              </TouchableOpacity>
            </View>
          ) : (
            upcomingClasses.map((classItem, index) => {
              const isToday = classItem.date && new Date(classItem.date).toDateString() === new Date().toDateString();
              
              return (
                <TouchableOpacity
                  key={classItem.id || index}
                  style={[
                    styles.classCard,
                    isToday && styles.todayClassCard
                  ]}
                  onPress={() => handleClassPress(classItem)}
                >
                  <View style={styles.classCardLeft}>
                    <View style={[styles.classColorIndicator, {
                      backgroundColor: getClassColor(classItem.courseCode)
                    }]} />
                  </View>
                  
                  <View style={styles.classCardContent}>
                    <View style={styles.classHeader}>
                      <Text style={styles.courseCode}>{classItem.courseCode}</Text>
                      {isToday && (
                        <View style={styles.todayPill}>
                          <Text style={styles.todayPillText}>Today</Text>
                        </View>
                      )}
                    </View>
                    
                    <Text style={styles.courseName}>{classItem.courseName}</Text>
                    <Text style={styles.classInfo}>Section {classItem.section} • {classItem.room}</Text>
                    
                    <View style={styles.dateTimeContainer}>
                      <View style={styles.dateContainer}>
                        <Ionicons name="calendar-outline" size={16} color="#666" />
                        <Text style={styles.dateText}>{formatDate(classItem.date)}</Text>
                      </View>
                      <View style={styles.timeContainer}>
                        <Ionicons name="time-outline" size={16} color="#666" />
                        <Text style={styles.timeText}>{classItem.startTime} - {classItem.endTime}</Text>
                      </View>
                    </View>
                  </View>
                  
                  <TouchableOpacity style={styles.classCardAction}>
                    <Ionicons name="chevron-forward" size={20} color="#1B3358" />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })
          )}
        </View>
        
        {/* Quick Actions Section */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <View style={styles.actionsRow}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleWebScannerPress}
            >
              <View style={[styles.actionIcon, { backgroundColor: "#4CAF50" }]}>
                <Ionicons name="scan-outline" size={24} color="#fff" />
              </View>
              <Text style={styles.actionText}>Scan QR</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate("AttendanceHistory")}
            >
              <View style={[styles.actionIcon, { backgroundColor: "#2196F3" }]}>
                <Ionicons name="list-outline" size={24} color="#fff" />
              </View>
              <Text style={styles.actionText}>Attendance</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleManageClasses}
            >
              <View style={[styles.actionIcon, { backgroundColor: "#FF9800" }]}>
                <Ionicons name="book-outline" size={24} color="#fff" />
              </View>
              <Text style={styles.actionText}>Classes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  };
  
  // Function to generate a consistent color based on course code
  const getClassColor = (courseCode) => {
    const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#009688'];
    let hash = 0;
    
    if (!courseCode) return colors[0];
    
    for (let i = 0; i < courseCode.length; i++) {
      hash = courseCode.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    hash = Math.abs(hash);
    return colors[hash % colors.length];
  };
  
  // Handle tab changes and navigation
  useEffect(() => {
    if (activeTab === 'classes') {
      // Navigate to the dedicated classes screen
      router.push('/(lecturer)/classes');
      
      // Reset the active tab to home after navigation
      setTimeout(() => {
        setActiveTab('home');
      }, 100);
    }
  }, [activeTab]);
  
  // This function is used as a placeholder while redirecting to the Classes screen
  const renderClassesRedirect = () => {
    return (
      <View style={styles.tabContent}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Redirecting to Classes...</Text>
        </View>
      </View>
    );
  };

  const renderCameraTab = () => {
    return (
      <View style={styles.cameraContainer}>
        <View style={styles.cameraPlaceholder}>
          <Ionicons name="camera" size={60} color="#1B3358" />
          <Text style={styles.cameraText}>QR Code Scanner</Text>
          <Text style={styles.cameraSubtext}>
            Scan student QR codes to mark attendance for your classes.
          </Text>
          
          <TouchableOpacity 
            style={styles.openCameraButton}
            onPress={handleCameraPress}
          >
            <Ionicons name="camera-outline" size={20} color="white" style={styles.buttonIcon} />
            <Text style={styles.openCameraText}>Open Camera</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.openCameraButton, styles.webScannerButton]}
            onPress={handleWebScannerPress}
          >
            <Ionicons name="scan-outline" size={20} color="white" style={styles.buttonIcon} />
            <Text style={styles.openCameraText}>Web Scanner</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderClassesTab = () => {
    return (
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.sectionHeaderContainer}>
          <Text style={styles.sectionTitle}>My Classes</Text>
        </View>
        
        {classes.length > 0 ? (
          <View style={styles.upcomingClassesContainer}>
            {classes.map((classItem, index) => (
              <TouchableOpacity
                key={classItem._id || index}
                style={[styles.classCard]}
                onPress={() => handleClassPress(classItem)}
              >
                <View style={styles.classCardLeft}>
                  <View 
                    style={[styles.classColorIndicator, { backgroundColor: getColorForCourse(classItem.courseCode) }]}
                  />
                </View>
                <View style={styles.classCardContent}>
                  <View style={styles.classHeader}>
                    <Text style={styles.courseCode}>{classItem.courseCode}</Text>
                  </View>
                  <Text style={styles.courseName}>{classItem.courseName}</Text>
                  <Text style={styles.classInfo}>
                    Section {classItem.section} • Room {classItem.room}
                  </Text>
                  <View style={styles.classSchedule}>
                    <Ionicons name="time-outline" size={16} color="#666" />
                    <Text style={styles.scheduleText}>
                      {classItem.schedule}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.noClassesContainer}>
            <View style={styles.emptyStateIconContainer}>
              <Ionicons name="book-outline" size={40} color="#1B3358" />
            </View>
            <Text style={styles.noClassesText}>No Classes Found</Text>
            <Text style={styles.noClassesSubText}>
              You don't have any classes yet. Create a new class to get started.
            </Text>
            <TouchableOpacity 
              style={styles.createClassButton}
              onPress={() => setShowCreateClassModal(true)}
            >
              <Ionicons name="add-circle-outline" size={20} color="white" />
              <Text style={styles.createClassButtonText}>Create New Class</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    );
  };

  const renderProfileTab = () => {
    return (
      <ScrollView style={styles.profileTabScrollView}>
        {userData && (
          <>
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {userData.name ? userData.name.charAt(0).toUpperCase() : 'L'}
                  </Text>
                </View>
              </View>
              <Text style={styles.profileNameText}>{userData.name || 'Lecturer'}</Text>
              <Text style={styles.idText}>{userData.lecturerId || 'ID Not Available'}</Text>
            </View>
            
            <View style={styles.sectionContainer}>
              <Text style={styles.profileSectionTitle}>Personal Information</Text>
              
              <View style={styles.infoItem}>
                <Ionicons name="mail-outline" size={24} color="#1B3358" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{userData.email || 'Not available'}</Text>
                </View>
              </View>
              
              <View style={styles.infoItem}>
                <Ionicons name="business-outline" size={24} color="#1B3358" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Department</Text>
                  <Text style={styles.infoValue}>{userData.department || 'Not available'}</Text>
                </View>
              </View>
              
              <View style={styles.infoItem}>
                <Ionicons name="school-outline" size={24} color="#1B3358" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Position</Text>
                  <Text style={styles.infoValue}>{userData.position || 'Lecturer'}</Text>
                </View>
              </View>
            </View>
            
            <TouchableOpacity style={styles.editButton}>
              <Text style={styles.editButtonText}>Edit Profile</Text>
              <Ionicons name="create-outline" size={20} color="#FFF" style={styles.editIcon} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.logoutButton} 
              onPress={() => {
                // Implement logout functionality
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
                            routes: [{ name: 'LecturerLogin' }],
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
              }}
            >
              <Text style={styles.logoutButtonText}>Logout</Text>
              <Ionicons name="log-out-outline" size={20} color="#FF6B6B" style={styles.logoutIcon} />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        {activeTab === 'home' && renderHomeTab()}
        {activeTab === 'camera' && renderCameraTab()}
        {activeTab === 'profile' && renderProfileTab()}
        {activeTab === 'classes' && renderClassesRedirect()}
      </View>
      
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'home' && styles.activeTabItem]}
          onPress={() => setActiveTab('home')}
        >
          <Ionicons
            name={activeTab === 'home' ? 'home' : 'home-outline'}
            size={24}
            color={activeTab === 'home' ? '#1B3358' : '#666'}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'home' && styles.activeTabLabel
            ]}
          >
            Home
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'classes' && styles.activeTabItem]}
          onPress={() => setActiveTab('classes')}
        >
          <Ionicons
            name={activeTab === 'classes' ? 'book' : 'book-outline'}
            size={24}
            color={activeTab === 'classes' ? '#1B3358' : '#666'}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'classes' && styles.activeTabLabel
            ]}
          >
            Classes
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'camera' && styles.activeTabItem]}
          onPress={() => setActiveTab('camera')}
        >
          <Ionicons
            name={activeTab === 'camera' ? 'camera' : 'camera-outline'}
            size={24}
            color={activeTab === 'camera' ? '#1B3358' : '#666'}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'camera' && styles.activeTabLabel
            ]}
          >
            Camera
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'profile' && styles.activeTabItem]}
          onPress={() => setActiveTab('profile')}
        >
          <Ionicons
            name={activeTab === 'profile' ? 'person' : 'person-outline'}
            size={24}
            color={activeTab === 'profile' ? '#1B3358' : '#666'}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'profile' && styles.activeTabLabel
            ]}
          >
            Profile
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Base Layout
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    flex: 1,
    paddingBottom: 60, // Space for the tab bar
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 80, // Extra padding to ensure content is visible above the tab bar
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  
  // Dashboard Header Styles
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
    marginBottom: 16,
  },
  greetingContainer: {
    flex: 1,
  },
  greetingText: {
    fontSize: 16,
    color: '#666',
  },
  lecturerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B3358',
    marginBottom: 4,
  },
  dateSubtitle: {
    fontSize: 14,
    color: '#888',
  },
  headerIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Stats Container Styles
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  
  // Section Headers
  sectionHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B3358',
  },
  seeAllButton: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '500',
  },
  
  // Class Cards
  upcomingClassesContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  classCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  todayClassCard: {
    borderWidth: 1,
    borderColor: '#e6f7ff',
    backgroundColor: '#f9fdff',
  },
  classCardLeft: {
    width: 8,
    height: '100%',
  },
  classColorIndicator: {
    width: '100%',
    height: '100%',
  },
  classCardContent: {
    flex: 1,
    padding: 16,
  },
  classCardAction: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: 12,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  courseCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B3358',
  },
  todayPill: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  todayPillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  courseName: {
    fontSize: 16,
    marginBottom: 4,
    color: '#333',
  },
  classInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  
  // Empty State
  noClassesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 40,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyStateIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  noClassesText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  noClassesSubText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  
  // Action Buttons
  createClassButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B3358',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  createClassButtonText: {
    color: '#fff',
    marginLeft: 6,
    fontWeight: '600',
    fontSize: 14,
  },
  actionsSection: {
    marginTop: 8,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  
  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eaeaea',
    height: 60,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeTabItem: {
    borderTopWidth: 3,
    borderTopColor: '#1B3358',
  },
  tabIcon: {
    marginBottom: 4,
  },
  
  // Profile Tab
  profileScrollViewContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  profileHeader: {
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
  },
  profileAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  profileDepartment: {
    fontSize: 14,
    color: '#888',
  },
  profileSection: {
    backgroundColor: '#fff',
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eaeaea',
  },
  profileSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    marginTop: 4,
  },
  profileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  profileMenuItemLast: {
    borderBottomWidth: 0,
  },
  profileMenuIcon: {
    marginRight: 12,
    width: 24,
  },
  profileMenuText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  profileLogoutButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 40,
    marginHorizontal: 16,
    alignItems: 'center',
  },
  profileLogoutText: {
    color: '#d32f2f',
    fontSize: 16,
    fontWeight: '600',
  },
  

  classSchedule: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  scheduleText: {
    marginLeft: 6,
    color: '#666',
    fontSize: 14,
  },
  classActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  classActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1B3358',
  },
  classActionText: {
    color: '#1B3358',
    marginLeft: 6,
    fontWeight: '500',
    fontSize: 12,
  },
  content: {
    flex: 1,
    paddingBottom: 60, // Space for tab bar
  },
  dashboardScrollView: {
    flex: 1,
  },
  welcomeSection: {
    backgroundColor: '#1B3358',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 30,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  welcomeText: {
    color: 'white',
    fontSize: 22,
    fontWeight: '500',
  },
  nameText: {
    fontSize: 26,
    fontWeight: 'bold',
  },
  todayClassesContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    padding: 10,
    alignSelf: 'flex-start',
    marginTop: 15,
  },
  todayClassesText: {
    color: 'white',
    fontWeight: '600',
  },
  upcomingSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  noClassesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: 'white',
    borderRadius: 10,
    marginVertical: 10,
  },
  noClassesText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  
  // Camera tab styles
  cameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cameraPlaceholder: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 30,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cameraText: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
  },
  cameraSubtext: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
  },
  openCameraButton: {
    backgroundColor: '#1B3358',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webScannerButton: {
    backgroundColor: '#4CAF50',
    marginTop: 12,
  },
  buttonIcon: {
    marginRight: 8,
  },
  openCameraText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Profile tab styles
  profileTabScrollView: {
    flex: 1,
    backgroundColor: '#F5F6FA',
    padding: 20,
    paddingTop: 60,
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
  profileNameText: {
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
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  profileSectionTitle: {
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
  dashboardLogoutButton: {
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
  dashboardLogoutButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
  logoutIcon: {
    marginLeft: 5,
  },
  
  // Enhanced Tab Bar Styles
  tabLabel: {
    fontSize: 12,
    marginTop: 2,
    color: '#666',
  },
  activeTabLabel: {
    color: '#1B3358',
    fontWeight: '600',
  },
});

export default LecturerDashboard;
