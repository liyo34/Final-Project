import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams } from 'expo-router';
import API_BASE_URL from '../../config/apiConfig';

export default function StudentListScreen() {
  const [students, setStudents] = useState([]);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [attendanceDates, setAttendanceDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [attendanceData, setAttendanceData] = useState({});
  const params = useLocalSearchParams();
  const { classId, courseCode, courseName, section, yearLevel } = params;

  const exportToCSV = async () => {
    if (!students || students.length === 0) {
      console.log('No students data available');
      return;
    }

    try {
      // Convert attendance data to CSV format
      const csvRows = [];
      
      // Add headers
      csvRows.push(['Student ID', 'Student Name', 'Course', 'Section', 'Date', 'Status']);
      
      // Add data rows
      students.forEach(student => {
        const status = selectedDate && attendanceData[selectedDate] ? attendanceData[selectedDate][student.studentId] : 'absent';
        csvRows.push([
          student.studentId,
          student.name,
          courseCode,
          section,
          selectedDate,
          status
        ]);
      });
      
      // Convert to CSV string
      let csvContent = csvRows.map(row => row.join(',')).join('\n');
      
      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `attendance_${courseCode}_${selectedDate}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting to CSV:', error);
    }
  };

  const loadStudents = async () => {
    try {
      setIsLoading(true);
      const userToken = await AsyncStorage.getItem('userToken');
      
      // Get all students with matching course, year and section
      const studentsResponse = await fetch(`${API_BASE_URL}/api/students/filter`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          course: 'BSIT',
          year: yearLevel.replace(' Year', ''),
          section: section.toUpperCase()
        })
      });

      if (!studentsResponse.ok) {
        throw new Error('Failed to fetch students');
      }

      const studentsData = await studentsResponse.json();
      setStudents(studentsData);

      // Load attendance records from both collections
      const [studentListAttResponse, attendanceResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/studentlistatt/class/${classId}`, {
          headers: {
            'Authorization': `Bearer ${userToken}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${API_BASE_URL}/api/attendance/class/${classId}`, {
          headers: {
            'Authorization': `Bearer ${userToken}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      const [studentListAttRecords, oldAttendanceRecords] = await Promise.all([
        studentListAttResponse.ok ? studentListAttResponse.json() : [],
        attendanceResponse.ok ? attendanceResponse.json() : []
      ]);

      // Combine records from both collections
      const attendanceRecords = [...studentListAttRecords, ...oldAttendanceRecords];
      
      // Process attendance records
      const dateMap = {};
      const dates = new Set();
      
      // First, initialize all students as absent for all dates
      attendanceRecords.forEach(record => {
        const date = new Date(record.date).toLocaleDateString();
        dates.add(date);
        
        if (!dateMap[date]) {
          dateMap[date] = {};
          // Initialize all students as absent
          studentsData.forEach(student => {
            dateMap[date][student.studentId] = 'absent';
          });
        }
      });

      // Then update the ones who are present
      attendanceRecords.forEach(record => {
        const date = new Date(record.date).toLocaleDateString();
        if (record.status === 'present') {
          dateMap[date][record.studentId] = 'present';
        }
      });

      setAttendanceDates(Array.from(dates).sort((a, b) => new Date(b) - new Date(a)));
      setAttendanceData(dateMap);
      
      if (dates.size > 0) {
        setSelectedDate(Array.from(dates)[0]);
      }
      
      // Temporarily disabled enrollment check
      /*
      // Get enrolled students for this class
      const enrolledResponse = await fetch(`${API_BASE_URL}/api/studentlistatt/class/${classId}`, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!enrolledResponse.ok) {
        throw new Error('Failed to fetch enrolled students');
      }

      const enrolledData = await enrolledResponse.json();
      const enrolledIds = new Set(enrolledData.map(record => record.studentId));
      
      // Combine the data to show enrollment status and attendance count
      const combinedData = studentsData.map(student => ({
        ...student,
        isEnrolled: enrolledIds.has(student.studentId),
        attendanceCount: enrolledData.filter(record => record.studentId === student.studentId).length
      }));

      setStudents(combinedData);
      */
    } catch (error) {
      console.error('Error loading students:', error);
      Alert.alert('Error', 'An error occurred while loading the student list');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, [classId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadStudents();
  };

  const renderStudentItem = ({ item }) => {
    const status = selectedDate && attendanceData[selectedDate] ? attendanceData[selectedDate][item.studentId] : 'absent';
    const statusColor = status === 'present' ? '#4CAF50' : '#FF3B30';
    
    return (
      <View style={styles.studentCard}>
        <View style={styles.studentInfo}>
          <Text style={styles.studentId}>{item.studentId}</Text>
          <Text style={styles.studentName}>{item.name}</Text>
          <Text style={styles.studentDetails}>
            {item.course} - {item.year} - Section {item.section}
          </Text>
        </View>
        <View style={[styles.attendanceStatus, { backgroundColor: statusColor }]}>
          <Text style={styles.attendanceStatusText}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Text>
        </View>
      </View>
    );
  };

  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1B3358" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.courseCode}>{courseCode}</Text>
        <Text style={styles.courseName}>{courseName}</Text>
        <Text style={styles.yearSection}>{yearLevel} - Section {section}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{students.length}</Text>
          <Text style={styles.statLabel}>Total Students</Text>
        </View>
        <TouchableOpacity 
          style={styles.exportButton} 
          onPress={exportToCSV}
        >
          <Text style={styles.exportButtonText}>Export to CSV</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dateTabsContainer}>
        <Text style={styles.dateTabsTitle}>Attendance Dates</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.dateTabsScroll}
        >
        {attendanceDates.map((date) => (
          <TouchableOpacity
            key={date}
            style={[styles.dateTab, selectedDate === date && styles.dateTabSelected]}
            onPress={() => setSelectedDate(date)}
          >
            <Text style={[styles.dateTabText, selectedDate === date && styles.dateTabTextSelected]}>
              {new Date(date).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
              })}
            </Text>
          </TouchableOpacity>
        ))}
        </ScrollView>
      </View>

      <FlatList
        data={students}
        renderItem={renderStudentItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#1B3358']}
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No students enrolled yet</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  dateTabsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B3358',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  dateTabsScroll: {
    flexGrow: 0,
  },
  dateTabsContainer: {
    flexGrow: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dateTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 12,
    borderRadius: 25,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  dateTabSelected: {
    backgroundColor: '#1B3358',
    borderColor: '#1B3358',
  },
  dateTabText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  dateTabTextSelected: {
    color: '#fff',
    fontWeight: '500',
  },
  attendanceStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 80,
    alignItems: 'center',
  },
  attendanceStatusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  exportButton: {
    backgroundColor: '#1a73e8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    elevation: 2,
  },
  exportButtonText: {
    color: 'white',
    fontSize: 14,
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  courseCode: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B3358',
  },
  courseName: {
    fontSize: 18,
    color: '#666',
    marginTop: 4,
  },
  yearSection: {
    fontSize: 16,
    color: '#888',
    marginTop: 2,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    marginVertical: 8,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B3358',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  listContainer: {
    padding: 16,
  },
  studentCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  studentCardInactive: {
    backgroundColor: '#f8f8f8',
    borderLeftColor: '#ccc',
  },
  studentInfo: {
    flex: 1,
  },
  studentId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B3358',
  },
  studentName: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  studentDetails: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  attendanceInfo: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  enrollmentStatus: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
    marginBottom: 4,
  },
  enrollmentStatusNot: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  attendanceCount: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
});
