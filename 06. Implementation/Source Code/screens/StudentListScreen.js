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
import API_BASE_URL from '../config/apiConfig';

const StudentListScreen = ({ route }) => {
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [attendanceDates, setAttendanceDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [attendanceData, setAttendanceData] = useState({});
  const { classId, courseCode, courseName, section } = route.params;

  const loadStudents = async () => {
    try {
      setIsLoading(true);
      const userToken = await AsyncStorage.getItem('userToken');
      
      // Load students
      const studentsResponse = await fetch(`${API_BASE_URL}/api/classes/${classId}/students`, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!studentsResponse.ok) {
        throw new Error('Failed to load student list');
      }

      const studentsData = await studentsResponse.json();
      setStudents(studentsData);

      // Load attendance records
      const attendanceResponse = await fetch(`${API_BASE_URL}/api/attendance/class/${classId}`, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!attendanceResponse.ok) {
        throw new Error('Failed to load attendance records');
      }

      const attendanceRecords = await attendanceResponse.json();
      
      // Process attendance records
      const dateMap = {};
      const dates = new Set();
      
      attendanceRecords.forEach(record => {
        const date = new Date(record.date).toLocaleDateString();
        dates.add(date);
        
        if (!dateMap[date]) {
          dateMap[date] = {};
        }
        dateMap[date][record.studentId] = record.status || 'absent';
      });

      setAttendanceDates(Array.from(dates).sort((a, b) => new Date(b) - new Date(a)));
      setAttendanceData(dateMap);
      
      if (dates.size > 0) {
        setSelectedDate(Array.from(dates)[0]);
      }

    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', error.message);
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
    const status = selectedDate ? (attendanceData[selectedDate]?.[item.studentId] || 'absent') : 'absent';
    const statusColor = status === 'present' ? '#4CAF50' : '#FF3B30';
    
    return (
      <View style={styles.studentCard}>
        <View style={styles.studentInfo}>
          <Text style={styles.studentId}>{item.studentId}</Text>
          <Text style={styles.studentName}>{item.studentName}</Text>
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
        <Text style={styles.section}>Section {section}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{students.length}</Text>
          <Text style={styles.statLabel}>Total Students</Text>
        </View>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.dateTabsContainer}
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
};

const styles = StyleSheet.create({
  dateTabsContainer: {
    flexGrow: 0,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  dateTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dateTabSelected: {
    backgroundColor: '#1B3358',
    borderColor: '#1B3358',
  },
  dateTabText: {
    fontSize: 14,
    color: '#666',
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
  section: {
    fontSize: 16,
    color: '#888',
    marginTop: 2,
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
  attendanceInfo: {
    justifyContent: 'center',
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

export default StudentListScreen;
