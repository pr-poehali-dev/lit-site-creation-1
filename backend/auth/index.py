import json
import os

def handler(event: dict, context) -> dict:
    """Проверка пароля автора для входа в админ-панель."""
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            'body': ''
        }

    body = json.loads(event.get('body') or '{}')
    password = body.get('password', '')
    admin_password = os.environ.get('ADMIN_PASSWORD', '')

    if not admin_password:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Пароль не настроен'})
        }

    if password == admin_password:
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'ok': True, 'token': admin_password})
        }

    return {
        'statusCode': 401,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Неверный пароль'})
    }
