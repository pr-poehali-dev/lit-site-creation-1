import json
import os
import psycopg2

SCHEMA = os.environ['MAIN_DB_SCHEMA']

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def cors():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
    }

def handler(event: dict, context) -> dict:
    """Комментарии к произведениям: получить, добавить, удалить (автор)."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors(), 'body': ''}

    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}
    headers = {k.lower(): v for k, v in (event.get('headers') or {}).items()}

    conn = get_conn()
    cur = conn.cursor()

    try:
        if method == 'GET':
            work_id = params.get('work_id')
            if not work_id:
                # Возвращаем счётчики комментариев для всех произведений
                cur.execute(f'SELECT work_id, COUNT(*) FROM {SCHEMA}.comments GROUP BY work_id')
                rows = cur.fetchall()
                counts = {str(r[0]): r[1] for r in rows}
                return {'statusCode': 200, 'headers': cors(), 'body': json.dumps(counts, ensure_ascii=False)}
            cur.execute(
                f'SELECT id, work_id, parent_id, author_name, body, is_author, created_at FROM {SCHEMA}.comments WHERE work_id = %s ORDER BY created_at ASC',
                (work_id,)
            )
            rows = cur.fetchall()
            keys = ['id', 'work_id', 'parent_id', 'author_name', 'body', 'is_author', 'created_at']
            comments = []
            for row in rows:
                c = dict(zip(keys, row))
                c['created_at'] = c['created_at'].isoformat()
                comments.append(c)
            return {'statusCode': 200, 'headers': cors(), 'body': json.dumps(comments, ensure_ascii=False)}

        if method == 'POST':
            body = json.loads(event.get('body') or '{}')
            work_id = body.get('work_id')
            text = (body.get('body') or '').strip()
            if not work_id or not text:
                return {'statusCode': 400, 'headers': cors(), 'body': json.dumps({'error': 'work_id и body обязательны'})}

            token = headers.get('x-auth-token', '')
            is_author = token == os.environ.get('ADMIN_PASSWORD', '')
            author_name = 'Автор' if is_author else (body.get('author_name') or 'Читатель').strip()[:100]
            parent_id = body.get('parent_id')

            cur.execute(
                f'INSERT INTO {SCHEMA}.comments (work_id, parent_id, author_name, body, is_author) VALUES (%s, %s, %s, %s, %s) RETURNING id, created_at',
                (work_id, parent_id, author_name, text, is_author)
            )
            row = cur.fetchone()
            conn.commit()
            return {'statusCode': 201, 'headers': cors(), 'body': json.dumps({'id': row[0], 'created_at': row[1].isoformat()})}

        if method == 'DELETE':
            token = headers.get('x-auth-token', '')
            if token != os.environ.get('ADMIN_PASSWORD', ''):
                return {'statusCode': 401, 'headers': cors(), 'body': json.dumps({'error': 'Нет доступа'})}
            comment_id = params.get('id')
            cur.execute(f'UPDATE {SCHEMA}.comments SET body = %s WHERE id = %s OR parent_id = %s', ('[удалено]', comment_id, comment_id))
            conn.commit()
            return {'statusCode': 200, 'headers': cors(), 'body': json.dumps({'ok': True})}

        return {'statusCode': 405, 'headers': cors(), 'body': json.dumps({'error': 'Метод не поддерживается'})}

    finally:
        cur.close()
        conn.close()