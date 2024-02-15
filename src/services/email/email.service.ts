// import * as nodemailer from 'nodemailer';
// import * as handlebars from 'handlebars';
// import * as fs from 'fs';
// import { Injectable } from '@nestjs/common';

// // const {
// //   API_B2B_EMAIL_HOST = 'smtp.gmail.com',
// //   API_B2B_EMAIL_PORT = '465',
// //   API_B2B_EMAIL_USER,
// //   API_B2B_EMAIL_PASS,
// //   API_B2B_EMAIL_FROM_NAME,
// // } = process.env;

// @Injectable()
// export class EmailService {
//   private transporter;

//   constructor() {
//     this.transporter = nodemailer.createTransport({
//       service: 'gmail',
//       auth: {
//         user: 'bilal.bakr.elsherif@gmail.com', // sender email address
//         pass: 'ckwi qqqx uaoa kcbh', // app password generated from google
//       },
//     });
//   }

//   async sendOtpEmail(to: string, otp: string): Promise<void> {
//     const templatePath = `src/services/email/templates/otp.hbs`;
//     const templateContent = fs.readFileSync(templatePath, 'utf8');

//     const compiledTemplate = handlebars.compile(templateContent);
//     const html = compiledTemplate({ otp });

//     const mailOptions = {
//       from: `QuickPost`,
//       to: to,
//       subject: 'QuickPost sign up OTP',
//       html: html,
//     };

//     try {
//       await this.transporter.sendMail(mailOptions);
//       console.log('Email sent successfully');
//     } catch (error) {
//       console.error('Error sending email:', error);
//     }
//   }

//   async sendEmail(mailOptions: nodemailer.SendMailOptions): Promise<void> {
//     try {
//       await this.transporter.sendMail(mailOptions);
//       console.log('Email sent successfully');
//     } catch (error) {
//       console.error('Error sending email:', error);
//       throw new Error('Failed to send email');
//     }
//   }
// }

import * as nodemailer from 'nodemailer';
import { Injectable } from '@nestjs/common';
import * as handlebars from 'handlebars';
import * as fs from 'fs';

@Injectable()
export class EmailService {
  private transporter;

  // constructor() {
  //   this.transporter = nodemailer.createTransport({
  //     service: 'gmail',
  //     auth: {
  //       user: 'bilal.bakr.elsherif@gmail.com', // sender email address
  //       pass: 'ckwi qqqx uaoa kcbh', // app password generated from google
  //     },
  //   });
  // }

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: '465',
      secure: true,
      auth: {
        user: 'help.quickpost.inc@gmail.com',
        pass: 'weom jbmn ffzl etqa',
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  async sendOtpEmail(to: string, fullname: string, otp: string): Promise<void> {
    const templatePath = `src/services/email/templates/otp.hbs`;
    const templateContent = fs.readFileSync(templatePath, 'utf8');

    const currentDate = new Date().toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    const compiledTemplate = handlebars.compile(templateContent);
    const html = compiledTemplate({ otp, fullname, currentDate });

    const mailOptions = {
      from: 'QuickPost',
      to: to,
      subject: 'QuickPost sign up OTP',
      html: html,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('OTP Email sent successfully');
    } catch (error) {
      console.error('Error sending email:', error);
    }
  }

  async sendAccountCreateEmail(to: string, fullname: string): Promise<void> {
    const templatePath = `src/services/email/templates/account-create.hbs`;
    const templateContent = fs.readFileSync(templatePath, 'utf8');

    const currentDate = new Date().toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    const compiledTemplate = handlebars.compile(templateContent);
    const html = compiledTemplate({ fullname, currentDate });

    const mailOptions = {
      from: 'QuickPost',
      to: to,
      subject: 'QuickPost account created',
      html: html,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('Account create Email sent successfully');
    } catch (error) {
      console.error('Error sending email:', error);
    }
  }

  async sendLoginEmail(to: string, fullname: string): Promise<void> {
    const templatePath = `src/services/email/templates/login-notice.hbs`;
    const templateContent = fs.readFileSync(templatePath, 'utf8');

    const currentDate = new Date().toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    const compiledTemplate = handlebars.compile(templateContent);
    const html = compiledTemplate({ fullname, currentDate });

    const mailOptions = {
      from: 'QuickPost',
      to: to,
      subject: 'QuickPost Login notice',
      html: html,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('Login notice Email sent successfully');
    } catch (error) {
      console.error('Error sending email:', error);
    }
  }

  async sendEditEmail(to: string, fullname: string): Promise<void> {
    const templatePath = `src/services/email/templates/edit-profile-notice.hbs`;
    const templateContent = fs.readFileSync(templatePath, 'utf8');

    const currentDate = new Date().toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    const compiledTemplate = handlebars.compile(templateContent);
    const html = compiledTemplate({ fullname, currentDate });

    const mailOptions = {
      from: 'QuickPost',
      to: to,
      subject: 'QuickPost Profile Edit notice',
      html: html,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('Edit profile notice Email sent successfully');
    } catch (error) {
      console.error('Error sending email:', error);
    }
  }

  async sendForgetPassEmail(
    to: string,
    fullname: string,
    otp: string,
  ): Promise<void> {
    const templatePath = `src/services/email/templates/forget-pass.hbs`;
    const templateContent = fs.readFileSync(templatePath, 'utf8');

    const currentDate = new Date().toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    const compiledTemplate = handlebars.compile(templateContent);
    const html = compiledTemplate({ otp, fullname, currentDate });

    const mailOptions = {
      from: 'QuickPost',
      to: to,
      subject: 'QuickPost Forget Password OTP',
      html: html,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('Forget pass Email sent successfully');
    } catch (error) {
      console.error('Error sending email:', error);
    }
  }
}
