import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Pressable,
  TouchableWithoutFeedback,
  FlatList
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../config/apiConfig';

const CreateClassModal = ({ visible, onClose, onClassCreated }) => {
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [facultyName, setFacultyName] = useState('');
  const [section, setSection] = useState('A');
  const [room, setRoom] = useState('');
  const [schedule, setSchedule] = useState('');
  const [day, setDay] = useState('Monday');
  const [startTime, setStartTime] = useState('08:00 AM');
  const [endTime, setEndTime] = useState('09:30 AM');
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showSectionPicker, setShowSectionPicker] = useState(false);
  const [yearLevel, setYearLevel] = useState('1st Year');

  // Update section when year level changes
  useEffect(() => {
    const availableSections = getSectionOptions(yearLevel);
    if (!availableSections.some(opt => opt.value === section)) {
      setSection(availableSections[0].value);
    }
  }, [yearLevel]);
  const [isLoading, setIsLoading] = useState(false);

  // Get available sections based on year level
  const getSectionOptions = (year) => {
    const firstYearSections = Array.from('ABCDEFGH').map(section => ({
      label: `Section ${section}`,
      value: section
    }));
    
    const otherYearSections = Array.from('ABCD').map(section => ({
      label: `Section ${section}`,
      value: section
    }));
    
    return year === '1st Year' ? firstYearSections : otherYearSections;
  };

  // Days of the week options
  const dayOptions = [
    { label: 'Monday', value: 'Monday' },
    { label: 'Tuesday', value: 'Tuesday' },
    { label: 'Wednesday', value: 'Wednesday' },
    { label: 'Thursday', value: 'Thursday' },
    { label: 'Friday', value: 'Friday' },
    { label: 'Saturday', value: 'Saturday' },
    { label: 'Sunday', value: 'Sunday' },
    { label: 'MWF (Mon, Wed, Fri)', value: 'MWF' },
    { label: 'TTh (Tue, Thu)', value: 'TTh' },
    { label: 'Weekdays', value: 'Weekdays' },
    { label: 'Weekend', value: 'Weekend' },
  ];
  
  // Generate time options
  const generateTimeOptions = () => {
    const times = [];
    
    // Add 12:30 AM
    times.push({ label: '12:30 AM', value: '12:30 AM' });
    
    // Add 1:00 AM to 2:00 AM
    for (let hour = 1; hour <= 2; hour++) {
      const hourFormatted = hour.toString().padStart(2, '0');
      times.push({ label: `${hourFormatted}:00 AM`, value: `${hourFormatted}:00 AM` });
      if (hour < 2) { // Only add :30 for 1 AM
        times.push({ label: `${hourFormatted}:30 AM`, value: `${hourFormatted}:30 AM` });
      }
    }
    
    // Add regular hours from 7 AM to 9 PM
    for (let hour = 7; hour <= 21; hour++) {
      const hourFormat = hour > 12 ? hour - 12 : hour;
      const amPm = hour >= 12 ? 'PM' : 'AM';
      const hourFormatted = hourFormat.toString().padStart(2, '0');
      
      times.push({ label: `${hourFormatted}:00 ${amPm}`, value: `${hourFormatted}:00 ${amPm}` });
      times.push({ label: `${hourFormatted}:30 ${amPm}`, value: `${hourFormatted}:30 ${amPm}` });
    }
    
    return times;
  };
  
  const timeOptions = generateTimeOptions();

  const yearLevels = [
    { label: '1st Year', value: '1st Year' },
    { label: '2nd Year', value: '2nd Year' },
    { label: '3rd Year', value: '3rd Year' },
    { label: '4th Year', value: '4th Year' }
  ];

  const resetForm = () => {
    setCourseCode('');
    setCourseName('');
    setFacultyName('');
    setSection('');
    setRoom('');
    setSchedule('');
    setDay('Monday');
    setStartTime('08:00 AM');
    setEndTime('09:30 AM');
    setYearLevel('1st Year'); // Default to 1st Year
    setShowDayPicker(false);
    setShowStartTimePicker(false);
    setShowEndTimePicker(false);
    console.log('Form reset, year level:', yearLevel); // Debug log
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateForm = () => {
    console.log('Validating form with year level:', yearLevel);
    if (!courseCode.trim()) {
      Alert.alert('Error', 'Course code is required');
      return false;
    }
    if (!courseName.trim()) {
      Alert.alert('Error', 'Course name is required');
      return false;
    }
    if (!facultyName.trim()) {
      Alert.alert('Error', 'Faculty name is required');
      return false;
    }
    if (!section.trim()) {
      Alert.alert('Error', 'Section is required');
      return false;
    }
    if (!yearLevel) {
      Alert.alert('Error', 'Year level is required');
      return false;
    }
    return true;
  };

  // References to measure button positions
  const dayButtonRef = useRef(null);
  const startTimeButtonRef = useRef(null);
  const endTimeButtonRef = useRef(null);
  
  // State for dropdown positions
  const [dayDropdownPosition, setDayDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [startTimeDropdownPosition, setStartTimeDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [endTimeDropdownPosition, setEndTimeDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  
  // Handle dropdown toggling with position measurement
  const toggleDropdown = (dropdownName) => {
    // Close all dropdowns first
    setShowDayPicker(false);
    setShowStartTimePicker(false);
    setShowEndTimePicker(false);
    
    // Measure the position of the button and then open the dropdown
    const measureAndShow = (ref, setPosition, setVisible) => {
      if (ref.current) {
        ref.current.measure((fx, fy, width, height, px, py) => {
          setPosition({
            top: py + height + 2,
            left: px,
            width: width
          });
          setVisible(true);
        });
      }
    };
    
    // Then open the selected one with proper positioning
    switch(dropdownName) {
      case 'day':
        measureAndShow(dayButtonRef, setDayDropdownPosition, setShowDayPicker);
        break;
      case 'startTime':
        measureAndShow(startTimeButtonRef, setStartTimeDropdownPosition, setShowStartTimePicker);
        break;
      case 'endTime':
        measureAndShow(endTimeButtonRef, setEndTimeDropdownPosition, setShowEndTimePicker);
        break;
    }
  };
  
  // Close all dropdowns
  const closeAllDropdowns = () => {
    setShowDayPicker(false);
    setShowStartTimePicker(false);
    setShowEndTimePicker(false);
  };
  
  // Combine day and time selections into a schedule string
  const updateSchedule = () => {
    // Validate that end time is after start time
    const startHour = parseInt(startTime.split(':')[0]);
    const startMinute = parseInt(startTime.split(':')[1].split(' ')[0]);
    const startAmPm = startTime.split(' ')[1];
    
    const endHour = parseInt(endTime.split(':')[0]);
    const endMinute = parseInt(endTime.split(':')[1].split(' ')[0]);
    const endAmPm = endTime.split(' ')[1];
    
    let isValid = true;
    
    if (startAmPm === 'PM' && endAmPm === 'AM') {
      isValid = false;
    } else if (startAmPm === endAmPm) {
      if (startHour > endHour) {
        isValid = false;
      } else if (startHour === endHour && startMinute >= endMinute) {
        isValid = false;
      }
    }
    
    if (!isValid) {
      Alert.alert('Invalid Time Range', 'End time must be after start time');
      // Reset end time to be 1.5 hours after start time
      let newEndHour = startHour + 1;
      let newEndAmPm = startAmPm;
      
      if (startMinute === 30) {
        newEndHour += 1;
      }
      
      if (newEndHour > 12) {
        newEndHour = newEndHour - 12;
        if (startAmPm === 'AM') {
          newEndAmPm = 'PM';
        }
      }
      
      const newEndMinute = startMinute === 30 ? '00' : '30';
      const newEndTime = `${newEndHour.toString().padStart(2, '0')}:${newEndMinute} ${newEndAmPm}`;
      setEndTime(newEndTime);
      
      const formattedSchedule = `${day} ${startTime} - ${newEndTime}`;
      setSchedule(formattedSchedule);
      return formattedSchedule;
    }
    
    const formattedSchedule = `${day} ${startTime} - ${endTime}`;
    setSchedule(formattedSchedule);
    return formattedSchedule;
  };

  const handleCreateClass = async () => {
    console.log('Starting class creation with year level:', yearLevel);
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // Get user token
      const userToken = await AsyncStorage.getItem('userToken');
      
      if (!userToken) {
        Alert.alert('Error', 'You must be logged in to create a class');
        setIsLoading(false);
        return;
      }

      // Update the schedule string with current selections
      const currentSchedule = updateSchedule();

      // Get lecturer ID from AsyncStorage
      const lecturerData = await AsyncStorage.getItem('userData');
      if (!lecturerData) {
        Alert.alert('Error', 'Lecturer data not found');
        setIsLoading(false);
        return;
      }
      const { lecturerId } = JSON.parse(lecturerData);

      // Create class data
      console.log('Creating class with year level:', yearLevel);
      console.log('All form data:', {
        courseCode,
        courseName,
        facultyName,
        section,
        room,
        schedule: currentSchedule,
        year: yearLevel,
        lecturerId
      });
      
      if (!yearLevel || !['1st Year', '2nd Year', '3rd Year', '4th Year'].includes(yearLevel)) {
        console.error('Invalid year level detected:', yearLevel);
        throw new Error(`Invalid year level: ${yearLevel}`);
      }
      const classData = {
        courseCode: courseCode.trim(),
        courseName: courseName.trim(),
        facultyName: facultyName.trim(),
        section: section.trim(),
        room: room.trim(),
        schedule: currentSchedule,
        year: yearLevel,
        lecturerId,
        createdAt: new Date().toISOString()
      };
      
      console.log('Final class data being sent:', JSON.stringify(classData, null, 2));

      // Save to API
      try {
        console.log('Creating class with data:', classData);
        const createClassUrl = `${API_BASE_URL}/api/classes/lecturer/${classData.lecturerId}/classes`;
        
        const response = await fetch(createClassUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${userToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(classData)
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Class created successfully:', data);
          
          // Call the callback with the new class
          if (onClassCreated) {
            onClassCreated(data);
          }
          
          Alert.alert('Success', 'Class created successfully');
          handleClose();
        } else {
          const errorText = await response.text();
          console.error('Failed to create class:', errorText);
          
          // Parse error message if possible
          let errorMessage = 'Failed to create class. Please try again.';
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.message || errorMessage;
          } catch (e) {}
          
          Alert.alert('Error', errorMessage);
        }
      } catch (error) {
        console.error('Error creating class:', error);
        Alert.alert('Error', 'Failed to create class. Please check your connection.');
      }

    } catch (error) {
      console.error('Error creating class:', error);
      Alert.alert('Error', 'Failed to create class');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create New Class</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer}>
            <Text style={styles.label}>Course Code *</Text>
            <TextInput
              style={styles.input}
              value={courseCode}
              onChangeText={setCourseCode}
              placeholder="e.g. CS101"
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>Course Name *</Text>
            <TextInput
              style={styles.input}
              value={courseName}
              onChangeText={setCourseName}
              placeholder="Course Name"
            />

            <Text style={styles.label}>Faculty Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter faculty name"
              value={facultyName}
              onChangeText={setFacultyName}
              autoCapitalize="words"
            />

            <Text style={styles.label}>Section *</Text>
            <View style={styles.input}>
              <Picker
                selectedValue={section}
                onValueChange={(itemValue) => {
                  console.log('Setting section to:', itemValue);
                  setSection(itemValue);
                }}
                style={{ height: 50 }}
              >
                {getSectionOptions(yearLevel).map((option) => (
                  <Picker.Item 
                    key={option.value} 
                    label={option.label} 
                    value={option.value}
                  />
                ))}
              </Picker>
            </View>

            <Text style={styles.label}>Room:</Text>
            <TextInput
              style={styles.input}
              value={room}
              onChangeText={setRoom}
              placeholder="Enter room"
            />

            <Text style={styles.label}>Year Level:</Text>
            <View style={styles.input}>
              <Picker
                selectedValue={yearLevel}
                onValueChange={(itemValue) => {
                  console.log('Setting year level to:', itemValue);
                  setYearLevel(itemValue);
                }}
                style={{ height: 50 }}
              >
                <Picker.Item label="1st Year" value="1st Year" />
                <Picker.Item label="2nd Year" value="2nd Year" />
                <Picker.Item label="3rd Year" value="3rd Year" />
                <Picker.Item label="4th Year" value="4th Year" />
              </Picker>
            </View>

            <Text style={styles.sectionTitle}>Class Schedule</Text>
            <View style={styles.scheduleContainer}>
              {/* Custom dropdown for day selection */}
              <View style={styles.pickerOuterContainer}>
                <Text style={styles.pickerMainLabel}>Select Day</Text>
                <TouchableOpacity 
                  ref={dayButtonRef}
                  style={styles.pickerButton} 
                  onPress={() => toggleDropdown('day')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.pickerButtonText}>{day}</Text>
                  <Ionicons name="chevron-down" size={18} color="#555" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.timePickersRow}>
                {/* Start Time Selector */}
                <View style={[styles.pickerOuterContainer, styles.timePickerContainer]}>
                  <Text style={styles.pickerMainLabel}>Start Time</Text>
                  <TouchableOpacity 
                    ref={startTimeButtonRef}
                    style={styles.pickerButton} 
                    onPress={() => toggleDropdown('startTime')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.pickerButtonText}>{startTime}</Text>
                    <Ionicons name="chevron-down" size={18} color="#555" />
                  </TouchableOpacity>
                </View>
                
                {/* End Time Selector */}
                <View style={[styles.pickerOuterContainer, styles.timePickerContainer]}>
                  <Text style={styles.pickerMainLabel}>End Time</Text>
                  <TouchableOpacity 
                    ref={endTimeButtonRef}
                    style={styles.pickerButton} 
                    onPress={() => toggleDropdown('endTime')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.pickerButtonText}>{endTime}</Text>
                    <Ionicons name="chevron-down" size={18} color="#555" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            
            <View style={styles.schedulePreviewContainer}>
              <Text style={styles.schedulePreviewLabel}>Selected Schedule:</Text>
              <View style={styles.schedulePreviewBox}>
                <Text style={styles.schedulePreview}>{schedule || 'Not set'}</Text>
              </View>
              <Text style={styles.scheduleHint}>This is how the schedule will appear to students</Text>
            </View>
            
            {/* Day Dropdown Modal */}
            <Modal
              transparent={true}
              visible={showDayPicker}
              animationType="fade"
              onRequestClose={() => setShowDayPicker(false)}
            >
              <TouchableWithoutFeedback onPress={() => setShowDayPicker(false)}>
                <View style={styles.dropdownModalOverlay}>
                  <View 
                    style={[styles.dropdownModalContent, {
                      position: 'absolute',
                      top: dayDropdownPosition.top,
                      left: dayDropdownPosition.left,
                      width: dayDropdownPosition.width,
                    }]}
                  >
                    <ScrollView style={styles.dropdownScrollView}>
                      {dayOptions.map((option) => (
                        <TouchableOpacity
                          key={option.value}
                          style={[styles.dropdownItem, day === option.value && styles.dropdownItemSelected]}
                          onPress={() => {
                            setDay(option.value);
                            setShowDayPicker(false);
                            updateSchedule();
                          }}
                        >
                          <Text style={[styles.dropdownItemText, day === option.value && styles.dropdownItemTextSelected]}>
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </Modal>
            
            {/* Start Time Dropdown Modal */}
            <Modal
              transparent={true}
              visible={showStartTimePicker}
              animationType="fade"
              onRequestClose={() => setShowStartTimePicker(false)}
            >
              <TouchableWithoutFeedback onPress={() => setShowStartTimePicker(false)}>
                <View style={styles.dropdownModalOverlay}>
                  <View 
                    style={[styles.dropdownModalContent, {
                      position: 'absolute',
                      top: startTimeDropdownPosition.top,
                      left: startTimeDropdownPosition.left,
                      width: startTimeDropdownPosition.width,
                    }]}
                  >
                    <ScrollView style={styles.dropdownScrollView}>
                      {timeOptions.map((option) => (
                        <TouchableOpacity
                          key={option.value}
                          style={[styles.dropdownItem, startTime === option.value && styles.dropdownItemSelected]}
                          onPress={() => {
                            setStartTime(option.value);
                            setShowStartTimePicker(false);
                            updateSchedule();
                          }}
                        >
                          <Text style={[styles.dropdownItemText, startTime === option.value && styles.dropdownItemTextSelected]}>
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </Modal>
            
            {/* End Time Dropdown Modal */}
            <Modal
              transparent={true}
              visible={showEndTimePicker}
              animationType="fade"
              onRequestClose={() => setShowEndTimePicker(false)}
            >
              <TouchableWithoutFeedback onPress={() => setShowEndTimePicker(false)}>
                <View style={styles.dropdownModalOverlay}>
                  <View 
                    style={[styles.dropdownModalContent, {
                      position: 'absolute',
                      top: endTimeDropdownPosition.top,
                      left: endTimeDropdownPosition.left,
                      width: endTimeDropdownPosition.width,
                    }]}
                  >
                    <ScrollView style={styles.dropdownScrollView}>
                      {timeOptions.map((option) => (
                        <TouchableOpacity
                          key={option.value}
                          style={[styles.dropdownItem, endTime === option.value && styles.dropdownItemSelected]}
                          onPress={() => {
                            setEndTime(option.value);
                            setShowEndTimePicker(false);
                            updateSchedule();
                          }}
                        >
                          <Text style={[styles.dropdownItemText, endTime === option.value && styles.dropdownItemTextSelected]}>
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </Modal>
          </ScrollView>

          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateClass}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.createButtonText}>Create Class</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 15,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
  },
  scheduleContainer: {
    marginBottom: 20,
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  pickerOuterContainer: {
    marginBottom: 15,
  },
  timePickersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timePickerContainer: {
    width: '48%',
  },
  pickerMainLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#444',
  },
  pickerContainer: {
    position: 'relative',
  },
  pickerButton: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ccc',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  dropdownModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  dropdownModalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 20,
    maxHeight: 250,
    minWidth: 150,
  },
  dropdownScrollView: {
    maxHeight: 200,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemSelected: {
    backgroundColor: '#f0f8ff',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownItemTextSelected: {
    fontWeight: '600',
    color: '#0066cc',
  },
  schedulePreviewContainer: {
    marginTop: 15,
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  schedulePreviewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 5,
  },
  schedulePreviewBox: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginVertical: 8,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  schedulePreview: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  scheduleHint: {
    fontSize: 12,
    color: '#777',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 5,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    padding: 20,
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.2)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 5,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B3358',
  },
  closeButton: {
    padding: 5,
  },
  formContainer: {
    maxHeight: 400,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  createButton: {
    backgroundColor: '#1B3358',
    borderRadius: 5,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CreateClassModal;
