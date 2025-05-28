import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, Picker } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import AddAdminForm from './AddAdminForm';
import AddLecturerForm from './AddLecturerForm';
import API_BASE_URL from '../config/apiConfig';

const AdminDashboard = () => {
  const router = useRouter();
  // Initialize all state
  const [studentData, setStudentData] = useState([]);
  const [adminData, setAdminData] = useState([
    { id: '1', name: 'John Admin', email: 'john@admin.com', role: 'Super Admin' },
    { id: '2', name: 'Jane Admin', email: 'jane@admin.com', role: 'Admin' },
  ]);
  const [lecturerData, setLecturerData] = useState([
    { id: '1', name: 'Dr. Smith', email: 'smith@lecturer.com', department: 'Computer Science' },
    { id: '2', name: 'Prof. Johnson', email: 'johnson@lecturer.com', department: 'Engineering' },
  ]);
  const [activeTab, setActiveTab] = useState('admin');
  const [modalVisible, setModalVisible] = useState(false);
  const [studentModalVisible, setStudentModalVisible] = useState(false);
  const [adminModalVisible, setAdminModalVisible] = useState(false);
  const [lecturerModalVisible, setLecturerModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [newStudent, setNewStudent] = useState({
    id: '',
    name: '',
    email: '',
    yearLevel: '',
    section: '',
    course: '',
    type: 'Regular'
  });

  // Function to handle adding a new admin
  const handleAddAdmin = (newAdmin) => {
    // Add the new admin to the list
    // In a real app, this would be updated from the API response
    setAdminData([...adminData, {
      id: (adminData.length + 1).toString(),
      name: newAdmin.name,
      email: newAdmin.email,
      role: newAdmin.role
    }]);
  };

  // Function to handle adding a new lecturer
  const handleAddLecturer = (newLecturer) => {
    // Add the new lecturer to the list
    // In a real app, this would be updated from the API response
    setLecturerData([...lecturerData, {
      id: (lecturerData.length + 1).toString(),
      name: newLecturer.name,
      email: newLecturer.email,
      department: newLecturer.department
    }]);
  };

  // Function to add new student
  const handleAddStudent = async () => {
    try {
      // Reset error state and set loading
      setError('');
      setLoading(true);

      // Basic validation to prevent errors
      if (!newStudent.id || !newStudent.name || !newStudent.email) {
        setError('ID Number, Name, and Email are required fields');
        setLoading(false);
        return;
      }
      
      // Format the data according to what your API expects
      const studentPayload = {
        studentId: newStudent.id || '',
        name: newStudent.name || '',
        email: newStudent.email || '',
        year: newStudent.yearLevel || '',
        section: newStudent.section || '',
        course: newStudent.course || '',
        studentType: newStudent.type || 'Regular',
        username: newStudent.email || '', // Using email as username
        password: newStudent.id || '', // Using student ID as default password
      };

      console.log('Sending student data:', JSON.stringify(studentPayload));

      const response = await fetch(`${API_BASE_URL}/api/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(studentPayload),
      });

      // Check if response has JSON content
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        setError('Server returned an invalid response. Please try again.');
        setLoading(false);
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        console.error('API error:', data);
        setError(data.message || 'Failed to add student');
        setLoading(false);
        return;
      }

      console.log('Student added successfully:', data);

      // Format the returned data to match our table structure
      const formattedStudent = {
        id: data.studentId || newStudent.id || '',
        name: data.name || '',
        email: data.email || '',
        yearLevel: data.year || '',
        section: data.section || '',
        course: data.course || '',
        type: data.studentType || 'Regular'
      };

      // Add the new student to the list
      setStudentData([...studentData, formattedStudent]);
      
      // Reset form and close modal
      setNewStudent({
        id: '',
        name: '',
        email: '',
        yearLevel: '',
        section: '',
        course: '',
        type: 'Regular'
      });
      setStudentModalVisible(false);
    } catch (error) {
      console.error('Error adding student:', error);
      setError('Network error. Please try again: ' + (error.message || ''));
    } finally {
      setLoading(false);
    }
  };

  // Load students from MongoDB
  // Load user data when component mounts
  useEffect(() => {
    const loadUserData = async () => {
      const storedUserData = await AsyncStorage.getItem('userData');
      if (storedUserData) {
        setUserData(JSON.parse(storedUserData));
      }
    };
    loadUserData();
  }, []);

  const handleLogout = async () => {
    try {
      // Send logout request to server
      if (userData) {
        await fetch(`${API_BASE_URL}/api/auth/admin/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: userData.username,
            role: userData.role
          }),
        });
      }

      // Clear local storage
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');

      // Navigate back to login
      router.replace('/');
    } catch (error) {
      console.error('Logout error:', error);
      setError('Failed to logout. Please try again.');
    }
  };

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/students`);
        const data = await response.json();
        if (response.ok) {
          // Map the MongoDB data to match our table structure
          const mappedData = data.map(student => ({
            id: student.studentId,
            name: student.name,
            email: student.email,
            yearLevel: student.year,
            section: student.section,
            course: student.course,
            type: student.studentType
          }));
          setStudentData(mappedData);
        }
      } catch (error) {
        console.error('Error fetching students:', error);
        setError('Failed to fetch students. Please try again.');
      }
    };

    fetchStudents();
  }, []);

  // Function to handle add button press
  const handleAddButtonPress = () => {
    switch (activeTab) {
      case 'admin':
        setAdminModalVisible(true);
        break;
      case 'student':
        setStudentModalVisible(true);
        break;
      case 'lecturer':
        setLecturerModalVisible(true);
        break;
      default:
        break;
    }
  };

  // Helper function to safely filter based on search query
  const filterDataBySearch = (data, query) => {
    if (!query || query.trim() === '') return data;
    
    const lowercaseQuery = query.toLowerCase();
    
    return data.filter(item => {
      // Check all string properties of the item for matches
      return Object.keys(item).some(key => {
        // Make sure the value is defined and is a string before calling toLowerCase()
        const value = item[key];
        return (
          value !== undefined && 
          value !== null && 
          typeof value === 'string' && 
          value.toLowerCase().includes(lowercaseQuery)
        );
      });
    });
  };

  const renderTable = (data, columns) => {
    // Apply search filter to data
    const filteredData = filterDataBySearch(data, searchQuery);
    
    return (
      <ScrollView horizontal style={styles.tableContainer}>
        <View>
          <View style={styles.tableHeader}>
            {columns.map((column) => (
              <View key={column.key} style={[styles.cell, { width: column.width }]}>
                <Text style={styles.headerText}>{column.title}</Text>
              </View>
            ))}
          </View>
          <ScrollView style={styles.tableBody}>
            {filteredData.length > 0 ? (
              filteredData.map((item) => (
                <View key={item.id} style={styles.row}>
                  {columns.map((column) => (
                    <View key={`${item.id}-${column.key}`} style={[styles.cell, { width: column.width }]}>
                      <Text style={styles.cellText}>{item[column.key] || ''}</Text>
                    </View>
                  ))}
                </View>
              ))
            ) : (
              <View style={styles.noDataRow}>
                <Text style={styles.noDataText}>No data found</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </ScrollView>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'admin':
        return renderTable(adminData, [
          { key: 'name', title: 'Name', width: 150 },
          { key: 'email', title: 'Email', width: 200 },
          { key: 'role', title: 'Role', width: 120 },
        ]);
      case 'student':
        return renderTable(studentData, [
          { key: 'id', title: 'ID Number', width: 120 },
          { key: 'name', title: 'Name', width: 150 },
          { key: 'email', title: 'Email', width: 200 },
          { key: 'yearLevel', title: 'Year Level', width: 100 },
          { key: 'section', title: 'Section', width: 100 },
          { key: 'course', title: 'Course', width: 150 },
          { key: 'type', title: 'Type', width: 100 },
        ]);
      case 'lecturer':
        return renderTable(lecturerData, [
          { key: 'name', title: 'Name', width: 150 },
          { key: 'email', title: 'Email', width: 200 },
          { key: 'department', title: 'Department', width: 150 },
        ]);
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Administrator Dashboard</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <MaterialIcons name="logout" size={24} color="#FF6B6B" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
          <MaterialIcons name="admin-panel-settings" size={32} color="#1B3358" style={{marginLeft: 10}} />
        </View>
      </View>

      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={24} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'admin' && styles.activeTab]}
          onPress={() => setActiveTab('admin')}
        >
          <Text style={[styles.tabText, activeTab === 'admin' && styles.activeTabText]}>Admins</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'student' && styles.activeTab]}
          onPress={() => setActiveTab('student')}
        >
          <Text style={[styles.tabText, activeTab === 'student' && styles.activeTabText]}>Students</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'lecturer' && styles.activeTab]}
          onPress={() => setActiveTab('lecturer')}
        >
          <Text style={[styles.tabText, activeTab === 'lecturer' && styles.activeTabText]}>Lecturers</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {renderContent()}
      </View>

      <TouchableOpacity
        style={styles.addButton}
        onPress={handleAddButtonPress}
      >
        <MaterialIcons name="add" size={24} color="white" />
      </TouchableOpacity>

      {/* Student Add Form Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={studentModalVisible}
        onRequestClose={() => setStudentModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Student</Text>
            
            <TextInput
              style={styles.input}
              placeholder="ID Number (YYYY-XXXX)"
              value={newStudent.id}
              onChangeText={(text) => setNewStudent({ ...newStudent, id: text })}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Name"
              value={newStudent.name}
              onChangeText={(text) => setNewStudent({ ...newStudent, name: text })}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={newStudent.email}
              onChangeText={(text) => setNewStudent({ ...newStudent, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <View style={styles.input}>
              <Picker
                selectedValue={newStudent.yearLevel}
                onValueChange={(value) => setNewStudent({ ...newStudent, yearLevel: value })}
                style={{ height: 40 }}
              >
                <Picker.Item label="Select Year Level" value="" />
                <Picker.Item label="1st Year" value="1st Year" />
                <Picker.Item label="2nd Year" value="2nd Year" />
                <Picker.Item label="3rd Year" value="3rd Year" />
                <Picker.Item label="4th Year" value="4th Year" />
              </Picker>
            </View>
            
            <TextInput
              style={styles.input}
              placeholder="Section"
              value={newStudent.section}
              onChangeText={(text) => setNewStudent({ ...newStudent, section: text })}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Course"
              value={newStudent.course}
              onChangeText={(text) => setNewStudent({ ...newStudent, course: text })}
            />
            
            <View style={styles.typeContainer}>
              <Text style={styles.typeLabel}>Student Type:</Text>
              <TouchableOpacity
                key="regular-type"
                style={[styles.typeButton, newStudent.type === 'Regular' && styles.selectedType]}
                onPress={() => setNewStudent({ ...newStudent, type: 'Regular' })}
              >
                <Text style={[styles.typeButtonText, newStudent.type === 'Regular' && styles.selectedTypeText]}>Regular</Text>
              </TouchableOpacity>
              <TouchableOpacity
                key="irregular-type"
                style={[styles.typeButton, newStudent.type === 'Irregular' && styles.selectedType]}
                onPress={() => setNewStudent({ ...newStudent, type: 'Irregular' })}
              >
                <Text style={[styles.typeButtonText, newStudent.type === 'Irregular' && styles.selectedTypeText]}>Irregular</Text>
              </TouchableOpacity>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleAddStudent}
                disabled={loading}
              >
                <Text style={styles.buttonText}>{loading ? 'Adding...' : 'Add Student'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setStudentModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Admin Form Modal */}
      <AddAdminForm 
        visible={adminModalVisible}
        onClose={() => setAdminModalVisible(false)}
        onAddAdmin={handleAddAdmin}
      />

      {/* Lecturer Form Modal */}
      <AddLecturerForm
        visible={lecturerModalVisible}
        onClose={() => setLecturerModalVisible(false)}
        onAddLecturer={handleAddLecturer}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
    width: '100%',
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  typeLabel: {
    marginRight: 10,
  },
  typeButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 5,
  },
  selectedType: {
    backgroundColor: '#1B3358',
  },
  typeButtonText: {
    color: '#333',
  },
  selectedTypeText: {
    color: '#fff',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  saveButton: {
    backgroundColor: '#1B3358',
  },
  cancelButton: {
    backgroundColor: '#dc3545',
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  errorText: {
    color: '#dc3545',
    marginBottom: 10,
    textAlign: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B3358',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 15,
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 10,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 10,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#1B3358',
    borderRadius: 10,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: 'white',
  },
  content: {
    flex: 1,
    backgroundColor: 'white',
    margin: 15,
    borderRadius: 10,
    elevation: 2,
  },
  tableContainer: {
    flex: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F5F6FA',
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
  },
  tableBody: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
  },
  cell: {
    padding: 15,
    justifyContent: 'center',
  },
  headerText: {
    fontWeight: 'bold',
    color: '#1B3358',
  },
  cellText: {
    color: '#666',
  },
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1B3358',
  },
  closeButton: {
    backgroundColor: '#FF6B6B',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  logoutText: {
    color: '#FF6B6B',
    marginLeft: 5,
    fontWeight: 'bold',
  },
  noDataRow: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataText: {
    color: '#666',
    fontSize: 16,
  },
});

export default AdminDashboard;
