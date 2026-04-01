import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import settings


async def send_email(to: str, subject: str, body_html: str):
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print(f"[EMAIL - not configured] To: {to} | Subject: {subject}")
        return

    message = MIMEMultipart("alternative")
    message["From"] = settings.SMTP_USER
    message["To"] = to
    message["Subject"] = subject
    message.attach(MIMEText(body_html, "html"))

    try:
        await aiosmtplib.send(
            message,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            start_tls=True,
        )
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")


async def notify_admin_new_event(event_title: str, creator: str, description: str, event_id: int):
    subject = f"[SIGambling] Nouvelle demande d'événement : {event_title}"
    body = f"""
    <h2>Nouvelle demande d'événement</h2>
    <p><b>Créateur :</b> {creator}</p>
    <p><b>Titre :</b> {event_title}</p>
    <p><b>Description :</b> {description}</p>
    <p><b>ID :</b> {event_id}</p>
    <p><a href="http://localhost:8000/admin">Panel admin</a></p>
    """
    await send_email(settings.ADMIN_EMAIL, subject, body)


async def notify_user_event_approved(user_email: str, event_title: str):
    subject = f"[SIGambling] Votre événement a été approuvé : {event_title}"
    body = f"""
    <h2>Événement approuvé !</h2>
    <p>Votre événement <b>{event_title}</b> est maintenant disponible sur la plateforme.</p>
    <p><a href="http://localhost:8000">Voir sur SIGambling</a></p>
    """
    await send_email(user_email, subject, body)


async def notify_user_event_rejected(user_email: str, event_title: str):
    subject = f"[SIGambling] Votre événement a été refusé : {event_title}"
    body = f"""
    <h2>Événement refusé</h2>
    <p>Votre événement <b>{event_title}</b> n'a pas pu être approuvé.</p>
    """
    await send_email(user_email, subject, body)
