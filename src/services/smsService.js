// src/services/smsService.js
const axios = require('axios');

class SMSService {
  constructor() {
    this.setupProvider();
  }

  setupProvider() {
    // Check if SMS provider is configured
    if (process.env.SMS_API_KEY && process.env.SMS_API_SECRET) {
      this.useSMSProvider = true;
      this.apiKey = process.env.SMS_API_KEY;
      this.apiSecret = process.env.SMS_API_SECRET;
      this.apiUrl = process.env.SMS_API_URL || 'https://api.sms.vn/sms/send';
      console.log('✅ SMS service configured');
    } else {
      this.useSMSProvider = false;
      console.log('⚠️ SMS service in mock mode (credentials not configured)');
    }
  }

  async sendOTP(phone, otp) {
    if (!this.useSMSProvider) {
      // Mock SMS for development
      console.log('\n=== 📱 MOCK SMS - OTP ===');
      console.log('📞 To:', phone);
      console.log('🔢 OTP:', otp);
      console.log('📝 Message: Your Carpooling verification code is', otp);
      console.log('⏰ Valid for: 10 minutes');
      console.log('========================\n');

      return {
        success: true,
        messageId: `mock-sms-${Date.now()}`,
        phone: phone,
        otp: otp
      };
    }

    const message = `Your Carpooling verification code is ${otp}. Valid for 10 minutes. Do not share this code with anyone.`;

    try {
      // Example for Vietnamese SMS providers (like SMS.vn, Esms.vn, etc.)
      const response = await axios.post(this.apiUrl, {
        phone: phone,
        message: message,
        api_key: this.apiKey,
        api_secret: this.apiSecret,
        type: 'text'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      console.log('✅ SMS sent successfully to:', phone);

      return {
        success: true,
        messageId: response.data.message_id || `sms-${Date.now()}`,
        phone: phone,
        provider: 'sms-provider'
      };

    } catch (error) {
      console.error('❌ SMS sending failed:', error.message);

      // Fallback to mock mode if SMS provider fails
      console.log('⚠️ Falling back to mock SMS...');
      console.log('\n=== 📱 MOCK SMS - OTP (Fallback) ===');
      console.log('📞 To:', phone);
      console.log('🔢 OTP:', otp);
      console.log('📝 Message:', message);
      console.log('================================\n');

      return {
        success: true,
        messageId: `mock-fallback-${Date.now()}`,
        phone: phone,
        otp: otp,
        fallback: true
      };
    }
  }

  async sendMessage(phone, message) {
    if (!this.useSMSProvider) {
      console.log('\n=== 📱 MOCK SMS - MESSAGE ===');
      console.log('📞 To:', phone);
      console.log('📝 Message:', message);
      console.log('============================\n');

      return {
        success: true,
        messageId: `mock-sms-${Date.now()}`,
        phone: phone
      };
    }

    try {
      const response = await axios.post(this.apiUrl, {
        phone: phone,
        message: message,
        api_key: this.apiKey,
        api_secret: this.apiSecret,
        type: 'text'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      console.log('✅ SMS message sent successfully to:', phone);

      return {
        success: true,
        messageId: response.data.message_id || `sms-${Date.now()}`,
        phone: phone,
        provider: 'sms-provider'
      };

    } catch (error) {
      console.error('❌ SMS message sending failed:', error.message);

      // Fallback to mock
      console.log('\n=== 📱 MOCK SMS - MESSAGE (Fallback) ===');
      console.log('📞 To:', phone);
      console.log('📝 Message:', message);
      console.log('====================================\n');

      return {
        success: true,
        messageId: `mock-fallback-${Date.now()}`,
        phone: phone,
        fallback: true
      };
    }
  }

  // Validate Vietnamese phone number
  validateVietnamesePhone(phone) {
    // Remove all non-digits
    const cleanPhone = phone.replace(/\D/g, '');

    // Vietnamese phone patterns
    const patterns = [
      /^(84|0)(3[2-9]|5[689]|7[06-9]|8[1-689]|9[0-46-9])[0-9]{7}$/,  // Mobile
      /^(84|0)(1[2689])[0-9]{8}$/  // Old mobile format
    ];

    return patterns.some(pattern => pattern.test(cleanPhone));
  }

  // Format phone number for SMS
  formatPhoneNumber(phone) {
    // Remove all non-digits
    let cleanPhone = phone.replace(/\D/g, '');

    // If starts with 0, replace with 84
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '84' + cleanPhone.substring(1);
    }

    // If doesn't start with 84, add it
    if (!cleanPhone.startsWith('84')) {
      cleanPhone = '84' + cleanPhone;
    }

    return cleanPhone;
  }
}

module.exports = new SMSService();