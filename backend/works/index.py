import json
import os
import psycopg2

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
    """Управление произведениями: получить список, создать, обновить, удалить."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors_headers(), 'body': ''}

    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}
    headers = {k.lower(): v for k, v in (event.get('headers') or {}).items()}

    conn = get_conn()
    cur = conn.cursor()

    try:
        if method == 'GET':
            genre = params.get('genre')
            search = params.get('search', '').strip()
            work_id = params.get('id')

            if work_id:
                cur.execute(
                    f'SELECT id, genre, title, excerpt, body, audio_url, read_time, created_at, published FROM {SCHEMA}.works WHERE id = %s',
                    (work_id,)
                )
                row = cur.fetchone()
                if not row:
                    return {'statusCode': 404, 'headers': cors_headers(), 'body': json.dumps({'error': 'Не найдено'})}
                keys = ['id', 'genre', 'title', 'excerpt', 'body', 'audio_url', 'read_time', 'created_at', 'published']
                work = dict(zip(keys, row))
                work['created_at'] = work['created_at'].isoformat()
                return {'statusCode': 200, 'headers': cors_headers(), 'body': json.dumps(work, ensure_ascii=False)}

            query = f'SELECT id, genre, title, excerpt, body, audio_url, read_time, created_at, published FROM {SCHEMA}.works WHERE 1=1'
            args = []
            if genre:
                query += ' AND genre = %s'
                args.append(genre)
            if search:
                query += ' AND (title ILIKE %s OR excerpt ILIKE %s OR body ILIKE %s)'
                like = f'%{search}%'
                args.extend([like, like, like])
            query += ' ORDER BY created_at DESC'
            cur.execute(query, args)
            rows = cur.fetchall()
            keys = ['id', 'genre', 'title', 'excerpt', 'body', 'audio_url', 'read_time', 'created_at', 'published']
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
                f'''INSERT INTO {SCHEMA}.works (genre, title, excerpt, body, audio_url, read_time, published)
                    VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id''',
                (body['genre'], body['title'], body.get('excerpt', ''), body.get('body', ''),
                 body.get('audio_url', ''), body.get('read_time', ''), body.get('published', True))
            )
            new_id = cur.fetchone()[0]
            conn.commit()
            return {'statusCode': 201, 'headers': cors_headers(), 'body': json.dumps({'id': new_id})}

        if method == 'PUT':
            work_id = params.get('id')
            cur.execute(
                f'''UPDATE {SCHEMA}.works SET genre=%s, title=%s, excerpt=%s, body=%s,
                    audio_url=%s, read_time=%s, published=%s WHERE id=%s''',
                (body['genre'], body['title'], body.get('excerpt', ''), body.get('body', ''),
                 body.get('audio_url', ''), body.get('read_time', ''), body.get('published', True), work_id)
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
