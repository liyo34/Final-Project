import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

/**
 * A component that generates QR codes for both web and mobile
 * 
 * @param {Object} props
 * @param {string} props.value - The value to encode in the QR code
 * @param {number} props.size - Size of the QR code
 * @param {string} props.backgroundColor - Background color of the QR code
 * @param {string} props.color - Color of the QR code
 * @param {Object} props.logoSize - Size of the logo
 * @param {Object} props.logo - Logo to display in the center of the QR code
 * @param {Object} props.containerStyle - Additional styles for the container
 */
const QRCodeGenerator = ({
  value,
  size = 200,
  backgroundColor = '#FFFFFF',
  color = '#000000',
  logoSize,
  logo,
  containerStyle = {},
}) => {
  // Default to a student ID if no value is provided
  const qrValue = value || JSON.stringify({
    studentId: 'DEMO123456',
    name: 'Demo Student',
    program: 'Computer Science'
  });

  return (
    <View style={[styles.container, containerStyle]}>
      <QRCode
        value={qrValue}
        size={size}
        color={color}
        backgroundColor={backgroundColor}
        logo={logo}
        logoSize={logoSize}
        logoBackgroundColor="white"
        quietZone={10}
        enableLinearGradient={Platform.OS !== 'web'}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
});

export default QRCodeGenerator;
