import asyncio
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from backend.app.core.config import settings

logger = logging.getLogger("lifora.email")


class EmailService:
    @staticmethod
    def _send_smtp_sync(to_email: str, subject: str, html_body: str, text_body: str) -> bool:
        if not settings.SMTP_HOST or not settings.SMTP_USER:
            if settings.ENVIRONMENT == "production":
                logger.warning(
                    f"[LIFORA EMAIL] SMTP provider not configured in production. Cannot send email to {to_email}. "
                    "Configure SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASSWORD in Render environment variables."
                )
            else:
                logger.info(f"[LIFORA EMAIL DEV] Email to {to_email} skipped (SMTP not configured).")
            return False

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = settings.SMTP_FROM_EMAIL or f"LIFORA <{settings.SMTP_USER}>"
            msg["To"] = to_email

            part1 = MIMEText(text_body, "plain", "utf-8")
            part2 = MIMEText(html_body, "html", "utf-8")
            msg.attach(part1)
            msg.attach(part2)

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
                if settings.SMTP_TLS:
                    server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(msg["From"], [to_email], msg.as_string())

            logger.info(f"[LIFORA EMAIL] Successfully sent email to {to_email}")
            return True
        except Exception as e:
            logger.error(f"[LIFORA EMAIL ERROR] Failed to send email to {to_email}: {e}")
            return False

    @classmethod
    async def send_verification_email(cls, to_email: str, token: str, frontend_url: str | None = None) -> bool:
        base_url = (frontend_url or settings.FRONTEND_URL).rstrip("/")
        verify_url = f"{base_url}/verify-email?token={token}&email={to_email}"
        subject = "Verify your LIFORA Account"

        text_body = (
            f"Welcome to LIFORA!\n\n"
            f"Please verify your account by clicking the link below or copying your verification token:\n"
            f"{verify_url}\n\n"
            f"Verification Token: {token}\n\n"
            f"LIFORA — Your Life. Your Space. Your Rules."
        )

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #021816; color: #e4e4e7; margin: 0; padding: 30px; }}
            .container {{ max-width: 520px; margin: 0 auto; background: #031f1c; border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 16px; padding: 32px; }}
            .brand {{ text-align: center; margin-bottom: 24px; }}
            .brand h1 {{ color: #ffffff; margin: 0; font-size: 26px; font-weight: 800; }}
            .brand p {{ color: #10b981; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin: 4px 0 0; }}
            .btn {{ display: inline-block; background-color: #10b981; color: #021816 !important; font-weight: bold; text-decoration: none; padding: 12px 28px; border-radius: 10px; margin: 20px 0; }}
            .token-box {{ background: #011311; border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 8px; padding: 12px; font-family: monospace; font-size: 13px; color: #6ee7b7; word-break: break-all; margin: 16px 0; }}
            .footer {{ text-align: center; color: #71717a; font-size: 11px; margin-top: 24px; }}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="brand">
              <h1>LIFORA</h1>
              <p>Your Life. Your Space. Your Rules.</p>
            </div>
            <h2>Verify Your Email Address</h2>
            <p>Welcome to LIFORA! Please confirm your email address to activate your personal life management account.</p>
            <div style="text-align: center;">
              <a href="{verify_url}" class="btn">Verify Account</a>
            </div>
            <p style="font-size: 12px; color: #a1a1aa;">Or paste this verification token into the verification screen:</p>
            <div class="token-box">{token}</div>
            <div class="footer">
              If you did not request this, you can safely ignore this email.<br>
              &copy; LIFORA Platform.
            </div>
          </div>
        </body>
        </html>
        """

        return await asyncio.to_thread(cls._send_smtp_sync, to_email, subject, html_body, text_body)

    @classmethod
    async def send_password_reset_email(cls, to_email: str, token: str, frontend_url: str | None = None) -> bool:
        base_url = (frontend_url or settings.FRONTEND_URL).rstrip("/")
        reset_url = f"{base_url}/reset-password?token={token}"
        subject = "Reset your LIFORA Password"

        text_body = (
            f"LIFORA Password Reset Request\n\n"
            f"You requested to reset your password. Use the link below:\n"
            f"{reset_url}\n\n"
            f"Reset Token: {token}\n\n"
            f"This link expires in 1 hour.\n\n"
            f"LIFORA — Your Life. Your Space. Your Rules."
        )

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #021816; color: #e4e4e7; margin: 0; padding: 30px; }}
            .container {{ max-width: 520px; margin: 0 auto; background: #031f1c; border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 16px; padding: 32px; }}
            .brand {{ text-align: center; margin-bottom: 24px; }}
            .brand h1 {{ color: #ffffff; margin: 0; font-size: 26px; font-weight: 800; }}
            .brand p {{ color: #10b981; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin: 4px 0 0; }}
            .btn {{ display: inline-block; background-color: #10b981; color: #021816 !important; font-weight: bold; text-decoration: none; padding: 12px 28px; border-radius: 10px; margin: 20px 0; }}
            .token-box {{ background: #011311; border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 8px; padding: 12px; font-family: monospace; font-size: 13px; color: #6ee7b7; word-break: break-all; margin: 16px 0; }}
            .footer {{ text-align: center; color: #71717a; font-size: 11px; margin-top: 24px; }}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="brand">
              <h1>LIFORA</h1>
              <p>Your Life. Your Space. Your Rules.</p>
            </div>
            <h2>Password Reset Request</h2>
            <p>You requested to reset your LIFORA account password. Click the button below to proceed:</p>
            <div style="text-align: center;">
              <a href="{reset_url}" class="btn">Reset Password</a>
            </div>
            <p style="font-size: 12px; color: #a1a1aa;">Or paste this reset token:</p>
            <div class="token-box">{token}</div>
            <p style="font-size: 11px; color: #71717a;">This link is valid for 1 hour. If you did not request this change, you can safely ignore this email.</p>
            <div class="footer">
              &copy; LIFORA Platform.
            </div>
          </div>
        </body>
        </html>
        """

        return await asyncio.to_thread(cls._send_smtp_sync, to_email, subject, html_body, text_body)
