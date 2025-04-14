import DeliveryUser from '../models/DeliveryUser.js';
import { generatePassword } from '../utility/PasswordUnility.js'
import { validatePassword } from '../utility/PasswordUnility.js';
import { generateSignature } from '../utility/PasswordUnility.js'
import { sendOtp, verifyOtp } from '../utility/NotificationUtility.js';

export const DeliverySignUp = async (req, res) => {
  try {
    const { email, phone, password, address, firstName, lastName, pincode } = req.body;
    console.log(`Attempting signup for delivery user: ${email}`);

    const existingDeliveryUser = await DeliveryUser.findOne({ email });
    if (existingDeliveryUser) {
      console.log(`Email ${email} already exists for delivery user`);
      return res.status(400).json({ message: 'A delivery user exists with the provided email!' });
    }

    const userPassword = await generatePassword(password);
    console.log(`Creating new delivery user for ${email}`);
    const result = await DeliveryUser.create({
      email,
      password: userPassword,
      phone,
      firstName,
      lastName,
      address,
      pincode,
      verified: false,
      lat: 0,
      lng: 0,
      isAvailable: false,
    });

    console.log(`Sending OTP to ${phone} for delivery user signup`);
    const otpResult = await sendOtp(phone);
    if (!otpResult.success) {
      console.error(`Failed to send OTP to ${phone}: ${otpResult.error}`);
      return res.status(400).json({ message: 'Failed to send OTP', error: otpResult.error });
    }

    const token = await generateSignature({
      _id: result._id,
      email: result.email,
      verified: result.verified,
    });

    // Set token in cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 90 * 24 * 60 * 60 * 1000,
    });

    const userResponse = await DeliveryUser.findById(result._id).select('-password -__v -createdAt -updatedAt');
    console.log(`Signup successful for delivery user ${email}`);
    return res.status(201).json(userResponse.toObject());
  } catch (error) {
    console.error(`Error creating delivery user: ${error.message}`);
    return res.status(400).json({ message: 'Error creating delivery user', errors: error.message });
  }
};


export const DeliveryLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`Attempting login for delivery user: ${email}`);

    const deliveryUser = await DeliveryUser.findOne({ email }).select('+password');
    if (!deliveryUser) {
      console.log(`No delivery user found for email: ${email}`);
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const isValid = await validatePassword(password, deliveryUser.password);
    if (!isValid) {
      console.log(`Invalid password for email: ${email}`);
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const token = await generateSignature({
      _id: deliveryUser._id,
      email: deliveryUser.email,
      verified: deliveryUser.verified,
    });

    // Set token in cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 90 * 24 * 60 * 60 * 1000,
    });

    const userResponse = await DeliveryUser.findById(deliveryUser._id).select('-password -__v -createdAt -updatedAt');
    console.log(`Login successful for delivery user ${email}`);
    return res.status(200).json(userResponse.toObject());
  } catch (error) {
    console.error(`Error logging in delivery user: ${error.message}`);
    return res.status(400).json({ message: 'Error logging in', errors: error.message });
  }
};


export const DeliveryVerify = async (req, res) => {
  const { otp } = req.body;
  const deliveryUser = req.user;

  try {
    if (!deliveryUser) {
      console.log('No authenticated delivery user found');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    console.log(`Fetching profile for delivery user ID: ${deliveryUser._id}`);
    const profile = await DeliveryUser.findById(deliveryUser._id);
    if (!profile) {
      console.log(`Delivery user not found for ID: ${deliveryUser._id}`);
      return res.status(400).json({ message: 'Delivery user not found' });
    }

    console.log(`Verifying OTP for phone: ${profile.phone}`);
    const verifyResult = await verifyOtp(profile.phone, otp);
    if (!verifyResult.success) {
      console.log(`Invalid OTP for phone: ${profile.phone}`);
      return res.status(400).json({ message: 'Invalid OTP', error: verifyResult.error });
    }

    profile.verified = true;
    await profile.save();
    console.log(`Delivery user verified successfully for ID: ${deliveryUser._id}`);

    const token = await generateSignature({
      _id: profile._id,
      email: profile.email,
      verified: profile.verified,
    });

    // Update token in cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 90 * 24 * 60 * 60 * 1000,
    });

    const userResponse = await DeliveryUser.findById(profile._id).select('-password -__v -createdAt -updatedAt');
    return res.status(200).json(userResponse.toObject());
  } catch (error) {
    console.error(`Error verifying delivery user: ${error.message}`);
    return res.status(400).json({ message: 'Unable to verify delivery user', error: error.message });
  }
};

// Other functions remain unchanged
export const DeliveryRequestOtp = async (req, res) => {
  const deliveryUser = req.user;

  try {
    if (!deliveryUser) {
      console.log('No authenticated delivery user found');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    console.log(`Fetching profile for delivery user ID: ${deliveryUser._id}`);
    const profile = await DeliveryUser.findById(deliveryUser._id);
    if (!profile) {
      console.log(`Delivery user not found for ID: ${deliveryUser._id}`);
      return res.status(400).json({ message: 'Delivery user not found' });
    }

    console.log(`Requesting new OTP for phone: ${profile.phone}`);
    const otpResult = await sendOtp(profile.phone);
    if (!otpResult.success) {
      console.error(`Failed to send OTP to ${profile.phone}: ${otpResult.error}`);
      return res.status(400).json({ message: 'Failed to send OTP', error: otpResult.error });
    }

    console.log(`OTP sent successfully to ${profile.phone}`);
    return res.status(200).json({ message: 'OTP sent to your registered mobile number!' });
  } catch (error) {
    console.error(`Error requesting OTP for delivery user: ${error.message}`);
    return res.status(400).json({ message: 'Error requesting OTP', error: error.message });
  }
};

export const GetDeliveryProfile = async (req, res) => {
  try {
    const deliveryUser = req.user;
    if (!deliveryUser) {
      console.log('No authenticated delivery user found');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    console.log(`Fetching profile for delivery user ID: ${deliveryUser._id}`);
    const profile = await DeliveryUser.findById(deliveryUser._id).select('-password -__v -createdAt -updatedAt');
    if (!profile) {
      console.log(`Delivery user not found for ID: ${deliveryUser._id}`);
      return res.status(400).json({ message: 'Delivery user not found' });
    }

    return res.status(200).json(profile);
  } catch (error) {
    console.error(`Error fetching delivery profile: ${error.message}`);
    return res.status(400).json({ message: 'Error fetching profile', errors: error.message });
  }
};

export const EditDeliveryProfile = async (req, res) => {
  try {
    const deliveryUser = req.user;
    const { firstName, lastName, address, pincode } = req.body;

    if (!deliveryUser) {
      console.log('No authenticated delivery user found');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    console.log(`Fetching profile for delivery user ID: ${deliveryUser._id}`);
    const profile = await DeliveryUser.findById(deliveryUser._id);
    if (!profile) {
      console.log(`Delivery user not found for ID: ${deliveryUser._id}`);
      return res.status(400).json({ message: 'Delivery user not found' });
    }

    if (firstName !== undefined) profile.firstName = firstName;
    if (lastName !== undefined) profile.lastName = lastName;
    if (address !== undefined) profile.address = address;
    if (pincode !== undefined) profile.pincode = pincode;

    await profile.save();
    console.log(`Profile updated for delivery user ID: ${deliveryUser._id}`);

    const userResponse = await DeliveryUser.findById(profile._id).select('-password -__v -createdAt -updatedAt');
    return res.status(200).json(userResponse);
  } catch (error) {
    console.error(`Error updating delivery profile: ${error.message}`);
    return res.status(400).json({ message: 'Error updating profile', errors: error.message });
  }
};

export const UpdateDeliveryUserStatus = async (req, res) => {
  try {
    const deliveryUser = req.user;
    const { lat, lng, isAvailable } = req.body;

    if (!deliveryUser) {
      console.log('No authenticated delivery user found');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    console.log(`Fetching profile for delivery user ID: ${deliveryUser._id}`);
    const profile = await DeliveryUser.findById(deliveryUser._id);
    if (!profile) {
      console.log(`Delivery user not found for ID: ${deliveryUser._id}`);
      return res.status(400).json({ message: 'Delivery user not found' });
    }

    if (lat !== undefined) profile.lat = lat;
    if (lng !== undefined) profile.lng = lng;
    if (isAvailable !== undefined) profile.isAvailable = isAvailable;
    else profile.isAvailable = !profile.isAvailable;

    await profile.save();
    console.log(`Status updated for delivery user ID: ${deliveryUser._id}`);

    const userResponse = await DeliveryUser.findById(profile._id).select('-password -__v -createdAt -updatedAt');
    return res.status(200).json(userResponse);
  } catch (error) {
    console.error(`Error updating delivery status: ${error.message}`);
    return res.status(400).json({ message: 'Error updating status', errors: error.message });
  }
};