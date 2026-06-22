import json
import os
import psycopg2

SCHEMA = os.environ['MAIN_DB_SCHEMA']

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def cors_headers():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
    }

def handler(event: dict, context) -> dict:
    """Счётчик посетителей: POST — записать визит, GET — получить статистику (только для автора)."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors_headers(), 'body': ''}

    method = event.get('httpMethod', 'GET')
    headers = {k.lower(): v for k, v in (event.get('headers') or {}).items()}
    ip = (event.get('requestContext') or {}).get('identity', {}).get('sourceIp', '')

    conn = get_conn()
    cur = conn.cursor()

    try:
        if method == 'POST':
            cur.execute(f'INSERT INTO {SCHEMA}.visits (ip) VALUES (%s)', (ip,))
            conn.commit()
            return {'statusCode': 200, 'headers': cors_headers(), 'body': json.dumps({'ok': True})}

        if method == 'GET':
            token = headers.get('x-auth-token', '')
            if token != os.environ.get('ADMIN_PASSWORD', ''):
                return {'statusCode': 401, 'headers': cors_headers(), 'body': json.dumps({'error': 'Нет доступа'})}

            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.visits WHERE visited_at::date = CURRENT_DATE")
            today = cur.fetchone()[0]

            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.visits")
            total = cur.fetchone()[0]

            return {'statusCode': 200, 'headers': cors_headers(), 'body': json.dumps({'today': today, 'total': total})}

        return {'statusCode': 405, 'headers': cors_headers(), 'body': json.dumps({'error': 'Метод не поддерживается'})}

    finally:
        cur.close()
        conn.close()
