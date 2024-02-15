import { Injectable } from '@nestjs/common';

@Injectable()
export class OtpService {
  generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  }

  isOtpValid(otp: string, otpExpiry: Date): boolean {
    const now = new Date();
    return otp === otp && otpExpiry > now;
  }
}
