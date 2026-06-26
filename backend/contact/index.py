import json
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

YANDEX_EMAIL = 'a.i.ush@yandex.ru'
TO_EMAIL = 'a.i.ush@yandex.ru'


def send_message(name: str, reply_email: str, message: str):
    msg = MIMEMultipart('alternative')
    msg['Subject'] = f'Сообщение с сайта от {name}'
    msg['From'] = YANDEX_EMAIL
    msg['To'] = TO_EMAIL
    msg['Reply-To'] = reply_email

    html = f"""
    <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
      <p style="font-size: 22px; font-style: italic;">Пространство <span style="color:#b45309;">&</span> слова</p>
      <p><b>Имя:</b> {name}</p>
      <p><b>Email для ответа:</b> {reply_email}</p>
      <hr style="border:none;border-top:1px solid #eee;margin:16px 0;">
      <p style="white-space:pre-wrap;">{message}</p>
      <p style="color: #888; font-size: 13px; margin-top: 32px;">Отправлено с alexey-ushakov.ru</p>
    </div>
    """
    msg.attach(MIMEText(html, 'html'))

    with smtplib.SMTP_SSL('smtp.yandex.ru', 465) as server:
        server.login(YANDEX_EMAIL, os.environ['YANDEX_SMTP_PASSWORD'])
        server.sendmail(YANDEX_EMAIL, TO_EMAIL, msg.as_string())


def handler(event: dict, context) -> dict:
    """Отправка сообщения с контактной формы на почту автора."""
    cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    }

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors, 'body': ''}

    if event.get('httpMethod') != 'POST':
        return {'statusCode': 405, 'headers': cors, 'body': json.dumps({'error': 'Method not allowed'})}

    body = json.loads(event.get('body') or '{}')
    name = (body.get('name') or '').strip()
    reply_email = (body.get('email') or '').strip()
    message = (body.get('message') or '').strip()

    if not name or not reply_email or not message:
        return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Заполните все поля'}, ensure_ascii=False)}

    send_message(name, reply_email, message)

    return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'status': 'ok'})}
