import { HTTP_STATUS } from '../utils/constants.js';
import { loginOwner, loginWorker, getOwnerProfile, getWorkerProfile, getSuperAdminProfile } from '../services/auth.service.js';

export const ownerLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await loginOwner(email, password);

    res.status(HTTP_STATUS.OK).json({
      message: 'Login successful',
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const workerLogin = async (req, res, next) => {
  try {
    const { username, password, pin } = req.body;

    if (!username) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: 'Username is required',
      });
    }

    console.log('Worker login attempt:', username);
    const result = await loginWorker(username, password || pin);
    console.log('Worker login result:', result);

    res.status(HTTP_STATUS.OK).json({
      message: 'Login successful',
      ...result,
    });
  } catch (error) {
    console.error('Worker login error:', error.message);
    next(error);
  }
};

export const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;

    let profile;
    if (role === 'owner') {
      profile = await getOwnerProfile(userId);
    } else if (role === 'super_admin') {
      profile = await getSuperAdminProfile(userId);
    } else {
      profile = await getWorkerProfile(userId);
    }

    res.status(HTTP_STATUS.OK).json({
      message: 'Profile fetched successfully',
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = (req, res) => {
  res.status(HTTP_STATUS.OK).json({
    message: 'Logout successful',
  });
};
