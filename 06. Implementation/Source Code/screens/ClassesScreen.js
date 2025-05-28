import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  RefreshControl, 
  Alert,
  Modal,
  TextInput,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { router } from 'expo-router';
import API_BASE_URL from '../config/apiConfig';
import CreateClassModal from '../components/CreateClassModal';

// Helper function to check if scanner is available for a given schedule
const isScannerAvailable = (schedule) => {
  try {
    // Get current time
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDay = now.getDay(); // 0-6 (Sunday-Saturday)
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    // Map day names to numbers
    const dayNameToNumber = {
      'SUNDAY': 0,
      'MONDAY': 1,
      'TUESDAY': 2,
      'WEDNESDAY': 3,
      'THURSDAY': 4,
      'FRIDAY': 5,
      'SATURDAY': 6,
      'MWF': [1, 3, 5],
      'TTH': [2, 4],
      'WEEKDAYS': [1, 2, 3, 4, 5],
      'WEEKEND': [0, 6]
    };

    if (!schedule) return false;

    // Split multiple schedules
    const schedules = schedule.split(';').map(s => s.trim());

    for (const scheduleStr of schedules) {
      const [dayName, timeRange] = scheduleStr.split(/\s+(.+)/);
      if (!dayName || !timeRange) continue;

      // Get days to check
      const daysToCheck = Array.isArray(dayNameToNumber[dayName.toUpperCase()]) ?
        dayNameToNumber[dayName.toUpperCase()] :
        [dayNameToNumber[dayName.toUpperCase()]];

      if (!daysToCheck || !daysToCheck.includes(currentDay)) continue;

      // Parse time range
      const [startStr, endStr] = timeRange.split('-').map(t => t.trim());
      if (!startStr || !endStr) continue;

      // Convert times to minutes
      const parseTime = (timeStr) => {
        const [time, period] = timeStr.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
      };

      const startTimeInMinutes = parseTime(startStr);
      const endTimeInMinutes = parseTime(endStr);

      // Check if current time is within class schedule
      // If it is, scanner should be available (return true)
      if (currentTimeInMinutes >= startTimeInMinutes && 
          currentTimeInMinutes <= endTimeInMinutes) {
        // We're in class time, so scanner should be available
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking scanner availability:', error);
    return false;
  }
};

const ClassesScreen = () => {
  const [classes, setClasses] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [showClassDetailsModal, setShowClassDetailsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState({
    sortBy: 'courseCode', // 'courseCode', 'courseName', 'schedule'
    filterDay: 'all' // 'all', 'M', 'T', 'W', 'Th', 'F', 'S', 'Su'
  });
  
  const navigation = useNavigation();

  useEffect(() => {
    loadClasses();
  }, []);

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
          const response = await fetch(`${API_BASE_URL}/api/classes/lecturer/${parsedData.lecturerId}/classes`, {
            headers: {
              'Authorization': `Bearer ${userToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('Classes fetched from MongoDB:', data);
            
            // Update state with fetched classes
            setClasses(Array.isArray(data) ? data : []);
          } else {
            console.error('Failed to fetch classes:', response.status);
            Alert.alert(
              'Error',
              'Failed to fetch classes from the server. Please try again later.'
            );
            setClasses([]);
          }
        } else {
          console.error('No lecturer ID found');
          Alert.alert(
            'Error',
            'Your account information is incomplete. Please log in again.'
          );
          setClasses([]);
        }
      } else {
        console.error('No authentication token found');
        Alert.alert(
          'Authentication Error',
          'Please log in to view your classes.'
        );
        setClasses([]);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
      Alert.alert(
        'Error',
        'An error occurred while fetching your classes. Please try again.'
      );
      setClasses([]);
    } finally {
      setRefreshing(false);
    }
  };

  // Handle class creation
  const handleClassCreated = async (newClass) => {
    try {
      // The class has already been created in CreateClassModal
      // We just need to refresh the class list
      console.log('Class created successfully:', newClass);
      loadClasses();
    } catch (error) {
      console.error('Error in handleClassCreated:', error);
      Alert.alert('Error', 'An error occurred while refreshing the class list.');
    }
  };
  
  const handleClassPress = (classItem) => {
    setSelectedClass(classItem);
    setShowClassDetailsModal(true);
  };
  
  const handleViewStudentList = (classItem) => {
    router.push({
      pathname: '/(lecturer)/student-list',
      params: {
        classId: classItem._id,
        courseCode: classItem.courseCode,
        courseName: classItem.courseName,
        section: classItem.section,
        yearLevel: classItem.year || '1st Year'
      }
    });
  };
  
  const handleDeleteClass = async (classId) => {
    Alert.alert(
      'Delete Class',
      'Are you sure you want to delete this class? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Get authentication data
              const userToken = await AsyncStorage.getItem('userToken');
              
              if (!userToken) {
                Alert.alert('Authentication Error', 'Please log in to delete a class.');
                return;
              }
              
              // Get user data to get lecturer ID
              const storedUserData = await AsyncStorage.getItem('userData');
              if (!storedUserData) {
                Alert.alert('Error', 'User data not found. Please log in again.');
                return;
              }
              
              const parsedData = JSON.parse(storedUserData);
              if (!parsedData.lecturerId) {
                Alert.alert('Error', 'Lecturer ID not found. Please log in again.');
                return;
              }
              
              // Delete directly from MongoDB via API
              const response = await fetch(`${API_BASE_URL}/api/classes/${classId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${userToken}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (response.ok) {
                console.log('Class deleted from MongoDB');
                
                // Update local state
                const updatedClasses = classes.filter(c => c.id !== classId);
                setClasses(updatedClasses);
                
                // Close the modal
                setShowClassDetailsModal(false);
                
                // Show success message
                Alert.alert('Success', 'Class deleted successfully!');
              } else {
                console.error('Failed to delete class from MongoDB:', response.status);
                Alert.alert('Error', 'Failed to delete class from the database. Please try again.');
              }
            } catch (error) {
              console.error('Error deleting class:', error);
              Alert.alert('Error', 'An error occurred while deleting the class. Please try again.');
            }
          }
        }
      ]
    );
  };
  
  const handleTakeAttendance = async (classItem) => {
    try {
      console.log('Taking attendance for class:', classItem);
      
      // Store the complete class data in AsyncStorage for the scanner to access
      // This ensures all class details are available for attendance records
      await AsyncStorage.setItem('currentClass', JSON.stringify(classItem));
      
      // Get lecturer data to include with attendance
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const parsedUserData = JSON.parse(userData);
        console.log('Storing lecturer data for attendance:', parsedUserData);
        
        // Store the complete lecturer data to ensure all information is available
        // This is important for properly recording the lecturer in attendance records
        await AsyncStorage.setItem('lecturerData', JSON.stringify({
          // Store all possible ID fields
          id: parsedUserData.lecturerId || parsedUserData._id || parsedUserData.id,
          _id: parsedUserData._id || parsedUserData.lecturerId || parsedUserData.id,
          lecturerId: parsedUserData.lecturerId || parsedUserData._id || parsedUserData.id,
          // Store all possible name fields
          name: parsedUserData.name || parsedUserData.fullName || parsedUserData.lecturerName,
          fullName: parsedUserData.fullName || parsedUserData.name || parsedUserData.lecturerName,
          // Store additional lecturer information if available
          email: parsedUserData.email || parsedUserData.emailAddress,
          department: parsedUserData.department,
          // Store the original data as well for reference
          originalData: parsedUserData
        }));
      } else {
        console.warn('No lecturer data found in AsyncStorage');
      }
      
      // Close the modal first
      setShowClassDetailsModal(false);
      
      // Navigate to the scanner screen
      router.push('/(lecturer)/scanner');
    } catch (error) {
      console.error('Error navigating to scanner:', error);
      Alert.alert('Error', 'Could not open the attendance scanner. Please try again.');
    }
  };
  
  const getFilteredClasses = () => {
    // First apply search filter
    let filteredClasses = classes.filter(c => 
      c.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.room.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    // Then apply day filter
    if (filters.filterDay !== 'all') {
      filteredClasses = filteredClasses.filter(c => 
        c.schedule && c.schedule.includes(filters.filterDay)
      );
    }
    
    // Then sort
    return filteredClasses.sort((a, b) => {
      if (filters.sortBy === 'courseCode') {
        return a.courseCode.localeCompare(b.courseCode);
      } else if (filters.sortBy === 'courseName') {
        return a.courseName.localeCompare(b.courseName);
      } else if (filters.sortBy === 'schedule') {
        return a.schedule.localeCompare(b.schedule);
      }
      return 0;
    });
  };
  
  const renderFilterModal = () => {
    return (
      <Modal
        visible={filterModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModalContainer}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Filter & Sort</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Sort By</Text>
              <View style={styles.filterOptions}>
                <TouchableOpacity 
                  style={[
                    styles.filterOption, 
                    filters.sortBy === 'courseCode' && styles.filterOptionSelected
                  ]}
                  onPress={() => setFilters({...filters, sortBy: 'courseCode'})}
                >
                  <Text style={filters.sortBy === 'courseCode' ? styles.filterOptionTextSelected : styles.filterOptionText}>
                    Course Code
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.filterOption, 
                    filters.sortBy === 'courseName' && styles.filterOptionSelected
                  ]}
                  onPress={() => setFilters({...filters, sortBy: 'courseName'})}
                >
                  <Text style={filters.sortBy === 'courseName' ? styles.filterOptionTextSelected : styles.filterOptionText}>
                    Course Name
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.filterOption, 
                    filters.sortBy === 'schedule' && styles.filterOptionSelected
                  ]}
                  onPress={() => setFilters({...filters, sortBy: 'schedule'})}
                >
                  <Text style={filters.sortBy === 'schedule' ? styles.filterOptionTextSelected : styles.filterOptionText}>
                    Schedule
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Filter by Day</Text>
              <View style={styles.filterOptions}>
                <TouchableOpacity 
                  style={[
                    styles.filterOption, 
                    filters.filterDay === 'all' && styles.filterOptionSelected
                  ]}
                  onPress={() => setFilters({...filters, filterDay: 'all'})}
                >
                  <Text style={filters.filterDay === 'all' ? styles.filterOptionTextSelected : styles.filterOptionText}>
                    All Days
                  </Text>
                </TouchableOpacity>
                
                {['M', 'T', 'W', 'Th', 'F'].map(day => (
                  <TouchableOpacity 
                    key={day}
                    style={[
                      styles.filterDayOption, 
                      filters.filterDay === day && styles.filterOptionSelected
                    ]}
                    onPress={() => setFilters({...filters, filterDay: day})}
                  >
                    <Text style={filters.filterDay === day ? styles.filterOptionTextSelected : styles.filterOptionText}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.applyFilterButton}
              onPress={() => setFilterModalVisible(false)}
            >
              <Text style={styles.applyFilterButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };
  
  const renderClassDetailsModal = () => {
    if (!selectedClass) return null;
    
    return (
      <Modal
        visible={showClassDetailsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowClassDetailsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.classDetailsContainer}>
            <View style={styles.classDetailsHeader}>
              <Text style={styles.classDetailsTitle}>{selectedClass.courseCode}</Text>
              <TouchableOpacity onPress={() => setShowClassDetailsModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.classDetailsContent}>
              <Text style={styles.classDetailsCourseName}>{selectedClass.courseName}</Text>
              <Text style={styles.classDetailsSection}>Section {selectedClass.section}</Text>
              
              <View style={styles.classDetailsInfoRow}>
                <Ionicons name="location-outline" size={20} color="#666" />
                <Text style={styles.classDetailsInfoText}>{selectedClass.room}</Text>
              </View>
              
              <View style={styles.classDetailsInfoRow}>
                <Ionicons name="time-outline" size={20} color="#666" />
                <Text style={styles.classDetailsInfoText}>{selectedClass.schedule}</Text>
              </View>
              
              <View style={styles.classDetailsInfoRow}>
                <Ionicons name="people-outline" size={20} color="#666" />
                <Text style={styles.classDetailsInfoText}>{selectedClass.students || 0} Students</Text>
              </View>
              
              {selectedClass.description && (
                <View style={styles.classDetailsDescriptionContainer}>
                  <Text style={styles.classDetailsDescriptionTitle}>Description</Text>
                  <Text style={styles.classDetailsDescriptionText}>{selectedClass.description}</Text>
                </View>
              )}
              
              <View style={styles.classDetailsActions}>
                <TouchableOpacity 
                  style={styles.classDetailsActionButton}
                  onPress={() => handleTakeAttendance(selectedClass)}
                >
                  <Ionicons name="qr-code" size={24} color="#fff" />
                  <Text style={styles.classDetailsActionButtonText}>Take Attendance</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.classDetailsActionButton}
                  onPress={() => {
                    setShowClassDetailsModal(false);
                    handleViewStudentList(selectedClass);
                  }}
                >
                  <Ionicons name="people" size={24} color="#fff" />
                  <Text style={styles.classDetailsActionButtonText}>Student List</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.classDetailsActionButton, styles.classDetailsDeleteButton]}
                  onPress={() => {
                    setShowClassDetailsModal(false);
                    handleDeleteClass(selectedClass._id);
                  }}
                >
                  <Ionicons name="trash" size={24} color="#fff" />
                  <Text style={styles.classDetailsActionButtonText}>Delete Class</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Classes</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setFilterModalVisible(true)}
          >
            <Ionicons name="filter" size={22} color="#1B3358" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.createButton}
            onPress={() => setShowCreateClassModal(true)}
          >
            <Ionicons name="add" size={22} color="#fff" />
            <Text style={styles.createButtonText}>Create</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search classes..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity 
            style={styles.clearSearchButton}
            onPress={() => setSearchQuery('')}
          >
            <Ionicons name="close-circle" size={18} color="#999" />
          </TouchableOpacity>
        )}
      </View>
      
      <TouchableOpacity 
        style={styles.filterButton}
        onPress={() => setFilterModalVisible(true)}
      >
        <Ionicons name="filter" size={24} color="#1B3358" />
      </TouchableOpacity>
      
      <FlatList
        data={getFilteredClasses()}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.classCard}
            onPress={() => handleClassPress(item)}
          >
            <View style={styles.classCardHeader}>
              <View style={styles.courseHeader}>
                <Text style={styles.classCardCode}>{item.courseCode}</Text>
                <View style={styles.yearLevelBadge}>
                  <Text style={styles.yearLevelText}>{item.year || '1st Year'}</Text>
                </View>
              </View>
              <View style={styles.classCardBadge}>
                <Text style={styles.classCardBadgeText}>{item.students || 0} Students</Text>
              </View>
            </View>
            
            <Text style={styles.classCardName}>{item.courseName}</Text>
            <View style={styles.classCardDetails}>
              <Text style={styles.classCardSection}>Section {item.section}</Text>
              <Text style={styles.classCardFaculty}>{item.facultyName}</Text>
            </View>
            <Text style={styles.classCardSchedule}>{item.schedule}</Text>
            
            <View style={styles.scheduleContainer}>
              <View style={styles.scheduleRow}>
                <Ionicons name="time" size={16} color="#666" />
                <Text style={styles.scheduleText}>{item.schedule}</Text>
              </View>
              {isScannerAvailable(item.schedule) ? (
                <View style={[styles.scannerStatus, styles.scannerAvailable]}>
                  <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                  <Text style={styles.scannerStatusText}>Scanner Available</Text>
                </View>
              ) : (
                <View style={[styles.scannerStatus, styles.scannerUnavailable]}>
                  <Ionicons name="time" size={16} color="#FF6B6B" />
                  <Text style={styles.scannerStatusText}>Scanner Unavailable</Text>
                </View>
              )}
            </View>
            
            <View style={styles.classCardActions}>
              <TouchableOpacity 
                style={styles.classCardAction}
                onPress={(e) => {
                  e.stopPropagation();
                  handleTakeAttendance(item);
                }}
              >
                <Ionicons name="scan-outline" size={16} color="#1B3358" />
                <Text style={styles.classCardActionText}>Take Attendance</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.classesList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadClasses} />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="school-outline" size={60} color="#ccc" />
            <Text style={styles.emptyTitle}>No Classes Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Try a different search term' : 'Create your first class to get started'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity 
                style={styles.emptyCreateButton}
                onPress={() => setShowCreateClassModal(true)}
              >
                <Ionicons name="add-circle-outline" size={18} color="#fff" />
                <Text style={styles.emptyCreateButtonText}>Create Class</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
      
      <CreateClassModal 
        visible={showCreateClassModal} 
        onClose={() => setShowCreateClassModal(false)} 
        onClassCreated={handleClassCreated}
      />
      
      {renderFilterModal()}
      {renderClassDetailsModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scheduleContainer: {
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: '#f8f8f8',
    padding: 10,
    borderRadius: 8,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  scheduleText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  scannerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  scannerAvailable: {
    backgroundColor: '#E8F5E9',
  },
  scannerUnavailable: {
    backgroundColor: '#FFEBEE',
  },
  scannerStatusText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '500',
  },
  classCardActionDisabled: {
    backgroundColor: '#e0e0e0',
  },
  classCardActionTextDisabled: {
    color: '#999',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B3358',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterButton: {
    padding: 8,
    marginRight: 12,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B3358',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    marginLeft: 4,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  clearSearchButton: {
    padding: 4,
  },
  classesList: {
    padding: 16,
    paddingTop: 8,
  },
  classCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  classCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  courseHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  classCardCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B3358',
  },
  yearLevelBadge: {
    backgroundColor: '#1B3358',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  yearLevelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  classCardBadge: {
    backgroundColor: '#E8F0FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 12,
  },
  classCardBadgeText: {
    fontSize: 12,
    color: '#1B3358',
    fontWeight: '500',
  },
  classCardName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  classCardSection: {
    fontSize: 14,
    color: '#666',
  },
  classCardFaculty: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  classCardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  classCardDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  classCardDetailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  classCardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  classCardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  classCardActionText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#1B3358',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyCreateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B3358',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 24,
  },
  emptyCreateButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterModalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    paddingBottom: 30,
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  filterSection: {
    marginBottom: 20,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
    marginBottom: 8,
  },
  filterDayOption: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
    marginBottom: 8,
  },
  filterOptionSelected: {
    backgroundColor: '#1B3358',
  },
  filterOptionText: {
    color: '#666',
  },
  filterOptionTextSelected: {
    color: '#fff',
    fontWeight: '500',
  },
  applyFilterButton: {
    backgroundColor: '#1B3358',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  applyFilterButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  classDetailsContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    height: '80%',
  },
  classDetailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  classDetailsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B3358',
  },
  classDetailsContent: {
    padding: 16,
  },
  classDetailsCourseName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  classDetailsSection: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  classDetailsInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  classDetailsInfoText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 12,
  },
  classDetailsDescriptionContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  classDetailsDescriptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  classDetailsDescriptionText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  classDetailsActions: {
    marginTop: 24,
  },
  classDetailsActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1B3358',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  classDetailsDeleteButton: {
    backgroundColor: '#FF6B6B',
  },
  classDetailsActionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
});

export default ClassesScreen;
