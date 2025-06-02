const nodemailer = require('nodemailer');

class EmailService {
	constructor() {
		this.setupTransporter();
	}

	setupTransporter() {
		if (process.env.MAILTRAP_USER && process.env.MAILTRAP_PASS) {
			// Mailtrap Testing configuration (không phải Live SMTP)
			this.transporter = nodemailer.createTransport({
				host: 'sandbox.smtp.mailtrap.io', // Đổi từ live.smtp.mailtrap.io
				port: 2525, // Đổi từ 587
				auth: {
					user: process.env.MAILTRAP_USER,
					pass: process.env.MAILTRAP_PASS,
				},
			});
			this.useMailtrap = true;
			console.log('✅ Mailtrap Testing email service configured');
		} else {
			this.useMailtrap = false;
			console.log('⚠️ Email service in mock mode (Mailtrap not configured)');
		}
	}

	async sendPasswordResetEmail(email, token, fullName) {
		const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password/${token}`;

		if (!this.useMailtrap) {
			// Mock email for development
			console.log('\n=== 📧 MOCK EMAIL - PASSWORD RESET ===');
			console.log('📮 To:', email);
			console.log('👤 Name:', fullName);
			console.log('🔑 Reset Token:', token);
			console.log('🔗 Reset URL:', resetUrl);
			console.log('⏰ Expires in: 30 minutes');
			console.log('📝 Copy this URL to test reset password:');
			console.log('   ', resetUrl);
			console.log('====================================\n');

			return {
				success: true,
				messageId: `mock-${Date.now()}`,
				resetUrl: resetUrl,
			};
		}

		const mailOptions = {
			from: '"Carpooling App" <test@carpooling.com>', // Đổi from email
			to: email,
			subject: 'Password Reset Request - Carpooling App',
			html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
            .header { background-color: #FF6B6B; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .button { 
              display: inline-block; 
              padding: 12px 24px; 
              background-color: #FF6B6B; 
              color: white; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 20px 0;
            }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
            .warning { background-color: #FFF3CD; border: 1px solid #FFEAA7; padding: 15px; border-radius: 5px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Hi ${fullName}!</h2>
              <p>You requested to reset your password for your Carpooling App account.</p>
              
              <div class="warning">
                <strong>⚠️ Security Notice:</strong> If you didn't request this password reset, please ignore this email and your password will remain unchanged.
              </div>
              
              <p>To reset your password, click the button below:</p>
              
              <a href="${resetUrl}" class="button">Reset Password</a>
              
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #666;">${resetUrl}</p>
              
              <p><strong>This link will expire in 30 minutes for security reasons.</strong></p>
              
              <p>If you continue to have problems, please contact our support team.</p>
            </div>
            <div class="footer">
              <p>© 2024 Carpooling App. All rights reserved.</p>
              <p>This is an automated email, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
		};

		try {
			const info = await this.transporter.sendMail(mailOptions);
			console.log('✅ Mailtrap Testing email sent:', info.messageId);
			return { success: true, messageId: info.messageId };
		} catch (error) {
			console.error('❌ Mailtrap email error:', error);

			// Fallback to mock mode if Mailtrap fails
			console.log('⚠️ Falling back to mock mode...');
			console.log('\n=== 📧 MOCK EMAIL - PASSWORD RESET (Fallback) ===');
			console.log('📮 To:', email);
			console.log('👤 Name:', fullName);
			console.log('🔑 Reset Token:', token);
			console.log('🔗 Reset URL:', resetUrl);
			console.log('====================================================\n');

			return {
				success: true,
				messageId: `mock-fallback-${Date.now()}`,
				resetUrl: resetUrl,
			};
		}
	}

	async sendPasswordChangedEmail(email, fullName) {
		if (!this.useMailtrap) {
			console.log('\n=== 📧 MOCK EMAIL - PASSWORD CHANGED ===');
			console.log('📮 To:', email);
			console.log('👤 Name:', fullName);
			console.log('📅 Changed at:', new Date().toLocaleString());
			console.log('=======================================\n');
			return { success: true, messageId: `mock-${Date.now()}` };
		}

		const mailOptions = {
			from: '"Carpooling App" <test@carpooling.com>', // Đổi from email
			to: email,
			subject: 'Password Changed Successfully - Carpooling App',
			html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
            .info { background-color: #E3F2FD; border: 1px solid #2196F3; padding: 15px; border-radius: 5px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Password Changed Successfully</h1>
            </div>
            <div class="content">
              <h2>Hi ${fullName}!</h2>
              <p>Your password has been changed successfully.</p>
              
              <div class="info">
                <strong>📅 Changed at:</strong> ${new Date().toLocaleString()}<br>
                <strong>🔐 Security tip:</strong> Make sure to use a strong, unique password for your account.
              </div>
              
              <p>If you didn't make this change, please contact our support team immediately.</p>
              
              <p>For your security:</p>
              <ul>
                <li>Don't share your password with anyone</li>
                <li>Use a unique password for this account</li>
                <li>Consider enabling two-factor authentication if available</li>
              </ul>
            </div>
            <div class="footer">
              <p>© 2024 Carpooling App. All rights reserved.</p>
              <p>Need help? Contact us at support@carpooling.com</p>
            </div>
          </div>
        </body>
        </html>
      `,
		};

		try {
			const info = await this.transporter.sendMail(mailOptions);
			console.log('✅ Password changed email sent:', info.messageId);
			return { success: true, messageId: info.messageId };
		} catch (error) {
			console.error('❌ Password changed email error:', error);

			// Fallback to mock
			console.log('\n=== 📧 MOCK EMAIL - PASSWORD CHANGED (Fallback) ===');
			console.log('📮 To:', email);
			console.log('👤 Name:', fullName);
			console.log('📅 Changed at:', new Date().toLocaleString());
			console.log('=================================================\n');

			return { success: true, messageId: `mock-fallback-${Date.now()}` };
		}
	}
}

module.exports = new EmailService();
