// src/utility/NotificationUtility.js
import crypto from 'crypto';

const otpStorage = new Map();

export const sendOtp = async (toPhoneNumber) => {
  if (!toPhoneNumber || toPhoneNumber.length < 10) {
    console.error(`Invalid phone number format: ${toPhoneNumber}`);
    throw new Error('Invalid phone number format. Must be at least 10 characters.');
  }

  try {
    console.log(`Generating OTP for ${toPhoneNumber}`);
    const otp = crypto.randomInt(100000, 999999).toString();
    otpStorage.set(toPhoneNumber, otp);
    console.log(`OTP generated and "sent" to ${toPhoneNumber}: ${otp}`);
    return {
      success: true,
      response: {
        status: 'pending',
        to: toPhoneNumber,
        otp,
      },
    };
  } catch (error) {
    console.error(`Error generating OTP for ${toPhoneNumber}: ${error.message}`);
    return {
      success: false,
      error: error.message,
    };
  }
};

export const verifyOtp = async (toPhoneNumber, otp) => {
  if (!toPhoneNumber || toPhoneNumber.length < 10) {
    console.error(`Invalid phone number format: ${toPhoneNumber}`);
    throw new Error('Invalid phone number format. Must be at least 10 characters.');
  }

  if (!otp || otp.length !== 6) {
    console.error(`Invalid OTP format: ${otp}`);
    throw new Error('Invalid OTP format. Must be a 6-digit code.');
  }

  try {
    console.log(`Verifying OTP for ${toPhoneNumber}`);
    const savedOtp = otpStorage.get(toPhoneNumber);
    if (!savedOtp) {
      console.error(`No OTP found for ${toPhoneNumber}`);
      return {
        success: false,
        error: 'OTP not found or expired',
      };
    }

    if (otp === savedOtp) {
      console.log(`OTP verification successful for ${toPhoneNumber}`);
      otpStorage.delete(toPhoneNumber);
      return {
        success: true,
        response: {
          status: 'approved',
          to: toPhoneNumber,
        },
      };
    } else {
      console.error(`Invalid OTP for ${toPhoneNumber}`);
      return {
        success: false,
        error: 'Invalid OTP',
      };
    }
  } catch (error) {
    console.error(`Error verifying OTP for ${toPhoneNumber}: ${error.message}`);
    return {
      success: false,
      error: error.message,
    };
  }
};