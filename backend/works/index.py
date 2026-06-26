import json
import os
import base64
import uuid
import smtplib
import psycopg2
import boto3
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

YANDEX_EMAIL = 'a.i.ush@yandex.ru'

def send_contact_email(name: str, reply_email: str, message: str):
    msg = MIMEMultipart('alternative')
    msg['Subject'] = f'Сообщение с сайта от {name}'
    msg['From'] = YANDEX_EMAIL
    msg['To'] = YANDEX_EMAIL
    msg['Reply-To'] = reply_email
    html = f"""
    <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
      <p style="font-size: 22px; font-style: italic;">Пространство <span style="color:#b45309;">&</span> слова</p>
      <p><b>Имя:</b> {name}</p>
      <p><b>Email для ответа:</b> {reply_email}</p>
      <hr style="border:none;border-top:1px solid #eee;margin:16px 0;">
      <p style="white-space:pre-wrap;">{message}</p>
      <p style="color:#888;font-size:13px;margin-top:32px;">Отправлено с alexey-ushakov.ru</p>
    </div>
    """
    msg.attach(MIMEText(html, 'html'))
    with smtplib.SMTP_SSL('smtp.yandex.ru', 465) as server:
        server.login(YANDEX_EMAIL, os.environ['YANDEX_SMTP_PASSWORD'])
        server.sendmail(YANDEX_EMAIL, YANDEX_EMAIL, msg.as_string())

SCHEMA = os.environ['MAIN_DB_SCHEMA']

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def cors_headers():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
    }

def handler(event: dict, context) -> dict:
    """Произведения + загрузка иллюстраций + счётчик посетителей."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors_headers(), 'body': ''}

    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}
    headers = {k.lower(): v for k, v in (event.get('headers') or {}).items()}
    action = params.get('action', '')

    # --- КОНТАКТНАЯ ФОРМА: POST ?action=contact ---
    if action == 'contact' and method == 'POST':
        body = json.loads(event.get('body') or '{}')
        name = (body.get('name') or '').strip()
        reply_email = (body.get('email') or '').strip()
        message = (body.get('message') or '').strip()
        if not name or not reply_email or not message:
            return {'statusCode': 400, 'headers': cors_headers(), 'body': json.dumps({'error': 'Заполните все поля'}, ensure_ascii=False)}
        send_contact_email(name, reply_email, message)
        return {'statusCode': 200, 'headers': cors_headers(), 'body': json.dumps({'status': 'ok'})}

    # --- СЧЁТЧИК: POST ?action=visit (без авторизации) ---
    if action == 'visit' and method == 'POST':
        referer = headers.get('referer', '') or headers.get('origin', '')
        if 'poehali.dev' in referer:
            return {'statusCode': 200, 'headers': cors_headers(), 'body': json.dumps({'ok': True, 'skipped': True})}
        ip = (event.get('requestContext') or {}).get('identity', {}).get('sourceIp', '')
        conn = get_conn()
        cur = conn.cursor()
        try:
            cur.execute(f'INSERT INTO {SCHEMA}.visits (ip) VALUES (%s)', (ip,))
            conn.commit()
        finally:
            cur.close()
            conn.close()
        return {'statusCode': 200, 'headers': cors_headers(), 'body': json.dumps({'ok': True})}

    # --- СЧЁТЧИК: DELETE ?action=visits (только автор, сброс) ---
    if action == 'visits' and method == 'DELETE':
        token = headers.get('x-auth-token', '')
        if token != os.environ.get('ADMIN_PASSWORD', ''):
            return {'statusCode': 401, 'headers': cors_headers(), 'body': json.dumps({'error': 'Нет доступа'})}
        conn = get_conn()
        cur = conn.cursor()
        try:
            cur.execute(f"DELETE FROM {SCHEMA}.visits")
            conn.commit()
        finally:
            cur.close()
            conn.close()
        return {'statusCode': 200, 'headers': cors_headers(), 'body': json.dumps({'ok': True})}

    # --- СЧЁТЧИК: GET ?action=visits (только автор) ---
    if action == 'visits' and method == 'GET':
        token = headers.get('x-auth-token', '')
        if token != os.environ.get('ADMIN_PASSWORD', ''):
            return {'statusCode': 401, 'headers': cors_headers(), 'body': json.dumps({'error': 'Нет доступа'})}
        conn = get_conn()
        cur = conn.cursor()
        try:
            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.visits WHERE visited_at::date = CURRENT_DATE")
            today = cur.fetchone()[0]
            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.visits")
            total = cur.fetchone()[0]
        finally:
            cur.close()
            conn.close()
        return {'statusCode': 200, 'headers': cors_headers(), 'body': json.dumps({'today': today, 'total': total})}

    # --- ЗАГРУЗКА ИЛЛЮСТРАЦИИ: POST ?action=upload (только автор) ---
    if action == 'upload' and method == 'POST':
        token = headers.get('x-auth-token', '')
        if token != os.environ.get('ADMIN_PASSWORD', ''):
            return {'statusCode': 401, 'headers': cors_headers(), 'body': json.dumps({'error': 'Нет доступа'})}
        body = json.loads(event.get('body') or '{}')
        data_url = body.get('file', '')
        if not data_url:
            return {'statusCode': 400, 'headers': cors_headers(), 'body': json.dumps({'error': 'Файл не передан'})}
        if ',' in data_url:
            header, encoded = data_url.split(',', 1)
            ext = 'png' if 'png' in header else 'gif' if 'gif' in header else 'webp' if 'webp' in header else 'jpg'
        else:
            encoded, ext = data_url, 'jpg'
        file_data = base64.b64decode(encoded)
        key = f'illustrations/{uuid.uuid4()}.{ext}'
        content_type = f'image/{ext}' if ext != 'jpg' else 'image/jpeg'
        s3 = boto3.client('s3', endpoint_url='https://bucket.poehali.dev',
                          aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
                          aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'])
        s3.put_object(Bucket='files', Key=key, Body=file_data, ContentType=content_type)
        cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
        return {'statusCode': 200, 'headers': cors_headers(), 'body': json.dumps({'url': cdn_url})}

    # --- КОНТЕНТ: GET ?action=content ---
    if action == 'content' and method == 'GET':
        conn = get_conn()
        cur = conn.cursor()
        try:
            cur.execute(f'SELECT key, value FROM {SCHEMA}.site_content')
            rows = cur.fetchall()
            result = {r[0]: r[1] for r in rows}
        finally:
            cur.close()
            conn.close()
        return {'statusCode': 200, 'headers': cors_headers(), 'body': json.dumps(result, ensure_ascii=False)}

    # --- КОНТЕНТ: POST ?action=content (только автор) ---
    if action == 'content' and method == 'POST':
        token = headers.get('x-auth-token', '')
        if token != os.environ.get('ADMIN_PASSWORD', ''):
            return {'statusCode': 401, 'headers': cors_headers(), 'body': json.dumps({'error': 'Нет доступа'})}
        body = json.loads(event.get('body') or '{}')
        conn = get_conn()
        cur = conn.cursor()
        try:
            for key, value in body.items():
                cur.execute(
                    f'INSERT INTO {SCHEMA}.site_content (key, value) VALUES (%s, %s) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
                    (key, value)
                )
            conn.commit()
        finally:
            cur.close()
            conn.close()
        return {'statusCode': 200, 'headers': cors_headers(), 'body': json.dumps({'ok': True})}

    # --- ПОРЯДОК: POST ?action=reorder ---
    if action == 'reorder' and method == 'POST':
        token = headers.get('x-auth-token', '')
        if token != os.environ.get('ADMIN_PASSWORD', ''):
            return {'statusCode': 401, 'headers': cors_headers(), 'body': json.dumps({'error': 'Нет доступа'})}
        body = json.loads(event.get('body') or '{}')
        ids = body.get('ids', [])
        conn = get_conn()
        cur = conn.cursor()
        try:
            for i, wid in enumerate(ids):
                cur.execute(f'UPDATE {SCHEMA}.works SET sort_order = %s WHERE id = %s', (i, wid))
            conn.commit()
        finally:
            cur.close()
            conn.close()
        return {'statusCode': 200, 'headers': cors_headers(), 'body': json.dumps({'ok': True})}

    # --- ПРОИЗВЕДЕНИЯ ---
    conn = get_conn()
    cur = conn.cursor()
    try:
        if method == 'GET':
            genre = params.get('genre')
            search = params.get('search', '').strip()
            work_id = params.get('id')

            if work_id:
                cur.execute(
                    f'SELECT id, genre, title, excerpt, body, audio_url, read_time, created_at, published, image_url FROM {SCHEMA}.works WHERE id = %s',
                    (work_id,)
                )
                row = cur.fetchone()
                if not row:
                    return {'statusCode': 404, 'headers': cors_headers(), 'body': json.dumps({'error': 'Не найдено'})}
                keys = ['id', 'genre', 'title', 'excerpt', 'body', 'audio_url', 'read_time', 'created_at', 'published', 'image_url']
                work = dict(zip(keys, row))
                work['created_at'] = work['created_at'].isoformat()
                return {'statusCode': 200, 'headers': cors_headers(), 'body': json.dumps(work, ensure_ascii=False)}

            query = f'SELECT id, genre, title, excerpt, body, audio_url, read_time, created_at, published, image_url FROM {SCHEMA}.works WHERE 1=1'
            args = []
            if genre:
                query += ' AND genre = %s'
                args.append(genre)
            if search:
                query += ' AND (title ILIKE %s OR excerpt ILIKE %s OR body ILIKE %s)'
                like = f'%{search}%'
                args.extend([like, like, like])
            query += ' ORDER BY sort_order ASC, created_at DESC'
            cur.execute(query, args)
            rows = cur.fetchall()
            keys = ['id', 'genre', 'title', 'excerpt', 'body', 'audio_url', 'read_time', 'created_at', 'published', 'image_url']
            works = []
            for row in rows:
                w = dict(zip(keys, row))
                w['created_at'] = w['created_at'].isoformat()
                works.append(w)
            return {'statusCode': 200, 'headers': cors_headers(), 'body': json.dumps(works, ensure_ascii=False)}

        token = headers.get('x-auth-token', '')
        if token != os.environ.get('ADMIN_PASSWORD', ''):
            return {'statusCode': 401, 'headers': cors_headers(), 'body': json.dumps({'error': 'Нет доступа'})}

        body = json.loads(event.get('body') or '{}')

        if method == 'POST':
            cur.execute(
                f'''INSERT INTO {SCHEMA}.works (genre, title, excerpt, body, audio_url, read_time, published, image_url)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id''',
                (body['genre'], body['title'], body.get('excerpt', ''), body.get('body', ''),
                 body.get('audio_url', ''), body.get('read_time', ''), body.get('published', True),
                 body.get('image_url', ''))
            )
            new_id = cur.fetchone()[0]
            conn.commit()
            return {'statusCode': 201, 'headers': cors_headers(), 'body': json.dumps({'id': new_id})}

        if method == 'PUT':
            work_id = params.get('id')
            cur.execute(
                f'''UPDATE {SCHEMA}.works SET genre=%s, title=%s, excerpt=%s, body=%s,
                    audio_url=%s, read_time=%s, published=%s, image_url=%s WHERE id=%s''',
                (body['genre'], body['title'], body.get('excerpt', ''), body.get('body', ''),
                 body.get('audio_url', ''), body.get('read_time', ''), body.get('published', True),
                 body.get('image_url', ''), work_id)
            )
            conn.commit()
            return {'statusCode': 200, 'headers': cors_headers(), 'body': json.dumps({'ok': True})}

        if method == 'DELETE':
            work_id = params.get('id')
            cur.execute(f'DELETE FROM {SCHEMA}.works WHERE id = %s', (work_id,))
            conn.commit()
            return {'statusCode': 200, 'headers': cors_headers(), 'body': json.dumps({'ok': True})}

        return {'statusCode': 405, 'headers': cors_headers(), 'body': json.dumps({'error': 'Метод не поддерживается'})}

    finally:
        cur.close()
        conn.close()