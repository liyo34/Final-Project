import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../config/apiConfig';

const QRCodeScreen = () => {
  const [userData, setUserData] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentQrIndex, setCurrentQrIndex] = useState(0); // Track which QR service we're using
  
  // Helper function to fetch user data by identifier
  const fetchUserByIdentifier = async (parsedData) => {
    try {
      // Determine where the user data is stored
      const userInfo = parsedData.user || parsedData;
      
      // Find the right identifier to use
      let identifier = '';
      let type = '';
      
      // Try to find a valid identifier with priority order
      const identifierFields = ['studentId', 'email', 'username', '_id', 'id'];
      
      for (const field of identifierFields) {
        if (userInfo[field] && userInfo[field] !== '') {
          identifier = userInfo[field];
          type = field;
          console.log(`Using ${field} as identifier: ${identifier}`);
          break;
        }
      }
      
      if (!identifier) {
        console.log('No valid identifier found in user data');
        return;
      }
      
      console.log(`Fetching student data using ${type}: ${identifier}`);
      
      // Fetch student data from API
      const response = await fetch(`${API_BASE_URL}/api/students?${type}=${identifier}`);
      
      if (!response.ok) {
        console.log('Failed to fetch student data:', response.status);
        // If we can't fetch from API, just use the stored data
        return;
      }
      
      const apiData = await response.json();
      console.log('API response data:', JSON.stringify(apiData, null, 2));
      
      // If we got an array, take the first item
      const studentData = Array.isArray(apiData) ? apiData[0] : apiData;
      
      if (studentData) {
        // Merge API data with stored data, preferring API data for most fields
        const mergedData = {
          ...parsedData,
          ...studentData,
          // Ensure we keep the token from stored data
          token: parsedData.token,
          // Explicitly copy critical fields to the top level
          studentId: studentData.studentId || userInfo.studentId || userInfo.id,
          name: studentData.name || userInfo.name || userInfo.username,
          email: studentData.email || userInfo.email || userInfo.username,
        };
        
        console.log('Merged data:', JSON.stringify(mergedData, null, 2));
        
        // Update state with the merged data
        setUserData(mergedData);
        
        // Store the updated data
        await AsyncStorage.setItem('userData', JSON.stringify(mergedData));
        
        // Generate a new QR code with the complete data
        const qrData = createStudentQRData(mergedData);
        setQrCodeUrl(generateQRCode(qrData));
      }
    } catch (error) {
      console.error('Error fetching user by identifier:', error);
      // If identifier-based fetch fails, we still have the basic QR code
    }
  };

  // Generate a QR code using the QR Server API with fallbacks for network issues
  const generateQRCode = (data) => {
    try {
      // Encode the data for URL
      const encodedData = encodeURIComponent(data);
      console.log('Generating QR code with data:', data);
      
      // Try multiple QR code services for redundancy
      // Start with the primary service
      const primaryQrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodedData}&size=250x250&margin=10`;
      
      // Alternative services as fallbacks
      const fallbackQrUrls = [
        `https://chart.googleapis.com/chart?cht=qr&chs=250x250&chl=${encodedData}`,
        `https://quickchart.io/qr?text=${encodedData}&size=250`
      ];
      
      console.log('Generated primary QR code URL:', primaryQrUrl);
      
      // Return the primary URL, but we'll implement fallback in the image component
      return {
        primary: primaryQrUrl,
        fallbacks: fallbackQrUrls,
        data: data // Keep the original data for local generation if needed
      };
    } catch (err) {
      console.error('Error creating QR URL:', err);
      // Return a simple fallback with minimal URL encoding
      return {
        primary: 'https://api.qrserver.com/v1/create-qr-code/?data=ERROR&size=250x250',
        fallbacks: [
          'https://chart.googleapis.com/chart?cht=qr&chs=250x250&chl=ERROR',
          'https://quickchart.io/qr?text=ERROR&size=250'
        ],
        data: 'ERROR'
      };
    }
  };
  
  // Create a formatted QR code data string with student info (name, email, studentID)
  const createStudentQRData = (studentData) => {
    // Log the data we're working with to help with debugging
    console.log('Creating QR data from student data:', JSON.stringify(studentData, null, 2));
    
    // Check if we have user data nested in a user property
    const actualData = studentData.user || studentData;
    
    // Extract studentId with fallbacks - try multiple sources with priority
    let studentId = 'unknown-id';
    const possibleIdFields = ['studentId', 'student_id', 'id'];
    
    for (const field of possibleIdFields) {
      // Check both in the main object and in nested user object if it exists
      if (actualData[field] && actualData[field] !== '') {
        studentId = String(actualData[field]);
        console.log(`Found studentId in field ${field}:`, studentId);
        break;
      }
    }
    
    // Extract name with fallbacks - try multiple sources with priority
    let name = 'Unknown Student';
    const possibleNameFields = ['name', 'fullName', 'full_name', 'username'];
    
    for (const field of possibleNameFields) {
      if (actualData[field] && actualData[field] !== '') {
        name = actualData[field];
        console.log(`Found name in field ${field}:`, name);
        break;
      }
    }
    
    // Extract email with fallbacks - try multiple sources with priority
    let email = 'unknown@email.com';
    const possibleEmailFields = ['email', 'emailAddress', 'email_address', 'username'];
    
    for (const field of possibleEmailFields) {
      if (actualData[field] && actualData[field] !== '') {
        email = actualData[field];
        console.log(`Found email in field ${field}:`, email);
        break;
      }
    }
    
    // Create a formatted string with pipe separators
    // Format: StudentID|Name|Email
    const qrData = `${studentId}|${name}|${email}`;
    console.log('Final QR data string:', qrData);
    return qrData;
  };

  useEffect(() => {
    loadUserData();
  }, []);
  
  // Monitor QR code URL changes for debugging
  useEffect(() => {
    if (qrCodeUrl) {
      console.log('QR code URL updated:', qrCodeUrl);
    }
  }, [qrCodeUrl]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Get the authentication token from AsyncStorage
      const userToken = await AsyncStorage.getItem('userToken');
      console.log('User token available:', !!userToken);
      
      // Get stored user data from AsyncStorage
      const storedUserData = await AsyncStorage.getItem('userData');
      console.log('Stored user data available:', !!storedUserData);
      
      if (!storedUserData) {
        console.log('No stored user data found');
        setError('Please log in to view your QR code');
        setLoading(false);
        return;
      }
      
      // Parse the user data
      const parsedData = JSON.parse(storedUserData);
      console.log('Parsed user data:', JSON.stringify(parsedData, null, 2));
      
      // Start with local data
      setUserData(parsedData);
      
      // Generate a basic QR code immediately to avoid blank screen
      const basicQrData = createStudentQRData(parsedData);
      setQrCodeUrl(generateQRCode(basicQrData));
      
      // If we have a token, use it to fetch the most up-to-date user data
      if (userToken) {
        try {
          console.log('Fetching current user data using authentication token...');
          
          // Fetch current user data from API using the token for authentication
          const response = await fetch(`${API_BASE_URL}/api/students/me`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${userToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (!response.ok) {
            console.log('Failed to fetch current user data:', response.status);
            if (response.status === 401) {
              // Token expired or invalid
              console.log('Authentication token expired or invalid');
              // Clear the token but keep the user data for now
              await AsyncStorage.removeItem('userToken');
            }
            return;
          }
          
          const currentUserData = await response.json();
          console.log('Current user data from API:', JSON.stringify(currentUserData, null, 2));
          
          if (currentUserData) {
            // Extract the actual user data (might be nested under user, student, or at top level)
            const userData = currentUserData.user || currentUserData.student || currentUserData;
            
            // Merge API data with stored data, preferring API data for most fields
            const mergedData = {
              ...parsedData,
              ...userData,
              // Ensure we keep the token
              token: userToken,
              // Explicitly copy critical fields to the top level with consistent naming
              studentId: userData.studentId || userData.student_id || userData.id || parsedData.studentId,
              name: userData.name || userData.fullName || userData.full_name || userData.username || parsedData.name,
              email: userData.email || userData.emailAddress || userData.email_address || parsedData.email,
              // Mark this data as recently verified
              lastVerified: new Date().toISOString()
            };
            
            console.log('Merged data:', JSON.stringify(mergedData, null, 2));
            
            // Update state with the merged data
            setUserData(mergedData);
            
            // Store the updated data
            await AsyncStorage.setItem('userData', JSON.stringify(mergedData));
            
            // Generate a new QR code with the complete data
            const qrData = createStudentQRData(mergedData);
            setQrCodeUrl(generateQRCode(qrData));
          }
        } catch (apiError) {
          console.error('Error fetching current user data from API:', apiError);
          // We already have basic QR code from stored data, so just continue
        }
      } else {
        console.log('No authentication token available, using stored user data only');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setError('Error loading student data: ' + error.message);
      
      // Generate a temporary QR code anyway with the required format: studentId|name|timestamp
      const tempStudentId = `error-${Math.floor(Math.random() * 10000)}`;
      const tempName = 'Error User';
      const tempTimestamp = new Date().toISOString();
      const tempQrData = `${tempStudentId}|${tempName}|${tempTimestamp}`;
      setQrCodeUrl(generateQRCode(tempQrData));
    } finally {
      setLoading(false);
    }
  };
  
  const refreshQrCode = () => {
    // If we already have user data, generate a new QR code with a fresh timestamp
    if (userData) {
      console.log('Refreshing QR code with current user data');
      const freshQrData = createStudentQRData(userData);
      setQrCodeUrl(generateQRCode(freshQrData));
    } else {
      // If no user data, reload everything
      loadUserData();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Attendance QR Code</Text>
      </View>
      
      <View style={styles.content}>
        <View style={styles.studentInfoCard}>
          <Text style={styles.nameText}>
            {userData?.name || userData?.username || 'Student Name'}
          </Text>
          <Text style={styles.idText}>
            ID: {userData?.studentId || 'Unknown'}
          </Text>
          <Text style={styles.emailText}>
            Email: {userData?.email || userData?.username || 'Unknown'}
          </Text>
          {(!userData?.name && !userData?.username) || !userData?.studentId ? (
            <View style={styles.warningBadge}>
              <Ionicons name="alert-circle" size={16} color="#fff" />
              <Text style={styles.warningText}>Incomplete Profile</Text>
            </View>
          ) : null}
        </View>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1B3358" />
            <Text style={styles.loadingText}>Loading QR Code...</Text>
          </View>
        ) : (
          <View style={styles.qrContainer}>
            {qrCodeUrl ? (
              <>
                <View style={styles.qrCodeContainer}>
                  <Text style={styles.qrCodeTitle}>Student QR Code</Text>
                  <View style={styles.qrImageBorder}>
                    <Image 
                      source={{ uri: qrCodeUrl.primary }} 
                      style={styles.qrImage} 
                      resizeMode="contain"
                      onLoad={() => {
                        console.log('QR code image loaded successfully');
                        // Reset to primary service on successful load
                        setCurrentQrIndex(0);
                      }}
                      onError={(error) => {
                        console.error('QR code image failed to load:', error.nativeEvent?.error || 'Unknown error');
                        // Try the next fallback service
                        if (currentQrIndex < qrCodeUrl.fallbacks.length) {
                          const nextIndex = currentQrIndex + 1;
                          console.log(`Trying fallback QR service #${nextIndex}`);
                          setCurrentQrIndex(nextIndex);
                        } else {
                          console.log('All QR services failed, showing error state');
                        }
                      }}
                    />
                    {/* Show a fallback QR code from another service if the primary one fails */}
                    {currentQrIndex > 0 && currentQrIndex <= qrCodeUrl.fallbacks.length && (
                      <Image 
                        source={{ uri: qrCodeUrl.fallbacks[currentQrIndex - 1] }} 
                        style={[styles.qrImage, { position: 'absolute' }]} 
                        resizeMode="contain"
                        onLoad={() => console.log(`Fallback QR code #${currentQrIndex} loaded successfully`)}
                        onError={(error) => {
                          console.error(`Fallback QR code #${currentQrIndex} failed to load:`, error.nativeEvent?.error || 'Unknown error');
                          // Try the next fallback service
                          if (currentQrIndex < qrCodeUrl.fallbacks.length) {
                            const nextIndex = currentQrIndex + 1;
                            console.log(`Trying next fallback QR service #${nextIndex}`);
                            setCurrentQrIndex(nextIndex);
                          } else {
                            console.log('All QR services failed, showing error state');
                          }
                        }}
                      />
                    )}
                    {/* Show error state if all QR services fail */}
                    {currentQrIndex > qrCodeUrl.fallbacks.length && (
                      <View style={styles.qrErrorContainer}>
                        <Ionicons name="warning-outline" size={50} color="#FF6B6B" />
                        <Text style={styles.qrErrorText}>QR Code Unavailable</Text>
                        <Text style={styles.qrErrorSubtext}>Network connection issue</Text>
                        <TouchableOpacity 
                          style={styles.retryButton}
                          onPress={() => {
                            setCurrentQrIndex(0); // Reset to primary service
                            refreshQrCode(); // Try generating a new QR code
                          }}
                        >
                          <Text style={styles.retryButtonText}>Retry</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                  <Text style={styles.qrCodeInstructions}>
                    Show this code to your lecturer to mark attendance
                  </Text>
                </View>
                <Text style={{fontSize: 10, color: '#999', marginTop: 5, textAlign: 'center'}}>
                  Generated: {new Date().toLocaleTimeString()}
                </Text>
              </>
            ) : (
              <View style={styles.loadingQr}>
                <Ionicons name="qr-code" size={150} color="#DDD" />
                <Text style={styles.loadingText}>Generating QR Code...</Text>
              </View>
            )}
            <Text style={styles.instructions}>
              Show this QR code to your lecturer to record your attendance
            </Text>
          </View>
        )}
        
        <TouchableOpacity style={styles.refreshButton} onPress={refreshQrCode}>
          <Text style={styles.refreshButtonText}>Refresh QR Code</Text>
          <Ionicons name="refresh-outline" size={24} color="#FFF" style={styles.refreshIcon} />
        </TouchableOpacity>
        
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Important Notes</Text>
          <Text style={styles.infoText}>
            • Your QR code contains your identity information
          </Text>
          <Text style={styles.infoText}>
            • Each QR code is time-stamped for security
          </Text>
          <Text style={styles.infoText}>
            • You can refresh your QR code if needed
          </Text>
          <Text style={styles.infoText}>
            • Have your lecturer scan this code to mark you present
          </Text>
        </View>
      </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 100, // Make room for the tab navigator
  },
  studentInfoCard: {
    backgroundColor: '#F5F6FA',
    borderRadius: 10,
    padding: 15,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  warningBadge: {
    position: 'absolute',
    top: 8,
    right: 8, 
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignItems: 'center',
  },
  warningText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 3,
  },
  nameText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B3358',
  },
  idText: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  emailText: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#1B3358',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 15,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  qrErrorContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F8F8F8',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    borderRadius: 8,
  },
  qrErrorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginTop: 10,
  },
  qrErrorSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    marginVertical: 10,
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  qrImage: {
    width: 250,
    height: 250,
    margin: 10,
  },
  qrCodeContainer: {
    width: 280,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  qrCodeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B3358',
    marginBottom: 10,
  },
  qrImageBorder: {
    borderWidth: 2,
    borderColor: '#1B3358',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrImage: {
    width: 250,
    height: 250,
    margin: 5,
  },
  qrCodeInstructions: {
    fontSize: 14,
    color: '#666',
    marginTop: 15,
    textAlign: 'center',
  },
  loadingQr: {
    width: 250,
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 10,
    margin: 10,
  },
  instructions: {
    fontSize: 14,
    color: '#666',
    marginTop: 15,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  refreshButton: {
    flexDirection: 'row',
    backgroundColor: '#1B3358',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 15,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  refreshIcon: {
    marginLeft: 5,
  },
  infoBox: {
    backgroundColor: '#F5F6FA',
    borderRadius: 10,
    padding: 15,
    width: '100%',
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B3358',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    paddingLeft: 10,
  }
});

export default QRCodeScreen;
