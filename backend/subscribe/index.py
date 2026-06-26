import json
import os
import smtplib
import psycopg2
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 't_p40885687_lit_site_creation_1')
YANDEX_EMAIL = 'a.i.ush@yandex.ru'


def send_confirmation(to_email: str):
    msg = MIMEMultipart('alternative')
    msg['Subject'] = 'Вы подписались на новости Алексея Ушакова'
    msg['From'] = YANDEX_EMAIL
    msg['To'] = to_email

    html = """
    <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
      <p style="font-size: 22px; font-style: italic;">Пространство <span style="color:#b45309;">&</span> слова</p>
      <p>Спасибо за подписку!</p>
      <p>Когда появится новое стихотворение, рассказ или книга — я пришлю весточку. Не чаще раза в месяц, обещаю.</p>
      <p style="color: #888; font-size: 13px; margin-top: 32px;">— Алексей Ушаков<br>alexey-ushakov.ru</p>
    </div>
    """
    msg.attach(MIMEText(html, 'html'))

    with smtplib.SMTP_SSL('smtp.yandex.ru', 465) as server:
        server.login(YANDEX_EMAIL, os.environ['YANDEX_SMTP_PASSWORD'])
        server.sendmail(YANDEX_EMAIL, to_email, msg.as_string())


def handler(event: dict, context) -> dict:
    """Подписка на новости: сохраняет email и отправляет письмо-подтверждение."""
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
    email = (body.get('email') or '').strip().lower()

    if not email or '@' not in email:
        return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Некорректный email'}, ensure_ascii=False)}

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()

    cur.execute(f"SELECT id FROM {SCHEMA}.subscribers WHERE email = '{email}'")
    if cur.fetchone():
        conn.close()
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'status': 'already_subscribed'})}

    cur.execute(f"INSERT INTO {SCHEMA}.subscribers (email) VALUES ('{email}')")
    conn.commit()
    conn.close()

    send_confirmation(email)

    return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'status': 'ok'})}