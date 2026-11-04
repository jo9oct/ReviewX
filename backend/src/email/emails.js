
import { client } from "../config/mailtrap.config.js";
import {VERIFICATION_EMAIL_REQUEST_TEMPLATE,
        WELCOME_EMAIL_REQUEST_TEMPLATE,
        PASSWORD_RESET_REQUEST_TEMPLATE,
        PASSWORD_RESET_SUCCESS_REQUEST_TEMPLATE } from "./emailTemplates.js"


export const sendVerificationEmail = async (email, verificationToken, explore_link, FullName, Support_Email, year) => {
//   const recipients = [{ email }];

  try {
    const response = await client.sendMail({
      from: `"Mail Test" <lolita30@ethereal.email>`,
      to: `jops7326@gmail.com`,
      subject: "You are awesome!",
      html: VERIFICATION_EMAIL_REQUEST_TEMPLATE
        .replace("{{first_name}}", FullName)
        .replace("{{verification_code}}", verificationToken)
        .replace("{{verification_link}}", explore_link)
        .replace("{{support_email}}", Support_Email)
        .replace("{{year}}", year),
      category: "Integration Test",
    });

    console.log("✅ Email response:", response);
    console.log("📧 Sent verification email to:", email);

    return response;
  } catch (err) {
    console.error("❌ Error sending email:", err.response?.data || err.message);
  }
};

export const sendWelcomeEmail = async (email, name, logo, explore_link, support_email, year) => {

    try{
        const response = await client.sendMail({
                from: `"Mail Test" <lolita30@ethereal.email>`,
                to: `jops7326@gmail.com`,
                subject: "You are awesome!",
                html: WELCOME_EMAIL_REQUEST_TEMPLATE
                        .replace("{{logo_url}}", logo)
                        .replace("{{first_name}}", name)
                        .replace("{{explore_link}}", explore_link)
                        .replace("{{support_email}}", support_email)
                        .replace("{{year}}", year),
                category: "Integration Test",
            })

        console.log("✅ Email response:", response);
        console.log("📧 Sent Welcome email to:", email);
        return response
    }
    catch(err){
        console.log("Error: " + err)
    }
}

export const sendPasswordResetEmail = async (email, url, name, logo, support_email, year) => {

    try{
        const response = await client.sendMail({
                from: `"Mail Test" <lolita30@ethereal.email>`,
                to: `jops7326@gmail.com`,
                subject: "You are awesome!",
                html: PASSWORD_RESET_REQUEST_TEMPLATE
                        .replace("{{logo_url}}", logo)
                        .replace("{{first_name}}", name)
                        .replace("{{reset_link}}", url)
                        .replace("{{support_email}}", support_email )
                        .replace("{{year}}", year),
                category: "Integration Test",
            })
            
        console.log("✅ Email response:", response);
        console.log("📧 Sent Password Reset email to:", email);
        return response
    }
    catch(err){
        console.log("Error: " + err)
    }
}

export const sendResetSuccessEmail = async (email, logo, name, login_link, support_email, year) => {

    try{
        const response = await client.sendMail({
                from: `"Mail Test" <lolita30@ethereal.email>`,
                to: `jops7326@gmail.com`,
                subject: "You are awesome!",
                html: PASSWORD_RESET_SUCCESS_REQUEST_TEMPLATE
                        .replace("{{logo_url}}", logo)
                        .replace("{{first_name}}", name)
                        .replace("{{login_link}}", login_link)
                        .replace("{{support_email}}", support_email)
                        .replace("{{year}}", year),
                category: "Integration Test",
            })
        
        console.log("✅ Email response:", response);
        console.log("📧 Sent Password Reset Success email to:", email);
        return response
    }
    catch(err){
        console.log("Error: " + err)
    }
}
